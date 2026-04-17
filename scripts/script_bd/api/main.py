# -*- coding: utf-8 -*-
"""
API REST Python (FastAPI) pour les tables décrites dans database_structure.json.
Expose pour chaque table : GET liste, GET par id, POST (création/mise à jour), DELETE.
"""
import json
import os
import re
from collections import Counter, defaultdict, deque
from pathlib import Path as FsPath

import networkx as nx
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import Body, FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import DB_CONFIG, STRUCTURE_JSON_PATH
from .db import get_connection, get_cursor
from .rx_topology import get_rx_schema_result, get_rx_trace_result, has_rx_topology, is_rx_topology_slug

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


def _codification_table_available(cur) -> bool:
    """Indique si la table de codification existe dans le schema public."""
    cur.execute("SELECT to_regclass('public.equipement_codification') IS NOT NULL AS ok")
    row = cur.fetchone() or {}
    return bool(row.get("ok"))


def _attach_code_equipement(cur, table_name: str, rows: list[dict]) -> None:
    """Ajoute code_equipement aux lignes si la table equipement_codification existe."""
    if not rows:
        return
    if not _codification_table_available(cur):
        return

    equipement_ids = []
    for r in rows:
        gid = r.get("gid")
        if gid is None:
            continue
        equipement_ids.append(str(gid))
    if not equipement_ids:
        return

    cur.execute(
        """
        SELECT equipement_id, code_equipement
        FROM equipement_codification
        WHERE table_name = %s
          AND equipement_id = ANY(%s)
        """,
        (table_name, equipement_ids),
    )
    by_gid = {str(x.get("equipement_id")): x.get("code_equipement") for x in (cur.fetchall() or [])}
    for r in rows:
        gid = r.get("gid")
        r["code_equipement"] = by_gid.get(str(gid)) if gid is not None else None


RULE_TYPES = {"connectivite", "topologie"}


def _ensure_rules_table(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS network_rules (
            id BIGSERIAL PRIMARY KEY,
            rule_type VARCHAR(32) NOT NULL,
            category TEXT,
            rule_name TEXT NOT NULL,
            concerned_objects TEXT,
            description TEXT,
            technical_constraints TEXT,
            examples TEXT,
            detected_errors TEXT,
            best_practices TEXT,
            source_file TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CHECK (rule_type IN ('connectivite', 'topologie'))
        );
        CREATE INDEX IF NOT EXISTS idx_network_rules_type ON network_rules(rule_type);
        CREATE INDEX IF NOT EXISTS idx_network_rules_sort ON network_rules(rule_type, sort_order, id);
        """
    )


def _normalize_md_cell(value: str) -> str:
    text = (value or "").strip()
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    return text.strip()


def _parse_markdown_table(md_text: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for raw in (md_text or "").splitlines():
        line = raw.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|\s*[-:\s|]+\|\s*$", line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        rows.append([_normalize_md_cell(c) for c in cells])
    return rows


def _rows_from_markdown(md_text: str, rule_type: str, source_file: str) -> list[dict]:
    table_rows = _parse_markdown_table(md_text)
    if len(table_rows) <= 1:
        return []

    data_rows = table_rows[1:]
    out: list[dict] = []
    for i, row in enumerate(data_rows, start=1):
        if rule_type == "connectivite":
            out.append(
                {
                    "rule_type": rule_type,
                    "category": row[0] if len(row) > 0 else "",
                    "rule_name": row[0] if len(row) > 0 else f"Regle {i}",
                    "concerned_objects": row[1] if len(row) > 1 else "",
                    "description": row[2] if len(row) > 2 else "",
                    "technical_constraints": row[3] if len(row) > 3 else "",
                    "examples": row[4] if len(row) > 4 else "",
                    "detected_errors": "",
                    "best_practices": row[5] if len(row) > 5 else "",
                    "source_file": source_file,
                    "sort_order": i,
                }
            )
        else:
            out.append(
                {
                    "rule_type": rule_type,
                    "category": row[0] if len(row) > 0 else "",
                    "rule_name": row[1] if len(row) > 1 else f"Regle {i}",
                    "concerned_objects": "",
                    "description": row[2] if len(row) > 2 else "",
                    "technical_constraints": row[3] if len(row) > 3 else "",
                    "examples": row[4] if len(row) > 4 else "",
                    "detected_errors": row[5] if len(row) > 5 else "",
                    "best_practices": row[6] if len(row) > 6 else "",
                    "source_file": source_file,
                    "sort_order": i,
                }
            )
    return out


def _load_default_rules(cur, replace_existing: bool = True) -> dict:
    _ensure_rules_table(cur)
    api_dir = FsPath(__file__).resolve().parent
    base_dir = api_dir.parent
    files = [
        ("connectivite", base_dir / "connectivity_rule.md"),
        ("topologie", base_dir / "topologie_rule.md"),
    ]

    inserted_total = 0
    by_type: dict[str, int] = {"connectivite": 0, "topologie": 0}
    for rule_type, file_path in files:
        if not file_path.exists():
            continue
        md_text = file_path.read_text(encoding="utf-8", errors="replace")
        rows = _rows_from_markdown(md_text, rule_type, file_path.name)
        if replace_existing:
            cur.execute("DELETE FROM network_rules WHERE rule_type = %s", (rule_type,))
        for item in rows:
            cur.execute(
                """
                INSERT INTO network_rules (
                    rule_type, category, rule_name, concerned_objects, description,
                    technical_constraints, examples, detected_errors, best_practices,
                    source_file, sort_order
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    item["rule_type"],
                    item["category"],
                    item["rule_name"],
                    item["concerned_objects"],
                    item["description"],
                    item["technical_constraints"],
                    item["examples"],
                    item["detected_errors"],
                    item["best_practices"],
                    item["source_file"],
                    item["sort_order"],
                ),
            )
            inserted_total += 1
            by_type[rule_type] += 1
    return {"inserted": inserted_total, "by_type": by_type}


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
def count_rows(
    table_slug: str = Path(..., description="Slug de la table"),
    collecte_par: str | None = Query(None, description="Filtre optionnel par collecteur (ex: jeu_donnees_kaya)"),
):
    """Retourne le nombre d'enregistrements dans la table (filtrable par collecte_par)."""
    table_name, meta = get_table_meta(table_slug)
    quoted_table = quote_ident(table_name)
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            if collecte_par and _table_has_column(meta, "collecte_par"):
                cur.execute(
                    f"SELECT COUNT(*) AS count FROM {quoted_table} WHERE {_canon_sql_expr('collecte_par')} = %s",
                    (_canon_id(collecte_par),),
                )
            else:
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
    slugs = _trace_ref_slugs_for_type(trace_type)
    return slugs[0] if slugs else None


def _trace_ref_slugs_for_type(trace_type: str) -> list[str]:
    """Retourne la liste ordonnée des slugs candidats pour un type de départ."""
    trace_type = (trace_type or "").strip().lower()
    candidates: list[str] = []

    def add_slug(slug: str):
        if slug in TABLE_BY_SLUG and slug not in candidates:
            candidates.append(slug)

    # Ordre préféré aligné au frontend:
    # - poste_source -> poste-source
    # - poste_transformation -> poste-cabine / transfo-poteau (fallback transfo-ht-bt)
    # - abonne -> point-raccordement (fallback abonne / branchement)
    if trace_type == "poste_source":
        # Inclure aussi le slug issu de l'import SHP (ps-poste-source).
        for slug in ("poste-source", "ps-poste-source", "limite-poste", "poste-sourc"):
            add_slug(slug)
        for slug in TABLE_BY_SLUG:
            if "poste" in slug.lower() and "sourc" in slug.lower():
                add_slug(slug)
    if trace_type == "poste_transformation":
        for slug in ("poste-cabine", "transfo-poteau", "transfo-ht-bt", "transfo-ht_bt"):
            add_slug(slug)
        for slug in TABLE_BY_SLUG:
            s = slug.lower()
            if ("poste" in s and "cabine" in s) or ("transfo" in s and "poteau" in s) or ("transfo" in s and "ht" in s and "bt" in s):
                add_slug(slug)
    if trace_type == "abonne":
        for slug in ("point-raccordement", "abonne", "branchement", "distributionpanel-branchement"):
            add_slug(slug)
        for slug in TABLE_BY_SLUG:
            s = slug.lower()
            if ("point" in s and "raccord" in s) or "abonne" in s or "branchement" in s:
                add_slug(slug)
    return candidates


def _get_ref_point_wkt(trace_type: str, ref_id: str, ref_slug: str = "") -> str | None:
    """Récupère la géométrie (WKT WGS84) du point de référence pour le tracé. Retourne None si non trouvé."""
    if not ref_id or not ref_id.strip():
        return None
    if (trace_type or "").strip().lower() == "ouvrage":
        ref_canon = _canon_id(ref_id)
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                ordered_slugs = sorted(TABLE_BY_SLUG.keys())
                ref_slug_norm = (ref_slug or "").strip().lower()
                if ref_slug_norm in TABLE_BY_SLUG:
                    ordered_slugs = [ref_slug_norm] + [s for s in ordered_slugs if s != ref_slug_norm]
                for slug in ordered_slugs:
                    table_name, meta = TABLE_BY_SLUG[slug]
                    if not (_table_has_column(meta, "gid") and get_geometry_columns(meta)):
                        continue
                    qtable = quote_ident(table_name)
                    qgeom = quote_ident(get_geometry_columns(meta)[0])
                    # Centroid -> point WKT pour fallback spatial, même si géométrie source est une ligne.
                    select_geom = (
                        f"ST_AsText(ST_Centroid(CASE WHEN ST_SRID({qgeom}) = 0 "
                        f"THEN ST_Transform(ST_SetSRID({qgeom}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID}) "
                        f"ELSE ST_Transform({qgeom}, {OUTPUT_SRID}) END))"
                    )
                    try:
                        cur.execute(
                            f"SELECT {select_geom} AS wkt FROM {qtable} WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                            (ref_canon,),
                        )
                        row = cur.fetchone()
                        if row and row.get("wkt"):
                            return str(row["wkt"])
                    except Exception:
                        continue
        return None

    slugs = _trace_ref_slugs_for_type(trace_type)
    if not slugs:
        return None
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for slug in slugs:
                try:
                    table_name, meta = get_table_meta(slug)
                except HTTPException:
                    continue
                geom_cols = get_geometry_columns(meta)
                if not geom_cols:
                    continue
                pk = get_primary_key(meta)
                quoted_table = quote_ident(table_name)
                qgeom = quote_ident(geom_cols[0])
                select_geom = (
                    f"ST_AsText(CASE WHEN ST_SRID({qgeom}) = 0 THEN ST_Transform(ST_SetSRID({qgeom}, {DEFAULT_INPUT_SRID}), {OUTPUT_SRID}) "
                    f"ELSE ST_Transform({qgeom}, {OUTPUT_SRID}) END)"
                )
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
    slugs = _trace_ref_slugs_for_type("poste_source")
    if not slugs:
        return None
    ref_canon = _canon_id(ref_id)
    for slug in slugs:
        try:
            table_name, meta = get_table_meta(slug)
        except HTTPException:
            continue
        pk = get_primary_key(meta)
        quoted_table = quote_ident(table_name)
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
        # Essayer par colonnes alternatives : codification (numéro de l'ouvrage), numero_poste, name, etc.
        alt_candidates = get_alternate_key_columns(meta, pk) + [
            c for c in ("codification", "numero_ouvrage", "numero_poste", "name", "numero", "code", "assetid")
            if c in all_cols
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


# Colonnes utilisées pour résoudre une codification (numéro de l'ouvrage) vers un gid
_CODIFICATION_COLS = ["codification", "numero_ouvrage", "numero_poste", "numero", "code"]


def _resolve_ref_by_codification(cur, ref_id: str) -> tuple[str, str] | None:
    """
    Résout ref_id (codification / numéro de l'ouvrage) en (slug, gid) en cherchant dans les tables
    les colonnes codification, numero_ouvrage, numero_poste, numero, code.
    Retourne le premier (slug, gid) trouvé, ou None.
    """
    if not ref_id or not str(ref_id).strip():
        return None
    ref_canon = _canon_id(ref_id)
    for slug in sorted(TABLE_BY_SLUG.keys()):
        table_name, meta = TABLE_BY_SLUG[slug]
        if not _table_has_column(meta, "gid"):
            continue
        for col in _CODIFICATION_COLS:
            if not _table_has_column(meta, col):
                continue
            try:
                cur.execute(
                    f"SELECT gid FROM {quote_ident(table_name)} WHERE {_canon_sql_expr(col)} = %s AND gid IS NOT NULL LIMIT 1",
                    (ref_canon,),
                )
                row = cur.fetchone()
                if row and row.get("gid") is not None:
                    return (slug, str(row["gid"]).strip())
            except Exception:
                continue
    return None


def _ref_exists_as_gid(cur, ref_id: str) -> bool:
    """
    True si ref_id existe déjà comme gid dans au moins une table métier.
    Permet d'éviter de re-résoudre un gid numérique comme une codification.
    """
    ref_canon = _canon_id(ref_id)
    if not ref_canon:
        return False
    for slug in sorted(TABLE_BY_SLUG.keys()):
        table_name, meta = TABLE_BY_SLUG[slug]
        if not _table_has_column(meta, "gid"):
            continue
        try:
            cur.execute(
                f"SELECT 1 FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                (ref_canon,),
            )
            if cur.fetchone():
                return True
        except Exception:
            continue
    return False


def _trace_resolve_start_nodes(cur, trace_type: str, ref_id: str, ref_slug: str = "") -> set[str]:
    """
    Résout le point de départ (poste source, transfo, abonné) en nœuds du graphe.
    ref_id peut être un gid ou une codification (numéro de l'ouvrage).
    """
    start: set[str] = set()
    ref_canon = _canon_id(ref_id)
    trace_type = (trace_type or "").strip().lower()
    ref_slug_norm = (ref_slug or "").strip().lower()
    # Résolution par codification (numéro de l'ouvrage) : si ref_id est une codification, on obtient le gid
    # IMPORTANT : si ref_slug est fourni, on privilégie l'objet réellement cliqué dans cette couche
    # et on évite de réinterpréter un gid numérique ("1", "2", ...) comme une codification d'un autre ouvrage.
    try:
        treat_as_direct_gid = _ref_exists_as_gid(cur, ref_id)
        resolved = None if (ref_slug_norm or treat_as_direct_gid) else _resolve_ref_by_codification(cur, ref_id)
        if resolved:
            _slug, gid_resolved = resolved
            ref_canon = _canon_id(gid_resolved)
    except Exception:
        pass
    start.add(ref_canon)
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
            # Point de raccordement / abonné : résoudre d'abord la ligne de branchement
            # via le helper robuste (accepte gid point_raccordement, abonne ou branchement).
            try:
                line_id, _pt_gid = _trace_get_ligne_brcht_only_for_raccord(cur, ref_id)
                if line_id:
                    cur.execute(
                        "SELECT id_depart_bt, id_poteau_bt, id_poteau_hta FROM ligne_brcht "
                        "WHERE " + _canon_sql_expr("gid") + " = %s",
                        (_canon_id(line_id),),
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

            # 1.5) Migration connectivité : si l'utilisateur a cliqué une couche rx_*
            # (ref_slug), retrouver les arêtes legacy construites via le tag RXCOMPAT|<rx_table>|<rx_gid>.
            try:
                ref_slug_norm = (ref_slug or "").strip().lower()
                if ref_slug_norm and ref_slug_norm in TABLE_BY_SLUG:
                    rx_table_name, _rx_meta = TABLE_BY_SLUG[ref_slug_norm]
                    compat_num = f"RXCOMPAT|{rx_table_name}|{ref_canon}"

                    # HTA : rx_hta_*_troncons -> ligne_hta
                    if "rx_hta_" in rx_table_name and "troncons" in rx_table_name:
                        cur.execute(
                            "SELECT id_depart_hta, id_poteau_hta FROM ligne_hta WHERE numero = %s LIMIT 1",
                            (compat_num,),
                        )
                        row = cur.fetchone()
                        if row:
                            for k in ("id_depart_hta", "id_poteau_hta"):
                                v = row.get(k)
                                if v is not None and str(v).strip():
                                    start.add(str(v).strip())

                    # BT : rx_bt_*_cable_bt -> ligne_bt
                    if "rx_bt_" in rx_table_name and "cable_bt" in rx_table_name:
                        cur.execute(
                            "SELECT id_depart_bt, id_poteau_bt FROM ligne_bt WHERE numero = %s LIMIT 1",
                            (compat_num,),
                        )
                        row = cur.fetchone()
                        if row:
                            for k in ("id_depart_bt", "id_poteau_bt"):
                                v = row.get(k)
                                if v is not None and str(v).strip():
                                    start.add(str(v).strip())

                    # Nœuds : rx_*_poste_hta_* ou rx_*_poste_h59
                    if (
                        ("poste_hta" in rx_table_name and "rx_" in rx_table_name)
                        or ("poste_h59" in rx_table_name and "rx_" in rx_table_name)
                    ):
                        if ref_canon:
                            start.add(ref_canon)
            except Exception:
                # Ne pas casser le tracé si la compatibilité n'est pas trouvée
                pass

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
    """True si au moins un des node_ids correspond à un depart HTA (gid dans la table depart).
    Version étendue : considère aussi les nœuds HTA issus des tables `rx_*` (poste-hta / poteau-hta).
    """
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
        pass

    # Fallback : regarder dans toutes les tables de nœuds HTA (rx postes).
    try:
        for slug, (table_name, meta) in TABLE_BY_SLUG.items():
            s = (slug or "").lower()
            if "poste-hta" not in s and "poteau-hta" not in s:
                continue
            if not _table_has_column(meta, "gid"):
                continue
            try:
                cur.execute(
                    f"SELECT 1 FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('gid')} IN ({placeholders}) LIMIT 1",
                    tuple(canon),
                )
                if cur.fetchone() is not None:
                    return True
            except Exception:
                continue
    except Exception:
        return False

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


def _trace_first_poste_cabine_from_nodes(cur, node_ids: set[str]) -> str | None:
    """Retourne le gid d'un poste cabine trouvé depuis un ensemble de nœuds visités BT."""
    if not node_ids:
        return None
    try:
        equip_pairs = _trace_postes_transfos_from_node_ids(cur, node_ids)
        cabine_gids = [
            _canon_id(str(gid))
            for slug, gid in (equip_pairs or [])
            if "poste-cabine" in (_resolve_slug(slug) or "")
        ]
        cabine_gids = [g for g in cabine_gids if g]
        return sorted(cabine_gids)[0] if cabine_gids else None
    except Exception:
        return None


def _trace_bfs_bt_to_cabine(cur, start_nodes: set[str]) -> tuple[list[tuple[str, str]], set[str], str | None]:
    """
    Remonte en amont uniquement sur le réseau BT (ligne_bt + côté BT de ligne_brcht),
    jusqu'à trouver un poste cabine.
    Retourne (segments_bt, nœuds_visités_bt, poste_cabine_gid_ou_None).
    """
    start = {_canon_id(n) for n in (start_nodes or set()) if _canon_id(n)}
    if not start:
        return [], set(), None

    visited: set[str] = set(start)
    frontier: set[str] = set(start)
    pairs: list[tuple[str, str]] = []
    seen_pairs: set[tuple[str, str]] = set()
    poste_cabine_gid = _trace_first_poste_cabine_from_nodes(cur, visited)

    while frontier and not poste_cabine_gid:
        next_frontier: set[str] = set()
        fvals = sorted(frontier)
        placeholders = ", ".join(["%s"] * len(fvals))
        # 1) Remontée BT classique
        try:
            cur.execute(
                f"SELECT gid, {quote_ident('id_depart_bt')}, {quote_ident('id_poteau_bt')} "
                f"FROM {quote_ident('ligne_bt')} "
                f"WHERE {_canon_sql_expr('id_poteau_bt')} IN ({placeholders})",
                tuple(fvals),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is not None:
                    key = ("ligne-bt", str(gid_val))
                    if key not in seen_pairs:
                        seen_pairs.add(key)
                        pairs.append(key)
                up = row.get("id_depart_bt")
                up_canon = _canon_id(up) if up is not None else ""
                if up_canon and up_canon not in visited:
                    next_frontier.add(up_canon)
        except Exception:
            pass

        # 2) Branchement BT : accepter aussi id_poteau_hta quand id_poteau_bt est absent
        # (cas fréquent des jeux de données où le branchement est accroché directement au HTA).
        try:
            cur.execute(
                f"SELECT gid, {quote_ident('id_depart_bt')}, {quote_ident('id_poteau_bt')}, {quote_ident('id_poteau_hta')} "
                f"FROM {quote_ident('ligne_brcht')} "
                f"WHERE {_canon_sql_expr('id_poteau_bt')} IN ({placeholders}) "
                f"OR {_canon_sql_expr('id_poteau_hta')} IN ({placeholders})",
                tuple(fvals) * 2,
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is not None:
                    key = ("ligne-brcht", str(gid_val))
                    if key not in seen_pairs:
                        seen_pairs.add(key)
                        pairs.append(key)
                up = row.get("id_depart_bt")
                up_canon = _canon_id(up) if up is not None else ""
                if up_canon and up_canon not in visited:
                    next_frontier.add(up_canon)
        except Exception:
            pass

        next_frontier -= visited
        if not next_frontier:
            break
        visited |= next_frontier
        poste_cabine_gid = _trace_first_poste_cabine_from_nodes(cur, next_frontier)
        frontier = next_frontier

    return pairs, visited, poste_cabine_gid


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


def _trace_nearby_lines_fallback(cur, trace_type: str, ref_id: str, radius_m: int = 120, ref_slug: str = "") -> list[tuple[str, str]]:
    """
    Fallback non directionnel si la connectivité par identifiants n'est pas disponible:
    retourne les lignes proches du point de référence (poste/transfo/point raccordement).
    """
    wkt = _get_ref_point_wkt(trace_type, ref_id, ref_slug=ref_slug)
    if not wkt:
        return []
    # ST_GeogFromText attend un WKT "POINT(lon lat)" sans préfixe SRID.
    geog_ref = wkt
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    spatial_tables: list[tuple[str, str]] = []
    seen_tables: set[tuple[str, str]] = set()
    ref_slug_norm = (ref_slug or "").strip().lower()
    # Si une couche précise a ete choisie (ex. rx-hta-raz-4-troncons), limiter le scan a
    # cette couche rend le fallback deterministe et evite les ambiguittes de schema.
    if ref_slug_norm and ref_slug_norm in TABLE_BY_SLUG:
        table_name, _meta = TABLE_BY_SLUG[ref_slug_norm]
        spatial_tables = [(table_name, ref_slug_norm)]
    else:
        for table_name, slug, _node_cols in _TRACE_EDGE_TABLES:
            k = (table_name, slug)
            if k not in seen_tables:
                seen_tables.add(k)
                spatial_tables.append(k)
        # Inclure aussi les couches importées (ex. rx-hta-*-troncons, rx-bt-*-cable-bt).
        for slug, (table_name, _meta) in TABLE_BY_SLUG.items():
            s = slug.lower()
            if not (_is_line_table(s) or "troncon" in s or "cable" in s):
                continue
            k = (table_name, slug)
            if k not in seen_tables:
                seen_tables.add(k)
                spatial_tables.append(k)

    for table_name, slug in spatial_tables:
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


def _trace_nearby_points_fallback(cur, trace_type: str, ref_id: str, radius_m: int = 120, ref_slug: str = "") -> list[tuple[str, str]]:
    """Fallback spatial pour points : ouvrages ponctuels proches du point de référence."""
    wkt = _get_ref_point_wkt(trace_type, ref_id, ref_slug=ref_slug)
    if not wkt:
        return []
    # ST_GeogFromText attend un WKT "POINT(lon lat)" sans préfixe SRID.
    geog_ref = wkt
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    ref_slug_norm = (ref_slug or "").strip().lower()
    slugs_to_scan = (
        [ref_slug_norm]
        if ref_slug_norm and ref_slug_norm in TABLE_BY_SLUG
        else sorted(TABLE_BY_SLUG.keys())
    )
    for slug in slugs_to_scan:
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


@app.get("/gis/rx-topology-nodes")
def get_rx_topology_nodes(topology_code: str = "rx_raz4"):
    """
    Retourne tous les nœuds de la topologie RX avec leur géométrie WKT (POINT WGS84).
    Inclut les nœuds synthétiques (poteau-hta, poteau-bt, depart-bt) qui n'ont pas
    de couche SHP propre mais ont des coordonnées calculées par clustering.
    Format compatible avec l'endpoint /gis/{slug} pour être chargé comme couche de carte.
    """
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            try:
                cur.execute(
                    """
                    SELECT
                        node_id AS gid,
                        node_type,
                        network_level,
                        business_label AS label,
                        source_slug,
                        source_gid,
                        depart_code,
                        metadata,
                        ST_AsText(geom) AS geom
                    FROM rx_topology_node
                    WHERE topology_code = %s
                      AND geom IS NOT NULL
                    ORDER BY node_type, node_id
                    """,
                    (topology_code,),
                )
                rows = [dict(r) for r in (cur.fetchall() or [])]
                for r in rows:
                    if r.get("metadata") and not isinstance(r["metadata"], str):
                        import json as _json
                        r["metadata"] = _json.dumps(r["metadata"])
                return {"slug": "rx-topology-nodes", "rows": rows, "count": len(rows)}
            except Exception as exc:
                return {"slug": "rx-topology-nodes", "rows": [], "count": 0, "error": str(exc)}


@app.get("/gis/rx-topology-edges")
def get_rx_topology_edges(topology_code: str = "rx_raz4"):
    """
    Retourne les arcs SYNTHÉTIQUES de la topologie RX (bridges HTA-BT, ponts de raccordement)
    avec leur géométrie LINESTRING WGS84. Ces arcs n'ont pas de couche SHP propre mais ont
    des coordonnées calculées à partir des nœuds sources/cibles.
    Seuls les arcs avec géométrie et sans source_slug (synthétiques purs) sont retournés.
    """
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            try:
                cur.execute(
                    """
                    SELECT
                        edge_id AS gid,
                        edge_type,
                        network_level,
                        business_label AS label,
                        source_node_id,
                        target_node_id,
                        depart_code,
                        metadata,
                        ST_AsText(geom) AS geom
                    FROM rx_topology_edge
                    WHERE topology_code = %s
                      AND source_slug IS NULL
                      AND geom IS NOT NULL
                      AND ST_Length(ST_Transform(geom, 32630)) > 1.0
                    ORDER BY edge_type, edge_id
                    """,
                    (topology_code,),
                )
                rows = [dict(r) for r in (cur.fetchall() or [])]
                for r in rows:
                    if r.get("metadata") and not isinstance(r["metadata"], str):
                        import json as _json
                        r["metadata"] = _json.dumps(r["metadata"])
                return {"slug": "rx-topology-edges", "rows": rows, "count": len(rows)}
            except Exception as exc:
                return {"slug": "rx-topology-edges", "rows": [], "count": 0, "error": str(exc)}


@app.get("/gis/trace")
def trace_ouvrages(
    type: str = "poste_source",
    ref_id: str = "",
    ref_slug: str = "",
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

    ref_slug_norm = (ref_slug or "").strip().lower()
    used_spatial_fallback = False

    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                if trace_type == "ouvrage" and has_rx_topology(cur):
                    rx_result = None
                    if ref_slug_norm and is_rx_topology_slug(ref_slug_norm):
                        rx_result = get_rx_trace_result(cur, ref_id, ref_slug=ref_slug_norm, direction=direction)
                    elif not ref_slug_norm:
                        rx_result = get_rx_trace_result(cur, ref_id, ref_slug="", direction=direction)
                    if rx_result and rx_result.get("ouvrage_ids"):
                        return rx_result

                # ref_slug_norm / used_spatial_fallback déjà definis au-dessus
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
                    start_nodes = _trace_resolve_start_nodes(cur, trace_type, ref_id, ref_slug=ref_slug_norm)
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
                        bt_pairs_amont: list[tuple[str, str]] = []
                        bt_visited_amont: set[str] = set()
                        poste_cabine_found: str | None = None

                        # Nouveau flux métier amont :
                        # 1) Remonter BT jusqu'au poste cabine (si départ BT/abonné)
                        # 2) Puis remonter HTA depuis ce poste cabine.
                        needs_bt_bridge = (
                            trace_type in ("abonne", "poste_transformation")
                            or from_point_raccordement
                            or (trace_type == "ouvrage" and not _trace_has_hta_depart_nodes(cur, start_nodes))
                        )
                        if needs_bt_bridge:
                            bt_bridge_start = set(start_nodes)
                            # Depuis un point de raccordement/abonné en amont, inclure explicitement
                            # la ligne de branchement pour ne pas perdre le segment BT de départ.
                            if from_point_raccordement and ligne_brcht_only_gid:
                                seed_pairs = [("ligne-brcht", ligne_brcht_only_gid)]
                                bt_pairs_amont.extend(seed_pairs)
                                # N'injecter que id_depart_bt dans bt_bridge_start (extrémité BT amont).
                                # Exclure id_poteau_hta : s'il était inclus, _trace_first_poste_cabine_from_nodes
                                # trouverait le poste cabine dès la ligne 1359 (avant la boucle BFS),
                                # ce qui empêcherait de parcourir les ligne_bt intermédiaires.
                                try:
                                    lg = _canon_id(ligne_brcht_only_gid)
                                    cur.execute(
                                        "SELECT id_depart_bt FROM ligne_brcht WHERE "
                                        + _canon_sql_expr("gid") + " = %s LIMIT 1",
                                        (lg,),
                                    )
                                    brcht_row = cur.fetchone()
                                    if brcht_row:
                                        v = brcht_row.get("id_depart_bt")
                                        if v is not None and str(v).strip():
                                            bt_bridge_start.add(_canon_id(v))
                                except Exception:
                                    bt_bridge_start |= _trace_line_endpoints_gids_from_pairs(cur, seed_pairs)
                            bt_pairs_walk, bt_visited_walk, poste_cabine_found = _trace_bfs_bt_to_cabine(cur, bt_bridge_start)
                            bt_pairs_amont.extend(bt_pairs_walk)
                            bt_visited_amont |= bt_visited_walk

                        if poste_cabine_found:
                            hta_entry, ligne_hta_cabine_gid = _trace_hta_entry_from_poste_cabine(cur, poste_cabine_found)
                            if hta_entry:
                                _log.debug("hta_entry résolu via poste_cabine %s", poste_cabine_found)

                        # Fallback si poste cabine introuvable ou topologie incomplète
                        if not hta_entry:
                            bridge_start = bt_visited_amont if bt_visited_amont else start_nodes
                            hta_entry = _trace_hta_entry_from_start(cur, bridge_start)
                            _log.warning("hta_entry fallback via pont BT→HTA pour nœud %s", sorted(bridge_start))

                        if hta_entry:
                            hta_pairs, hta_visited = _trace_bfs_from_node(cur, hta_entry, "amont", restrict_to_hta=True)
                            pairs = list(bt_pairs_amont) + list(hta_pairs)
                            visited_nodes = set(bt_visited_amont) | set(hta_visited)
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
                    # used_spatial_fallback déjà initialisé en haut de fonction
                    ref_slug_norm = (ref_slug or "").strip().lower()
                    if not pairs:
                        # Aucun chemin directionnel trouvé : fallback spatial
                        # (utile aussi quand seules des couches importées rx_* existent).
                        for radius in (120, 400, 1200):
                            pairs = _trace_nearby_lines_fallback(cur, trace_type, ref_id, radius_m=radius, ref_slug=ref_slug_norm)
                            if pairs:
                                break
                        for radius in (150, 500, 1500):
                            point_pairs = _trace_nearby_points_fallback(cur, trace_type, ref_id, radius_m=radius, ref_slug=ref_slug_norm)
                            if point_pairs:
                                break
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
                    if effective_direction in ("aval", "tous"):
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


# --- Schéma unifilaire : graphe topologique (nœuds + arêtes) + layout NetworkX ---
# Mapping (table_ligne, colonne) -> slug de la table de nœuds pour construire node_id = f"{slug}:{gid}"
_SCHEMA_EDGE_NODE_COLS = [
    ("ligne_hta", "ligne-hta", [("id_depart_hta", "depart"), ("id_poteau_hta", "poteau-hta")]),
    ("ligne_bt", "ligne-bt", [("id_depart_bt", "depart-bt"), ("id_poteau_bt", "poteau-bt")]),
    ("ligne_brcht", "ligne-brcht", [("id_depart_bt", "depart-bt"), ("id_poteau_bt", "poteau-bt"), ("id_poteau_hta", "poteau-hta")]),
]


def _schema_unifilaire_extract_edges_and_node_gids(cur) -> tuple[list[tuple[str, str, str, str, str, str]], set[str]]:
    """
    Extrait toutes les arêtes (s_slug, s_gid, t_slug, t_gid, line_slug, line_gid) et l'ensemble des gids de nœuds.
    """
    edges_with_gids: list[tuple[str, str, str, str, str, str]] = []
    all_gids: set[str] = set()
    for _table_name, line_slug, node_col_slugs in _SCHEMA_EDGE_NODE_COLS:
        table_name_real = TABLE_BY_SLUG.get(line_slug, (None, {}))[0]
        if not table_name_real:
            continue
        qtable = quote_ident(table_name_real)
        cols = [c for c, _ in node_col_slugs]
        try:
            cur.execute(
                f"SELECT gid, {', '.join(quote_ident(c) for c in cols)} FROM {qtable} "
                "WHERE gid IS NOT NULL"
            )
        except Exception:
            continue
        for row in cur.fetchall() or []:
            line_gid = row.get("gid")
            if line_gid is None:
                continue
            line_gid_str = _canon_id(str(line_gid))
            pairs = []
            for col, node_slug in node_col_slugs:
                v = row.get(col)
                if v is not None and str(v).strip():
                    gid_str = _canon_id(str(v))
                    all_gids.add(gid_str)
                    pairs.append((node_slug, gid_str))
            if len(pairs) >= 2:
                # Une arête par paire consécutive (pour ligne_brcht: depart_bt-poteau_bt, poteau_bt-poteau_hta)
                for i in range(len(pairs) - 1):
                    edges_with_gids.append((pairs[i][0], pairs[i][1], pairs[i + 1][0], pairs[i + 1][1], line_slug, line_gid_str))
    return edges_with_gids, all_gids


def _schema_unifilaire_resolve_gid_to_slug(cur, node_gids: set[str]) -> dict[str, str]:
    """
    Pour chaque gid, détermine le slug de la table (point) qui le contient.
    Retourne dict gid -> slug (un seul slug par gid; si plusieurs tables, on prend le premier trouvé).
    """
    canon_list = sorted(node_gids)
    if not canon_list:
        return {}
    placeholders = ", ".join(["%s"] * len(canon_list))
    gid_to_slug: dict[str, str] = {}
    for slug in sorted(TABLE_BY_SLUG.keys()):
        if not _is_point_table(slug):
            continue
        table_name, meta = TABLE_BY_SLUG[slug]
        if not _table_has_column(meta, "gid"):
            continue
        try:
            cur.execute(
                f"SELECT gid FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                tuple(canon_list),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                if gid_val is not None:
                    gid_str = _canon_id(str(gid_val))
                    if gid_str not in gid_to_slug:
                        gid_to_slug[gid_str] = slug
        except Exception:
            continue
    return gid_to_slug


def _schema_unifilaire_node_labels(cur, gid_to_slug: dict[str, str]) -> dict[str, str]:
    """
    Retourne pour chaque node_id un libellé orienté métier (numéro/codification en priorité),
    sans exposer le gid dans le texte affiché.
    """
    labels: dict[str, str] = {}
    label_cols = ["codification", "numero_ouvrage", "numero_poste", "numero_depart", "numero", "name", "nom", "code", "assetid", "objectid"]
    slug_counts: Counter[str] = Counter()
    slug_base_map: dict[str, str] = {
        "poste-source": "Poste source",
        "depart": "Depart",
        "depart-bt": "Depart BT",
        "poste-cabine": "Poste cabine",
        "poste-transformation": "Poste transfo",
        "transformateur": "Transformateur",
        "abonne": "Abonne",
        "point-raccordement": "Point raccordement",
        "branchement": "Branchement",
    }

    def _fallback_label_for_slug(slug: str) -> str:
        slug_counts[slug] += 1
        base = slug_base_map.get(slug, (slug or "Noeud").replace("-", " ").strip().title() or "Noeud")
        return f"{base} #{slug_counts[slug]}"

    for gid_str, slug in gid_to_slug.items():
        node_id = f"{slug}:{gid_str}"
        table_name, meta = TABLE_BY_SLUG.get(slug, (None, {}))
        if not table_name:
            labels[node_id] = _fallback_label_for_slug(slug)
            continue
        cols = get_all_columns(meta)
        candidates = [c for c in label_cols if c in cols]
        if not candidates:
            labels[node_id] = _fallback_label_for_slug(slug)
            continue
        try:
            cur.execute(
                f"SELECT {', '.join(quote_ident(c) for c in candidates)} FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                (gid_str,),
            )
            row = cur.fetchone()
            if not row:
                labels[node_id] = _fallback_label_for_slug(slug)
                continue
            # Prendre la première valeur non vide ; sinon fallback lisible (sans gid)
            value = ""
            for c in candidates:
                v = row.get(c)
                if v is not None and str(v).strip():
                    value = str(v).strip()[:60]
                    break
            if not value:
                value = _fallback_label_for_slug(slug)
            labels[node_id] = value
        except Exception:
            labels[node_id] = _fallback_label_for_slug(slug)
    # Éviter les doublons sans utiliser le gid : suffixe numérique stable.
    dup_count = Counter(labels.values())
    dup_seq: Counter[str] = Counter()
    for node_id, lbl in list(labels.items()):
        if dup_count[lbl] > 1:
            dup_seq[lbl] += 1
            labels[node_id] = f"{lbl} ({dup_seq[lbl]})"
    return labels


def _schema_unifilaire_node_extra(cur, gid_to_slug: dict[str, str]) -> dict[str, dict]:
    """
    Retourne pour chaque node_id les attributs optionnels : state (ouvert/fermé), tension, courant, puissance.
    Seules les colonnes présentes en base sont interrogées.
    """
    from collections import defaultdict
    out: dict[str, dict] = defaultdict(dict)
    by_slug: dict[str, list[str]] = defaultdict(list)
    for gid_str, slug in gid_to_slug.items():
        by_slug[slug].append(gid_str)
    state_cols = ["etat", "state", "ouvert", "ferme"]
    measure_cols = ["tension", "courant", "puissance"]
    for slug, gids in by_slug.items():
        table_name, meta = TABLE_BY_SLUG.get(slug, (None, {}))
        if not table_name or not gids:
            continue
        cols = get_all_columns(meta)
        opt_state = [c for c in state_cols if c in cols]
        opt_measure = [c for c in measure_cols if c in cols]
        if not opt_state and not opt_measure:
            continue
        select_cols = ["gid"] + opt_state + opt_measure
        placeholders = ", ".join(["%s"] * len(gids))
        try:
            cur.execute(
                f"SELECT {', '.join(quote_ident(c) for c in select_cols)} FROM {quote_ident(table_name)} WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                tuple(gids),
            )
            for row in cur.fetchall() or []:
                gid_val = row.get("gid")
                gid_str = _canon_id(gid_val) if gid_val is not None else None
                if not gid_str:
                    continue
                node_id = f"{slug}:{gid_str}"
                if opt_state:
                    state_val = None
                    for c in opt_state:
                        v = row.get(c)
                        if v is not None and str(v).strip():
                            state_val = str(v).strip().lower()
                            if state_val in ("1", "true", "oui", "ferme", "fermé", "closed"):
                                state_val = "ferme"
                            elif state_val in ("0", "false", "non", "ouvert", "open"):
                                state_val = "ouvert"
                            break
                    if state_val:
                        out[node_id]["state"] = state_val
                for c in opt_measure:
                    v = row.get(c)
                    if v is not None:
                        try:
                            out[node_id][c] = float(v)
                        except (TypeError, ValueError):
                            out[node_id][c] = str(v)
        except Exception:
            pass
    return dict(out)


def _schema_unifilaire_node_slug(node_id: str) -> str:
    """Partie slug d'un node_id « slug:gid »."""
    if not node_id or ":" not in str(node_id):
        return ""
    return str(node_id).split(":", 1)[0].strip().lower()


def _schema_unifilaire_node_gid_part(node_id: str) -> str:
    if not node_id or ":" not in str(node_id):
        return ""
    return _canon_id(str(node_id).split(":", 1)[1])


def _schema_unifilaire_slug_is_contractible(slug: str) -> bool:
    """
    Nœuds « tronçon » à supprimer / fusionner : poteaux, cellules, parafoudres.
    On conserve : poste source, départs, transformateurs, postes cabines, clients (abonnés, points de raccordement, etc.).
    """
    s = (slug or "").lower()
    if "poteau" in s:
        return True
    if "cellule" in s or "parafoudre" in s:
        return True
    return False


def _schema_unifilaire_line_slug_priority(slug: str) -> int:
    s = (slug or "").lower()
    if "hta" in s:
        return 3
    if "bt" in s and "brcht" not in s:
        return 2
    if "brcht" in s:
        return 1
    return 0


def _schema_unifilaire_merge_line_slug(a: str, b: str) -> str:
    """Fusionne deux types de ligne pour un tronçon contracté (priorité métier HTA > BT > branchement)."""
    a = (a or "").strip()
    b = (b or "").strip()
    if not a:
        return b
    if not b:
        return a
    if _schema_unifilaire_line_slug_priority(a) >= _schema_unifilaire_line_slug_priority(b):
        return a
    return b


def _schema_unifilaire_simplify_graph(
    edges_for_nx: list[tuple[str, str, str, str]],
) -> tuple[list[tuple[str, str, str, str]], set[str]]:
    """
    Étape 1 — Nettoyage : suppression des nœuds intermédiaires (poteaux, etc.) et fusion des tronçons.
    Retourne des arêtes non orientées (u, v) avec métadonnées de ligne fusionnées.
    """
    G = nx.Graph()
    for s, t, ls, lg in edges_for_nx:
        if s == t:
            continue
        ls = (ls or "").strip()
        lg = (lg or "").strip()
        if G.has_edge(s, t):
            od = G[s][t]
            od["line_slug"] = _schema_unifilaire_merge_line_slug(od.get("line_slug", ""), ls)
            od["line_gid"] = (od.get("line_gid") or lg) or od.get("line_gid") or ""
        else:
            G.add_edge(s, t, line_slug=ls, line_gid=lg)
    changed = True
    safety = 0
    while changed and safety < 50000:
        safety += 1
        changed = False
        for v in list(G.nodes()):
            slug = _schema_unifilaire_node_slug(str(v))
            if not _schema_unifilaire_slug_is_contractible(slug):
                continue
            deg = G.degree(v)
            if deg == 2:
                a, b = list(G.neighbors(v))
                d_a = G[v][a]
                d_b = G[v][b]
                ls_m = _schema_unifilaire_merge_line_slug(d_a.get("line_slug", ""), d_b.get("line_slug", ""))
                lg_m = (d_a.get("line_gid") or d_b.get("line_gid") or "").strip()
                G.remove_node(v)
                if a == b:
                    changed = True
                    continue
                if G.has_edge(a, b):
                    od = G[a][b]
                    od["line_slug"] = _schema_unifilaire_merge_line_slug(od.get("line_slug", ""), ls_m)
                    od["line_gid"] = (od.get("line_gid") or lg_m) or od.get("line_gid") or ""
                else:
                    G.add_edge(a, b, line_slug=ls_m, line_gid=lg_m)
                changed = True
            elif deg == 1:
                G.remove_node(v)
                changed = True
            elif deg == 0:
                G.remove_node(v)
                changed = True
    out_edges: list[tuple[str, str, str, str]] = []
    for a, b in G.edges():
        ls = G[a][b].get("line_slug", "") or ""
        lg = G[a][b].get("line_gid", "") or ""
        out_edges.append((a, b, ls, lg))
    nodes = set(G.nodes())
    return out_edges, nodes


def _schema_unifilaire_pick_tree_root(nodes: set[str], start_gids: set[str], gid_to_node_id: dict[str, str]) -> str | None:
    """Racine de l'arbre logique : poste source si présent, sinon transfo PS, sinon nœud du tracé."""
    if not nodes:
        return None
    postes = sorted(n for n in nodes if n.startswith("poste-source:"))
    if postes:
        return postes[0]
    transfos = sorted(
        n for n in nodes if "transfo" in _schema_unifilaire_node_slug(n) or "poste-cabine" in _schema_unifilaire_node_slug(n)
    )
    if transfos:
        return transfos[0]
    for gid in sorted(start_gids):
        nid = gid_to_node_id.get(_canon_id(str(gid)))
        if nid and nid in nodes:
            return nid
    return sorted(nodes)[0]


def _schema_unifilaire_bfs_tree_edges(
    undirected_edges: list[tuple[str, str, str, str]],
    root: str | None,
) -> tuple[list[tuple[str, str, str, str]], set[str]]:
    """
    Transforme le graphe simplifié en arbre logique (arêtes orientées parent → enfant).
    Ne conserve que la composante connexe de la racine.
    """
    if not root:
        return [], set()
    adj: defaultdict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for s, t, ls, lg in undirected_edges:
        adj[s].append((t, ls, lg))
        adj[t].append((s, ls, lg))
    if root not in adj:
        return [], {root}
    tree_edges: list[tuple[str, str, str, str]] = []
    seen: set[str] = {root}
    q: deque[str] = deque([root])
    while q:
        u = q.popleft()
        for v, ls, lg in adj[u]:
            if v not in seen:
                seen.add(v)
                tree_edges.append((u, v, ls, lg))
                q.append(v)
    return tree_edges, seen


def _schema_unifilaire_orient_edges_from_root(
    edge_records: list[tuple[str, str, str, str]],
    root: str | None,
) -> list[tuple[str, str, str, str]]:
    """
    Oriente les arêtes pour un flux visuel cohérent source -> aval.
    Règle: nœud le plus proche de la racine = amont (source de l'arête).
    """
    if not edge_records:
        return edge_records
    if not root:
        return edge_records

    UG = nx.Graph()
    for s, t, _ls, _lg in edge_records:
        UG.add_edge(s, t)
    if root not in UG:
        return edge_records

    distances = nx.single_source_shortest_path_length(UG, root)
    oriented: list[tuple[str, str, str, str]] = []
    for s, t, ls, lg in edge_records:
        s_slug = _schema_unifilaire_node_slug(s)
        t_slug = _schema_unifilaire_node_slug(t)
        # Priorité métier absolue: poste source toujours amont.
        s_is_source = "poste-source" in s_slug
        t_is_source = "poste-source" in t_slug
        if s_is_source and not t_is_source:
            oriented.append((s, t, ls, lg))
            continue
        if t_is_source and not s_is_source:
            oriented.append((t, s, ls, lg))
            continue

        ds = distances.get(s)
        dt = distances.get(t)
        if ds is None or dt is None:
            oriented.append((s, t, ls, lg))
            continue
        if ds < dt:
            oriented.append((s, t, ls, lg))
            continue
        if dt < ds:
            oriented.append((t, s, ls, lg))
            continue
        # Égalité de profondeur: fallback métier par étage unifilaire.
        ss = _unifilaire_stage_order(_schema_unifilaire_node_slug(s))
        st = _unifilaire_stage_order(_schema_unifilaire_node_slug(t))
        if ss <= st:
            oriented.append((s, t, ls, lg))
        else:
            oriented.append((t, s, ls, lg))
    return oriented


def _schema_unifilaire_layout_linear_tree(G: nx.DiGraph, root: str) -> dict[str, tuple[float, float]]:
    """
    Étape 3 — Linéarisation : placement orthogonal « synoptique ».

    - **Horizontalement** : les nœuds qui partagent le même parent (frères) sont alignés sur une même
      ligne horizontale (même ordonnée y).
    - **Verticalement** : la profondeur dans l’arbre augmente vers le bas (y croissant) : les branches
      descendent.
    - **Sans croisement** : placement type arbre récursif (sous-arbres contigus en largeur, parent centré
      au-dessus de l’enveloppe de ses enfants), ce qui évite les croisements d’arêtes pour un arbre.

    Coordonnées en pixels (origine en haut à gauche, comme le SVG).
    """
    if root not in G:
        return {}

    # Espacements réduits pour tenir dans une zone d’affichage type 72vh côté front
    VERTICAL_GAP = 72.0
    LEAF_UNIT = 64.0
    SIBLING_GAP = 24.0

    children_cache: dict[str, list[str]] = {}
    for n in G.nodes():
        children_cache[n] = sorted(
            list(G.successors(n)),
            key=lambda x: (str(G.nodes[x].get("label") or x).lower(), x),
        )

    pos: dict[str, tuple[float, float]] = {}

    def assign(n: str, x_left: float, depth: int) -> float:
        """Place le sous-arbre enraciné en ``n`` ; retourne l’abscisse droite du bloc utilisé."""
        ch = children_cache.get(n, [])
        y = depth * VERTICAL_GAP
        if not ch:
            cx = x_left + LEAF_UNIT / 2.0
            pos[n] = (cx, y)
            return x_left + LEAF_UNIT
        x_cur = x_left
        centers: list[float] = []
        for c in ch:
            right = assign(c, x_cur, depth + 1)
            centers.append(pos[c][0])
            x_cur = right + SIBLING_GAP
        cx = (min(centers) + max(centers)) / 2.0 if centers else x_left + LEAF_UNIT / 2.0
        pos[n] = (cx, y)
        return x_cur - SIBLING_GAP

    assign(root, 0.0, 0)

    if not pos:
        return pos
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    margin = 48.0
    min_x = min(xs)
    min_y = min(ys)
    for n in pos:
        x, y = pos[n]
        pos[n] = (x - min_x + margin, y - min_y + margin)
    return pos


def _trace_line_endpoints_gids_from_pairs(cur, line_pairs: list[tuple[str, str]]) -> set[str]:
    """Gids des extrémités (id_depart_*, id_poteau_*) pour chaque ligne HTA/BT/branchement."""
    out: set[str] = set()
    for pair_slug, line_gid in line_pairs:
        if pair_slug not in ("ligne-hta", "ligne-bt", "ligne-brcht"):
            continue
        lg = _canon_id(str(line_gid))
        if not lg:
            continue
        for table_name, slug, node_cols in _TRACE_EDGE_TABLES:
            if slug != pair_slug:
                continue
            try:
                cur.execute(
                    f'SELECT {", ".join(quote_ident(c) for c in node_cols)} FROM {quote_ident(table_name)} '
                    f"WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                    (lg,),
                )
                row = cur.fetchone()
                if not row:
                    break
                for c in node_cols:
                    v = row.get(c)
                    if v is not None and str(v).strip():
                        out.add(_canon_id(v))
            except Exception:
                pass
            break
    return out


def _trace_visited_nodes_for_schema_unifilaire(cur, trace_type: str, ref_id: str, direction: str) -> set[str]:
    """
    Même logique de parcours que GET /gis/trace : HTA amont (poste cabine), extension BT aval,
    postes cabine, fallback spatial, etc. — pour que le schéma unifilaire filtre les mêmes nœuds
    que le tracé sur la carte.
    """
    direction = (direction or "tous").strip().lower()
    if direction not in ("amont", "aval", "tous"):
        direction = "tous"
    trace_type = (trace_type or "ouvrage").strip().lower()
    if trace_type not in ("poste_source", "poste_transformation", "abonne", "ouvrage"):
        trace_type = "ouvrage"

    from_point_raccordement = trace_type == "abonne" or _trace_ref_is_point_raccordement_or_abonne(cur, ref_id)
    ligne_brcht_only_gid, _pt_racc_gid = _trace_get_ligne_brcht_only_for_raccord(cur, ref_id) if from_point_raccordement else (None, None)

    if from_point_raccordement and ligne_brcht_only_gid and direction != "amont":
        pairs = [("ligne-brcht", ligne_brcht_only_gid)]
        visited = _trace_line_endpoints_gids_from_pairs(cur, pairs)
        raccord_pairs = _trace_points_raccordement_from_lines(cur, pairs)
        for _slug, gid in raccord_pairs:
            if gid:
                visited.add(_canon_id(str(gid)))
        return visited

    effective_direction = direction
    if direction == "tous" and from_point_raccordement:
        effective_direction = "amont"
    start_nodes = _trace_resolve_start_nodes(cur, trace_type, ref_id, ref_slug="")
    if not start_nodes:
        return set()
    restrict_to_bt = (
        trace_type == "abonne"
        or (trace_type == "poste_transformation" and direction != "amont")
        or (trace_type == "ouvrage" and not _trace_has_hta_depart_nodes(cur, start_nodes))
    )
    ligne_hta_cabine_gid: str | None = None
    if effective_direction == "amont":
        hta_entry = set()
        bt_pairs_amont: list[tuple[str, str]] = []
        bt_visited_amont: set[str] = set()
        poste_cabine_found: str | None = None

        needs_bt_bridge = (
            trace_type in ("abonne", "poste_transformation")
            or from_point_raccordement
            or (trace_type == "ouvrage" and not _trace_has_hta_depart_nodes(cur, start_nodes))
        )
        if needs_bt_bridge:
            bt_bridge_start = set(start_nodes)
            if from_point_raccordement and ligne_brcht_only_gid:
                seed_pairs = [("ligne-brcht", ligne_brcht_only_gid)]
                bt_pairs_amont.extend(seed_pairs)
                try:
                    lg = _canon_id(ligne_brcht_only_gid)
                    cur.execute(
                        "SELECT id_depart_bt FROM ligne_brcht WHERE "
                        + _canon_sql_expr("gid") + " = %s LIMIT 1",
                        (lg,),
                    )
                    brcht_row = cur.fetchone()
                    if brcht_row:
                        v = brcht_row.get("id_depart_bt")
                        if v is not None and str(v).strip():
                            bt_bridge_start.add(_canon_id(v))
                except Exception:
                    bt_bridge_start |= _trace_line_endpoints_gids_from_pairs(cur, seed_pairs)
            bt_pairs_walk, bt_visited_walk, poste_cabine_found = _trace_bfs_bt_to_cabine(cur, bt_bridge_start)
            bt_pairs_amont.extend(bt_pairs_walk)
            bt_visited_amont |= bt_visited_walk

        if poste_cabine_found:
            hta_entry, ligne_hta_cabine_gid = _trace_hta_entry_from_poste_cabine(cur, poste_cabine_found)
            if hta_entry:
                _log.debug("schema-unifilaire: hta_entry via poste_cabine %s", poste_cabine_found)

        if not hta_entry:
            bridge_start = bt_visited_amont if bt_visited_amont else start_nodes
            hta_entry = _trace_hta_entry_from_start(cur, bridge_start)
            _log.warning("schema-unifilaire: hta_entry fallback BT→HTA pour nœud %s", sorted(bridge_start))

        if hta_entry:
            hta_pairs, hta_visited = _trace_bfs_from_node(cur, hta_entry, "amont", restrict_to_hta=True)
            pairs = list(bt_pairs_amont) + list(hta_pairs)
            visited_nodes = set(bt_visited_amont) | set(hta_visited)
            if ligne_hta_cabine_gid and not any(
                _canon_id(gid) == _canon_id(ligne_hta_cabine_gid) for _s, gid in pairs if _s == "ligne-hta"
            ):
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
    # Si le graphe directionnel n'a rien renvoyé, on tente une recherche spatiale (utile
    # avec les imports rx_* qui ne remplissent pas forcément les champs id_depart_*/id_poteau_*).
    if not pairs:
        ref_slug_norm_local = ""
        pairs = _trace_nearby_lines_fallback(cur, trace_type, ref_id, radius_m=120, ref_slug=ref_slug_norm_local)
        point_pairs = _trace_nearby_points_fallback(cur, trace_type, ref_id, radius_m=150, ref_slug=ref_slug_norm_local)
        equip_pairs = _trace_postes_transfos_from_node_ids(cur, visited_nodes)
        raccord_pairs = _trace_points_raccordement_from_lines(cur, pairs)
        visited_nodes |= _trace_line_endpoints_gids_from_pairs(cur, pairs)
        used_spatial_fallback = len(pairs) > 0

    merged: list[tuple[str, str]] = []
    seen_merged: set[tuple[str, str]] = set()
    for item in (pairs + point_pairs + equip_pairs + raccord_pairs):
        if item not in seen_merged:
            seen_merged.add(item)
            merged.append(item)

    bt_start: set[str] = set()
    if effective_direction in ("aval", "tous"):
        bt_start = _trace_bt_start_from_hta_nodes(cur, visited_nodes)
    poste_cabine_gids = [gid for slug, gid in merged if "poste-cabine" in (slug or "")]
    if poste_cabine_gids and effective_direction in ("tous", "aval"):
        for pc_gid in poste_cabine_gids:
            bt_start |= _trace_resolve_start_nodes(cur, "poste_transformation", pc_gid)
    bt_visited: set[str] = set()
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

    visited = set(visited_nodes)
    visited |= bt_visited
    for _slug, gid in merged:
        if gid:
            visited.add(_canon_id(str(gid)))
    return visited


@app.get("/gis/schema-unifilaire")
def get_schema_unifilaire(
    ref_id: str = Query(..., description="Codification (numéro de l'ouvrage) ou gid pour lequel générer le schéma"),
    type_ouvrage: str = Query("ouvrage", description="Type d'ouvrage : poste_source | poste_transformation | abonne | ouvrage"),
    direction: str = Query("tous", description="Direction du tracé : amont | aval | tous (réseau connecté)"),
    ref_slug: str = Query("", description="Slug de la couche source (optionnel, recommandé pour RX)"),
    mode: str = Query("complet", description="Mode de rendu : complet | compact"),
):
    """
    Schéma unifilaire du réseau **par ouvrage** : graphe topologique des nœuds et arêtes connectés
    à l'ouvrage donné. ref_id = codification (numéro de l'ouvrage) ou gid. Même logique que le tracé.

    **Alignement carte** : les nœuds inclus sont filtrés avec la même règle que GET /gis/trace (même type,
    direction, remontée HTA amont, extension BT, poste cabine, fallback spatial).

    **Étape 1 (nettoyage)** : fusion des tronçons en supprimant les nœuds intermédiaires (poteaux HTA/BT,
    cellules, parafoudres) ; les types de ligne sont fusionnés avec priorité HTA > BT > branchement.

    **Arbre logique** : le sous-graphe simplifié est ramené à un arbre (BFS) depuis la racine métier
    (poste source si présent, sinon transfo / poste cabine, sinon le nœud du tracé). Seule la composante
    connexe de cette racine est renvoyée (hiérarchie type poste → départs → transfo → clients).

    **Étape 3 (linéarisation)** : coordonnées calculées pour un dessin de haut en bas — frères alignés
    horizontalement, profondeur verticale vers le bas, placement type arbre sans croisement d’arêtes.
    """
    ref_id = (ref_id or "").strip()
    if not ref_id:
        raise HTTPException(status_code=400, detail="Codification (numéro de l'ouvrage) requise.")
    type_ouvrage = (type_ouvrage or "ouvrage").strip().lower()
    if type_ouvrage not in ("poste_source", "poste_transformation", "abonne", "ouvrage"):
        type_ouvrage = "ouvrage"
    direction = (direction or "tous").strip().lower()
    if direction not in ("amont", "aval", "tous"):
        direction = "tous"
    mode = (mode or "complet").strip().lower()
    if mode not in ("complet", "compact"):
        mode = "complet"
    try:
        with get_connection() as conn:
            with get_cursor(conn) as cur:
                ref_slug_norm = (ref_slug or "").strip().lower()
                if type_ouvrage == "ouvrage" and has_rx_topology(cur):
                    rx_result = None
                    if ref_slug_norm and is_rx_topology_slug(ref_slug_norm):
                        rx_result = get_rx_schema_result(cur, ref_id, ref_slug=ref_slug_norm, direction=direction, mode=mode)
                    elif not ref_slug_norm:
                        rx_result = get_rx_schema_result(cur, ref_id, ref_slug="", direction=direction, mode=mode)
                    if rx_result and (rx_result.get("nodes") or rx_result.get("edges")):
                        for node in rx_result.get("nodes", []):
                            node["symbol"] = _slug_to_symbol(str(node.get("type") or ""))
                        return rx_result

                # 1) Même ensemble de nœuds que le tracé carte (/gis/trace) pour ref_id + type + direction
                visited = _trace_visited_nodes_for_schema_unifilaire(cur, type_ouvrage, ref_id, direction)
                if not visited:
                    return {
                        "nodes": [],
                        "edges": [],
                        "message": "Ouvrage introuvable ou aucun nœud connecté (vérifiez la codification, le type et la même direction que sur la carte).",
                    }
                start_ids = _trace_resolve_start_nodes(cur, type_ouvrage, ref_id) or set()
                # 3) Extraire toutes les arêtes puis garder seulement celles dont les deux extrémités sont dans visited
                edges_raw, all_gids = _schema_unifilaire_extract_edges_and_node_gids(cur)
                gid_to_slug: dict[str, str] = {}
                for s_slug, s_gid, t_slug, t_gid, _line_slug, _line_gid in edges_raw:
                    gid_to_slug[s_gid] = s_slug
                    gid_to_slug[t_gid] = t_slug
                # Canoniser le type réel de chaque gid via les tables de points.
                # Evite les doublons du style "poteau-hta:<gid>" + "poste-cabine:<gid>"
                # quand ligne_hta.id_poteau_hta référence en réalité un poste cabine.
                try:
                    gids_for_resolution = set(gid_to_slug.keys()) | {g for g in visited if _canon_id(g)}
                    resolved_slug = _schema_unifilaire_resolve_gid_to_slug(cur, gids_for_resolution)
                    if resolved_slug:
                        gid_to_slug.update(resolved_slug)
                except Exception:
                    pass
                gid_to_node_id = {gid_str: f"{slug}:{gid_str}" for gid_str, slug in gid_to_slug.items()}
                allowed_node_ids = {gid_to_node_id[g] for g in visited if g in gid_to_node_id}
                edges_for_nx: list[tuple[str, str, str, str]] = []
                for s_slug, s_gid, t_slug, t_gid, line_slug, line_gid in edges_raw:
                    sid = gid_to_node_id.get(s_gid) or f"{s_slug}:{s_gid}"
                    tid = gid_to_node_id.get(t_gid) or f"{t_slug}:{t_gid}"
                    if sid in allowed_node_ids and tid in allowed_node_ids:
                        edges_for_nx.append((sid, tid, line_slug, line_gid))
                if not edges_for_nx:
                    return {
                        "nodes": [],
                        "edges": [],
                        "message": "Aucune arête connectée à cet ouvrage (vérifiez la topologie des lignes).",
                    }
                # 4) Limiter gid_to_slug et labels aux nœuds effectivement dans le sous-graphe
                node_set = set()
                for s, t, _ls, _lg in edges_for_nx:
                    node_set.add(s)
                    node_set.add(t)
                gid_to_slug = {
                    gid_str: slug
                    for gid_str, slug in gid_to_slug.items()
                    if gid_to_node_id.get(gid_str) in node_set
                }
                # Nœuds racine : poste source (transfo de puissance) en tête pour chaque départ HTA
                dep_meta = TABLE_BY_SLUG.get("depart", (None, {}))[1] or {}
                if _table_has_column(dep_meta, "gid") and _table_has_column(dep_meta, "id_poste_source"):
                    depart_node_ids = [n for n in node_set if n.startswith("depart:") and "depart-bt" not in n]
                    depart_gids = [_canon_id(n.split(":", 1)[-1]) for n in depart_node_ids if ":" in n]
                    if depart_gids:
                        placeholders = ", ".join(["%s"] * len(depart_gids))
                        try:
                            cur.execute(
                                f"SELECT {_canon_sql_expr('gid')} AS gid, id_poste_source FROM depart WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                                tuple(depart_gids),
                            )
                            for row in cur.fetchall() or []:
                                ps_gid = _canon_id(row.get("id_poste_source"))
                                dep_gid = _canon_id(row.get("gid"))
                                if not ps_gid or not dep_gid:
                                    continue
                                ps_node_id = f"poste-source:{ps_gid}"
                                dep_node_id = f"depart:{dep_gid}"
                                if dep_node_id not in node_set:
                                    continue
                                node_set.add(ps_node_id)
                                gid_to_slug[ps_gid] = "poste-source"
                                edges_for_nx.append((ps_node_id, dep_node_id, "ligne-hta", ""))
                        except Exception:
                            pass
                # Liaisons métier HTA→BT : relier explicitement les départs BT à leur poste/transfo
                # pour conserver la logique de transition (poste cabine / transfo) dans le schéma.
                dep_bt_table, dep_bt_meta = TABLE_BY_SLUG.get("depart-bt", (None, {}))
                dep_bt_fk_cols = [
                    c for c in ("id_poste_cabine", "id_poste_sur_poteau", "id_transfo_ht_bt", "id_transfo_poteau")
                    if _table_has_column(dep_bt_meta, c)
                ]
                depart_bt_node_ids = [n for n in node_set if n.startswith("depart-bt:")]
                depart_bt_gids = [_canon_id(n.split(":", 1)[-1]) for n in depart_bt_node_ids if ":" in n]
                if dep_bt_table and depart_bt_gids and dep_bt_fk_cols:
                    try:
                        placeholders = ", ".join(["%s"] * len(depart_bt_gids))
                        select_cols = ["gid"] + dep_bt_fk_cols
                        cur.execute(
                            f"SELECT {', '.join(quote_ident(c) for c in select_cols)} "
                            f"FROM {quote_ident(dep_bt_table)} "
                            f"WHERE {_canon_sql_expr('gid')} IN ({placeholders})",
                            tuple(depart_bt_gids),
                        )
                        dep_bt_links: list[tuple[str, str]] = []
                        transfo_gids: set[str] = set()
                        for row in cur.fetchall() or []:
                            dep_gid = _canon_id(row.get("gid"))
                            if not dep_gid:
                                continue
                            for fk in dep_bt_fk_cols:
                                target_gid = _canon_id(row.get(fk))
                                if target_gid:
                                    dep_bt_links.append((dep_gid, target_gid))
                                    transfo_gids.add(target_gid)
                        if transfo_gids:
                            transfo_gid_to_slug = _schema_unifilaire_resolve_gid_to_slug(cur, transfo_gids)
                            existing_edges = {(s, t, ls, lg) for s, t, ls, lg in edges_for_nx}
                            for dep_gid, target_gid in dep_bt_links:
                                target_slug = transfo_gid_to_slug.get(target_gid)
                                if not target_slug:
                                    continue
                                dep_node_id = f"depart-bt:{dep_gid}"
                                target_node_id = f"{target_slug}:{target_gid}"
                                node_set.add(dep_node_id)
                                node_set.add(target_node_id)
                                gid_to_slug[target_gid] = target_slug
                                synthetic_edge = (target_node_id, dep_node_id, "ligne-bt", "")
                                if synthetic_edge not in existing_edges:
                                    edges_for_nx.append(synthetic_edge)
                                    existing_edges.add(synthetic_edge)
                    except Exception:
                        pass
                # Liaisons métier HTA -> poste cabine/transfo :
                # dans certains jeux de données, le poste n'est pas endpoint direct de ligne_hta
                # (seul id_ligne_hta est renseigné sur le poste). On reconnecte explicitement.
                cabine_like = [
                    (g, s) for g, s in gid_to_slug.items()
                    if ("poste-cabine" in (s or "")) or ("transfo-ht-bt" in (s or ""))
                ]
                if cabine_like:
                    try:
                        existing_edges = {(s, t, ls, lg) for s, t, ls, lg in edges_for_nx}
                        for cab_gid, cab_slug in cabine_like:
                            table_name, meta = TABLE_BY_SLUG.get(cab_slug, (None, {}))
                            if not table_name or not _table_has_column(meta, "id_ligne_hta"):
                                continue
                            cur.execute(
                                f"SELECT id_ligne_hta FROM {quote_ident(table_name)} "
                                f"WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                                (cab_gid,),
                            )
                            r = cur.fetchone()
                            line_gid = _canon_id(r.get("id_ligne_hta")) if r and r.get("id_ligne_hta") else ""
                            if not line_gid:
                                continue
                            cur.execute(
                                "SELECT gid, id_depart_hta, id_poteau_hta FROM ligne_hta "
                                f"WHERE {_canon_sql_expr('gid')} = %s LIMIT 1",
                                (line_gid,),
                            )
                            lr = cur.fetchone()
                            if not lr:
                                continue
                            l_gid = _canon_id(lr.get("gid"))
                            hta_targets = [_canon_id(lr.get("id_poteau_hta")), _canon_id(lr.get("id_depart_hta"))]
                            source_node = f"{cab_slug}:{cab_gid}"
                            node_set.add(source_node)
                            for tgt_gid in hta_targets:
                                if not tgt_gid:
                                    continue
                                tgt_slug = gid_to_slug.get(tgt_gid)
                                if not tgt_slug:
                                    continue
                                target_node = f"{tgt_slug}:{tgt_gid}"
                                node_set.add(target_node)
                                synthetic_edge = (target_node, source_node, "ligne-hta", l_gid or line_gid)
                                if synthetic_edge not in existing_edges:
                                    edges_for_nx.append(synthetic_edge)
                                    existing_edges.add(synthetic_edge)
                    except Exception:
                        pass
                # Liaisons métier BT aval: ligne de branchement -> point de raccordement -> branchement
                # afin d'afficher correctement les extrémités clients dans le schéma unifilaire.
                try:
                    existing_edges = {(s, t, ls, lg) for s, t, ls, lg in edges_for_nx}
                    line_brcht_anchor: dict[str, str] = {}
                    line_brcht_gids: set[str] = set()
                    for s_slug, s_gid, t_slug, t_gid, line_slug, line_gid in edges_raw:
                        if line_slug != "ligne-brcht":
                            continue
                        lg = _canon_id(line_gid)
                        if not lg:
                            continue
                        line_brcht_gids.add(lg)
                        s_node = gid_to_node_id.get(s_gid) or f"{s_slug}:{s_gid}"
                        t_node = gid_to_node_id.get(t_gid) or f"{t_slug}:{t_gid}"
                        # Priorité de rattachement visuel: poteau BT > depart BT > autre
                        cand = None
                        for n in (s_node, t_node):
                            if n.startswith("poteau-bt:"):
                                cand = n
                                break
                        if not cand:
                            for n in (s_node, t_node):
                                if n.startswith("depart-bt:"):
                                    cand = n
                                    break
                        if not cand:
                            cand = s_node
                        if lg not in line_brcht_anchor and cand:
                            line_brcht_anchor[lg] = cand

                    if line_brcht_gids:
                        placeholders = ", ".join(["%s"] * len(line_brcht_gids))
                        candidate_pr_slugs = [s for s in sorted(TABLE_BY_SLUG.keys()) if ("point" in s and "raccord" in s)]
                        pr_node_by_gid: dict[str, str] = {}
                        pr_gids: set[str] = set()
                        for pr_slug in candidate_pr_slugs:
                            pr_table, pr_meta = TABLE_BY_SLUG.get(pr_slug, (None, {}))
                            if not pr_table or not (_table_has_column(pr_meta, "gid") and _table_has_column(pr_meta, "id_ligne_brcht")):
                                continue
                            try:
                                cur.execute(
                                    f"SELECT gid, id_ligne_brcht FROM {quote_ident(pr_table)} "
                                    f"WHERE {_canon_sql_expr('id_ligne_brcht')} IN ({placeholders})",
                                    tuple(line_brcht_gids),
                                )
                                for row in cur.fetchall() or []:
                                    pr_gid = _canon_id(row.get("gid"))
                                    l_gid = _canon_id(row.get("id_ligne_brcht"))
                                    if not pr_gid or not l_gid:
                                        continue
                                    anchor = line_brcht_anchor.get(l_gid)
                                    if not anchor:
                                        continue
                                    pr_node = f"{pr_slug}:{pr_gid}"
                                    node_set.add(pr_node)
                                    gid_to_slug[pr_gid] = pr_slug
                                    pr_node_by_gid[pr_gid] = pr_node
                                    pr_gids.add(pr_gid)
                                    rec = (anchor, pr_node, "ligne-brcht", l_gid)
                                    if rec not in existing_edges:
                                        edges_for_nx.append(rec)
                                        existing_edges.add(rec)
                            except Exception:
                                continue

                        # Branchements client relies au point de raccordement
                        if pr_gids:
                            candidate_br_slugs = [s for s in sorted(TABLE_BY_SLUG.keys()) if "branchement" in s]
                            br_placeholders = ", ".join(["%s"] * len(pr_gids))
                            for br_slug in candidate_br_slugs:
                                br_table, br_meta = TABLE_BY_SLUG.get(br_slug, (None, {}))
                                if not br_table or not (_table_has_column(br_meta, "gid") and _table_has_column(br_meta, "id_point_raccordement")):
                                    continue
                                try:
                                    cur.execute(
                                        f"SELECT gid, id_point_raccordement FROM {quote_ident(br_table)} "
                                        f"WHERE {_canon_sql_expr('id_point_raccordement')} IN ({br_placeholders})",
                                        tuple(pr_gids),
                                    )
                                    for row in cur.fetchall() or []:
                                        br_gid = _canon_id(row.get("gid"))
                                        pr_gid = _canon_id(row.get("id_point_raccordement"))
                                        if not br_gid or not pr_gid:
                                            continue
                                        pr_node = pr_node_by_gid.get(pr_gid)
                                        if not pr_node:
                                            continue
                                        br_node = f"{br_slug}:{br_gid}"
                                        node_set.add(br_node)
                                        gid_to_slug[br_gid] = br_slug
                                        rec = (pr_node, br_node, "ligne-brcht", "")
                                        if rec not in existing_edges:
                                            edges_for_nx.append(rec)
                                            existing_edges.add(rec)
                                except Exception:
                                    continue
                except Exception:
                    pass
                if mode == "compact":
                    # 5) Simplification topologique (tronçons / poteaux) puis arbre logique depuis la racine métier
                    edges_simple, nodes_simple = _schema_unifilaire_simplify_graph(edges_for_nx)
                    if not nodes_simple:
                        return {
                            "nodes": [],
                            "edges": [],
                            "message": "Aucun équipement métier après fusion des tronçons intermédiaires.",
                        }
                    tree_root = _schema_unifilaire_pick_tree_root(nodes_simple, start_ids, gid_to_node_id)
                    tree_edges, reachable = _schema_unifilaire_bfs_tree_edges(edges_simple, tree_root)
                    if not reachable:
                        return {
                            "nodes": [],
                            "edges": [],
                            "message": "Impossible de déterminer la racine du schéma (poste source / transfo).",
                        }
                    reachable_gids = {_schema_unifilaire_node_gid_part(n) for n in reachable if ":" in str(n)}
                    gid_to_slug = {
                        g: s for g, s in gid_to_slug.items() if g in reachable_gids
                    }
                    for n in reachable:
                        g = _schema_unifilaire_node_gid_part(n)
                        sl = _schema_unifilaire_node_slug(n)
                        if g and sl and g not in gid_to_slug:
                            gid_to_slug[g] = sl
                    node_labels = _schema_unifilaire_node_labels(cur, gid_to_slug)
                    node_list = sorted(reachable)
                    G = nx.DiGraph()
                    for n in node_list:
                        gid_part = _schema_unifilaire_node_gid_part(n)
                        slug_attr = gid_to_slug.get(gid_part) or _schema_unifilaire_node_slug(n)
                        G.add_node(n, slug=slug_attr, label=node_labels.get(n, n))
                    for s, t, line_slug, line_gid in tree_edges:
                        G.add_edge(s, t, line_slug=line_slug, line_gid=line_gid)
                    pos = _schema_unifilaire_layout_linear_tree(G, tree_root)
                    edge_records = tree_edges
                    edge_records = _schema_unifilaire_orient_edges_from_root(edge_records, tree_root)
                else:
                    # Mode complet: conserver les objets connectés sans simplification ni réduction en arbre.
                    visited_gids = {_canon_id(g) for g in visited if _canon_id(g)}
                    unresolved = {g for g in visited_gids if g not in gid_to_slug}
                    if unresolved:
                        gid_to_slug.update(_schema_unifilaire_resolve_gid_to_slug(cur, unresolved))
                    node_set_full = set(node_set)
                    if not node_set_full:
                        return {
                            "nodes": [],
                            "edges": [],
                            "message": "Aucun nœud exploitable en mode complet.",
                        }
                    node_labels = _schema_unifilaire_node_labels(cur, gid_to_slug)
                    all_nodes = sorted(node_set_full)
                    G = nx.DiGraph()
                    for n in all_nodes:
                        gid_part = _schema_unifilaire_node_gid_part(n)
                        slug_attr = gid_to_slug.get(gid_part) or _schema_unifilaire_node_slug(n)
                        G.add_node(n, slug=slug_attr, label=node_labels.get(n, n))
                    seen_edges: set[tuple[str, str, str, str]] = set()
                    all_edge_records: list[tuple[str, str, str, str]] = []
                    for s, t, line_slug, line_gid in edges_for_nx:
                        if s not in G.nodes or t not in G.nodes:
                            continue
                        rec = (s, t, line_slug, line_gid)
                        if rec in seen_edges:
                            continue
                        seen_edges.add(rec)
                        G.add_edge(s, t, line_slug=line_slug, line_gid=line_gid)
                        all_edge_records.append(rec)
                    UG = nx.Graph()
                    UG.add_nodes_from(all_nodes)
                    UG.add_edges_from([(s, t) for s, t, _ls, _lg in all_edge_records])

                    # Garder uniquement la composante connectée à la racine métier, pour rester cohérent
                    # avec le tracé carte (évite les nœuds/segments isolés visuellement).
                    root_full = _schema_unifilaire_pick_tree_root(set(all_nodes), start_ids, gid_to_node_id)
                    if root_full and root_full in UG:
                        keep_nodes = set(nx.node_connected_component(UG, root_full))
                    else:
                        comps = list(nx.connected_components(UG))
                        keep_nodes = set(max(comps, key=len)) if comps else set(all_nodes)
                    node_list = sorted(keep_nodes)
                    edge_records = [
                        (s, t, line_slug, line_gid)
                        for s, t, line_slug, line_gid in all_edge_records
                        if s in keep_nodes and t in keep_nodes
                    ]
                    edge_records = _schema_unifilaire_orient_edges_from_root(edge_records, root_full)

                    if len(node_list) == 1:
                        pos = {node_list[0]: (120.0, 120.0)}
                    else:
                        UG_keep = UG.subgraph(keep_nodes).copy()
                        raw_pos = nx.spring_layout(UG_keep, seed=42, k=0.9, iterations=120)
                        xs = [p[0] for p in raw_pos.values()] or [0.0]
                        ys = [p[1] for p in raw_pos.values()] or [0.0]
                        min_x, max_x = min(xs), max(xs)
                        min_y, max_y = min(ys), max(ys)
                        span_x = (max_x - min_x) if (max_x - min_x) > 1e-9 else 1.0
                        span_y = (max_y - min_y) if (max_y - min_y) > 1e-9 else 1.0
                        margin = 64.0
                        width = 1200.0
                        height = 760.0
                        pos = {}
                        for nid, (rx, ry) in raw_pos.items():
                            x = margin + ((rx - min_x) / span_x) * (width - 2 * margin)
                            y = margin + ((ry - min_y) / span_y) * (height - 2 * margin)
                            pos[nid] = (x, y)

                # Cohérence métier: une ligne de branchement (ligne-brcht) ne doit pas relier un poste source.
                # Ces arêtes peuvent apparaître dans les données de compatibilité RX (migration) mais ne doivent
                # pas être visualisées comme liaison électrique métier dans le schéma unifilaire.
                filtered_edge_records: list[tuple[str, str, str, str]] = []
                for s, t, line_slug, line_gid in edge_records:
                    if line_slug == "ligne-brcht":
                        s_slug = (_schema_unifilaire_node_slug(s) or "").lower()
                        t_slug = (_schema_unifilaire_node_slug(t) or "").lower()
                        if "poste-source" in s_slug or "poste-source" in t_slug:
                            continue
                    filtered_edge_records.append((s, t, line_slug, line_gid))
                edge_records = filtered_edge_records

                # Après filtrage métier, conserver les nœuds réellement connectés.
                if edge_records:
                    connected_nodes = {s for s, _t, _ls, _lg in edge_records} | {t for _s, t, _ls, _lg in edge_records}
                    node_list = [n for n in node_list if n in connected_nodes]

                node_extra = _schema_unifilaire_node_extra(cur, gid_to_slug)
                # Sortie JSON : nodes avec x, y, type (slug), label ; optionnel : state, tension, courant, puissance
                nodes_out = []
                for n in node_list:
                    slug_attr = G.nodes[n].get("slug") or (n.split(":", 1)[0] if ":" in n else "")
                    payload = {
                        "id": n,
                        "type": slug_attr,
                        "symbol": _slug_to_symbol(slug_attr),
                        "label": G.nodes[n].get("label") or n,
                        "x": round(pos.get(n, (0, 0))[0], 2),
                        "y": round(pos.get(n, (0, 0))[1], 2),
                    }
                    extra = node_extra.get(n) or {}
                    if extra.get("state") is not None:
                        payload["state"] = extra["state"]
                    for key in ("tension", "courant", "puissance"):
                        if key in extra:
                            payload[key] = extra[key]
                    nodes_out.append(payload)
                edges_out = [
                    {"source": s, "target": t, "line_type": line_slug, "line_gid": line_gid}
                    for s, t, line_slug, line_gid in edge_records
                ]
                return {"nodes": nodes_out, "edges": edges_out}
    except Exception as e:
        _log.exception("Schema unifilaire: %s", e)
        raise HTTPException(status_code=500, detail=f"Erreur schéma unifilaire: {e}")


def _unifilaire_stage_order(slug: str) -> int:
    """Ordre d'étage pour le schéma unifilaire (1 = amont, 5 = aval). Aligné avec le frontend."""
    s = (slug or "").lower()
    if "poste-source" in s or "limite-poste" in s or "arrivee" in s:
        return 1
    if "ligne" in s and ("hta" in s or "ht" in s):
        return 2
    if "poteau" in s or "cellule" in s or "transformateur" in s or "transfo" in s or "parafoudre" in s or "poste-cabine" in s:
        return 3
    if "depart" in s and "bt" not in s:
        return 3
    if "ligne" in s and ("bt" in s or "brcht" in s):
        return 4
    if "abonne" in s or "raccordement" in s or "branchement" in s or "compteur" in s:
        return 5
    return 3


def _unifilaire_label(slug: str) -> str:
    """Libellé court d'un slug pour le schéma unifilaire. Aligné avec le frontend."""
    labels = {
        "poste-source": "Poste source",
        "limite-poste-sourc": "Poste source",
        "arrivee": "Arrivée HT",
        "ligne-hta-aerien": "Ligne HTA",
        "ligne-hta-souter": "Ligne HTA",
        "ligne-hta": "Ligne HTA",
        "depart-bt": "Départ BT",
        "depart": "Départ MT",
        "poteau-hta": "Poteau HTA",
        "poteau-bt": "Poteau BT",
        "transformateur-ps": "Transfo puissance",
        "transfo-ht-bt": "Transfo MT/BT",
        "cellule": "Cellule",
        "parafoudre": "Parafoudre",
        "poste-cabine": "Poste cabine",
        "ligne-brcht": "Ligne branchement",
        "ligne-bt": "Ligne BT",
        "point-raccordement": "Point raccordement",
        "branchement": "Branchement",
        "abonne": "Abonné",
        "compteur": "Compteur",
    }
    lower = (slug or "").lower()
    for key, label in sorted(labels.items(), key=lambda x: -len(x[0])):
        if lower == key or key in lower:
            return label
    return slug or "Ouvrage"


def _is_poste_source_trace(by_stage: dict) -> bool:
    """True si le tracé contient au moins un poste source / arrivée HT et des lignes HTA (schéma type poste source)."""
    stage1 = by_stage.get(1, {})
    stage2 = by_stage.get(2, {})
    if not stage1 or not stage2:
        return False
    source_slugs = ["poste-source", "limite-poste", "arrivee", "transformateur-ps"]
    for slug in stage1:
        if any(s in (slug or "").lower() for s in source_slugs):
            return True
    return False


# Correspondance symboles schéma unifilaire ↔ normes (alignée avec le frontend)
# IEC 60617 : symboles graphiques pour schémas électrotechniques (CEI 60617).
# CEI 61850 : nœuds logiques (Logical Nodes) pour modélisation équipements.
SYMBOL_STANDARDS = {
    "sym-poste-source": {"iec60617": "06-02-01", "iec61850": "PTTR"},
    "sym-poste-cabine": {"iec60617": "06-02-01", "iec61850": "YPTR"},
    "sym-transfo-bt": {"iec60617": "06-02-01", "iec61850": "YPTR"},
    "sym-depart-hta": {"iec60617": "07-13-02", "iec61850": "XCBR"},
    "sym-depart-bt": {"iec60617": "07-13-02", "iec61850": "XCBR"},
    "sym-poteau-hta": {"iec60617": "—", "iec61850": "XSWI"},
    "sym-poteau-bt": {"iec60617": "—", "iec61850": "XSWI"},
    "sym-cellule": {"iec60617": "07-13-02", "iec61850": "XCBR"},
    "sym-parafoudre": {"iec60617": "07-14-11", "iec61850": "YSPD"},
    "sym-point-raccordement": {"iec60617": "03-02-01", "iec61850": "MMTR"},
    "sym-abonne": {"iec60617": "03-02-01", "iec61850": "MMTR"},
    "sym-compteur": {"iec60617": "03-02-01", "iec61850": "MMTR"},
    "sym-branchement": {"iec60617": "—", "iec61850": "—"},
    "sym-ouvrage": {"iec60617": "—", "iec61850": "—"},
}


def _slug_to_symbol(slug: str) -> str:
    """
    Retourne l'id du symbole SVG pour un slug (logique électrique / topologique).
    Les symboles sont alignés sur IEC 60617 (graphique) et CEI 61850 (nœuds logiques).
    Voir SYMBOL_STANDARDS pour les références normatives.
    """
    s = (slug or "").lower()
    if "poste-source" in s or "limite-poste" in s or "arrivee" in s or "transformateur-ps" in s:
        return "sym-poste-source"
    if "poste-cabine" in s:
        return "sym-poste-cabine"
    if "transfo" in s:
        return "sym-transfo-bt"
    if "depart-bt" in s:
        return "sym-depart-bt"
    if "depart" in s or ("ligne" in s and ("hta" in s or "ht" in s)):
        return "sym-depart-hta"
    if "poteau-hta" in s:
        return "sym-poteau-hta"
    if "poteau-bt" in s:
        return "sym-poteau-bt"
    if "parafoudre" in s:
        return "sym-parafoudre"
    if "cellule" in s or "ocr" in s or "tur" in s or "coffret" in s:
        return "sym-cellule"
    if "point-raccordement" in s or "raccordement" in s:
        return "sym-point-raccordement"
    if "abonne" in s:
        return "sym-abonne"
    if "compteur" in s:
        return "sym-compteur"
    if "branchement" in s:
        return "sym-branchement"
    return "sym-ouvrage"


def _build_unifilaire_svg_poste_source(by_stage: dict) -> str:
    """
    Schéma unifilaire type « Poste Source » (inspiré poste_source.jsx) :
    Zone HTB → Arrivée(s) / Barres HTB → Transformateur(s) → Barres HTA → Départs HTA.
    Symboles IEC 60617 : sectionneur, disjoncteur, TC, TT, parafoudre, arrivée ligne.
    """
    # Palette fond clair (analyse.md) : fond blanc, zones pastel, fils et barres foncés lisibles
    c_htb = "#c2410c"       # Orange foncé (fils HTB, barre JB-HTB)
    c_hta = "#0369a1"       # Bleu foncé (fils HTA, barre JB-HTA)
    c_wire = "#334155"      # Gris (symboles)
    c_ground = "#15803d"    # Terre
    c_dim = "#1e293b"       # Labels secondaires (lisibles sur blanc)
    c_title = "#1e293b"     # Titre et textes
    c_bg = "#ffffff"        # Fond SVG / modale
    c_zone_label = "#9a3412"  # Labels de zones (ZONE HTB, TABLEAU HTA) — rouge-brun sur blanc
    c_on_busbar = "#ffffff"
    fill_zone_htb = "#fff7f5"
    fill_zone_transfo = "#f8fafc"
    fill_zone_hta = "#f0f9ff"
    stroke_zone_transfo = "#64748b"
    marge = 24

    n_sources = sum(by_stage.get(1, {}).values()) or 1
    n_hta = sum(by_stage.get(2, {}).values()) or 1
    n_transfo = min(max(1, n_sources), 4)
    n_departs = min(max(1, n_hta), 12)

    # Largeur SVG (analyse.md) : largeur minimale 90 px par départ pour éviter chevauchement labels
    largeur_min_depart = 90
    largeur_utile = max(n_departs * largeur_min_depart, n_transfo * 200, 800)
    w = largeur_utile + 2 * marge

    # Unité de référence (analyse.md) : UNIT = largeurSVG/70 pour symboles plus visibles
    unit = w / 70
    u = unit  # alias
    # Tailles symboles (analyse.md) — sectionneur, disj, TC, TT, parafoudre plus grands
    sym_sect_w = round(u * 3.5)
    sym_sect_h = round(u * 2.8)
    sym_disj = round(u * 2.8)
    sym_tc_w, sym_tc_h = round(u * 2.8), round(u * 2.8)  # TC_R = UNIT*1.4 → diamètre ~2.8
    sym_tt = round(u * 2.4)  # TT rayon ~17px
    sym_paraf_w = round(u * 1.6)
    sym_paraf_h = round(u * 4)  # PARA_H = UNIT*4
    sym_arrivee_w, sym_arrivee_h = round(u * 6), round(u * 7)
    sym_transfo_w, sym_transfo_h = round(u * 8), round(u * 11)
    # Fils et contours
    stroke_htb = max(1.5, round(u * 0.4 * 10) / 10)
    stroke_hta = max(1.5, round(u * 0.35 * 10) / 10)
    stroke_sym = max(1, round(u * 0.25 * 10) / 10)
    # Polices (relatives à UNIT)
    font_label = max(8, round(u * 1.4))
    font_zone = max(10, round(u * 1.8))
    font_value = max(7, round(u * 1.2))
    font_titre = max(14, round(u * 1.9))
    barre_h = max(8, round(u * 1.2))
    gap_coupleur = round(u * 4.4)
    # GAP minimum 35px entre symboles (analyse.md) — sectionneur / disj / TC bien séparés
    gap = max(35, round(u * 4))
    # Sous transformateur : sectionneur HTA ↔ disjoncteur HTA : Y_DISJ2 >= Y_DISJ1 + DISJ_H + GAP (53 px min, analyse.md)
    gap_sous_transfo = max(gap, (49 - sym_tc_h + 1) // 2, (53 - sym_tc_h + 1) // 2)

    # Colonnes alignées verticalement
    x_col = [int(marge + (i + 0.5) * largeur_utile / n_transfo) for i in range(n_transfo)]
    x_depart = [int(marge + (i + 0.5) * largeur_utile / n_departs) for i in range(n_departs)]
    x_center = w / 2
    largeur_par_depart = largeur_utile / n_departs  # pour labels 2 lignes ou court

    # Calcul Y en cascade (analyse.md) : Y_suivant = Y_actuel + hauteur_symbole + GAP
    y_debut_zones = 80
    y_zone_htb = y_debut_zones
    margin_zone = 20
    y = y_zone_htb + margin_zone
    y_arrivee = y
    y += sym_arrivee_h + gap
    y_sect = y  # parafoudre en dérivation au même niveau (analyse.md)
    y += sym_sect_h + gap
    y_disj_l = y
    y += sym_disj + gap
    y_tc1 = y
    y += sym_tc_h + gap
    y_htb_bar = y
    y += barre_h
    hauteur_htb = y - y_zone_htb + 10  # zone collée au contenu, peu de vide (analyse.md)

    y_zone_transfo = y_zone_htb + hauteur_htb + 10
    y = y_zone_transfo + margin_zone
    y_sect_htb = y
    y += sym_sect_h + gap
    y_disj_t = y
    y += sym_disj + gap
    y_tc_htb = y
    y += sym_tc_h + gap
    y_trafo = y
    y += sym_transfo_h + gap_sous_transfo
    y_sect_hta = y  # sectionneur HTA — distance ≥ 49px jusqu'au disj HTA (analyse.md)
    y += sym_sect_h + gap_sous_transfo
    y_tc3 = y
    y += sym_tc_h + gap_sous_transfo
    y_disj_h = y
    y += sym_disj + gap_sous_transfo
    y_hta_bar = y
    y += barre_h
    hauteur_transfo = y - y_zone_transfo + margin_zone

    y_zone_hta = y_zone_transfo + hauteur_transfo + 10
    y_sect_d = y_hta_bar + barre_h + gap
    y_disj_d = y_sect_d + sym_sect_h + gap
    y_tc_d = y_disj_d + sym_disj + gap
    arrow_sz = max(4, round(u * 0.6))
    y_arrow = y_tc_d + sym_tc_h + gap
    y_label = y_arrow + arrow_sz * 2 + gap
    hauteur_hta = int(y_label - y_zone_hta + font_label * 2.5 + margin_zone)
    legend_height = 58
    h = y_zone_hta + hauteur_hta + 30 + legend_height

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        "<defs>",
        '<marker id="arrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#333"/></marker>',
        # Sectionneur vertical (IEC 60617)
        '<symbol id="sym-sect" viewBox="0 0 20 28">',
        f'<line x1="10" y1="0" x2="10" y2="8" stroke="{c_wire}" stroke-width="1.8"/>',
        f'<line x1="3" y1="10" x2="17" y2="10" stroke="{c_wire}" stroke-width="1.8"/>',
        f'<line x1="3" y1="18" x2="17" y2="18" stroke="{c_wire}" stroke-width="1.8"/>',
        f'<line x1="10" y1="20" x2="10" y2="28" stroke="{c_wire}" stroke-width="1.8"/>',
        "</symbol>",
        # Disjoncteur fermé (IEC) — trait plein, sans pointillés (analyse.md)
        '<symbol id="sym-disj" viewBox="0 0 24 24">',
        f'<rect x="2" y="2" width="20" height="20" rx="3" fill="#ffffff" stroke="{c_wire}" stroke-width="1.5" stroke-dasharray="none"/>',
        f'<line x1="12" y1="6" x2="12" y2="18" stroke="{c_wire}" stroke-width="2" stroke-dasharray="none"/>',
        "</symbol>",
        # TC (transformateur de courant)
        '<symbol id="sym-tc" viewBox="0 0 20 18">',
        f'<circle cx="10" cy="9" r="7" fill="none" stroke="{c_wire}" stroke-width="1.4"/>',
        f'<text x="10" y="13" text-anchor="middle" fill="{c_wire}" font-size="6" font-weight="bold">TC</text>',
        "</symbol>",
        # TT (transformateur de tension)
        '<symbol id="sym-tt" viewBox="0 0 24 24">',
        f'<circle cx="8" cy="12" r="6" fill="none" stroke="{c_wire}" stroke-width="1.3"/>',
        f'<circle cx="16" cy="12" r="6" fill="none" stroke="{c_wire}" stroke-width="1.3"/>',
        f'<text x="12" y="24" text-anchor="middle" fill="{c_wire}" font-size="6">TT</text>',
        "</symbol>",
        # Parafoudre
        '<symbol id="sym-parafoudre" viewBox="0 0 14 32">',
        f'<line x1="7" y1="0" x2="7" y2="10" stroke="{c_wire}" stroke-width="1.5"/>',
        f'<polygon points="7,18 2,10 12,10" fill="{c_wire}" opacity="0.8"/>',
        f'<line x1="7" y1="18" x2="7" y2="24" stroke="{c_wire}" stroke-width="1.5"/>',
        f'<line x1="2" y1="24" x2="12" y2="24" stroke="{c_ground}" stroke-width="1.5"/>',
        f'<line x1="4" y1="27" x2="10" y2="27" stroke="{c_ground}" stroke-width="1"/>',
        "</symbol>",
        # Arrivée ligne (pylône)
        '<symbol id="sym-arrivee" viewBox="0 0 60 70">',
        f'<line x1="30" y1="0" x2="0" y2="35" stroke="{c_htb}" stroke-width="2" stroke-dasharray="5 3"/>',
        f'<line x1="30" y1="0" x2="60" y2="35" stroke="{c_htb}" stroke-width="2" stroke-dasharray="5 3"/>',
        f'<line x1="30" y1="0" x2="30" y2="50" stroke="{c_htb}" stroke-width="2"/>',
        f'<polygon points="30,8 27,18 33,18" fill="{c_htb}" opacity="0.9"/>',
        "</symbol>",
        # Transformateur HTB/HTA (deux cercles Y/yn)
        '<symbol id="sym-transfo-htb-hta" viewBox="0 0 80 110">',
        f'<rect x="2" y="8" width="76" height="94" rx="6" fill="#ffffff" stroke="{c_wire}" stroke-width="1.2"/>',
        f'<circle cx="40" cy="38" r="22" fill="none" stroke="{c_htb}" stroke-width="2"/>',
        f'<circle cx="40" cy="72" r="22" fill="none" stroke="{c_hta}" stroke-width="2"/>',
        f'<text x="40" y="34" text-anchor="middle" fill="{c_htb}" font-size="9" font-weight="bold">Y</text>',
        f'<text x="40" y="68" text-anchor="middle" fill="{c_hta}" font-size="9" font-weight="bold">yn</text>',
        "</symbol>",
        "</defs>",
        f'<rect x="0" y="0" width="{w}" height="{h}" fill="{c_bg}"/>',
        f"<style>.tit{{ font: bold {font_titre}px sans-serif; fill: {c_title}; }} .zone{{ font: {font_zone}px sans-serif; fill: {c_dim}; }} .lb{{ font: {font_label}px sans-serif; fill: {c_dim}; }}</style>",
    ]
    # Balise SVG : viewBox = dimensions réelles (analyse.md)
    parts[1] = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w} {h}" width="100%" style="max-width:{w}px;height:auto">'

    # Titre et sous-titre
    parts.append(f'<text x="{x_center}" y="28" text-anchor="middle" font-size="{font_titre}" font-weight="bold" fill="{c_title}">Schéma unifilaire — Poste source</text>')
    parts.append(f'<text x="{x_center}" y="46" text-anchor="middle" font-size="{font_zone}" fill="{c_dim}">Ouvrage source et connexions · IEC 60617</text>')

    # ═══ ZONE HTB ═══
    parts.append(f'<rect x="12" y="{y_zone_htb}" width="{w - 24}" height="{hauteur_htb}" rx="6" fill="{fill_zone_htb}" stroke="{c_htb}" stroke-width="{stroke_sym}" stroke-dasharray="5 4"/>')
    parts.append(f'<text x="24" y="{y_zone_htb + 18}" fill="{c_zone_label}" font-size="{font_zone}" font-weight="bold" letter-spacing="2">ZONE HTB</text>')

    # Arrivées (colonnes transfo) — positions Y en cascade
    for i, x_l in enumerate(x_col):
        parts.append(f'<text x="{x_l}" y="{y_arrivee - 8}" text-anchor="middle" fill="{c_title}" font-size="{font_zone}" font-weight="bold">LIGNE {i + 1}</text>')
        parts.append(f'<use href="#sym-arrivee" x="{x_l - sym_arrivee_w // 2}" y="{y_arrivee}" width="{sym_arrivee_w}" height="{sym_arrivee_h}"/>')
    # Fil vertical : bord bas → bord haut (analyse.md) pour éviter chevauchement
    for x_l in x_col:
        parts.append(f'<line x1="{x_l}" y1="{y_arrivee + sym_arrivee_h}" x2="{x_l}" y2="{y_sect}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
    # Sectionneur SEUL sur sa ligne ; parafoudre/TT en dérivation (analyse.md) : fil (xCol±10) → (X±15)
    offset_deriv = max(50, round(u * 5))
    x_para = lambda x_l: x_l - offset_deriv
    x_tt = lambda x_l: x_l + offset_deriv
    for i, x_l in enumerate(x_col):
        parts.append(f'<use href="#sym-sect" x="{x_l - sym_sect_w // 2}" y="{y_sect}" width="{sym_sect_w}" height="{sym_sect_h}"/>')
        y_deriv = y_sect + sym_sect_h // 2
        # Fil horizontal vers parafoudre (gauche) : ne pas partir du centre pour éviter chevauchement
        parts.append(f'<line x1="{x_l - 10}" y1="{y_deriv}" x2="{x_para(x_l) + 15}" y2="{y_deriv}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-parafoudre" x="{x_para(x_l) - sym_paraf_w // 2}" y="{y_sect}" width="{sym_paraf_w}" height="{sym_paraf_h}"/>')
        # Fil horizontal vers TT (droite)
        parts.append(f'<line x1="{x_l + 10}" y1="{y_deriv}" x2="{x_tt(x_l) - 15}" y2="{y_deriv}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-tt" x="{x_tt(x_l) - sym_tt // 2}" y="{y_sect}" width="{sym_tt}" height="{sym_tt}"/>')
    for i, x_l in enumerate(x_col):
        parts.append(f'<line x1="{x_l}" y1="{y_sect + sym_sect_h}" x2="{x_l}" y2="{y_disj_l}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-disj" x="{x_l - sym_disj // 2}" y="{y_disj_l}" width="{sym_disj}" height="{sym_disj}"/>')
        parts.append(f'<line x1="{x_l}" y1="{y_disj_l + sym_disj}" x2="{x_l}" y2="{y_tc1}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-tc" x="{x_l - sym_tc_w // 2}" y="{y_tc1}" width="{sym_tc_w}" height="{sym_tc_h}"/>')
    barre_htb_top = y_htb_bar - barre_h // 2
    barre_hta_top = y_hta_bar - barre_h // 2
    for x_l in x_col:
        parts.append(f'<line x1="{x_l}" y1="{y_tc1 + sym_tc_h}" x2="{x_l}" y2="{barre_htb_top}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
    jb_htb_left = min(x_col) - round(u * 4)
    jb_htb_w = max(x_col) - min(x_col) + round(u * 8)
    parts.append(f'<rect x="{jb_htb_left}" y="{y_htb_bar - barre_h // 2}" width="{jb_htb_w}" height="{barre_h}" rx="{max(2, round(u * 0.5))}" fill="{c_htb}"/>')
    parts.append(f'<text x="{x_center}" y="{y_htb_bar - barre_h // 2 - 2}" text-anchor="middle" fill="{c_on_busbar}" font-size="{font_zone}" font-weight="bold">JB-HTB</text>')

    # ═══ TRANSFORMATEURS ═══
    parts.append(f'<rect x="12" y="{y_zone_transfo}" width="{w - 24}" height="{hauteur_transfo}" rx="6" fill="{fill_zone_transfo}" stroke="{stroke_zone_transfo}" stroke-width="{stroke_sym}" stroke-dasharray="4 4"/>')
    parts.append(f'<text x="24" y="{y_zone_transfo + 18}" fill="{c_zone_label}" font-size="{font_zone}" font-weight="bold">TRANSFORMATEURS HTB / HTA</text>')
    for idx, x_t in enumerate(x_col):
        parts.append(f'<line x1="{x_t}" y1="{barre_htb_top + barre_h}" x2="{x_t}" y2="{y_sect_htb}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-sect" x="{x_t - sym_sect_w // 2}" y="{y_sect_htb}" width="{sym_sect_w}" height="{sym_sect_h}"/>')
        parts.append(f'<line x1="{x_t}" y1="{y_sect_htb + sym_sect_h}" x2="{x_t}" y2="{y_disj_t}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-disj" x="{x_t - sym_disj // 2}" y="{y_disj_t}" width="{sym_disj}" height="{sym_disj}"/>')
        parts.append(f'<line x1="{x_t}" y1="{y_disj_t + sym_disj}" x2="{x_t}" y2="{y_tc_htb}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-tc" x="{x_t - sym_tc_w // 2}" y="{y_tc_htb}" width="{sym_tc_w}" height="{sym_tc_h}"/>')
        parts.append(f'<line x1="{x_t}" y1="{y_tc_htb + sym_tc_h}" x2="{x_t}" y2="{y_trafo}" stroke="{c_htb}" stroke-width="{stroke_htb}"/>')
        parts.append(f'<use href="#sym-transfo-htb-hta" x="{x_t - sym_transfo_w // 2}" y="{y_trafo}" width="{sym_transfo_w}" height="{sym_transfo_h}"/>')
        x_t1_label = x_t + sym_transfo_w // 2 + max(15, round(u * 1.8))
        y_trafo_center = y_trafo + sym_transfo_h // 2
        parts.append(f'<line x1="{x_t + sym_transfo_w // 2}" y1="{y_trafo_center}" x2="{x_t1_label - 4}" y2="{y_trafo_center}" stroke="{c_dim}" stroke-width="1"/>')
        parts.append(f'<text x="{x_t1_label}" y="{y_trafo_center}" text-anchor="start" dominant-baseline="middle" fill="{c_dim}" font-size="{font_value}" font-weight="bold">T{idx + 1}</text>')
        parts.append(f'<line x1="{x_t}" y1="{y_trafo + sym_transfo_h}" x2="{x_t}" y2="{y_sect_hta}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')
        parts.append(f'<use href="#sym-sect" x="{x_t - sym_sect_w // 2}" y="{y_sect_hta}" width="{sym_sect_w}" height="{sym_sect_h}"/>')
        parts.append(f'<line x1="{x_t}" y1="{y_sect_hta + sym_sect_h}" x2="{x_t}" y2="{y_tc3}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')
        parts.append(f'<use href="#sym-tc" x="{x_t - sym_tc_w // 2}" y="{y_tc3}" width="{sym_tc_w}" height="{sym_tc_h}"/>')
        parts.append(f'<line x1="{x_t}" y1="{y_tc3 + sym_tc_h}" x2="{x_t}" y2="{y_disj_h}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')
        parts.append(f'<use href="#sym-disj" x="{x_t - sym_disj // 2}" y="{y_disj_h}" width="{sym_disj}" height="{sym_disj}"/>')
        parts.append(f'<line x1="{x_t}" y1="{y_disj_h + sym_disj}" x2="{x_t}" y2="{barre_hta_top}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')

    # ═══ ZONE HTA ═══
    parts.append(f'<rect x="12" y="{y_zone_hta}" width="{w - 24}" height="{hauteur_hta}" rx="6" fill="{fill_zone_hta}" stroke="{c_hta}" stroke-width="{stroke_sym}" stroke-dasharray="5 4"/>')
    parts.append(f'<text x="24" y="{y_zone_hta + 18}" fill="{c_zone_label}" font-size="{font_zone}" font-weight="bold">TABLEAU HTA</text>')
    jb_hta_left = min(x_depart) - round(u * 4)
    jb_hta_w = max(x_depart) - min(x_depart) + round(u * 8)
    parts.append(f'<rect x="{jb_hta_left}" y="{y_hta_bar - barre_h // 2}" width="{x_center - jb_hta_left - gap_coupleur // 2}" height="{barre_h}" rx="{max(2, round(u * 0.5))}" fill="{c_hta}"/>')
    parts.append(f'<rect x="{x_center + gap_coupleur // 2}" y="{y_hta_bar - barre_h // 2}" width="{jb_hta_left + jb_hta_w - x_center - gap_coupleur // 2}" height="{barre_h}" rx="{max(2, round(u * 0.5))}" fill="{c_hta}"/>')
    parts.append(f'<use href="#sym-disj" x="{x_center - sym_disj // 2}" y="{y_hta_bar - barre_h // 2 - sym_disj - 2}" width="{sym_disj}" height="{sym_disj}"/>')
    # NO à droite du coupleur, centré verticalement sur le symbole, en noir pour désigner l'ouvrage
    y_coupleur_center = y_hta_bar - barre_h // 2 - sym_disj // 2 - 2
    parts.append(f'<text x="{x_center + sym_disj // 2 + max(6, round(u * 0.8))}" y="{y_coupleur_center}" text-anchor="start" dominant-baseline="middle" fill="#000000" font-size="{font_value}" font-weight="bold">NO</text>')
    # JB-HTA à gauche de la barre, centré sur la barre, en noir
    parts.append(f'<text x="{jb_hta_left - max(10, round(u * 1.2))}" y="{y_hta_bar + 4}" text-anchor="end" dominant-baseline="middle" fill="#000000" font-size="{font_zone}" font-weight="bold">JB-HTA</text>')

    # Départs HTA — positions Y en cascade (sect → disj → TC → flèche) ; labels 2 lignes ou court (analyse.md)
    use_label_2_lignes = largeur_par_depart >= 85
    for i in range(n_departs):
        fx = x_depart[i]
        parts.append(f'<line x1="{fx}" y1="{barre_hta_top + barre_h}" x2="{fx}" y2="{y_sect_d}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')
        parts.append(f'<use href="#sym-sect" x="{fx - sym_sect_w // 2}" y="{y_sect_d}" width="{sym_sect_w}" height="{sym_sect_h}"/>')
        parts.append(f'<line x1="{fx}" y1="{y_sect_d + sym_sect_h}" x2="{fx}" y2="{y_disj_d}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')
        parts.append(f'<use href="#sym-disj" x="{fx - sym_disj // 2}" y="{y_disj_d}" width="{sym_disj}" height="{sym_disj}"/>')
        parts.append(f'<line x1="{fx}" y1="{y_disj_d + sym_disj}" x2="{fx}" y2="{y_tc_d}" stroke="{c_hta}" stroke-width="{stroke_hta}"/>')
        parts.append(f'<use href="#sym-tc" x="{fx - sym_tc_w // 2}" y="{y_tc_d}" width="{sym_tc_w}" height="{sym_tc_h}"/>')
        parts.append(f'<line x1="{fx}" y1="{y_tc_d + sym_tc_h}" x2="{fx}" y2="{y_arrow}" stroke="{c_hta}" stroke-width="{stroke_hta}" marker-end="url(#arrow)"/>')
        parts.append(f'<polygon points="{fx - arrow_sz},{y_arrow + arrow_sz} {fx + arrow_sz},{y_arrow + arrow_sz} {fx},{y_arrow + arrow_sz * 2}" fill="{c_hta}"/>')
        if use_label_2_lignes:
            parts.append(f'<text x="{fx}" y="{y_label}" text-anchor="middle" fill="{c_title}" font-size="{font_label}" font-weight="bold">D{i + 1}</text>')
            font_ligne_hta = max(7, int(font_label * 0.62))
            parts.append(f'<text x="{fx}" y="{y_label + font_label + 10}" text-anchor="middle" fill="{c_dim}" font-size="{font_ligne_hta}">Ligne HTA</text>')
        else:
            parts.append(f'<text x="{fx}" y="{y_label}" text-anchor="middle" fill="{c_title}" font-size="{font_label}" font-weight="bold">D{i + 1}</text>')

    # Légende des symboles
    y_leg = y_zone_hta + hauteur_hta + 8
    font_leg = max(8, round(u * 1.0))
    sym_leg = max(18, round(u * 2.0))
    legend_items = [
        ("sym-arrivee", "Arrivée"),
        ("sym-sect", "Sectionneur"),
        ("sym-parafoudre", "Parafoudre"),
        ("sym-tt", "TT"),
        ("sym-disj", "Disjoncteur"),
        ("sym-tc", "TC"),
        ("sym-transfo-htb-hta", "Transformateur"),
    ]
    n_leg = len(legend_items)
    leg_step = (w - 2 * marge) / n_leg if n_leg else 0
    for i, (sym_id, lib) in enumerate(legend_items):
        x_leg = marge + (i + 0.5) * leg_step
        parts.append(f'<use href="#{sym_id}" x="{int(x_leg - sym_leg // 2)}" y="{int(y_leg)}" width="{sym_leg}" height="{sym_leg}"/>')
        parts.append(f'<text x="{int(x_leg)}" y="{int(y_leg + sym_leg + font_leg + 2)}" text-anchor="middle" fill="#000000" font-size="{font_leg}">{_escape_svg(lib)}</text>')

    parts.append("</svg>")
    return "\n".join(parts)


def _build_unifilaire_svg(ouvrage_ids: list[dict]) -> str:
    """
    Génère un schéma unifilaire à partir du tracé : représentation de l'ouvrage source
    et de tous les équipements connectés, selon la logique électrique et topologique
    (étages 1→2→3→4→5 avec connexions). Si le tracé correspond à un poste source (stage 1 + lignes HTA),
    utilise le rendu type poste_source.jsx (zones HTB, transfo, HTA, départs).
    """
    from collections import defaultdict

    by_stage: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for o in ouvrage_ids:
        slug = (o.get("slug") or "").strip() or "autre"
        order = _unifilaire_stage_order(slug)
        by_stage[order][slug] += 1

    if _is_poste_source_trace(by_stage):
        return _build_unifilaire_svg_poste_source(by_stage)

    stage_order = [1, 2, 3, 4, 5]
    stage_labels = {
        1: "Source / Arrivée HT",
        2: "Lignes HTA",
        3: "Ouvrages MT (poteaux, cellules, transfo)",
        4: "Lignes BT",
        5: "Raccordements / Abonnés",
    }
    rows: list[tuple[int, list[tuple[str, int]]]] = []
    for order in stage_order:
        items = by_stage.get(order, {})
        if not items:
            continue
        rows.append((order, sorted(items.items(), key=lambda x: -x[1])))

    if not rows:
        return _build_unifilaire_svg_empty()

    w = 720
    row_h = 72
    margin_top = 36
    h = margin_top + len(rows) * row_h + 40
    sym_w, sym_h = 44, 50
    spacing = 56

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        "<defs>",
        '<marker id="arrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">',
        '<path d="M0,0 L8,3 L0,6 Z" fill="#333"/>',
        "</marker>",
        '<symbol id="sym-transfo" viewBox="0 0 40 50">',
        '<circle cx="20" cy="15" r="12" fill="none" stroke="#222" stroke-width="1.8"/>',
        '<circle cx="20" cy="15" r="6" fill="none" stroke="#222" stroke-width="1.2"/>',
        '<line x1="20" y1="27" x2="20" y2="35" stroke="#222" stroke-width="1.5"/>',
        '<circle cx="20" cy="42" r="6" fill="none" stroke="#222" stroke-width="1.2"/>',
        "</symbol>",
        '<symbol id="sym-transfo-bt" viewBox="0 0 40 50">',
        '<circle cx="20" cy="15" r="12" fill="none" stroke="#222" stroke-width="1.5"/>',
        '<circle cx="20" cy="15" r="6" fill="none" stroke="#222" stroke-width="1"/>',
        '<line x1="20" y1="27" x2="20" y2="35" stroke="#222" stroke-width="1.2"/>',
        '<circle cx="20" cy="42" r="6" fill="none" stroke="#222" stroke-width="1"/>',
        "</symbol>",
        '<symbol id="sym-busbar" viewBox="0 0 100 8">',
        '<rect x="0" y="2" width="100" height="4" fill="none" stroke="#222" stroke-width="2"/>',
        "</symbol>",
        '<symbol id="sym-point-livraison" viewBox="0 0 12 12">',
        '<circle cx="6" cy="6" r="4" fill="#222" stroke="#222" stroke-width="1"/>',
        "</symbol>",
        '<symbol id="sym-poteau" viewBox="0 0 24 24">',
        '<circle cx="12" cy="12" r="8" fill="none" stroke="#222" stroke-width="1.5"/>',
        "</symbol>",
        '<symbol id="sym-depart" viewBox="0 0 4 30">',
        '<line x1="2" y1="0" x2="2" y2="28" stroke="#222" stroke-width="1.5" marker-end="url(#arrow)"/>',
        "</symbol>",
        "</defs>",
        "<style>",
        ".title { font: bold 14px sans-serif; fill: #111; }",
        ".label { font: 10px sans-serif; fill: #333; }",
        ".small { font: 9px sans-serif; fill: #555; }",
        ".solid { stroke: #222; stroke-width: 2; fill: none; }",
        "</style>",
    ]

    parts.append(f'<text x="{w // 2}" y="24" text-anchor="middle" class="title">Schéma unifilaire – Ouvrage source et connexions</text>')

    y_centers: list[float] = []
    x_center = w / 2
    for row_idx, (stage_num, row_items) in enumerate(rows):
        y_row = margin_top + row_idx * row_h + row_h // 2
        y_centers.append(y_row)
        n_syms = len(row_items)
        total_width = (n_syms - 1) * spacing + sym_w if n_syms else sym_w
        x_start = x_center - total_width / 2 + sym_w / 2
        stage_label = stage_labels.get(stage_num, "")
        parts.append(f'<text x="12" y="{y_row - row_h // 2 + 14}" class="label">{_escape_svg(stage_label)}</text>')
        x_pos = x_start
        for slug, count in row_items:
            sym_id = _slug_to_symbol(slug)
            lbl = _unifilaire_label(slug)
            parts.append(
                f'<use href="#{sym_id}" x="{int(x_pos - sym_w // 2)}" y="{int(y_row - sym_h // 2)}" width="{sym_w}" height="{sym_h}"/>'
            )
            parts.append(f'<text x="{int(x_pos)}" y="{int(y_row + sym_h // 2 + 14)}" text-anchor="middle" class="small">{_escape_svg(lbl)} ({count})</text>')
            x_pos += spacing
    for row_idx in range(1, len(rows)):
        y_prev = y_centers[row_idx - 1]
        y_curr = y_centers[row_idx]
        parts.append(f'<line x1="{int(x_center)}" y1="{int(y_prev + sym_h // 2)}" x2="{int(x_center)}" y2="{int(y_curr - sym_h // 2)}" class="solid"/>')

    parts.append("</svg>")
    return "\n".join(parts)


def _build_unifilaire_svg_empty() -> str:
    """SVG minimal quand aucun ouvrage (tracé vide)."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">'
        '<text x="200" y="60" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#333">'
        "Aucun ouvrage : effectuez un tracé (Amont, Aval ou Tous) à partir d&#39;un équipement."
        "</text>"
        "</svg>"
    )


def _escape_svg(s: str) -> str:
    """Échappe les caractères spéciaux pour un contenu texte SVG."""
    if not s:
        return ""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


@app.post("/gis/unifilaire/svg")
def unifilaire_svg(body: dict = Body(default=None)):
    """
    Génère un SVG de schéma unifilaire à partir de la liste d'ouvrages du tracé.
    Body: { "ouvrage_ids": [ {"slug": "ligne-hta", "id": "123"}, ... ] }.
    Retourne le SVG (image/svg+xml).
    """
    from fastapi.responses import Response

    ouvrage_ids = (body or {}).get("ouvrage_ids") or []
    if not ouvrage_ids:
        return Response(
            content='<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">Aucun ouvrage : effectuez un tracé d\'abord.</text></svg>',
            media_type="image/svg+xml",
        )
    svg = _build_unifilaire_svg(ouvrage_ids)
    return Response(content=svg, media_type="image/svg+xml")


@app.post("/gis/unifilaire/pdf")
def unifilaire_pdf(body: dict = Body(default=None)):
    """
    Génère un PDF du schéma unifilaire à partir de la liste d'ouvrages du tracé.
    Body: { "ouvrage_ids": [ {"slug": "ligne-hta", "id": "123"}, ... ] }.
    Retourne le PDF en téléchargement (application/pdf).
    """
    from io import BytesIO, StringIO

    from fastapi.responses import Response

    ouvrage_ids = (body or {}).get("ouvrage_ids") or []
    if not ouvrage_ids:
        return Response(
            content=b"",
            status_code=400,
            media_type="application/pdf",
        )
    svg = _build_unifilaire_svg(ouvrage_ids)
    try:
        from reportlab.graphics import renderPDF
        from svglib.svglib import svg2rlg

        # svglib n'accepte pas width="100%" ni height:auto → remplacer par dimensions explicites (viewBox)
        _vb = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg)
        if _vb:
            _w, _h = _vb.group(1), _vb.group(2)
            svg = re.sub(
                r'<svg\s+xmlns="[^"]*"[^>]*viewBox="0 0 \d+ \d+"[^>]*>',
                f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {_w} {_h}" width="{_w}" height="{_h}">',
                svg,
                count=1,
            )
        # svglib n'accepte pas une chaîne Unicode avec déclaration XML → passer des bytes
        drawing = svg2rlg(BytesIO(svg.encode("utf-8")))
        if drawing is None:
            return Response(
                content=b"",
                status_code=500,
                media_type="application/pdf",
            )
        buffer = BytesIO()
        renderPDF.drawToFile(drawing, buffer)
        pdf_bytes = buffer.getvalue()
    except Exception as e:
        _log.exception("Export PDF schéma unifilaire: %s", e)
        return Response(
            content=b"",
            status_code=500,
            media_type="application/pdf",
        )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="schema-unifilaire.pdf"',
        },
    )


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


def _build_points_utm_collect_sql() -> str | None:
    """
    SQL interne : agrégat des géométries ponctuelles (poteaux, postes, etc.) en UTM pour snap.
    Retourne None si aucune table de points avec géométrie.
    """
    UTM_SRID = 32630
    WGS84_SRID = 4326
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
        return None
    points_union = " UNION ALL ".join(point_geom_cols)
    return f"""
        SELECT ST_Collect(
            CASE WHEN ST_SRID(geom) IN (0, {WGS84_SRID}) THEN ST_Transform(ST_SetSRID(geom, {WGS84_SRID}), {UTM_SRID})
            ELSE ST_Transform(geom, {UTM_SRID}) END
        ) AS geom FROM ({points_union}) t
    """


def _line_ws84_endpoint_expr(qgeom: str, col_index: int, n_specs: int) -> str:
    """Expression SQL : point sur la ligne (4326) pour le i-ème attribut de connectivité."""
    g = f"""ST_LineMerge(
      CASE WHEN ST_SRID({qgeom}) IN (0, 4326) THEN ST_SetSRID({qgeom}, 4326)
      ELSE ST_Transform({qgeom}, 4326) END
    )"""
    if n_specs <= 1:
        return f"ST_StartPoint({g})"
    if n_specs == 2:
        return f"ST_StartPoint({g})" if col_index == 0 else f"ST_EndPoint({g})"
    frac = col_index / (n_specs - 1)
    return f"ST_LineInterpolatePoint({g}, {frac})"


def _edge_node_specs_for_line_slug(line_slug: str) -> list[tuple[str, str]] | None:
    """Colonnes de connectivité et slug de table nœud cible (aligné sur _SCHEMA_EDGE_NODE_COLS)."""
    for _table_name, slug, pairs in _SCHEMA_EDGE_NODE_COLS:
        if slug == line_slug:
            return list(pairs)
    return None


def _cell_empty_for_connectivity(val) -> bool:
    return val is None or (isinstance(val, str) and not val.strip())


def _nearest_gid_from_point(
    cur, node_slug: str, lx: float, ly: float, radius_m: float
) -> tuple[str | None, float | None]:
    """Plus proche nœud (table point) d'un point WGS84 ; distance en mètres (géodésique)."""
    if node_slug not in TABLE_BY_SLUG:
        return None, None
    table_name, meta = TABLE_BY_SLUG[node_slug]
    geom_cols = get_geometry_columns(meta)
    if not geom_cols:
        return None, None
    qgeom = quote_ident(geom_cols[0])
    qtable = quote_ident(table_name)
    pk = get_primary_key(meta)
    qpk = quote_ident(pk)
    sql = f"""
    SELECT {qpk}::text AS pk_val,
      ST_Distance(
        ST_Transform({qgeom}, 4326)::geography,
        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
      ) AS d
    FROM {qtable}
    WHERE {qgeom} IS NOT NULL
    ORDER BY d
    LIMIT 1
    """
    cur.execute(sql, (lx, ly))
    row = cur.fetchone()
    if not row or row.get("d") is None:
        return None, None
    d = float(row["d"])
    if d > radius_m:
        return None, d
    return str(row["pk_val"]).strip(), d


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

    points_utm_sql = _build_points_utm_collect_sql()
    if not points_utm_sql:
        return {
            "corrected": 0,
            "by_table": {},
            "message": "Aucune table de points (poteaux, transfo, postes, abonnés) trouvée.",
        }

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


@app.post("/gis/topology/validate")
def topology_validate(
    body: dict = Body(default=None),
):
    """
    Vérifie la conformité connectivité/topologie et remonte les ouvrages en défaut
    pour mise en évidence sur la carte.
    Body:
      - check_type: connectivite | topologie | all (défaut all)
      - limit_per_table: nombre max de défauts par table (défaut 300)
    """
    check_type = str((body or {}).get("check_type") or "all").strip().lower()
    if check_type not in {"connectivite", "topologie", "all"}:
        raise HTTPException(status_code=400, detail="check_type invalide (connectivite|topologie|all).")
    try:
        limit_per_table = int((body or {}).get("limit_per_table") or 300)
    except Exception:
        limit_per_table = 300
    limit_per_table = max(10, min(limit_per_table, 2000))

    issues: list[dict] = []
    by_slug: dict[str, int] = {}
    by_rule_type = {"connectivite": 0, "topologie": 0}

    def _auto_fix_meta(issue_slug: str, issue_rule_type: str, issue_reason: str) -> tuple[bool, str | None]:
        if issue_rule_type == "connectivite":
            if not _is_line_table(issue_slug):
                return False, "La correction automatique de connectivité s'applique uniquement aux couches de lignes."
            if not _edge_node_specs_for_line_slug(issue_slug):
                return False, "Aucune règle de correction automatique n'est définie pour cette couche."
            return True, None
        if issue_rule_type == "topologie":
            if issue_reason == "Ligne avec moins de 2 sommets.":
                return False, "Cette anomalie nécessite une édition manuelle de la géométrie."
            return True, None
        return False, "Type d'anomalie non pris en charge automatiquement."

    edge_node_cols = {
        "id_depart_hta",
        "id_poteau_hta",
        "id_depart_bt",
        "id_poteau_bt",
        "id_ligne_bt",
        "id_ligne_hta",
        "id_poste_source",
        "id_poste_cabine",
        "id_poste_sur_poteau",
        "id_transfo_ht_bt",
        "id_transfo_poteau",
        "id_branchement",
    }

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for slug in sorted(TABLE_BY_SLUG.keys()):
                table_name, meta = TABLE_BY_SLUG[slug]
                qtable = quote_ident(table_name)
                pk = get_primary_key(meta)
                qpk = quote_ident(pk)
                cols = [c.get("Field") for c in (meta.get("columns") or []) if c.get("Field")]
                if not cols:
                    continue
                qgeom = quote_ident("geom") if "geom" in cols else None

                # 1) Connectivité: références id_* manquantes sur les lignes
                if check_type in {"connectivite", "all"} and _is_line_table(slug):
                    node_cols = [c for c in cols if c in edge_node_cols]
                    if node_cols:
                        missing_expr = " OR ".join(
                            [f"{quote_ident(c)} IS NULL OR BTRIM(CAST({quote_ident(c)} AS TEXT)) = ''" for c in node_cols]
                        )
                        try:
                            cur.execute(
                                f"""
                                SELECT {qpk} AS id
                                FROM {qtable}
                                WHERE ({missing_expr})
                                LIMIT %s
                                """,
                                (limit_per_table,),
                            )
                            for row in cur.fetchall() or []:
                                auto_correctable, auto_correction_reason = _auto_fix_meta(
                                    slug, "connectivite", "Référence de connectivité manquante sur la ligne."
                                )
                                issue = {
                                    "rule_type": "connectivite",
                                    "slug": slug,
                                    "id": str(row.get("id")),
                                    "reason": "Référence de connectivité manquante sur la ligne.",
                                    "severity": "warning",
                                    "suggestion": "Renseigner les identifiants attendus sur la ligne (départ, arrivée, postes, poteaux, branchements, etc.) selon le modèle de données.",
                                    "auto_correctable": auto_correctable,
                                    "auto_correction_reason": auto_correction_reason,
                                }
                                issues.append(issue)
                                by_slug[slug] = by_slug.get(slug, 0) + 1
                                by_rule_type["connectivite"] += 1
                        except Exception:
                            pass

                # 2) Topologie: géométries invalides / vides (+ ligne sans segment)
                if check_type in {"topologie", "all"} and qgeom is not None:
                    try:
                        cur.execute(
                            f"""
                            SELECT {qpk} AS id
                            FROM {qtable}
                            WHERE {qgeom} IS NOT NULL
                              AND (NOT ST_IsValid({qgeom}) OR ST_IsEmpty({qgeom}))
                            LIMIT %s
                            """,
                            (limit_per_table,),
                        )
                        for row in cur.fetchall() or []:
                            auto_correctable, auto_correction_reason = _auto_fix_meta(
                                slug, "topologie", "Géométrie invalide ou vide."
                            )
                            issue = {
                                "rule_type": "topologie",
                                "slug": slug,
                                "id": str(row.get("id")),
                                "reason": "Géométrie invalide ou vide.",
                                "severity": "error",
                                "suggestion": "Corriger la géométrie dans l'outil SIG (validité, topologie) ou utiliser la correction topologique par tolérance si les extrémités doivent être raccrochées aux nœuds.",
                                "auto_correctable": auto_correctable,
                                "auto_correction_reason": auto_correction_reason,
                            }
                            issues.append(issue)
                            by_slug[slug] = by_slug.get(slug, 0) + 1
                            by_rule_type["topologie"] += 1
                    except Exception:
                        pass

                    if _is_line_table(slug):
                        try:
                            cur.execute(
                                f"""
                                SELECT {qpk} AS id
                                FROM {qtable}
                                WHERE {qgeom} IS NOT NULL
                                  AND ST_NPoints({qgeom}) < 2
                                LIMIT %s
                                """,
                                (limit_per_table,),
                            )
                            for row in cur.fetchall() or []:
                                auto_correctable, auto_correction_reason = _auto_fix_meta(
                                    slug, "topologie", "Ligne avec moins de 2 sommets."
                                )
                                issue = {
                                    "rule_type": "topologie",
                                    "slug": slug,
                                    "id": str(row.get("id")),
                                    "reason": "Ligne avec moins de 2 sommets.",
                                    "severity": "error",
                                    "suggestion": "Compléter la ligne avec au moins deux sommets ou fusionner/supprimer le segment incohérent.",
                                    "auto_correctable": auto_correctable,
                                    "auto_correction_reason": auto_correction_reason,
                                }
                                issues.append(issue)
                                by_slug[slug] = by_slug.get(slug, 0) + 1
                                by_rule_type["topologie"] += 1
                        except Exception:
                            pass

    return {
        "check_type": check_type,
        "total_issues": len(issues),
        "by_rule_type": by_rule_type,
        "by_slug": by_slug,
        "issues": issues,
        "message": "Analyse terminée.",
    }


def _topology_correct_issue_row(cur, slug: str, row_id: str, tolerance_m: float) -> dict:
    """
    Topologie ciblée : ST_MakeValid sur la géométrie, puis pour les lignes snap des extrémités
    vers l'agrégat des nœuds (même logique que POST /gis/topology/correct mais une seule entité).
    """
    UTM_SRID = 32630
    WGS84_SRID = 4326
    if slug not in TABLE_BY_SLUG:
        return {"success": False, "message": "Couche inconnue."}
    table_name, meta = TABLE_BY_SLUG[slug]
    geom_cols = get_geometry_columns(meta)
    if not geom_cols:
        return {"success": False, "message": "Pas de colonne géométrique sur cette couche."}
    pk = get_primary_key(meta)
    qgeom = quote_ident(geom_cols[0])
    qtable = quote_ident(table_name)
    qpk = quote_ident(pk)

    try:
        cur.execute(
            f"""
            UPDATE {qtable} SET {qgeom} = ST_MakeValid({qgeom})
            WHERE {_canon_sql_expr(pk)} = %s AND {qgeom} IS NOT NULL AND NOT ST_IsValid({qgeom})
            """,
            (_canon_id(row_id),),
        )
        make_valid_n = cur.rowcount
    except Exception as e:
        return {"success": False, "message": f"Correction géométrique impossible : {e}"}

    if _is_line_table(slug):
        cur.execute(
            f"""
            SELECT ST_NPoints(ST_LineMerge(
                CASE WHEN ST_SRID({qgeom}) IN (0, 4326) THEN ST_SetSRID({qgeom}, 4326)
                ELSE ST_Transform({qgeom}, 4326) END
            )) AS n
            FROM {qtable} WHERE {_canon_sql_expr(pk)} = %s
            """,
            (_canon_id(row_id),),
        )
        nrow = cur.fetchone()
        n = int(nrow.get("n") or 0) if nrow else 0
        if n < 2:
            return {
                "success": False,
                "message": "La ligne a moins de 2 sommets : correction automatique impossible sans édition manuelle.",
                "make_valid_updated": make_valid_n,
            }

        points_utm_sql = _build_points_utm_collect_sql()
        if not points_utm_sql:
            return {
                "success": make_valid_n > 0,
                "message": "Géométrie corrigée (validité). Aucune table de points pour le snap.",
                "make_valid_updated": make_valid_n,
                "snap_updated": 0,
            }

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
                WHERE {_canon_sql_expr(pk)} = %s AND t.{qgeom} IS NOT NULL
            )
            UPDATE {qtable} tbl SET {qgeom} = s.new_geom
            FROM snapped s WHERE tbl.{qpk} = s.pk_val
            AND NOT ST_Equals(tbl.{qgeom}, s.new_geom)
        """
        try:
            cur.execute(sql, (tolerance_m, _canon_id(row_id)))
            snap_n = cur.rowcount
        except Exception as e:
            return {"success": False, "message": str(e), "make_valid_updated": make_valid_n}
        msg = []
        if make_valid_n:
            msg.append("géométrie rendue valide")
        if snap_n:
            msg.append(f"snap des extrémités ({snap_n} mise(s) à jour)")
        if not msg:
            msg.append("aucun changement nécessaire")
        return {
            "success": True,
            "message": "; ".join(msg) + ".",
            "make_valid_updated": make_valid_n,
            "snap_updated": snap_n,
        }

    return {
        "success": True,
        "message": "Géométrie corrigée (ST_MakeValid)." if make_valid_n else "Aucun changement nécessaire.",
        "make_valid_updated": make_valid_n,
        "snap_updated": 0,
    }


def _connectivity_correct_issue_row(cur, slug: str, row_id: str, search_radius_m: float) -> dict:
    """
    Connectivité ciblée : pour les lignes connues (ligne-hta, ligne-bt, ligne-brcht),
    complète les champs id_* vides en prenant le nœud le plus proche géographiquement
    (départ / poteau selon le modèle de données, aligné sur _SCHEMA_EDGE_NODE_COLS).
    """
    if not _is_line_table(slug):
        return {"success": False, "message": "La correction automatique de connectivité s'applique aux couches de lignes."}
    specs = _edge_node_specs_for_line_slug(slug)
    if not specs:
        return {
            "success": False,
            "message": "Aucune règle de connectivité automatique pour cette couche (ligne-hta, ligne-bt, ligne-brcht).",
        }

    table_name, meta = TABLE_BY_SLUG[slug]
    geom_cols = get_geometry_columns(meta)
    if not geom_cols:
        return {"success": False, "message": "Pas de géométrie sur cette couche."}
    pk = get_primary_key(meta)
    qgeom = quote_ident(geom_cols[0])
    qtable = quote_ident(table_name)
    qpk = quote_ident(pk)

    try:
        cur.execute(
            f"""
            UPDATE {qtable} SET {qgeom} = ST_MakeValid({qgeom})
            WHERE {_canon_sql_expr(pk)} = %s AND {qgeom} IS NOT NULL AND NOT ST_IsValid({qgeom})
            """,
            (_canon_id(row_id),),
        )
    except Exception:
        pass

    cur.execute(f"SELECT * FROM {qtable} WHERE {_canon_sql_expr(pk)} = %s LIMIT 1", (_canon_id(row_id),))
    row = cur.fetchone()
    if not row:
        return {"success": False, "message": "Ouvrage introuvable."}

    n_specs = len(specs)
    updates: list[dict] = []
    for idx, (col_name, node_slug) in enumerate(specs):
        if col_name not in row:
            continue
        if not _cell_empty_for_connectivity(row.get(col_name)):
            continue
        pt_expr = _line_ws84_endpoint_expr(f"t.{qgeom}", idx, n_specs)
        try:
            cur.execute(
                f"SELECT ST_X(({pt_expr})) AS lx, ST_Y(({pt_expr})) AS ly FROM {qtable} t WHERE {_canon_sql_expr(pk)} = %s",
                (_canon_id(row_id),),
            )
        except Exception as e:
            updates.append({"column": col_name, "ok": False, "error": str(e), "node_slug": node_slug})
            continue
        pr = cur.fetchone()
        if not pr or pr.get("lx") is None or pr.get("ly") is None:
            updates.append({"column": col_name, "ok": False, "reason": "point_sur_ligne_introuvable", "node_slug": node_slug})
            continue
        lx, ly = float(pr["lx"]), float(pr["ly"])
        gid, dist = _nearest_gid_from_point(cur, node_slug, lx, ly, search_radius_m)
        if gid is None:
            updates.append(
                {
                    "column": col_name,
                    "ok": False,
                    "node_slug": node_slug,
                    "distance_m": dist,
                    "reason": "aucun_noeud_dans_le_rayon",
                }
            )
            continue
        qcol = quote_ident(col_name)
        try:
            cur.execute(
                f"UPDATE {qtable} SET {qcol} = %s WHERE {_canon_sql_expr(pk)} = %s",
                (gid, _canon_id(row_id)),
            )
        except Exception as e:
            updates.append({"column": col_name, "ok": False, "error": str(e), "node_slug": node_slug})
            continue
        row[col_name] = gid
        updates.append(
            {"column": col_name, "ok": True, "value": gid, "node_slug": node_slug, "distance_m": dist}
        )

    ok_count = sum(1 for u in updates if u.get("ok"))
    if ok_count:
        return {
            "success": True,
            "message": f"{ok_count} référence(s) de connectivité mise(s) à jour (plus proche nœud dans le rayon).",
            "updates": updates,
        }
    if not updates:
        return {"success": True, "message": "Aucun champ vide à compléter pour cette ligne.", "updates": []}
    return {
        "success": False,
        "message": "Impossible de déduire des nœuds dans le rayon pour les champs manquants.",
        "updates": updates,
    }


@app.post("/gis/topology/correct-issue")
def topology_correct_issue(body: dict = Body(default=None)):
    """
    Correction automatique ciblée pour une anomalie détectée par /gis/topology/validate.

    Body:
      - slug: couche (ex. ligne-hta)
      - id: identifiant de l'ouvrage (pk ou valeur alternative canonique)
      - rule_type: connectivite | topologie
      - tolerance_m: tolérance snap (m), défaut 2, max 50 — pour topologie
      - search_radius_m: rayon de recherche du nœud le plus proche (m) — pour connectivité, défaut 800, max 3000
    """
    data = body or {}
    slug = str(data.get("slug") or "").strip()
    row_id = str(data.get("id") or "").strip()
    rule_type = str(data.get("rule_type") or "").strip().lower()
    if not slug or not row_id:
        raise HTTPException(status_code=400, detail="slug et id sont requis.")
    if slug not in TABLE_BY_SLUG:
        raise HTTPException(status_code=400, detail="Couche inconnue.")
    if rule_type not in {"connectivite", "topologie"}:
        raise HTTPException(status_code=400, detail="rule_type invalide (connectivite|topologie).")

    tol = float(data.get("tolerance_m") or 2.0)
    tol = max(0.5, min(tol, 50.0))

    # Connectivité : recherche du nœud le plus proche (m). Les lignes BT/branchement peuvent
    # être à plusieurs centaines de mètres du poteau HTA de rattachement — rayon par défaut large.
    if rule_type == "connectivite":
        try:
            sr = float(data.get("search_radius_m") or 800.0)
        except Exception:
            sr = 800.0
        sr = min(max(sr, 5.0), 3000.0)
    else:
        sr = 35.0

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            if rule_type == "connectivite":
                result = _connectivity_correct_issue_row(cur, slug, row_id, sr)
            else:
                result = _topology_correct_issue_row(cur, slug, row_id, tol)

    return {
        "rule_type": rule_type,
        "slug": slug,
        "id": row_id,
        "tolerance_m": tol,
        "search_radius_m": sr if rule_type == "connectivite" else None,
        **result,
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


@app.post("/gis/rules/load-defaults")
def load_default_rules(replace_existing: bool = Query(True, description="Remplacer les regles existantes par les fichiers .md")):
    """Charge les règles depuis scripts/script_bd/connectivity_rule.md et topologie_rule.md."""
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            result = _load_default_rules(cur, replace_existing=replace_existing)
    return {"success": True, **result}


@app.get("/gis/rules")
def list_rules(rule_type: str = Query(..., description="connectivite | topologie")):
    """Liste les règles par type avec tri stable."""
    rt = (rule_type or "").strip().lower()
    if rt not in RULE_TYPES:
        raise HTTPException(status_code=400, detail="rule_type invalide (connectivite|topologie).")
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            _ensure_rules_table(cur)
            cur.execute(
                """
                SELECT id, rule_type, category, rule_name, concerned_objects, description,
                       technical_constraints, examples, detected_errors, best_practices,
                       source_file, sort_order, created_at, updated_at
                FROM network_rules
                WHERE rule_type = %s
                ORDER BY sort_order ASC, id ASC
                """,
                (rt,),
            )
            rows = cur.fetchall() or []
    return [row_to_json(r) for r in rows]


@app.get("/gis/rules/{rule_id}")
def get_rule_by_id(rule_id: int = Path(..., description="ID de la regle")):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            _ensure_rules_table(cur)
            cur.execute(
                """
                SELECT id, rule_type, category, rule_name, concerned_objects, description,
                       technical_constraints, examples, detected_errors, best_practices,
                       source_file, sort_order, created_at, updated_at
                FROM network_rules
                WHERE id = %s
                """,
                (rule_id,),
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Regle non trouvee")
    return row_to_json(row)


@app.post("/gis/rules")
def create_rule(body: dict = Body(default=None)):
    data = body or {}
    rt = str(data.get("rule_type") or "").strip().lower()
    if rt not in RULE_TYPES:
        raise HTTPException(status_code=400, detail="rule_type invalide (connectivite|topologie).")
    rule_name = str(data.get("rule_name") or "").strip()
    if not rule_name:
        raise HTTPException(status_code=400, detail="rule_name est requis.")

    with get_connection() as conn:
        with get_cursor(conn) as cur:
            _ensure_rules_table(cur)
            cur.execute(
                """
                INSERT INTO network_rules (
                    rule_type, category, rule_name, concerned_objects, description,
                    technical_constraints, examples, detected_errors, best_practices,
                    source_file, sort_order
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    rt,
                    data.get("category"),
                    rule_name,
                    data.get("concerned_objects"),
                    data.get("description"),
                    data.get("technical_constraints"),
                    data.get("examples"),
                    data.get("detected_errors"),
                    data.get("best_practices"),
                    data.get("source_file"),
                    int(data.get("sort_order") or 0),
                ),
            )
            row = cur.fetchone()
    return row_to_json(row)


@app.put("/gis/rules/{rule_id}")
def update_rule(rule_id: int = Path(..., description="ID de la regle"), body: dict = Body(default=None)):
    data = body or {}
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            _ensure_rules_table(cur)
            cur.execute("SELECT id, rule_type FROM network_rules WHERE id = %s", (rule_id,))
            current = cur.fetchone()
            if not current:
                raise HTTPException(status_code=404, detail="Regle non trouvee")

            next_rt = str(data.get("rule_type") or current.get("rule_type") or "").strip().lower()
            if next_rt not in RULE_TYPES:
                raise HTTPException(status_code=400, detail="rule_type invalide (connectivite|topologie).")
            next_name = str(data.get("rule_name") or "").strip() or str(current.get("rule_name") or "")
            if not next_name:
                raise HTTPException(status_code=400, detail="rule_name est requis.")

            cur.execute(
                """
                UPDATE network_rules
                SET
                    rule_type = %s,
                    category = %s,
                    rule_name = %s,
                    concerned_objects = %s,
                    description = %s,
                    technical_constraints = %s,
                    examples = %s,
                    detected_errors = %s,
                    best_practices = %s,
                    source_file = %s,
                    sort_order = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (
                    next_rt,
                    data.get("category"),
                    next_name,
                    data.get("concerned_objects"),
                    data.get("description"),
                    data.get("technical_constraints"),
                    data.get("examples"),
                    data.get("detected_errors"),
                    data.get("best_practices"),
                    data.get("source_file"),
                    int(data.get("sort_order") or 0),
                    rule_id,
                ),
            )
            row = cur.fetchone()
    return row_to_json(row)


@app.delete("/gis/rules/{rule_id}")
def delete_rule(rule_id: int = Path(..., description="ID de la regle")):
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            _ensure_rules_table(cur)
            cur.execute("DELETE FROM network_rules WHERE id = %s", (rule_id,))
            deleted = cur.rowcount > 0
    if not deleted:
        raise HTTPException(status_code=404, detail="Regle non trouvee")
    return {"deleted": True, "id": rule_id}


@app.get("/gis/{table_slug}")
def list_rows(
    table_slug: str = Path(..., description="Slug de la table (ex: distributionpanel-branchement)"),
    limit: int = 100,
    offset: int = 0,
    collecte_par: str | None = Query(None, description="Filtre optionnel par collecteur"),
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
            if collecte_par and _table_has_column(meta, "collecte_par"):
                cur.execute(
                    f'SELECT {select_list} FROM {quoted_table} '
                    f'WHERE {_canon_sql_expr("collecte_par")} = %s '
                    f'ORDER BY {quoted_pk} NULLS LAST LIMIT %s OFFSET %s',
                    (_canon_id(collecte_par), limit, offset),
                )
            else:
                cur.execute(
                    f'SELECT {select_list} FROM {quoted_table} ORDER BY {quoted_pk} NULLS LAST LIMIT %s OFFSET %s',
                    (limit, offset),
                )
            rows = cur.fetchall()
            _attach_code_equipement(cur, table_name, rows)
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
    # Fallback utile pour les nœuds de schéma dont l'identifiant vient parfois d'une codification
    # présente dans les colonnes métier plutôt que dans la PK stricte.
    for c in ("gid", "codification", "numero_ouvrage", "numero_poste", "numero_depart", "numero", "code", "name", "nom"):
        if _table_has_column(meta, c) and c not in search_cols:
            search_cols.append(c)
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            for col in search_cols:
                cur.execute(
                    f"SELECT {select_list} FROM {quoted_table} WHERE {_canon_sql_expr(col)} = %s LIMIT 1",
                    (canon,),
                )
                row = cur.fetchone()
                if row is not None:
                    _attach_code_equipement(cur, table_name, [row])
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
                    row = cur.fetchone()
                    if row is not None:
                        _attach_code_equipement(cur, table_name, [row])
                    return row_to_json(row)
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
                if row is not None:
                    _attach_code_equipement(cur, table_name, [row])
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
