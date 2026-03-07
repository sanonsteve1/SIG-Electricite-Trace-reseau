# -*- coding: utf-8 -*-
"""
API REST Python (FastAPI) pour les tables décrites dans database_structure.json.
Expose pour chaque table : GET liste, GET par id, POST (création/mise à jour), DELETE.
"""
import json
import os
import re

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import Body, FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import DB_CONFIG, STRUCTURE_JSON_PATH
from .db import get_connection, get_cursor

import logging
_log = logging.getLogger(__name__)

_script_dir = os.path.dirname(os.path.abspath(__file__))
# Structure des tables : uniquement script_bd/database_structure.json (une API par table)
STRUCTURE_PATH = STRUCTURE_JSON_PATH

app = FastAPI(
    title="API GIS – Tables base goughin",
    description="API CRUD générée à partir de database_structure.json",
    version="1.0.0",
)
# Avec allow_credentials=True, on ne peut pas utiliser "*" ; il faut des origines explicites
CORS_ORIGINS = [
    "http://localhost:4300",
    "http://localhost:4200",
    "http://127.0.0.1:4300",
    "http://127.0.0.1:4200",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_structure() -> dict:
    """Charge le schéma des tables depuis le JSON."""
    if not os.path.isfile(STRUCTURE_PATH):
        raise FileNotFoundError(f"Fichier de structure introuvable: {STRUCTURE_PATH}")
    with open(STRUCTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def table_slug(table_name: str) -> str:
    """Nom de table -> segment d'URL (minuscules, tirets)."""
    return table_name.lower().replace("_", "-")


def quote_ident(name: str) -> str:
    """Quote un identifiant PostgreSQL (casse préservée)."""
    return f'"{name}"'


def row_to_json(row: dict) -> dict:
    """Convertit une ligne (RealDictRow) en dict JSON-sérialisable (dates, decimal, bytes)."""
    if row is None:
        return None
    out = {}
    for k, v in row.items():
        if v is None:
            out[k] = None
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif isinstance(v, (bytes, memoryview)):
            try:
                out[k] = v.decode("utf-8", errors="replace")
            except Exception:
                out[k] = None
        elif hasattr(v, "__float__") and not isinstance(v, (int, bool)):
            try:
                out[k] = float(v)
            except (TypeError, ValueError):
                out[k] = v
        else:
            out[k] = v
    return out


def get_existing_table_names() -> set[str] | None:
    """
    Retourne l'ensemble des noms de tables (public, minuscules) présentes en base.
    Retourne None si la connexion échoue (pour ne pas filtrer au démarrage).
    """
    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
                )
                rows = cur.fetchall()
        return {str(r["table_name"]).lower() for r in (rows or [])}
    except Exception:
        return None


def get_table_columns_from_db(table_name: str) -> list[dict] | None:
    """
    Retourne les colonnes réelles d'une table (information_schema) pour rester
    aligné avec les évolutions de schéma faites directement en base.
    """
    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                cur.execute(
                    """
                    SELECT
                        column_name,
                        data_type,
                        udt_name,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s
                    ORDER BY ordinal_position
                    """,
                    (table_name,),
                )
                rows = cur.fetchall() or []
        if not rows:
            return None
        out: list[dict] = []
        for r in rows:
            data_type = str(r.get("data_type") or "").strip()
            udt_name = str(r.get("udt_name") or "").strip().lower()
            # Conserver "USER-DEFINED" pour les géométries afin de rester
            # compatible avec get_geometry_columns().
            col_type = "USER-DEFINED" if data_type == "USER-DEFINED" and udt_name == "geometry" else data_type
            out.append(
                {
                    "Field": r.get("column_name"),
                    "Type": col_type,
                    "Null": "YES" if str(r.get("is_nullable") or "").upper() == "YES" else "NO",
                    "Default": r.get("column_default"),
                    "Extra": "",
                }
            )
        return out
    except Exception:
        return None


# Chargement du schéma au démarrage
STRUCTURE = load_structure()
# Map slug URL -> (table_name, meta) — uniquement les tables qui existent en base
TABLE_BY_SLUG = {}
for table_name, meta in STRUCTURE.items():
    slug = table_slug(table_name)
    TABLE_BY_SLUG[slug] = (table_name, meta)

# Ne garder que les tables présentes dans la base actuelle (alignement BD / API / frontend)
_existing = get_existing_table_names()
if _existing is not None:
    _to_drop = [s for s, (t, _) in TABLE_BY_SLUG.items() if t.lower() not in _existing]
    for s in _to_drop:
        del TABLE_BY_SLUG[s]
    if _to_drop:
        import logging
        logging.getLogger(__name__).info(
            "API: %d table(s) exclues (absentes de la base): %s", len(_to_drop), sorted(_to_drop)[:10]
        )

# Synchroniser les colonnes avec l'état réel de la base (ex: ALTER TABLE ... ADD COLUMN geom)
for _slug, (_table_name, _meta) in list(TABLE_BY_SLUG.items()):
    _db_columns = get_table_columns_from_db(_table_name)
    if _db_columns:
        _meta["columns"] = _db_columns

# Valeurs par défaut pour le pré-remplissage des formulaires par couche (module IA)
FORM_DEFAULTS_PATH = os.path.join(_script_dir, "form_defaults.json")
FORM_DEFAULTS_RAW: dict = {}
if os.path.isfile(FORM_DEFAULTS_PATH):
    with open(FORM_DEFAULTS_PATH, "r", encoding="utf-8") as f:
        FORM_DEFAULTS_RAW = json.load(f)


def _esri_geometry_to_wkt(geom: dict) -> str | None:
    """Convertit une géométrie Esri (JSON) en WKT. Point (x,y), paths, rings."""
    if not geom or not isinstance(geom, dict):
        return None
    if "x" in geom and "y" in geom:
        return f"POINT ({geom['x']} {geom['y']})"
    if "paths" in geom and geom["paths"]:
        paths = geom["paths"]
        def to_line(ring):
            return ", ".join(f"{p[0]} {p[1]}" for p in ring if len(p) >= 2)
        if len(paths) == 1:
            return "LINESTRING (" + to_line(paths[0]) + ")"
        return "MULTILINESTRING (" + ", ".join("(" + to_line(p) + ")" for p in paths) + ")"
    if "rings" in geom and geom["rings"]:
        rings = geom["rings"]
        def to_ring(ring):
            return ", ".join(f"{p[0]} {p[1]}" for p in ring if len(p) >= 2)
        if len(rings) == 1:
            return "POLYGON ((" + to_ring(rings[0]) + "))"
        return "MULTIPOLYGON (" + ", ".join("((" + to_ring(r) + "))" for r in rings) + ")"
    return None


def get_form_defaults_for_slug(slug: str) -> dict:
    """
    Retourne les valeurs par défaut pour un slug de couche.
    Fusionne les entrées pattern (clé se terminant par *) puis l'entrée exacte.
    """
    slug_lower = slug.lower().strip()
    out = {}
    # 1) Patterns (clé se terminant par *)
    for key, values in FORM_DEFAULTS_RAW.items():
        if not key.endswith("*") or not isinstance(values, dict):
            continue
        pattern = key[:-1].lower()
        if pattern in slug_lower:
            out.update(values)
    # 2) Entrée exacte
    if slug_lower in FORM_DEFAULTS_RAW and isinstance(FORM_DEFAULTS_RAW[slug_lower], dict):
        out.update(FORM_DEFAULTS_RAW[slug_lower])
    return out


# Alias slugs dashboard frontend (noms ArcGIS/Utility Network) -> slug API (table réelle)
# Permet au tableau de bord d'obtenir les comptes sans modifier le frontend.
SLUG_ALIASES: dict[str, str] = {
    "structurejunction-electricmediumvoltagepole-poteau-hta": "poteau-hta",
    "structurejunction-electriclowvoltagepole-poteau-bt": "poteau-bt",
    "electricdevice-lowvoltagecontrolunit-tur": "tur",
    "electricdevice-lowvoltagenetworkprotection-disjoncteur": "tur",
    "electricjunction-lowvoltageconnection-point-noeud-bt": "point-connecte",
    "electricdevice-ground-terre": "point-raccordement",
    "electricdevice-mediumvoltageswitch-cellule-ocr": "ocr",
    "electricdevice-mediumvoltagetransformer-transfo-ht-bt": "transfo-ht-bt",
    "electricdevice-highvoltagetransformer-transfo-ps": "transformateur-ps",
    "electricdevice-mediumvoltagearrester-parafoudre": "parafoudre",
    "electricline-lowvoltageundergroundconductor-ligne-bt-souterrain": "ligne-bt",
    "electricline-lowvoltageoverheadconductor-ligne-bt-aerien": "ligne-bt",
    "electricjunction-lowvoltagelineend-findeligne": "point-non-connecte",
    "electricline-mediumvoltageundergroundconductor-ligne-hta-souter": "ligne-hta",
    "electricline-mediumvoltageoverheadconductor-ligne-hta-aerien": "ligne-hta",
    "structureboundary-electricsubstationboundary-limite-poste-sourc": "poste-source",
    "structueboundary-electricdistributionstationboundary-limite-po": "poste-cabine",
    "structurejunction-electricjunctionbox-coffret": "coffret",
    "subscriberform-abonne": "abonne",
    "meters-compteur": "compteur",
    "distributionpanel-branchement": "branchement",
    "electricline-lowvoltageservice-ligne-branchement-bt": "ligne-brcht",
}


def _resolve_slug(slug: str) -> str:
    """Retourne le slug réel (table API) pour un slug éventuellement alias (dashboard)."""
    if slug in TABLE_BY_SLUG:
        return slug
    return SLUG_ALIASES.get(slug, slug)


def get_table_meta(slug: str) -> tuple[str, dict]:
    """Retourne (table_name, meta) pour un slug (ou alias dashboard). Sinon 404."""
    resolved = _resolve_slug(slug)
    if resolved not in TABLE_BY_SLUG:
        raise HTTPException(status_code=404, detail=f"Table inconnue: {slug}")
    return TABLE_BY_SLUG[resolved]


def get_all_columns(meta: dict) -> list[str]:
    """Toutes les colonnes de la table."""
    return [c["Field"] for c in meta["columns"]]


def get_geometry_columns(meta: dict) -> list[str]:
    """Colonnes de type géométrie (PostGIS)."""
    return [
        c["Field"]
        for c in meta["columns"]
        if c.get("Type", "").upper() == "USER-DEFINED"
    ]


def get_primary_key(meta: dict) -> str:
    """Clé primaire (première PK ou 'id')."""
    pks = meta.get("primary_keys") or []
    if pks:
        return pks[0]
    cols = [c["Field"] for c in meta["columns"]]
    return "id" if "id" in cols else cols[0]


def get_alternate_key_columns(meta: dict, pk: str) -> list[str]:
    """Colonnes à essayer en secours pour retrouver une ligne (ex: id si la PK est gid, ou objectid)."""
    all_cols = get_all_columns(meta)
    # Ordre préféré pour la compatibilité frontend (qui envoie souvent id ou objectid)
    fallback = ["objectid", "assetid", "id", "gid"]
    return [c for c in fallback if c in all_cols and c != pk]


# SRID cible pour l'API : WGS84 (lon/lat) pour affichage carte web.
OUTPUT_SRID = 4326
# SRID par défaut si la géométrie n'a pas de SRID (0) : UTM zone 30N
DEFAULT_INPUT_SRID = 32630


def build_select_list(meta: dict, include_image_fields: bool = True) -> str:
    """Liste SQL SELECT avec géométries en WKT (WGS84).

    Par défaut, toutes les colonnes sont renvoyées. Pour les listes volumineuses,
    `include_image_fields=False` permet d'exclure les champs image/base64 afin
    d'éviter des payloads très lourds côté frontend.
    """
    geom_cols = get_geometry_columns(meta)
    parts = []
    for c in meta["columns"]:
        f = c["Field"]
        if not include_image_fields and re.match(r"^image($|_)", str(f), flags=re.IGNORECASE):
            continue
        q = quote_ident(f)
        if f in geom_cols:
            # WGS84 pour la carte (points, lignes, polygones). Si SRID=0, on suppose 32630 (UTM 30N).
            parts.append(
                f"ST_AsText(CASE WHEN {q} IS NULL THEN NULL "
                f"WHEN ST_SRID({q}) = 0 THEN ST_Transform(ST_SetSRID({q}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID}) "
                f"ELSE ST_Transform({q}, {OUTPUT_SRID}) END) AS {q}"
            )
        else:
            parts.append(q)
    return ", ".join(parts)


@app.get("/")
def root():
    """
    Liste des tables exposées par l'API.
    Chaque table a sa propre API sous /gis/{slug} :
    - GET /gis/{slug} (liste paginée)
    - GET /gis/{slug}/count
    - GET /gis/{slug}/meta
    - GET /gis/{slug}/{id}
    - POST /gis/{slug}
    - DELETE /gis/{slug}/{id}
    Uniquement les tables définies dans script_bd/database_structure.json sont exposées.
    """
    return {
        "tables": [
            {"slug": slug, "table": TABLE_BY_SLUG[slug][0], "api_base": f"/gis/{slug}"}
            for slug in sorted(TABLE_BY_SLUG.keys())
        ],
        "source": "script_bd/database_structure.json",
    }


@app.get("/gis/{table_slug}/count")
def count_rows(table_slug: str = Path(..., description="Slug de la table")):
    """Retourne le nombre total d'enregistrements dans la table."""
    table_name, meta = get_table_meta(table_slug)
    quoted_table = quote_ident(table_name)
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(f"SELECT COUNT(*) AS count FROM {quoted_table}")
            row = cur.fetchone()
    return {"count": row["count"] if row else 0}


def get_geometry_type_from_db(table_name: str, meta: dict) -> str | None:
    """Détecte le type de géométrie (Point, LineString, Polygon, etc.) via PostGIS."""
    geom_cols = get_geometry_columns(meta)
    if not geom_cols:
        return None
    qtable = quote_ident(table_name)
    qgeom = quote_ident(geom_cols[0])
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                f"SELECT ST_GeometryType({qgeom}) AS gtype FROM {qtable} WHERE {qgeom} IS NOT NULL LIMIT 1"
            )
            row = cur.fetchone()
    if not row or not row.get("gtype"):
        return None
    # 'ST_Point' -> 'Point', 'ST_LineString' -> 'LineString', etc.
    gtype = str(row["gtype"]).strip()
    if gtype.upper().startswith("ST_"):
        return gtype[3:]
    return gtype


def get_geometry_srid_from_db(table_name: str, geom_col: str) -> int | None:
    """Retourne le SRID déclaré d'une colonne géométrique (None si indisponible)."""
    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                cur.execute("SELECT Find_SRID('public', %s, %s) AS srid", (table_name, geom_col))
                row = cur.fetchone()
                srid = int(row["srid"]) if row and row.get("srid") is not None else None
                return srid if srid and srid > 0 else None
    except Exception:
        return None


@app.get("/gis/{table_slug}/meta")
def table_meta(
    table_slug: str = Path(..., description="Slug de la table (ex: distributionpanel-branchement)"),
):
    """Métadonnées de la table : slug, nom de table, type de géométrie (détecté automatiquement)."""
    table_name, meta = get_table_meta(table_slug)
    geometry_type = get_geometry_type_from_db(table_name, meta)
    return {
        "slug": table_slug,
        "table": table_name,
        "geometry_type": geometry_type,
    }


@app.get("/gis/{table_slug}/form-defaults")
def form_defaults(
    table_slug: str = Path(..., description="Slug de la table (ex: distributionpanel-branchement)"),
):
    """
    Valeurs par défaut pour le pré-remplissage du formulaire de création d'ouvrage
    (module IA). Retourne un objet { champ: valeur } selon la couche.
    Utilisable par l'app web, Field Maps (sync) ou toute application de collecte.
    """
    get_table_meta(table_slug)  # 404 si table inconnue
    defaults = get_form_defaults_for_slug(table_slug)
    return {"defaults": defaults}


@app.get("/gis/form-defaults/export")
def form_defaults_export():
    """
    Export de toutes les valeurs par défaut par couche (slug).
    Utilisé par le module Field Maps pour configurer les formulaires de collecte
    ou pour la synchro ArcGIS → API (application des défauts côté serveur).
    """
    result = []
    for slug in sorted(TABLE_BY_SLUG.keys()):
        table_name, _ = TABLE_BY_SLUG[slug]
        defaults = get_form_defaults_for_slug(slug)
        if defaults:
            result.append({"slug": slug, "table": table_name, "defaults": defaults})
    return {"layers": result, "source": "form_defaults.json"}


def _trace_ref_slug_for_type(trace_type: str) -> str | None:
    """Retourne le slug de la table correspondant au type de point de départ du tracé."""
    trace_type = (trace_type or "").strip().lower()
    # Ordre préféré aligné au frontend:
    # - poste_source -> poste-source
    # - poste_transformation -> poste-cabine / transfo-poteau (fallback transfo-ht-bt)
    # - abonne -> point-raccordement (fallback abonne / branchement)
    if trace_type == "poste_source":
        for slug in ("poste-source", "limite-poste", "poste-sourc"):
            if slug in TABLE_BY_SLUG:
                return slug
        for slug in TABLE_BY_SLUG:
            if "poste" in slug.lower() and "sourc" in slug.lower():
                return slug
    if trace_type == "poste_transformation":
        for slug in ("poste-cabine", "transfo-poteau", "transfo-ht-bt", "transfo-ht_bt"):
            if slug in TABLE_BY_SLUG:
                return slug
        for slug in TABLE_BY_SLUG:
            s = slug.lower()
            if ("poste" in s and "cabine" in s) or ("transfo" in s and "poteau" in s) or ("transfo" in s and "ht" in s and "bt" in s):
                return slug
    if trace_type == "abonne":
        for slug in ("point-raccordement", "abonne", "branchement", "distributionpanel-branchement"):
            if slug in TABLE_BY_SLUG:
                return slug
        for slug in TABLE_BY_SLUG:
            s = slug.lower()
            if ("point" in s and "raccord" in s) or "abonne" in s or "branchement" in s:
                return slug
    return None


def _get_ref_point_wkt(trace_type: str, ref_id: str) -> str | None:
    """Récupère la géométrie (WKT WGS84) du point de référence pour le tracé. Retourne None si non trouvé."""
    if not ref_id or not ref_id.strip():
        return None
    slug = _trace_ref_slug_for_type(trace_type)
    if not slug:
        return None
    try:
        table_name, meta = get_table_meta(slug)
    except HTTPException:
        return None
    geom_cols = get_geometry_columns(meta)
    if not geom_cols:
        return None
    pk = get_primary_key(meta)
    quoted_table = quote_ident(table_name)
    qgeom = quote_ident(geom_cols[0])
    select_geom = (
        f"ST_AsText(CASE WHEN ST_SRID({qgeom}) = 0 THEN ST_Transform(ST_SetSRID({qgeom}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID}) "
        f"ELSE ST_Transform({qgeom}, {OUTPUT_SRID}) END)"
    )
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(f"SELECT {select_geom} AS wkt FROM {quoted_table} WHERE {quote_ident(pk)} = %s", (ref_id.strip(),))
            row = cur.fetchone()
            if row and row.get("wkt"):
                return str(row["wkt"])
            for alt in get_alternate_key_columns(meta, pk):
                cur.execute(f"SELECT {select_geom} AS wkt FROM {quoted_table} WHERE {quote_ident(alt)} = %s", (ref_id.strip(),))
                row = cur.fetchone()
                if row and row.get("wkt"):
                    return str(row["wkt"])
    return None


# Configuration des tables de lignes pour le tracé (graphe par gid de nœuds)
# Les lignes relient des nœuds : depart (HTA), depart_bt, poteau_bt, poteau_hta, etc.
_TRACE_EDGE_TABLES = [
    ("ligne_bt", "ligne-bt", ["id_depart_bt", "id_poteau_bt"]),
    ("ligne_hta", "ligne-hta", ["id_depart_hta", "id_poteau_hta"]),
    ("ligne_brcht", "ligne-brcht", ["id_depart_bt", "id_poteau_bt", "id_poteau_hta"]),
]


def _canon_id(value) -> str:
    """Normalise un identifiant pour comparaison robuste (uuid avec/sans accolades, casse)."""
    if value is None:
        return ""
    return str(value).strip().replace("{", "").replace("}", "").lower()


def _canon_sql_expr(col_name: str) -> str:
    """Expression SQL de normalisation texte alignée avec _canon_id."""
    q = quote_ident(col_name)
    return f"REPLACE(REPLACE(LOWER(CAST({q} AS TEXT)), '{{', ''), '}}', '')"


def _trace_resolve_poste_source_gid(cur, ref_id: str) -> str | None:
    """
    Résout ref_id en gid du poste source (table poste_source).
    Le frontend peut envoyer le gid ou un autre identifiant (numero_poste, name, etc.).
    Retourne le gid (pk) de l'enregistrement trouvé, ou None si non trouvé.
    """
    if not ref_id or not str(ref_id).strip():
        return None
    slug = _trace_ref_slug_for_type("poste_source")
    if not slug:
        return None
    try:
        table_name, meta = get_table_meta(slug)
    except HTTPException:
        return None
    pk = get_primary_key(meta)
    quoted_table = quote_ident(table_name)
    ref_canon = _canon_id(ref_id)
    all_cols = get_all_columns(meta)
    # Essayer par clé primaire (ex. gid)
    try:
        cur.execute(
            f"SELECT {quote_ident(pk)} AS resolved FROM {quoted_table} WHERE {_canon_sql_expr(pk)} = %s LIMIT 1",
            (ref_canon,),
        )
        row = cur.fetchone()
        if row and row.get("resolved") is not None:
            return str(row["resolved"]).strip()
    except Exception:
        pass
    # Essayer par colonnes alternatives (numero_poste, name, objectid, etc.)
    alt_candidates = get_alternate_key_columns(meta, pk) + [
        c for c in ("numero_poste", "name", "numero", "assetid") if c in all_cols
    ]
    for alt in alt_candidates:
        try:
            cur.execute(
                f"SELECT {quote_ident(pk)} AS resolved FROM {quoted_table} WHERE {_canon_sql_expr(alt)} = %s LIMIT 1",
                (ref_canon,),
            )
            row = cur.fetchone()
            if row and row.get("resolved") is not None:
                return str(row["resolved"]).strip()
        except Exception:
            continue
    return None


def _trace_resolve_start_nodes(cur, trace_type: str, ref_id: str) -> set[str]:
    """
    Résout le point de départ (poste source, transfo, abonné) en nœuds du graphe.
    Les tables de lignes référencent depart.gid, depart_bt.gid, poteau_bt.gid, poteau_hta.gid,
    pas directement poste_source.gid. On retourne tous les gids à utiliser comme frontière initiale.
    """
    start = {ref_id}
    ref_canon = _canon_id(ref_id)
    trace_type = (trace_type or "").strip().lower()
    try:
        if trace_type == "poste_source":
            # Résoudre ref_id en gid du poste source (au cas où le frontend envoie numero_poste ou autre)
            poste_source_gid = _trace_resolve_poste_source_gid(cur, ref_id)
            ref_for_depart = _canon_id(poste_source_gid) if poste_source_gid else ref_canon
            # HTA : ligne_hta.id_depart_hta = depart.gid, et depart.id_poste_source = poste_source.gid
            cur.execute(
                "SELECT gid FROM depart "
                "WHERE REPLACE(REPLACE(LOWER(CAST(id_poste_source AS TEXT)), '{', ''), '}', '') = %s "
                "AND gid IS NOT NULL",
                (ref_for_depart,),
            )
            for row in cur.fetchall() or []:
                if row.get("gid"):
                    start.add(str(row["gid"]).strip())
        elif trace_type == "poste_transformation":
            # Le point de départ peut être poste_cabine/transfo_poteau ; on essaie de retrouver
            # les nœuds BT associés (depart_bt) pour entrer dans le graphe des lignes.
            dep_bt_meta = TABLE_BY_SLUG.get("depart-bt", (None, {}))[1] or {}
            candidate_cols = [
                "id_poste_cabine",
                "id_poste_sur_poteau",
                "id_transfo_ht_bt",
                "id_transfo_poteau",
            ]
            existing_cols = [c for c in candidate_cols if _table_has_column(dep_bt_meta, c)]
            for col in existing_cols:
                cur.execute(
                    f"SELECT gid FROM depart_bt WHERE {_canon_sql_expr(col)} = %s AND gid IS NOT NULL",
                    (ref_canon,),
                )
                for row in cur.fetchall() or []:
                    if row.get("gid"):
                        start.add(str(row["gid"]).strip())
        elif trace_type == "abonne":
            # Point de raccordement : s'il porte un id_ligne_brcht, on prend ses nœuds
            # de ligne branchement comme points de départ (amont/aval directionnel ensuite).
            try:
                cur.execute(
                    "SELECT id_ligne_brcht FROM point_raccordement "
                    "WHERE REPLACE(REPLACE(LOWER(CAST(gid AS TEXT)), '{', ''), '}', '') = %s",
                    (ref_canon,),
                )
                row = cur.fetchone()
                line_id = str(row.get("id_ligne_brcht")).strip() if row and row.get("id_ligne_brcht") else ""
                if line_id:
                    cur.execute(
                        "SELECT id_depart_bt, id_poteau_bt, id_poteau_hta FROM ligne_brcht WHERE gid = %s",
                        (line_id,),
                    )
                    line = cur.fetchone()
                    if line:
                        for k in ("id_depart_bt", "id_poteau_bt", "id_poteau_hta"):
                            v = line.get(k)
                            if v is not None and str(v).strip():
                                start.add(str(v).strip())
            except Exception:
                # fallback: garder ref_id seulement
                pass
        elif trace_type == "ouvrage":
            # Départ libre depuis un ouvrage cliqué (point ou ligne).
            # 1) Si ref_id est une ligne, injecter ses nœuds (id_depart_*, id_poteau_*).
            for table_name, _slug, node_cols in _TRACE_EDGE_TABLES:
                try:
                    cur.execute(
                        f"SELECT {', '.join(quote_ident(c) for c in node_cols)} "
                        f"FROM {quote_ident(table_name)} "
                        f"WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                        (ref_canon,),
                    )
                    row = cur.fetchone()
                    if row:
                        for c in node_cols:
                            v = row.get(c)
                            if v is not None and str(v).strip():
                                start.add(str(v).strip())
                except Exception:
                    continue
            # 2) Si ref_id pointe un poste source, récupérer ses départs HTA.
            try:
                cur.execute(
                    "SELECT gid FROM depart "
                    "WHERE REPLACE(REPLACE(LOWER(CAST(id_poste_source AS TEXT)), '{', ''), '}', '') = %s "
                    "AND gid IS NOT NULL",
                    (ref_canon,),
                )
                for row in cur.fetchall() or []:
                    if row.get("gid"):
                        start.add(str(row["gid"]).strip())
            except Exception:
                pass
            # 3) Si ref_id pointe un poste transfo, récupérer ses départs BT.
            dep_bt_meta = TABLE_BY_SLUG.get("depart-bt", (None, {}))[1] or {}
            for col in ["id_poste_cabine", "id_poste_sur_poteau", "id_transfo_ht_bt", "id_transfo_poteau"]:
                if not _table_has_column(dep_bt_meta, col):
                    continue
                try:
                    cur.execute(
                        f"SELECT gid FROM depart_bt WHERE {_canon_sql_expr(col)} = %s AND gid IS NOT NULL",
                        (ref_canon,),
                    )
                    for row in cur.fetchall() or []:
                        if row.get("gid"):
                            start.add(str(row["gid"]).strip())
                except Exception:
                    continue
            # 4) Si ref_id pointe un point de raccordement, suivre sa ligne branchement.
            try:
                cur.execute(
                    "SELECT id_ligne_brcht FROM point_raccordement "
                    "WHERE REPLACE(REPLACE(LOWER(CAST(gid AS TEXT)), '{', ''), '}', '') = %s",
                    (ref_canon,),
                )
                row = cur.fetchone()
                line_id = str(row.get("id_ligne_brcht")).strip() if row and row.get("id_ligne_brcht") else ""
                if line_id:
                    cur.execute(
                        "SELECT id_depart_bt, id_poteau_bt, id_poteau_hta FROM ligne_brcht "
                        f"WHERE {_canon_sql_expr('gid')} = %s",
                        (_canon_id(line_id),),
                    )
                    line = cur.fetchone()
                    if line:
                        for k in ("id_depart_bt", "id_poteau_bt", "id_poteau_hta"):
                            v = line.get(k)
                            if v is not None and str(v).strip():
                                start.add(str(v).strip())
            except Exception:
                pass
    except Exception as e:
        _log.debug("Résolution nœuds de départ: %s", e)
    return start


def _trace_has_hta_depart_nodes(cur, node_ids: set[str]) -> bool:
    """True si au moins un des node_ids correspond à un depart HTA (gid dans la table depart)."""
    if not node_ids:
        return False
    canon = sorted({_canon_id(n) for n in node_ids if _canon_id(n)})
    if not canon:
        return False
    try:
        placeholders = ", ".join(["%s"] * len(canon))
        cur.execute(
            f"SELECT 1 FROM depart WHERE {_canon_sql_expr('gid')} IN ({placeholders}) LIMIT 1",
            tuple(canon),
        )
        return cur.fetchone() is not None
    except Exception:
        return False


def _trace_ref_is_point_raccordement_or_abonne(cur, ref_id: str) -> bool:
    """
    True si ref_id est le gid d'un point de raccordement ou d'un abonné.
    Depuis un tel point, on souhaite souvent n'afficher que la ligne et les poteaux qui l'alimentent (amont),
    pas tout le réseau connecté.
    """
    if not ref_id or not str(ref_id).strip():
        return False
    ref_canon = _canon_id(ref_id)
    try:
        cur.execute(
            "SELECT 1 FROM point_raccordement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
            (ref_canon,),
        )
        if cur.fetchone():
            return True
    except Exception:
        pass
    try:
        cur.execute(
            "SELECT 1 FROM abonne WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
            (ref_canon,),
        )
        if cur.fetchone():
            return True
    except Exception:
        pass
    try:
        cur.execute(
            "SELECT 1 FROM branchement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
            (ref_canon,),
        )
        if cur.fetchone():
            return True
    except Exception:
        pass
    return False


def _trace_get_ligne_brcht_only_for_raccord(cur, ref_id: str) -> tuple[str | None, str | None]:
    """
    Depuis un point de raccordement (ou abonné / branchement), retourne uniquement
    la ligne de branchement liée à ce point : (gid_ligne_brcht, gid_point_raccordement).
    Retourne (None, None) si ref_id n'est pas un point de raccordement/abonné/branchement
    ou si la ligne de branchement est introuvable.
    """
    ref_canon = _canon_id(ref_id)
    if not ref_canon:
        return None, None
    pt_racc_gid: str | None = None
    ligne_brcht_gid: str | None = None
    try:
        # 1) ref_id = point_raccordement
        cur.execute(
            "SELECT gid, id_ligne_brcht FROM point_raccordement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
            (ref_canon,),
        )
        row = cur.fetchone()
        if row and row.get("id_ligne_brcht") is not None:
            pt_racc_gid = str(row["gid"]).strip() if row.get("gid") else None
            ligne_brcht_gid = str(row["id_ligne_brcht"]).strip()
            return ligne_brcht_gid, pt_racc_gid
    except Exception:
        pass
    try:
        # 2) ref_id = branchement -> id_point_raccordement
        cur.execute(
            "SELECT id_point_raccordement FROM branchement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
            (ref_canon,),
        )
        row = cur.fetchone()
        if row and row.get("id_point_raccordement") is not None:
            pt_id = str(row["id_point_raccordement"]).strip()
            cur.execute(
                "SELECT gid, id_ligne_brcht FROM point_raccordement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
                (_canon_id(pt_id),),
            )
            r2 = cur.fetchone()
            if r2 and r2.get("id_ligne_brcht") is not None:
                pt_racc_gid = str(r2["gid"]).strip() if r2.get("gid") else None
                ligne_brcht_gid = str(r2["id_ligne_brcht"]).strip()
                return ligne_brcht_gid, pt_racc_gid
    except Exception:
        pass
    try:
        # 3) ref_id = abonne -> branchement.id_abonne -> id_point_raccordement
        dep_bt_meta = TABLE_BY_SLUG.get("branchement", (None, {}))[1] or {}
        id_abonne_col = "id_abonne" if _table_has_column(dep_bt_meta, "id_abonne") else None
        if not id_abonne_col:
            # table branchement peut avoir un autre nom de colonne
            for c in ["id_abonne", "abonne_id", "gid_abonne"]:
                if _table_has_column(TABLE_BY_SLUG.get("distributionpanel-branchement", (None, {}))[1] or {}, c):
                    id_abonne_col = c
                    break
        if id_abonne_col:
            qcol = quote_ident(id_abonne_col)
            qtable = quote_ident("branchement")
            cur.execute(
                f"SELECT id_point_raccordement FROM {qtable} WHERE {_canon_sql_expr(id_abonne_col)} = %s LIMIT 1",
                (ref_canon,),
            )
            row = cur.fetchone()
            if row and row.get("id_point_raccordement") is not None:
                pt_id = str(row["id_point_raccordement"]).strip()
                cur.execute(
                    "SELECT gid, id_ligne_brcht FROM point_raccordement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
                    (_canon_id(pt_id),),
                )
                r2 = cur.fetchone()
                if r2 and r2.get("id_ligne_brcht") is not None:
                    pt_racc_gid = str(r2["gid"]).strip() if r2.get("gid") else None
                    ligne_brcht_gid = str(r2["id_ligne_brcht"]).strip()
                    return ligne_brcht_gid, pt_racc_gid
    except Exception:
        pass
    # Fallback: abonne via branchement sans colonne id_abonne (chercher branchement par gid abonne = ref_id)
    try:
        cur.execute(
            "SELECT id_point_raccordement FROM branchement WHERE " + _canon_sql_expr("id_abonne") + " = %s LIMIT 1",
            (ref_canon,),
        )
        row = cur.fetchone()
        if row and row.get("id_point_raccordement") is not None:
            pt_id = str(row["id_point_raccordement"]).strip()
            cur.execute(
                "SELECT gid, id_ligne_brcht FROM point_raccordement WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
                (_canon_id(pt_id),),
            )
            r2 = cur.fetchone()
            if r2 and r2.get("id_ligne_brcht") is not None:
                pt_racc_gid = str(r2["gid"]).strip() if r2.get("gid") else None
                ligne_brcht_gid = str(r2["id_ligne_brcht"]).strip()
                return ligne_brcht_gid, pt_racc_gid
    except Exception:
        pass
    return None, None


def _trace_bfs_from_node(
    cur, start_ids: set[str], direction: str = "aval", restrict_to_bt: bool = False, restrict_to_hta: bool = False
) -> tuple[list[tuple[str, str]], set[str]]:
    """
    BFS directionnel à partir des nœuds start_ids sur ligne_bt, ligne_hta, ligne_brcht.
    Retourne ([(slug, gid), ...], {node_ids_visités}).
    - aval : suit upstream -> downstream (id_depart_* vers id_poteau_*)
    - amont : suit downstream -> upstream
    - tous : composante connectée complète (amont + aval). Chaque nœud (dont les poteaux)
      est traité comme un carrefour : toutes les lignes touchant ce nœud sont suivies,
      ce qui permet d’afficher toutes les ramifications.
    - restrict_to_bt : si True, ne pas traverser le réseau HTA (ligne_hta) ni suivre id_poteau_hta
      dans ligne_brcht, pour que une coupure BT ne remonte pas vers le HTA.
    - restrict_to_hta : si True, ne traverser que le réseau HTA (ligne_hta uniquement).
    """
    start_ids = {_canon_id(s) for s in start_ids if s and str(s).strip()}
    if not start_ids:
        return [], set()
    direction = (direction or "aval").strip().lower()
    if direction not in {"amont", "aval", "tous"}:
        direction = "aval"
    visited = set(start_ids)
    frontier = set(start_ids)
    result: list[tuple[str, str]] = []
    seen_gids: set[tuple[str, str]] = set()

    while frontier:
        next_frontier: set[str] = set()
        frontier_list = list(frontier)
        tables = [(t, s, c) for t, s, c in _TRACE_EDGE_TABLES if s == "ligne-hta"] if restrict_to_hta else _TRACE_EDGE_TABLES
        for table_name, slug, node_cols in tables:
            if restrict_to_bt and slug == "ligne-hta":
                continue
            # En restrict_to_bt, ne pas suivre id_poteau_hta de ligne_brcht (reste côté BT uniquement)
            brcht_bt_only = restrict_to_bt and slug == "ligne-brcht"
            cols_for_frontier = ["id_depart_bt", "id_poteau_bt"] if brcht_bt_only else node_cols
            upstream_col = node_cols[0]
            downstream_cols = node_cols[1:] if len(node_cols) > 1 else node_cols
            placeholders = ", ".join(["%s"] * len(frontier_list))
            if direction == "aval":
                conditions = f"{_canon_sql_expr(upstream_col)} IN ({placeholders})"
                params = frontier_list
            elif direction == "tous":
                conditions = " OR ".join(f"{_canon_sql_expr(c)} IN ({placeholders})" for c in node_cols)
                params = frontier_list * len(node_cols)
            else:
                conditions = " OR ".join(f"{_canon_sql_expr(c)} IN ({placeholders})" for c in downstream_cols)
                params = frontier_list * len(downstream_cols)
            try:
                cur.execute(
                    f'SELECT gid, {", ".join(quote_ident(c) for c in node_cols)} FROM {quote_ident(table_name)} WHERE {conditions}',
                    params,
                )
            except Exception:
                continue
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is None:
                    continue
                gid_str = str(gid_val)
                key = (slug, gid_str)
                if key not in seen_gids:
                    seen_gids.add(key)
                    result.append((slug, gid_str))
                if direction == "aval":
                    candidates = [row.get(c) for c in (["id_poteau_bt"] if brcht_bt_only else downstream_cols)]
                elif direction == "tous":
                    candidates = [row.get(c) for c in cols_for_frontier]
                else:
                    candidates = [row.get(upstream_col)]
                for v in candidates:
                    if v is not None:
                        v_str = _canon_id(v)
                        if v_str and v_str not in visited:
                            next_frontier.add(v_str)
        next_frontier -= visited
        visited |= next_frontier
        frontier = next_frontier

    return result, visited


def _trace_hta_entry_from_poste_cabine(cur, ref_id: str) -> tuple[set[str], str | None]:
    """
    Utilise poste_cabine.id_ligne_hta pour obtenir directement les nœuds HTA (id_depart_hta, id_poteau_hta)
    de la ligne HTA qui alimente le poste cabine. Facilite le tracé amont vers le poste source.
    Retourne (set des nœuds HTA, gid de la ligne_hta à inclure) ou (set(), None) si non trouvé.
    """
    ref_canon = _canon_id(ref_id)
    if not ref_canon:
        return set(), None
    entry: set[str] = set()
    ligne_hta_gid: str | None = None

    def fetch_from_table(qtable: str, table_label: str) -> bool:
        nonlocal entry, ligne_hta_gid
        try:
            cur.execute(
                f"SELECT id_ligne_hta FROM {qtable} WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                (ref_canon,),
            )
            row = cur.fetchone()
            if not row or row.get("id_ligne_hta") is None:
                return False
            line_id = _canon_id(str(row["id_ligne_hta"]))
            if not line_id:
                return False
            cur.execute(
                "SELECT gid, id_depart_hta, id_poteau_hta FROM ligne_hta WHERE " + _canon_sql_expr("gid") + " = %s LIMIT 1",
                (line_id,),
            )
            line_row = cur.fetchone()
            if not line_row:
                return False
            ligne_hta_gid = str(line_row.get("gid", "")).strip() if line_row.get("gid") is not None else None
            for c in ("id_depart_hta", "id_poteau_hta"):
                v = line_row.get(c)
                if v is not None and str(v).strip():
                    entry.add(_canon_id(v))
            return True
        except Exception:
            return False

    # 1) Requête directe sur poste_cabine (schéma standard)
    try:
        qtable = quote_ident("poste_cabine")
        if fetch_from_table(qtable, "poste_cabine"):
            return entry, ligne_hta_gid
    except Exception:
        pass

    # 2) Chercher la table poste cabine via TABLE_BY_SLUG (slug ou alias poste-cabine)
    for slug in sorted(TABLE_BY_SLUG.keys()):
        if "poste-cabine" not in slug and _resolve_slug(slug) != "poste-cabine":
            continue
        table_name, _meta = TABLE_BY_SLUG[slug]
        try:
            qtable = quote_ident(table_name)
            if fetch_from_table(qtable, slug):
                return entry, ligne_hta_gid
        except Exception:
            continue

    return set(), None


def _trace_hta_entry_from_start(cur, start_nodes: set[str]) -> set[str]:
    """
    À partir de nœuds de départ (ex. depart_bt pour poste cabine), retourne les nœuds HTA
    (id_poteau_hta, id_depart_hta) permettant de traverser uniquement le réseau HTA en amont.
    - Depuis ligne_brcht : id_poteau_hta où id_depart_bt ou id_poteau_bt dans start_nodes.
    - Depuis ligne_hta : id_poteau_hta où id_depart_hta dans start_nodes (départ déjà côté HTA).
    """
    if not start_nodes:
        return set()
    canon = sorted({_canon_id(n) for n in start_nodes if _canon_id(n)})
    if not canon:
        return set()
    entry: set[str] = set()
    placeholders = ", ".join(["%s"] * len(canon))
    try:
        cur.execute(
            "SELECT id_poteau_hta FROM ligne_brcht "
            f"WHERE {_canon_sql_expr('id_depart_bt')} IN ({placeholders}) OR {_canon_sql_expr('id_poteau_bt')} IN ({placeholders})",
            tuple(canon) * 2,
        )
        for row in cur.fetchall() or []:
            v = row.get("id_poteau_hta")
            if v is not None and str(v).strip():
                entry.add(_canon_id(v))
    except Exception:
        pass
    try:
        cur.execute(
            "SELECT id_poteau_hta FROM ligne_hta WHERE " + _canon_sql_expr("id_depart_hta") + f" IN ({placeholders})",
            tuple(canon),
        )
        for row in cur.fetchall() or []:
            v = row.get("id_poteau_hta")
            if v is not None and str(v).strip():
                entry.add(_canon_id(v))
    except Exception:
        pass
    return entry


def _trace_bt_start_from_hta_nodes(cur, visited_nodes: set[str]) -> set[str]:
    """
    À partir de nœuds HTA (ex. poteau_hta) atteints par le tracé, retourne les nœuds BT
    (id_depart_bt, id_poteau_bt) des lignes de branchement connectées à ces poteaux HTA.
    Permet de poursuivre un tracé aval depuis le poste source vers le réseau BT et les points de raccordement.
    """
    if not visited_nodes:
        return set()
    canon = sorted({_canon_id(n) for n in visited_nodes if _canon_id(n)})
    if not canon:
        return set()
    bt_start: set[str] = set()
    try:
        placeholders = ", ".join(["%s"] * len(canon))
        cur.execute(
            "SELECT id_depart_bt, id_poteau_bt FROM ligne_brcht "
            f"WHERE {_canon_sql_expr('id_poteau_hta')} IN ({placeholders})",
            tuple(canon),
        )
        for row in cur.fetchall() or []:
            for c in ("id_depart_bt", "id_poteau_bt"):
                v = row.get(c)
                if v is not None and str(v).strip():
                    bt_start.add(_canon_id(v))
    except Exception:
        pass
    return bt_start


def _trace_directional_links_count(cur) -> int:
    """Nombre total de références de connectivité non nulles dans les tables de lignes."""
    total = 0
    for table_name, _slug, node_cols in _TRACE_EDGE_TABLES:
        for c in node_cols:
            try:
                cur.execute(
                    f"SELECT COUNT(*) AS c FROM {quote_ident(table_name)} "
                    f"WHERE {quote_ident(c)} IS NOT NULL AND CAST({quote_ident(c)} AS TEXT) <> ''"
                )
                row = cur.fetchone() or {}
                total += int(row.get("c") or 0)
            except Exception:
                continue
    return total


def _trace_nearby_lines_fallback(cur, trace_type: str, ref_id: str, radius_m: int = 120) -> list[tuple[str, str]]:
    """
    Fallback non directionnel si la connectivité par identifiants n'est pas disponible:
    retourne les lignes proches du point de référence (poste/transfo/point raccordement).
    """
    wkt = _get_ref_point_wkt(trace_type, ref_id)
    if not wkt:
        return []
    geog_ref = f"SRID=4326;{wkt}"
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for table_name, slug, _node_cols in _TRACE_EDGE_TABLES:
        try:
            qtable = quote_ident(table_name)
            qgeom = quote_ident("geom")
            geog_expr = _geom_to_4326_geography("t." + qgeom)
            cur.execute(
                f"""
                SELECT t.gid
                FROM {qtable} t
                WHERE t.{qgeom} IS NOT NULL
                  AND ST_DWithin({geog_expr}, ST_GeogFromText(%s), %s)
                ORDER BY ST_Distance({geog_expr}, ST_GeogFromText(%s))
                LIMIT 120
                """,
                (geog_ref, radius_m, geog_ref),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is None:
                    continue
                key = (slug, str(gid_val))
                if key not in seen:
                    seen.add(key)
                    pairs.append(key)
        except Exception:
            continue
    return pairs


def _table_has_column(meta: dict, col_name: str) -> bool:
    cols = [c.get("Field") for c in (meta.get("columns") or [])]
    return col_name in cols


def _trace_points_from_node_ids(cur, node_ids: set[str]) -> list[tuple[str, str]]:
    """
    À partir des identifiants de nœuds visités, retrouve les ouvrages ponctuels (tables de points)
    dont gid correspond à ces nœuds.
    """
    canon_nodes = sorted({_canon_id(n) for n in node_ids if _canon_id(n)})
    if not canon_nodes:
        return []
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for slug in sorted(TABLE_BY_SLUG.keys()):
        if not _is_point_table(slug):
            continue
        table_name, meta = TABLE_BY_SLUG[slug]
        if not _table_has_column(meta, "gid"):
            continue
        try:
            qtable = quote_ident(table_name)
            placeholders = ", ".join(["%s"] * len(canon_nodes))
            cur.execute(
                f"SELECT gid FROM {qtable} WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                tuple(canon_nodes),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is None:
                    continue
                key = (slug, str(gid_val))
                if key not in seen:
                    seen.add(key)
                    pairs.append(key)
        except Exception:
            continue
    return pairs


def _trace_points_raccordement_from_lines(cur, line_pairs: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """
    Ajoute les points de raccordement impactés à partir des lignes de branchement tracées.
    Règle métier: un point de raccordement est impacté si sa id_ligne_brcht appartient
    aux lignes de branchement présentes dans le tracé.
    """
    branchement_line_ids = sorted({
        _canon_id(gid)
        for slug, gid in (line_pairs or [])
        if slug == "ligne-brcht" and _canon_id(gid)
    })
    if not branchement_line_ids:
        return []

    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    # Peut varier selon les jeux de données; on cible tous les slugs contenant "point" + "raccord".
    candidate_slugs = [s for s in sorted(TABLE_BY_SLUG.keys()) if ("point" in s and "raccord" in s)]
    if not candidate_slugs:
        return []

    for slug in candidate_slugs:
        table_name, meta = TABLE_BY_SLUG[slug]
        if not (_table_has_column(meta, "gid") and _table_has_column(meta, "id_ligne_brcht")):
            continue
        try:
            qtable = quote_ident(table_name)
            placeholders = ", ".join(["%s"] * len(branchement_line_ids))
            cur.execute(
                f"SELECT gid FROM {qtable} WHERE {_canon_sql_expr('id_ligne_brcht')} IN ({placeholders})",
                tuple(branchement_line_ids),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is None:
                    continue
                key = (slug, str(gid_val))
                if key not in seen:
                    seen.add(key)
                    pairs.append(key)
        except Exception:
            continue
    return pairs


def _trace_postes_transfos_from_node_ids(cur, node_ids: set[str]) -> list[tuple[str, str]]:
    """
    Retrouve les postes/transfos impactés à partir des nœuds visités.
    Les lignes référencent des nœuds de type depart/depart_bt; ces nœuds portent ensuite
    les clés vers poste_source, poste_cabine et transfo_*.
    """
    canon_nodes = sorted({_canon_id(n) for n in node_ids if _canon_id(n)})
    if not canon_nodes:
        return []

    poste_source_ids: set[str] = set()
    poste_cabine_ids: set[str] = set()
    transfo_poteau_ids: set[str] = set()
    transfo_ht_bt_ids: set[str] = set()

    # 1) Depuis les départs HTA visités -> id_poste_source
    try:
        dep_meta = TABLE_BY_SLUG.get("depart", (None, {}))[1] or {}
        if _table_has_column(dep_meta, "gid") and _table_has_column(dep_meta, "id_poste_source"):
            placeholders = ", ".join(["%s"] * len(canon_nodes))
            cur.execute(
                f"SELECT id_poste_source FROM depart WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                tuple(canon_nodes),
            )
            for row in cur.fetchall() or []:
                v = row.get("id_poste_source")
                vv = _canon_id(v)
                if vv:
                    poste_source_ids.add(vv)
    except Exception:
        pass

    # 2) Depuis les départs BT visités -> id_poste_cabine / id_poste_sur_poteau / id_transfo_*
    try:
        dep_bt_meta = TABLE_BY_SLUG.get("depart-bt", (None, {}))[1] or {}
        candidate_cols = [
            "id_poste_cabine",
            "id_poste_sur_poteau",
            "id_transfo_ht_bt",
            "id_transfo_poteau",
        ]
        existing_cols = [c for c in candidate_cols if _table_has_column(dep_bt_meta, c)]
        if _table_has_column(dep_bt_meta, "gid") and existing_cols:
            placeholders = ", ".join(["%s"] * len(canon_nodes))
            cur.execute(
                f"SELECT {', '.join(quote_ident(c) for c in existing_cols)} "
                f"FROM depart_bt WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                tuple(canon_nodes),
            )
            for row in cur.fetchall() or []:
                if "id_poste_cabine" in existing_cols:
                    vv = _canon_id(row.get("id_poste_cabine"))
                    if vv:
                        poste_cabine_ids.add(vv)
                if "id_poste_sur_poteau" in existing_cols:
                    vv = _canon_id(row.get("id_poste_sur_poteau"))
                    if vv:
                        transfo_poteau_ids.add(vv)
                if "id_transfo_poteau" in existing_cols:
                    vv = _canon_id(row.get("id_transfo_poteau"))
                    if vv:
                        transfo_poteau_ids.add(vv)
                if "id_transfo_ht_bt" in existing_cols:
                    vv = _canon_id(row.get("id_transfo_ht_bt"))
                    if vv:
                        transfo_ht_bt_ids.add(vv)
    except Exception:
        pass

    # 3) Depuis les poteaux HTA visités -> postes cabines (poste_cabine.id_poteau_hta)
    # Quand on simule une coupure au poste source, on ne parcourt que les lignes HTA ;
    # les postes cabines sont alimentés via un poteau HTA, donc il faut les inclure via ce lien.
    try:
        for slug in sorted(TABLE_BY_SLUG.keys()):
            if "poste-cabine" not in slug:
                continue
            table_name, meta = TABLE_BY_SLUG[slug]
            if not _table_has_column(meta, "gid") or not _table_has_column(meta, "id_poteau_hta"):
                continue
            placeholders = ", ".join(["%s"] * len(canon_nodes))
            cur.execute(
                f"SELECT gid FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('id_poteau_hta')} IN ({placeholders})",
                tuple(canon_nodes),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is not None:
                    poste_cabine_ids.add(_canon_id(str(gid_val)))
    except Exception:
        pass

    def _collect_pairs_for_slugs(ids_set: set[str], slug_matcher) -> list[tuple[str, str]]:
        ids = sorted({_canon_id(x) for x in ids_set if _canon_id(x)})
        if not ids:
            return []
        out: list[tuple[str, str]] = []
        seen: set[tuple[str, str]] = set()
        for slug in sorted(TABLE_BY_SLUG.keys()):
            if not slug_matcher(slug):
                continue
            table_name, meta = TABLE_BY_SLUG[slug]
            if not _table_has_column(meta, "gid"):
                continue
            try:
                placeholders = ", ".join(["%s"] * len(ids))
                cur.execute(
                    f"SELECT gid FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                    tuple(ids),
                )
                for row in cur.fetchall() or []:
                    gid_val = row.get("gid")
                    if gid_val is None:
                        continue
                    key = (slug, str(gid_val))
                    if key not in seen:
                        seen.add(key)
                        out.append(key)
            except Exception:
                continue
        return out

    poste_source_pairs = _collect_pairs_for_slugs(
        poste_source_ids,
        lambda s: ("poste-source" in s) or ("limite-poste" in s),
    )
    poste_cabine_pairs = _collect_pairs_for_slugs(
        poste_cabine_ids,
        lambda s: "poste-cabine" in s,
    )
    transfo_poteau_pairs = _collect_pairs_for_slugs(
        transfo_poteau_ids,
        lambda s: ("transfo-poteau" in s) or ("poste-sur-poteau" in s),
    )
    transfo_ht_bt_pairs = _collect_pairs_for_slugs(
        transfo_ht_bt_ids,
        lambda s: "transfo-ht-bt" in s,
    )

    merged: list[tuple[str, str]] = []
    seen_merged: set[tuple[str, str]] = set()
    for item in (poste_source_pairs + poste_cabine_pairs + transfo_poteau_pairs + transfo_ht_bt_pairs):
        if item not in seen_merged:
            seen_merged.add(item)
            merged.append(item)
    return merged


def _trace_nearby_points_fallback(cur, trace_type: str, ref_id: str, radius_m: int = 120) -> list[tuple[str, str]]:
    """Fallback spatial pour points : ouvrages ponctuels proches du point de référence."""
    wkt = _get_ref_point_wkt(trace_type, ref_id)
    if not wkt:
        return []
    geog_ref = f"SRID=4326;{wkt}"
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for slug in sorted(TABLE_BY_SLUG.keys()):
        if not _is_point_table(slug):
            continue
        table_name, meta = TABLE_BY_SLUG[slug]
        if not (_table_has_column(meta, "gid") and len(get_geometry_columns(meta)) > 0):
            continue
        qtable = quote_ident(table_name)
        qgeom = quote_ident(get_geometry_columns(meta)[0])
        geog_expr = _geom_to_4326_geography("t." + qgeom)
        try:
            cur.execute(
                f"""
                SELECT t.gid
                FROM {qtable} t
                WHERE t.{qgeom} IS NOT NULL
                  AND ST_DWithin({geog_expr}, ST_GeogFromText(%s), %s)
                ORDER BY ST_Distance({geog_expr}, ST_GeogFromText(%s))
                LIMIT 150
                """,
                (geog_ref, radius_m, geog_ref),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is None:
                    continue
                key = (slug, str(gid_val))
                if key not in seen:
                    seen.add(key)
                    pairs.append(key)
        except Exception:
            continue
    return pairs


@app.get("/gis/trace")
def trace_ouvrages(
    type: str = "poste_source",
    ref_id: str = "",
    direction: str = "amont",
):
    """
    Tracé amont/aval : retourne les ouvrages (lignes BT, HTA, branchement) connectés à un point de départ.
    type: poste_source | poste_transformation | abonne | ouvrage.
    direction: amont | aval | tous (tous les ouvrages connectés).
    """
    ref_id = (ref_id or "").strip()
    if not ref_id:
        return {"ouvrage_ids": [], "message": "ref_id requis."}
    direction = (direction or "aval").strip().lower()
    if direction not in {"amont", "aval", "tous"}:
        return {"ouvrage_ids": [], "message": "direction invalide (amont|aval|tous)."}
    trace_type = (type or "").strip().lower()
    if trace_type not in {"poste_source", "poste_transformation", "abonne", "ouvrage"}:
        return {"ouvrage_ids": [], "message": "type invalide (poste_source|poste_transformation|abonne|ouvrage)."}

    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                # Depuis un point de raccordement / abonné : en aval/tous on ne retourne que sa ligne de branchement ;
                # en amont on remonte jusqu'au poste de transformation (BFS amont).
                from_point_raccordement = trace_type == "abonne" or _trace_ref_is_point_raccordement_or_abonne(cur, ref_id)
                ligne_brcht_only_gid, _pt_racc_gid = _trace_get_ligne_brcht_only_for_raccord(cur, ref_id) if from_point_raccordement else (None, None)
                if from_point_raccordement and ligne_brcht_only_gid and direction != "amont":
                    pairs = [("ligne-brcht", ligne_brcht_only_gid)]
                    visited_nodes = set()
                    raccord_pairs = _trace_points_raccordement_from_lines(cur, pairs)
                    merged = list(pairs)
                    seen_merged = set(merged)
                    for item in raccord_pairs:
                        if item not in seen_merged:
                            seen_merged.add(item)
                            merged.append(item)
                    pairs = merged
                else:
                    # Depuis un point de raccordement / abonné sans ligne_brcht trouvée, ou depuis un autre type : tracé classique.
                    effective_direction = direction
                    if direction == "tous" and from_point_raccordement:
                        effective_direction = "amont"
                    start_nodes = _trace_resolve_start_nodes(cur, trace_type, ref_id)
                    # Coupure BT ne doit pas remonter sur le HTA sauf en amont depuis poste cabine (remonter jusqu'au poste source).
                    # En amont depuis poste_transformation : ne pas restreindre au BT pour atteindre le poste source.
                    restrict_to_bt = (
                        trace_type == "abonne"
                        or (trace_type == "poste_transformation" and direction != "amont")
                        or (trace_type == "ouvrage" and not _trace_has_hta_depart_nodes(cur, start_nodes))
                    )
                    # En amont : ne traverser que le réseau HTA (ligne_hta) jusqu'au poste source.
                    # Priorité : poste_cabine.id_ligne_hta pour remonter directement vers le poste source.
                    ligne_hta_cabine_gid: str | None = None
                    if effective_direction == "amont":
                        hta_entry = set()
                        if trace_type == "poste_transformation":
                            hta_entry, ligne_hta_cabine_gid = _trace_hta_entry_from_poste_cabine(cur, ref_id)
                        if not hta_entry:
                            hta_entry = _trace_hta_entry_from_start(cur, start_nodes)
                        if hta_entry:
                            pairs, visited_nodes = _trace_bfs_from_node(cur, hta_entry, "amont", restrict_to_hta=True)
                            # Garantir que la ligne HTA qui alimente le poste cabine est bien dans le résultat
                            if ligne_hta_cabine_gid and not any(_canon_id(gid) == _canon_id(ligne_hta_cabine_gid) for _s, gid in pairs if _s == "ligne-hta"):
                                pairs.insert(0, ("ligne-hta", ligne_hta_cabine_gid))
                        else:
                            pairs, visited_nodes = _trace_bfs_from_node(cur, start_nodes, effective_direction, restrict_to_bt=restrict_to_bt)
                    else:
                        pairs, visited_nodes = _trace_bfs_from_node(cur, start_nodes, effective_direction, restrict_to_bt=restrict_to_bt)
                    if trace_type == "ouvrage":
                        ref_canon = _canon_id(ref_id)
                        for _table_name, slug, _node_cols in _TRACE_EDGE_TABLES:
                            try:
                                qtable = quote_ident(_table_name)
                                cur.execute(
                                    f"SELECT gid FROM {qtable} WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                                    (ref_canon,),
                                )
                                row = cur.fetchone()
                                if row and row.get("gid") is not None:
                                    pairs.append((slug, str(row["gid"])))
                            except Exception:
                                continue
                    point_pairs = _trace_points_from_node_ids(cur, visited_nodes)
                    equip_pairs = _trace_postes_transfos_from_node_ids(cur, visited_nodes)
                    raccord_pairs = _trace_points_raccordement_from_lines(cur, pairs)
                    links_count = _trace_directional_links_count(cur)
                    used_spatial_fallback = False
                    if not pairs and links_count == 0:
                        # Données non orientées (id_depart_*/id_poteau_* vides) : fallback spatial
                        pairs = _trace_nearby_lines_fallback(cur, trace_type, ref_id, radius_m=120)
                        point_pairs = _trace_nearby_points_fallback(cur, trace_type, ref_id, radius_m=150)
                        equip_pairs = _trace_postes_transfos_from_node_ids(cur, visited_nodes)
                        raccord_pairs = _trace_points_raccordement_from_lines(cur, pairs)
                        used_spatial_fallback = len(pairs) > 0
                    merged = []
                    seen_merged = set()
                    for item in (pairs + point_pairs + equip_pairs + raccord_pairs):
                        if item not in seen_merged:
                            seen_merged.add(item)
                            merged.append(item)

                    # Règle métier : si le réseau HTA qui alimente le BT est coupé, le réseau BT est coupé aussi.
                    # En "tous" : ajouter tout le réseau BT en aval des postes cabine.
                    # En "aval" depuis poste source : descendre jusqu'aux points de raccordement (réseau BT en aval).
                    bt_start: set[str] = set()
                    if effective_direction == "aval":
                        # Le BFS aval HTA s'arrête aux poteaux HTA ; on relie au BT via ligne_brcht (id_poteau_hta).
                        bt_start = _trace_bt_start_from_hta_nodes(cur, visited_nodes)
                    poste_cabine_gids = [gid for slug, gid in merged if "poste-cabine" in (slug or "")]
                    if poste_cabine_gids and effective_direction in ("tous", "aval"):
                        for pc_gid in poste_cabine_gids:
                            bt_start |= _trace_resolve_start_nodes(cur, "poste_transformation", pc_gid)
                    if bt_start:
                        bt_direction = "tous" if effective_direction == "tous" else "aval"
                        bt_pairs, bt_visited = _trace_bfs_from_node(cur, bt_start, bt_direction, restrict_to_bt=True)
                        bt_point_pairs = _trace_points_from_node_ids(cur, bt_visited)
                        bt_equip_pairs = _trace_postes_transfos_from_node_ids(cur, bt_visited)
                        bt_raccord_pairs = _trace_points_raccordement_from_lines(cur, bt_pairs)
                        for item in (bt_pairs + bt_point_pairs + bt_equip_pairs + bt_raccord_pairs):
                            if item not in seen_merged:
                                seen_merged.add(item)
                                merged.append(item)

                    pairs = merged
    except Exception as e:
        _log.warning("Trace amont/aval: %s", e)
        return {"ouvrage_ids": [], "message": f"Erreur lors du tracé: {e}"}

    ouvrage_ids = [{"slug": slug, "id": gid} for slug, gid in pairs]
    detail = None
    if not ouvrage_ids:
        detail = (
            "Aucune ligne trouvée. Vérifiez que : (1) le point de départ existe en base (ex. poste source avec des départs HTA), "
            "(2) les tables ligne_bt, ligne_hta, ligne_brcht contiennent des lignes dont les champs id_depart_bt, id_poteau_bt, "
            "id_depart_hta, id_poteau_hta référencent ce point ou des nœuds connectés."
        )
    elif "used_spatial_fallback" in locals() and used_spatial_fallback:
        detail = (
            "Tracé calculé en mode spatial (proximité géométrique), car les champs de connectivité "
            "id_depart_*/id_poteau_* sont vides dans les tables de lignes."
        )
    return {"ouvrage_ids": ouvrage_ids, "message": detail}


def _is_line_table(slug: str) -> bool:
    """True si le slug correspond à une table de lignes (conducteurs, etc.)."""
    s = slug.lower()
    return "ligne" in s or "electricline" in s


def _is_point_table(slug: str) -> bool:
    """True si le slug correspond à une table de points (poteaux, transfo, postes, abonnés)."""
    s = slug.lower()
    return (
        "poteau" in s or "pole" in s or "transfo" in s or "poste" in s
        or "abonne" in s or "branchement" in s or "limite-poste" in s
        or "findeligne" in s or "electricjunction" in s or "noeud" in s
        or "point-raccord" in s or "point_raccord" in s
    )


def _is_branchement_line_table(slug: str) -> bool:
    """True si le slug correspond à une ligne de branchement (ex. ligne_branchement_bt)."""
    return "ligne-branchement" in slug.lower() or "ligne_branchement" in slug.lower()


def _is_bt_branchement_line_table(slug: str) -> bool:
    """True si le slug correspond à une ligne de branchement BT (basse tension)."""
    return _is_branchement_line_table(slug) and "bt" in slug.lower()


def _get_branchement_table_for_counting(table_slug: str) -> tuple[str, str, str] | None:
    """
    Si on crée un branchement (point), retourne (table_name, geom_column_quoted, geog_expr)
    pour la table des branchements (pour compter ceux déjà sur une ligne). Sinon None.
    """
    if "ligne" in table_slug.lower():
        return None
    if "branchement" not in table_slug.lower():
        return None
    if table_slug not in TABLE_BY_SLUG:
        return None
    table_name, meta = TABLE_BY_SLUG[table_slug]
    geom_cols = get_geometry_columns(meta)
    if not geom_cols:
        return None
    qgeom = quote_ident(geom_cols[0])
    qtable = quote_ident(table_name)
    geog_expr = _geom_to_4326_geography("b." + qgeom)
    return (qtable, qgeom, geog_expr)


@app.post("/gis/topology/correct")
def topology_correct(
    body: dict = Body(default=None),
):
    """
    Correction de topologie du réseau : rapproche (snap) les extrémités des lignes
    vers les nœuds (poteaux, transformateurs, postes, abonnés) dans une tolérance donnée.
    Body: { "tolerance_m": 2.0 } (tolérance en mètres).
    Retourne le nombre de lignes corrigées par table.
    """
    tolerance_m = 2.0
    if body and isinstance(body.get("tolerance_m"), (int, float)):
        tolerance_m = float(body["tolerance_m"])
    if tolerance_m <= 0 or tolerance_m > 50:
        raise HTTPException(status_code=400, detail="tolerance_m doit être entre 0 et 50 (mètres)")

    UTM_SRID = 32630
    WGS84_SRID = 4326

    line_tables = [
        (slug, TABLE_BY_SLUG[slug][0], TABLE_BY_SLUG[slug][1])
        for slug in TABLE_BY_SLUG
        if _is_line_table(slug)
    ]
    point_tables = [
        (slug, TABLE_BY_SLUG[slug][0], TABLE_BY_SLUG[slug][1])
        for slug in TABLE_BY_SLUG
        if _is_point_table(slug)
    ]

    point_geom_cols = []
    for _slug, table_name, meta in point_tables:
        geom_cols = get_geometry_columns(meta)
        if not geom_cols:
            continue
        qtable = quote_ident(table_name)
        qgeom = quote_ident(geom_cols[0])
        point_geom_cols.append(f"SELECT {qgeom} AS geom FROM {qtable} WHERE {qgeom} IS NOT NULL")

    if not point_geom_cols:
        return {
            "corrected": 0,
            "by_table": {},
            "message": "Aucune table de points (poteaux, transfo, postes, abonnés) trouvée.",
        }

    points_union = " UNION ALL ".join(point_geom_cols)
    points_utm_sql = f"""
        SELECT ST_Collect(
            CASE WHEN ST_SRID(geom) IN (0, {WGS84_SRID}) THEN ST_Transform(ST_SetSRID(geom, {WGS84_SRID}), {UTM_SRID})
            ELSE ST_Transform(geom, {UTM_SRID}) END
        ) AS geom FROM ({points_union}) t
    """

    by_table = {}
    total = 0

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for slug, table_name, meta in line_tables:
                geom_cols = get_geometry_columns(meta)
                pk = get_primary_key(meta)
                if not geom_cols:
                    continue
                qtable = quote_ident(table_name)
                qgeom = quote_ident(geom_cols[0])
                qpk = quote_ident(pk)

                sql = f"""
                    WITH points_utm AS ({points_utm_sql}),
                    snapped AS (
                        SELECT t.{qpk} AS pk_val,
                            ST_Transform(
                                ST_Snap(
                                    CASE WHEN ST_SRID(t.{qgeom}) IN (0, {WGS84_SRID}) THEN ST_Transform(ST_SetSRID(t.{qgeom}, {WGS84_SRID}), {UTM_SRID})
                                    ELSE ST_Transform(t.{qgeom}, {UTM_SRID}) END,
                                    (SELECT geom FROM points_utm),
                                    %s
                                ),
                                {WGS84_SRID}
                            ) AS new_geom
                        FROM {qtable} t
                        WHERE t.{qgeom} IS NOT NULL
                    )
                    UPDATE {qtable} tbl SET {qgeom} = s.new_geom
                    FROM snapped s WHERE tbl.{qpk} = s.pk_val
                    AND NOT ST_Equals(tbl.{qgeom}, s.new_geom)
                """
                try:
                    cur.execute(sql, (tolerance_m,))
                    count = cur.rowcount
                except Exception as e:
                    by_table[slug] = {"updated": 0, "error": str(e)}
                    continue
                by_table[slug] = {"updated": count}
                total += count

    return {
        "corrected": total,
        "by_table": by_table,
        "tolerance_m": tolerance_m,
        "message": f"{total} segment(s) corrigé(s) avec une tolérance de {tolerance_m} m.",
    }


def _modelisation_body(body: dict | None) -> dict:
    """Paramètres communs modélisation : poste_source, tension, type_reseau, layer_slugs."""
    if not body:
        body = {}
    return {
        "poste_source": body.get("poste_source") or "",
        "tension": body.get("tension") or "both",
        "type_reseau": body.get("type_reseau") or "tous",
        "layer_slugs": body.get("layer_slugs") or [],
    }


def _modelisation_layer_counts(layer_slugs: list) -> tuple[list[dict], int]:
    """Pour les slugs valides, retourne les comptes par table et le total."""
    result = []
    total = 0
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for slug in layer_slugs:
                if slug not in TABLE_BY_SLUG:
                    continue
                table_name, meta = TABLE_BY_SLUG[slug]
                quoted_table = quote_ident(table_name)
                cur.execute(f"SELECT COUNT(*) AS c FROM {quoted_table}")
                row = cur.fetchone()
                count = row["c"] if row else 0
                result.append({"slug": slug, "table": table_name, "count": count})
                total += count
    return result, total


@app.post("/gis/modelisation/build")
def modelisation_build(body: dict = Body(default=None)):
    """
    Construit le modèle réseau à partir du périmètre et des couches sélectionnées.
    Body: { poste_source, tension, type_reseau, layer_slugs: [] }
    Retourne un résumé (nombre d'enregistrements par couche).
    """
    params = _modelisation_body(body)
    layer_slugs = [s for s in params["layer_slugs"] if isinstance(s, str)]
    if not layer_slugs:
        return {
            "success": False,
            "message": "Aucune couche sélectionnée.",
            "layers": [],
            "rows_total": 0,
        }
    layers, rows_total = _modelisation_layer_counts(layer_slugs)
    return {
        "success": True,
        "message": f"Modèle construit avec {len(layers)} couche(s) et {rows_total} enregistrement(s). Périmètre : poste {params['poste_source'] or 'tous'}, {params['tension']}, {params['type_reseau']}.",
        "layers": layers,
        "rows_total": rows_total,
    }


@app.post("/gis/modelisation/export")
def modelisation_export(body: dict = Body(default=None)):
    """
    Exporte le modèle (préparation). Body: { poste_source, tension, type_reseau, layer_slugs }.
    Retourne un message et un identifiant d'export pour téléchargement ultérieur si besoin.
    """
    params = _modelisation_body(body)
    layer_slugs = [s for s in params["layer_slugs"] if isinstance(s, str)]
    layers, rows_total = _modelisation_layer_counts(layer_slugs) if layer_slugs else ([], 0)
    return {
        "success": True,
        "message": f"Export préparé pour {len(layers)} couche(s) ({rows_total} enregistrements). Utilisez l'API GET /gis/{slug} pour exporter les données par table.",
        "layers": layers,
        "rows_total": rows_total,
    }


@app.post("/gis/modelisation/calculate")
def modelisation_calculate(body: dict = Body(default=None)):
    """
    Lance un calcul sur le modèle (ex. load flow). Body: { poste_source, tension, type_reseau, layer_slugs }.
    Stub : retourne un résumé; la logique métier (load flow, contraintes) est à implémenter.
    """
    params = _modelisation_body(body)
    layer_slugs = [s for s in params["layer_slugs"] if isinstance(s, str)]
    layers, rows_total = _modelisation_layer_counts(layer_slugs) if layer_slugs else ([], 0)
    return {
        "success": True,
        "message": f"Calcul terminé (stub). Modèle : {len(layers)} couche(s), {rows_total} enregistrement(s). Module de calcul (load flow) à brancher.",
        "layers": layers,
        "rows_total": rows_total,
    }


@app.get("/gis/{table_slug}")
def list_rows(
    table_slug: str = Path(..., description="Slug de la table (ex: distributionpanel-branchement)"),
    limit: int = 100,
    offset: int = 0,
):
    """Liste les enregistrements de la table (pagination). Toutes les colonnes, geom en WKT."""
    table_name, meta = get_table_meta(table_slug)
    quoted_table = quote_ident(table_name)
    pk = get_primary_key(meta)
    quoted_pk = quote_ident(pk)
    # En liste, on exclut les colonnes image/base64 pour garder la réponse légère
    # et éviter des rechargements UI instables après ajout de photos.
    select_list = build_select_list(meta, include_image_fields=False)
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            # Tri stable: éviter qu'un ouvrage "disparaisse" de la première page après update
            # quand une colonne non-PK est modifiée (ex: image/base64).
            cur.execute(
                f'SELECT {select_list} FROM {quoted_table} ORDER BY {quoted_pk} NULLS LAST LIMIT %s OFFSET %s',
                (limit, offset),
            )
            rows = cur.fetchall()
    return [row_to_json(r) for r in rows]


def _geom_to_4326_geography(quoted_geom: str) -> str:
    """Expression SQL pour convertir une géométrie en geography (4326) pour distance en mètres. SRID 0 = UTM 32630."""
    return (
        f"CASE WHEN ST_SRID({quoted_geom}) = 0 THEN ST_Transform(ST_SetSRID({quoted_geom}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID})::geography "
        f"WHEN ST_SRID({quoted_geom}) = {OUTPUT_SRID} THEN {quoted_geom}::geography "
        f"ELSE ST_Transform({quoted_geom}, {OUTPUT_SRID})::geography END"
    )


@app.get("/gis/{table_slug}/suggest-placement")
def suggest_placement(
    table_slug: str = Path(..., description="Slug de la couche à créer"),
    lat: float | None = Query(None, description="Latitude (centre carte ou clic)"),
    lng: float | None = Query(None, description="Longitude (centre carte ou clic)"),
    radius_m: float = Query(5000, ge=50, le=50000, description="Rayon max de recherche en mètres (défaut 5 km)"),
    limit_per_type: int = Query(5, ge=1, le=15),
):
    """
    Propositions intelligentes pour la création : où placer l'entité et à quoi la raccorder.
    Retourne les N géométries les plus proches (lignes et points) dans le rayon, triées par distance.
    """
    get_table_meta(table_slug)  # vérifier que la table existe
    if lat is None or lng is None:
        return {"suggestions": [], "message": "Fournir lat et lng (ex: centre de la carte)."}

    pt_geom = "ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
    pt_geog = pt_geom + "::geography"
    suggestions: list[dict] = []
    max_distance_m = min(radius_m, 20000)  # ne pas retourner des suggestions au-delà de 20 km
    MAX_BRANCHEMENTS_PER_LINE = 5  # ne proposer que les lignes branchement avec strictement moins de 5 branchements
    BRANCHEMENT_SNAP_M = 5  # un branchement est "sur" une ligne s'il est à moins de 5 m

    branchement_for_count = _get_branchement_table_for_counting(table_slug)

    line_tables = [
        (slug, TABLE_BY_SLUG[slug][0], TABLE_BY_SLUG[slug][1])
        for slug in TABLE_BY_SLUG
        if _is_line_table(slug)
    ]
    # En création de branchement (point) : ne proposer que les lignes branchements BT
    if branchement_for_count is not None:
        line_tables = [
            (slug, t, m) for slug, t, m in line_tables
            if _is_bt_branchement_line_table(slug)
        ]
    point_tables = [
        (slug, TABLE_BY_SLUG[slug][0], TABLE_BY_SLUG[slug][1])
        for slug in TABLE_BY_SLUG
        if _is_point_table(slug)
    ]

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            # Point le plus proche sur les lignes (lignes branchement : seulement si non surchargées, i.e. < 5 branchements)
            for slug, table_name, meta in line_tables:
                geom_cols = get_geometry_columns(meta)
                if not geom_cols:
                    continue
                pk = get_primary_key(meta)
                qtable = quote_ident(table_name)
                qgeom = quote_ident(geom_cols[0])
                qpk = quote_ident(pk)
                geog_expr = _geom_to_4326_geography(qgeom)
                # Pour les lignes branchement, exclure celles qui ont déjà >= 5 branchements à moins de 5 m
                filter_not_overloaded = ""
                params_extra = []
                if _is_branchement_line_table(slug) and branchement_for_count is not None:
                    b_table, b_qgeom, b_geog_expr = branchement_for_count
                    # Sous-requête : compter les branchements à moins de 5 m de cette ligne ; garder si < 5
                    filter_not_overloaded = f"""
                        AND (SELECT COUNT(*) FROM {b_table} AS b
                             WHERE b.{b_qgeom} IS NOT NULL
                               AND ST_DWithin({geog_expr}, {b_geog_expr}, {BRANCHEMENT_SNAP_M})) < {MAX_BRANCHEMENTS_PER_LINE}
                    """
                geom_4326_expr = (
                    f"CASE WHEN ST_SRID({qgeom}) = 0 THEN ST_Transform(ST_SetSRID({qgeom}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID}) "
                    f"WHEN ST_SRID({qgeom}) = {OUTPUT_SRID} THEN {qgeom} "
                    f"ELSE ST_Transform({qgeom}, {OUTPUT_SRID}) END"
                )
                sql = f"""
                    WITH pt AS (
                        SELECT ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography AS p
                    ),
                    ranked AS (
                        SELECT {qpk} AS pk,
                               ST_AsText(ST_ClosestPoint({geom_4326_expr}, (SELECT p::geometry FROM pt))) AS wkt,
                               ST_AsText({geom_4326_expr}) AS line_wkt,
                               ST_Distance({geog_expr}, (SELECT p FROM pt)) AS dist_m
                        FROM {qtable}
                        WHERE {qgeom} IS NOT NULL
                        {filter_not_overloaded}
                    )
                    SELECT pk, wkt, line_wkt, dist_m FROM ranked
                    WHERE dist_m <= %s
                    ORDER BY dist_m
                    LIMIT %s
                """
                try:
                    cur.execute(sql, (lng, lat, max_distance_m, limit_per_type))
                    for row in cur.fetchall() or []:
                        wkt = row.get("wkt")
                        line_wkt = row.get("line_wkt")
                        if not wkt or "EMPTY" in str(wkt):
                            continue
                        match = re.search(r"POINT\s*Z?\s*\(\s*([-\d.e]+)\s+([-\d.e]+)", str(wkt))
                        if match:
                            lon_s, lat_s = match.group(1), match.group(2)
                            item = {
                                "type": "line_connection",
                                "lat": float(lat_s),
                                "lng": float(lon_s),
                                "label": f"Raccorder à la ligne ({slug})",
                                "source_slug": slug,
                                "source_id": str(row.get("pk", "")),
                                "distance_m": round(float(row.get("dist_m") or 0), 1),
                            }
                            if line_wkt and "EMPTY" not in str(line_wkt):
                                item["line_wkt"] = str(line_wkt).strip()
                            suggestions.append(item)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning("suggest-placement line %s: %s", slug, e)

            # Points les plus proches (poteaux, transfo, postes)
            for slug, table_name, meta in point_tables:
                if slug == table_slug:
                    continue
                geom_cols = get_geometry_columns(meta)
                if not geom_cols:
                    continue
                pk = get_primary_key(meta)
                qtable = quote_ident(table_name)
                qgeom = quote_ident(geom_cols[0])
                qpk = quote_ident(pk)
                geog_expr = _geom_to_4326_geography(qgeom)
                geom_4326 = (
                    f"CASE WHEN ST_SRID({qgeom}) = 0 THEN ST_Transform(ST_SetSRID({qgeom}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID}) "
                    f"WHEN ST_SRID({qgeom}) = {OUTPUT_SRID} THEN {qgeom} "
                    f"ELSE ST_Transform({qgeom}, {OUTPUT_SRID}) END"
                )
                sql = f"""
                    WITH pt AS (
                        SELECT ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography AS p
                    ),
                    ranked AS (
                        SELECT {qpk} AS pk,
                               ST_AsText(ST_Centroid({geom_4326})) AS wkt,
                               ST_Distance({geog_expr}, (SELECT p FROM pt)) AS dist_m
                        FROM {qtable}
                        WHERE {qgeom} IS NOT NULL
                    )
                    SELECT pk, wkt, dist_m FROM ranked
                    WHERE dist_m <= %s
                    ORDER BY dist_m
                    LIMIT %s
                """
                try:
                    cur.execute(sql, (lng, lat, max_distance_m, limit_per_type))
                    for row in cur.fetchall() or []:
                        wkt = row.get("wkt")
                        if not wkt:
                            continue
                        match = re.search(r"POINT\s*Z?\s*\(\s*([-\d.e]+)\s+([-\d.e]+)", str(wkt))
                        if match:
                            lon_s, lat_s = match.group(1), match.group(2)
                            suggestions.append({
                                "type": "near_point",
                                "lat": float(lat_s),
                                "lng": float(lon_s),
                                "label": f"Près de {slug} #{row.get('pk', '')}",
                                "source_slug": slug,
                                "source_id": str(row.get("pk", "")),
                                "distance_m": round(float(row.get("dist_m") or 0), 1),
                            })
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning("suggest-placement point %s: %s", slug, e)

    suggestions.sort(key=lambda s: s.get("distance_m", 9999))
    result = suggestions[: 2 * limit_per_type]
    out = {"suggestions": result, "message": f"{len(result)} proposition(s)."}
    if len(result) == 0:
        out["_debug"] = {
            "line_tables": len(line_tables),
            "point_tables": len(point_tables),
            "center": {"lat": lat, "lng": lng},
            "max_distance_m": max_distance_m,
        }
    return out


@app.get("/gis/{table_slug}/{pk_value}")
def get_by_id(
    table_slug: str = Path(..., description="Slug de la table"),
    pk_value: str = Path(..., description="Valeur de la clé primaire (ou objectid, etc.)"),
):
    """Récupère un enregistrement par clé primaire (ou objectid si la ligne n'est pas trouvée par la PK)."""
    table_name, meta = get_table_meta(table_slug)
    pk = get_primary_key(meta)
    quoted_table = quote_ident(table_name)
    select_list = build_select_list(meta)
    row = None
    canon = _canon_id(pk_value)
    search_cols = [pk, *get_alternate_key_columns(meta, pk)]
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for col in search_cols:
                cur.execute(
                    f"SELECT {select_list} FROM {quoted_table} WHERE {_canon_sql_expr(col)} = %s LIMIT 1",
                    (canon,),
                )
                row = cur.fetchone()
                if row is not None:
                    break
    if not row:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return row_to_json(row)


def _do_create_or_update_row(table_slug: str, body: dict) -> dict:
    """Logique commune création/mise à jour (utilisée par POST /gis/{slug} et webhook ArcGIS)."""
    if body is None:
        body = {}
    table_name, meta = get_table_meta(table_slug)
    pk = get_primary_key(meta)
    all_columns = get_all_columns(meta)
    geom_cols = get_geometry_columns(meta)
    geom_srid_by_col = {c: (get_geometry_srid_from_db(table_name, c) or DEFAULT_INPUT_SRID) for c in geom_cols}
    quoted_table = quote_ident(table_name)
    data = {k: v for k, v in body.items() if k in all_columns}
    if not data:
        raise HTTPException(status_code=400, detail="Aucun champ fourni")
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            pk_val = data.get(pk) or body.get(pk)
            if pk_val is not None:
                quoted_pk = quote_ident(pk)
                cur.execute(f'SELECT 1 FROM {quoted_table} WHERE {quoted_pk} = %s', (pk_val,))
                if cur.fetchone():
                    set_parts = []
                    values = []
                    for c in data.keys():
                        if c == pk:
                            continue
                        q = quote_ident(c)
                        if c in geom_cols and data[c] is not None:
                            geom_text = str(data[c]).strip()
                            target_srid = int(geom_srid_by_col.get(c) or DEFAULT_INPUT_SRID)
                            if re.match(r"^SRID=\d+;", geom_text, flags=re.IGNORECASE):
                                set_parts.append(f"{q} = ST_Transform(ST_GeomFromEWKT(%s), {target_srid})")
                                values.append(geom_text)
                            else:
                                # WKT sans SRID depuis le frontend -> interprété en WGS84,
                                # puis transformé vers le SRID réel de la colonne.
                                set_parts.append(
                                    f"{q} = ST_Transform(ST_SetSRID(ST_GeomFromText(%s), {OUTPUT_SRID}), {target_srid})"
                                )
                                values.append(geom_text)
                        else:
                            set_parts.append(f"{q} = %s")
                            values.append(data[c])
                    if not set_parts:
                        raise HTTPException(status_code=400, detail="Rien à mettre à jour")
                    values.append(pk_val)
                    cur.execute(f'UPDATE {quoted_table} SET {", ".join(set_parts)} WHERE {quoted_pk} = %s', values)
                    select_list = build_select_list(meta)
                    cur.execute(f'SELECT {select_list} FROM {quoted_table} WHERE {quoted_pk} = %s', (pk_val,))
                    return row_to_json(cur.fetchone())
            cols = [c for c in data.keys()]
            placeholders = []
            for c in cols:
                if c in geom_cols and data[c] is not None:
                    geom_text = str(data[c]).strip()
                    target_srid = int(geom_srid_by_col.get(c) or DEFAULT_INPUT_SRID)
                    if re.match(r"^SRID=\d+;", geom_text, flags=re.IGNORECASE):
                        placeholders.append(f"ST_Transform(ST_GeomFromEWKT(%s), {target_srid})")
                    else:
                        placeholders.append(
                            f"ST_Transform(ST_SetSRID(ST_GeomFromText(%s), {OUTPUT_SRID}), {target_srid})"
                        )
                else:
                    placeholders.append("%s")
            cols_quoted = ", ".join(quote_ident(c) for c in cols)
            cur.execute(
                f'INSERT INTO {quoted_table} ({cols_quoted}) VALUES ({", ".join(placeholders)}) RETURNING *',
                [data[c] for c in cols],
            )
            row = cur.fetchone()
            pk_val = row.get(pk) if row else None
            if pk_val is not None:
                select_list = build_select_list(meta)
                cur.execute(f'SELECT {select_list} FROM {quoted_table} WHERE {quote_ident(pk)} = %s', (pk_val,))
                row = cur.fetchone()
            return row_to_json(row)


@app.post("/gis/{table_slug}")
def create_or_update(
    table_slug: str = Path(..., description="Slug de la table"),
    body: dict = Body(default={}, description="Champs à créer ou mettre à jour"),
):
    """Crée ou met à jour un enregistrement (si clé primaire fournie et existante → update). Toutes les colonnes acceptées ; geom en WKT/EWKT."""
    try:
        return _do_create_or_update_row(table_slug, body or {})
    except psycopg2.errors.ObjectNotInPrerequisiteState as e:
        table_name, _meta = get_table_meta(table_slug)
        sql_fix = f"ALTER TABLE {table_name} REPLICA IDENTITY FULL;"
        if _try_set_replica_identity_full(table_name):
            return _do_create_or_update_row(table_slug, body or {})
        raise HTTPException(
            status_code=409,
            detail={
                "code": "replica_identity_required",
                "message": "Mise à jour impossible : la table est utilisée en réplication logique sans REPLICA IDENTITY.",
                "sql": sql_fix,
                "hint": "Exécuter en base (avec droits suffisants) : " + sql_fix,
                "pg_message": str(e),
            },
        ) from e


@app.post("/gis/webhooks/arcgis")
def webhook_arcgis(body: dict = Body(default=None)):
    """
    Reçoit des features au format Esri (attributes + geometry) et les enregistre dans l'API.
    Utilisable depuis un relais webhook ArcGIS Online ou en envoi manuel.
    Body: {
      "table_slug": "distributionpanel-branchement",
      "features": [ { "attributes": {...}, "geometry": { "x", "y" } ou "paths"/"rings" } ],
      "apply_defaults": true
    }
    """
    if body is None:
        body = {}
    table_slug = body.get("table_slug")
    features = body.get("features") or []
    apply_defaults = body.get("apply_defaults", True)
    if not table_slug:
        raise HTTPException(status_code=400, detail="table_slug requis")
    get_table_meta(table_slug)
    defaults = get_form_defaults_for_slug(table_slug) if apply_defaults else {}
    created, errors = [], []
    for i, feat in enumerate(features):
        attrs = feat.get("attributes") or {}
        geom = feat.get("geometry")
        wkt = _esri_geometry_to_wkt(geom) if geom else None
        if wkt and not wkt.strip().upper().startswith("SRID="):
            wkt = "SRID=4326;" + wkt
        row_body = dict(attrs)
        if wkt:
            row_body["geom"] = wkt
        for k, v in defaults.items():
            if k in row_body and (row_body[k] is None or (isinstance(row_body[k], str) and row_body[k].strip() == "")):
                row_body[k] = v
        try:
            out = _do_create_or_update_row(table_slug, row_body)
            created.append(out)
        except psycopg2.errors.ObjectNotInPrerequisiteState:
            table_name, _meta = get_table_meta(table_slug)
            if _try_set_replica_identity_full(table_name):
                out = _do_create_or_update_row(table_slug, row_body)
                created.append(out)
            else:
                errors.append({"index": i, "error": f"REPLICA IDENTITY requis sur {table_name}"})
        except HTTPException:
            raise
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    return {"created": len(created), "errors": len(errors), "details": created, "errors_list": errors}


def _try_set_replica_identity_full(table_name: str) -> bool:
    """Tente d'exécuter ALTER TABLE ... REPLICA IDENTITY FULL (nécessaire pour DELETE sur tables répliquées). Retourne True si OK."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"ALTER TABLE {quote_ident(table_name)} REPLICA IDENTITY FULL")
        cur.close()
        _log.info("REPLICA IDENTITY FULL appliqué sur la table %s", table_name)
        return True
    except Exception as e:
        _log.warning("Impossible d'appliquer REPLICA IDENTITY FULL sur %s: %s", table_name, e)
        return False
    finally:
        if conn:
            conn.close()


def _do_delete_row(conn, cur, quoted_table: str, quoted_pk: str, meta: dict, pk: str, pk_value: str) -> bool:
    """Exécute le DELETE et retourne True si une ligne a été supprimée."""
    cur.execute(f"DELETE FROM {quoted_table} WHERE {quoted_pk} = %s", (pk_value,))
    if cur.rowcount > 0:
        return True
    for alt in get_alternate_key_columns(meta, pk):
        cur.execute(
            f"DELETE FROM {quoted_table} WHERE {quote_ident(alt)} = %s",
            (pk_value,),
        )
        if cur.rowcount > 0:
            return True
    return False


@app.delete("/gis/{table_slug}/{pk_value}")
def delete_row(
    table_slug: str = Path(..., description="Slug de la table"),
    pk_value: str = Path(..., description="Valeur de la clé primaire (ou objectid, etc.)"),
):
    """Supprime un enregistrement par clé primaire (ou objectid si la ligne n'est pas trouvée par la PK)."""
    table_name, meta = get_table_meta(table_slug)
    pk = get_primary_key(meta)
    quoted_table = quote_ident(table_name)
    quoted_pk = quote_ident(pk)
    deleted = False
    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                deleted = _do_delete_row(conn, cur, quoted_table, quoted_pk, meta, pk, pk_value)
    except psycopg2.errors.ObjectNotInPrerequisiteState as e:
        sql_fix = f"ALTER TABLE {table_name} REPLICA IDENTITY FULL;"
        if _try_set_replica_identity_full(table_name):
            with get_connection() as conn:
                with get_cursor(conn) as cur:
                    deleted = _do_delete_row(conn, cur, quoted_table, quoted_pk, meta, pk, pk_value)
        else:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "replica_identity_required",
                    "message": "Suppression impossible : la table est utilisée en réplication logique sans REPLICA IDENTITY. Un administrateur base de données doit exécuter la commande ci-dessous.",
                    "sql": sql_fix,
                    "hint": "Exécuter en base (avec droits suffisants) : " + sql_fix,
                    "pg_message": str(e),
                },
            ) from e
    except psycopg2.errors.ForeignKeyViolation as e:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "foreign_key_violation",
                "message": "Suppression impossible : d'autres enregistrements référencent encore cette ligne.",
                "pg_message": str(e),
            },
        ) from e
    if not deleted:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return {"deleted": True, "id": pk_value}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
