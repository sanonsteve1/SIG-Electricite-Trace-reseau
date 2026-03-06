#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère et insère un jeu de données volumineux pour la région Sahel du Burkina Faso (Dori et environs).
Couverture géographique : corridor Dori → Sebba → Yalgo → Djibo (Sahel burkinabé).

Volumes cibles:
  Poste source: 10 | Départs HTA: 80 | Poteaux HTA: 2 000 | Lignes HTA: 2 400
  Postes cabine: 600 | Départs BT: 3 000 | Poteaux BT: 120 000 | Lignes BT: 120 000
  Lignes branchement: 240 000 | Points raccordement: 240 000 | Abonnés: 240 000 | Branchements: 240 000

Usage:
  cd scripts/script_bd && python generate_donnees_dori_volumineux.py
  Variables d'env optionnelles: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

Attention: l'exécution peut prendre 1 à 3 heures (environ 1 million d'insertions).
"""

import os
import sys
import random
import uuid

# Connexion DB (même config que api)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from api.config import DB_CONFIG
    from api.db import get_connection, get_cursor
except ImportError:
    DB_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "database": os.getenv("DB_NAME", "pre_prod_test1"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "2023"),
    }
    import psycopg2
    from contextlib import contextmanager
    @contextmanager
    def get_connection():
        conn = psycopg2.connect(**DB_CONFIG)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    def get_cursor(conn):
        return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

COLLECTE = "jeu_dori_volumineux"
SRID_WGS84 = 4326
SRID_UTM = 32630

# Corridor Dori → Sebba → Yalgo → Djibo (lon, lat WGS84)
# Dori: chef-lieu Sahel | Sebba: est | Yalgo: centre-nord | Djibo: Soum
WAYPOINTS_ROUTE = [
    (-0.05, 14.05),   # Dori
    (0.53, 13.43),    # Sebba
    (-0.50, 13.80),   # Yalgo
    (-1.63, 14.10),   # Djibo
]
# Bbox couvrant le corridor (marge ~0.2°)
LON_MIN = min(p[0] for p in WAYPOINTS_ROUTE) - 0.25
LON_MAX = max(p[0] for p in WAYPOINTS_ROUTE) + 0.25
LAT_MIN = min(p[1] for p in WAYPOINTS_ROUTE) - 0.25
LAT_MAX = max(p[1] for p in WAYPOINTS_ROUTE) + 0.25

# Volumes
N_POSTE_SOURCE = 10
N_DEPART_HTA = 80
N_POTEAU_HTA = 2_000
N_LIGNE_HTA = 2_400
N_POSTE_CABINE = 600
N_DEPART_BT = 3_000
N_POTEAU_BT = 120_000
N_LIGNE_BT = 120_000
N_LIGNE_BRCHT = 240_000
N_POINT_RACCORDEMENT = 240_000
N_ABONNE = 240_000
N_BRANCHEMENT = 240_000

# Pour reproductibilité et génération déterministe des gids
SEED = "dori_vol_sahel_bf"
random.seed(42)


def gid_uuid(table: str, i: int) -> str:
    """Génère un UUID déterministe pour (table, i)."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{SEED}.{table}.{i}"))


def wkt_point(lon: float, lat: float) -> str:
    return f"POINT({lon} {lat})"


def wkt_linestring(lon1: float, lat1: float, lon2: float, lat2: float) -> str:
    return f"LINESTRING({lon1} {lat1}, {lon2} {lat2})"


def geom_transform_wkt(wkt: str) -> str:
    """Retourne l'expression SQL pour transformer WGS84 -> UTM 32630."""
    return f"ST_Transform(ST_SetSRID(ST_GeomFromText('{wkt}'), {SRID_WGS84}), {SRID_UTM})"


def _segment_lengths():
    """Longueurs cumulées des segments Dori → Sebba → Yalgo → Djibo (pour interpolation)."""
    import math
    lengths = [0.0]
    for i in range(1, len(WAYPOINTS_ROUTE)):
        a, b = WAYPOINTS_ROUTE[i - 1], WAYPOINTS_ROUTE[i]
        lengths.append(lengths[-1] + math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))
    return lengths


_route_lengths = None


def point_along_route(t: float):
    """Retourne (lon, lat) au paramètre t in [0, 1] le long de Dori → Sebba → Yalgo → Djibo."""
    global _route_lengths
    if _route_lengths is None:
        _route_lengths = _segment_lengths()
    total = _route_lengths[-1]
    if total <= 0:
        return WAYPOINTS_ROUTE[0]
    d = t * total
    for i in range(1, len(WAYPOINTS_ROUTE)):
        if d <= _route_lengths[i]:
            s = (d - _route_lengths[i - 1]) / (_route_lengths[i] - _route_lengths[i - 1]) if _route_lengths[i] > _route_lengths[i - 1] else 1.0
            a, b = WAYPOINTS_ROUTE[i - 1], WAYPOINTS_ROUTE[i]
            return (a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1]))
    return WAYPOINTS_ROUTE[-1]


def random_point():
    """Point aléatoire le long du corridor (80 %) ou dans la bbox (20 %)."""
    if random.random() < 0.8:
        t = random.uniform(0, 1)
        lon, lat = point_along_route(t)
        # Légère dispersion autour du corridor
        lon += random.uniform(-0.08, 0.08)
        lat += random.uniform(-0.08, 0.08)
        lon = max(LON_MIN, min(LON_MAX, lon))
        lat = max(LAT_MIN, min(LAT_MAX, lat))
        return (lon, lat)
    return (random.uniform(LON_MIN, LON_MAX), random.uniform(LAT_MIN, LAT_MAX))


def random_point_near(lon: float, lat: float, radius_deg: float = 0.05):
    dx = random.uniform(-radius_deg, radius_deg)
    dy = random.uniform(-radius_deg, radius_deg)
    return (lon + dx, lat + dy)


def run_sql(cursor, sql: str, params=None):
    cursor.execute(sql, params or ())


def delete_where_collecte(cursor, table: str):
    run_sql(cursor, f"DELETE FROM {table} WHERE collecte_par = %s", (COLLECTE,))


def main():
    print("Génération des données volumineuses - Corridor Dori → Sebba → Yalgo → Djibo (Sahel, Burkina Faso)")
    print("=" * 60)

    with get_connection() as conn:
        cur = get_cursor(conn)
        # Nettoyage (ordre dépendances)
        print("Nettoyage des anciennes données (collecte_par = ...)")
        for t in ("branchement", "abonne", "point_raccordement", "ligne_brcht", "ligne_bt",
                  "poteau_bt", "depart_bt", "poste_cabine", "ligne_hta", "poteau_hta", "depart", "poste_source"):
            try:
                delete_where_collecte(cur, t)
                print(f"  {t}: supprimé")
            except Exception as e:
                print(f"  {t}: ignoré ({e})")

        # --- 1) Postes source (10) le long de Dori → Sebba → Yalgo → Djibo ---
        print("\n1) Postes source (Dori → Sebba → Yalgo → Djibo)...")
        poste_source_gids = []
        # Répartition le long du corridor : Dori (départ), Sebba, Yalgo, Djibo (arrivée)
        t_positions = (0.0, 0.05, 0.30, 0.38, 0.52, 0.60, 0.75, 0.82, 0.90, 1.0)
        noms_etapes = ("DORI", "DORI", "SEBBA", "SEBBA", "YALGO", "YALGO", "DJIBO", "DJIBO", "DJIBO", "DJIBO")
        for i in range(N_POSTE_SOURCE):
            gid = gid_uuid("poste_source", i)
            poste_source_gids.append(gid)
            t = t_positions[i] if i < len(t_positions) else i / max(1, N_POSTE_SOURCE - 1)
            lon, lat = point_along_route(t)
            lon, lat = random_point_near(lon, lat, 0.015)
            etape = noms_etapes[i] if i < len(noms_etapes) else "SAHEL"
            libelle = f"Poste source {etape.capitalize()} - corridor Dori/Sebba/Yalgo/Djibo"
            run_sql(cur, """
                INSERT INTO poste_source (gid, numero_poste, exploitation, equipement, collecte_par, validation, geom)
                VALUES (%s, %s, 1, %s, %s, 1, """ + geom_transform_wkt(wkt_point(lon, lat)) + """)
            """, (gid, f"PS-{etape}-{i+1:02d}", libelle, COLLECTE))
        print(f"   Inséré {N_POSTE_SOURCE} postes source.")

        # --- 2) Départs HTA (80) ---
        print("2) Départs HTA...")
        depart_hta_gids = []
        for i in range(N_DEPART_HTA):
            gid = gid_uuid("depart_hta", i)
            depart_hta_gids.append(gid)
            ps_gid = poste_source_gids[i % N_POSTE_SOURCE]
            run_sql(cur, """
                INSERT INTO depart (gid, numero, id_poste_source, tension, collecte_par, validation)
                VALUES (%s, %s, %s, 33000, %s, 1)
            """, (gid, f"DEP-HTA-SAHEL-{i+1:03d}", ps_gid, COLLECTE))
        print(f"   Inséré {N_DEPART_HTA} départs HTA.")

        # --- 3) Poteaux HTA (2 000) ---
        print("3) Poteaux HTA...")
        poteau_hta_gids = []
        batch_size = 500
        for start in range(0, N_POTEAU_HTA, batch_size):
            rows = []
            for i in range(start, min(start + batch_size, N_POTEAU_HTA)):
                gid = gid_uuid("poteau_hta", i)
                poteau_hta_gids.append(gid)
                lon, lat = random_point()
                geom_sql = geom_transform_wkt(wkt_point(lon, lat))
                rows.append((gid, f"PHTA-SAHEL-{i+1:05d}", 1, 4, 4, True, True, False, False, False, COLLECTE, 1, geom_sql))
            for r in rows:
                run_sql(cur, """
                    INSERT INTO poteau_hta (gid, numero, id_poteau_hta_type, id_poteau_hta_hauteur, id_poteau_hta_implantation,
                    noeud, extension_ht, extension_bt, descente_bt, avec_lampadaire, collecte_par, validation, geom)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, """ + r[-1] + """)
                """, r[:-1])
        print(f"   Inséré {N_POTEAU_HTA} poteaux HTA.")

        # --- 4) Postes cabine (600) ---
        print("4) Postes cabine...")
        poste_cabine_gids = []
        for i in range(N_POSTE_CABINE):
            gid = gid_uuid("poste_cabine", i)
            poste_cabine_gids.append(gid)
            lon, lat = random_point()
            run_sql(cur, """
                INSERT INTO poste_cabine (gid, numero, id_poste_cabine_type, nbre_transfo, id_poste_cabine_tur,
                id_ligne_hta, collecte_par, validation, geom)
                VALUES (%s, %s, 1, 1, 1, NULL, %s, 1, """ + geom_transform_wkt(wkt_point(lon, lat)) + """)
            """, (gid, f"PC-SAHEL-{i+1:04d}", COLLECTE))
        print(f"   Inséré {N_POSTE_CABINE} postes cabine.")

        # --- 5) Lignes HTA (2 400) : chaînes depart -> poteau -> ... -> poste_cabine ---
        print("5) Lignes HTA...")
        poteau_hta_used = 0
        geom_line = "ST_Transform(ST_SetSRID(ST_GeomFromText('LINESTRING(0 0, 0.001 0.001)'), 4326), 32630)"
        for c in range(N_POSTE_CABINE):
            dep_idx = c % N_DEPART_HTA
            dep_gid = depart_hta_gids[dep_idx]
            cab_gid = poste_cabine_gids[c]
            idxes = [poteau_hta_used % N_POTEAU_HTA, (poteau_hta_used + 1) % N_POTEAU_HTA, (poteau_hta_used + 2) % N_POTEAU_HTA]
            poteau_hta_used += 3
            p_gids = [poteau_hta_gids[i] for i in idxes]
            for seg in range(4):
                i = c * 4 + seg
                gid = gid_uuid("ligne_hta", i)
                id_dep = dep_gid if seg == 0 else p_gids[seg - 1]
                id_pot = p_gids[seg] if seg < 3 else cab_gid
                run_sql(cur, """
                    INSERT INTO ligne_hta (gid, numero, id_ligne_hta_type, id_ligne_hta_tension, id_depart_hta, id_poteau_hta, collecte_par, validation, geom)
                    VALUES (%s, %s, 1, 1, %s, %s, %s, 1, """ + geom_line + """)
                """, (gid, f"LHTA-SAHEL-{i+1:05d}", id_dep, id_pot, COLLECTE))
            line_feed_gid = gid_uuid("ligne_hta", c * 4 + 3)
            run_sql(cur, "UPDATE poste_cabine SET id_ligne_hta = %s WHERE gid = %s", (line_feed_gid, cab_gid))
        print(f"   Inséré {N_LIGNE_HTA} lignes HTA.")

        # --- 6) Départs BT (3 000) ---
        print("6) Départs BT...")
        depart_bt_gids = []
        for i in range(N_DEPART_BT):
            gid = gid_uuid("depart_bt", i)
            depart_bt_gids.append(gid)
            pc_gid = poste_cabine_gids[i % N_POSTE_CABINE]
            run_sql(cur, """
                INSERT INTO depart_bt (gid, numero_depart, id_poste_cabine, collecte_par, validation)
                VALUES (%s, %s, %s, %s, 1)
            """, (gid, f"DEP-BT-SAHEL-{i+1:05d}", pc_gid, COLLECTE))
        print(f"   Inséré {N_DEPART_BT} départs BT.")

        # --- 7) Poteaux BT (120 000) par batch ---
        print("7) Poteaux BT (par lots de 10 000)...")
        poteau_bt_gids = []
        BATCH_BT = 10_000
        for start in range(0, N_POTEAU_BT, BATCH_BT):
            n = min(BATCH_BT, N_POTEAU_BT - start)
            vals = []
            for i in range(start, start + n):
                gid = gid_uuid("poteau_bt", i)
                poteau_bt_gids.append(gid)
                lon, lat = random_point()
                geom_sql = geom_transform_wkt(wkt_point(lon, lat))
                vals.append((gid, f"PBT-SAHEL-{i+1:06d}", 1, 2, 1, True, True, False, False, COLLECTE, 1, geom_sql))
            for r in vals:
                run_sql(cur, """
                    INSERT INTO poteau_bt (gid, numero, id_poteau_bt_type, id_poteau_bt_hauteur, id_poteau_bt_implantation,
                    noeud, extension, descente, avec_lampadaire, collecte_par, validation, geom)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, """ + r[-1] + """)
                """, r[:-1])
            print(f"   Poteaux BT: {start + n}/{N_POTEAU_BT}")
        print(f"   Inséré {N_POTEAU_BT} poteaux BT.")

        # --- 8) Lignes BT (120 000) : 40 lignes (depart -> poteau) par départ ---
        print("8) Lignes BT (par lots)...")
        geom_linestring = "ST_Transform(ST_SetSRID(ST_GeomFromText('LINESTRING(0 0, 0.001 0.001)'), 4326), 32630)"
        for i in range(N_LIGNE_BT):
            dep_idx = i // 40
            gid = gid_uuid("ligne_bt", i)
            dep_gid = depart_bt_gids[dep_idx]
            poteau_gid = poteau_bt_gids[i]
            run_sql(cur, """
                INSERT INTO ligne_bt (gid, numero, id_ligne_bt_type, id_ligne_bt_nature, id_ligne_bt_type_cable, id_ligne_bt_section_cable,
                id_depart_bt, id_poteau_bt, collecte_par, validation, geom)
                VALUES (%s, %s, 1, 1, 1, 1, %s, %s, %s, 1, """ + geom_linestring + """)
            """, (gid, f"LBT-SAHEL-{i+1:06d}", dep_gid, poteau_gid, COLLECTE))
            if (i + 1) % 20000 == 0:
                print(f"   Lignes BT: {i+1}/{N_LIGNE_BT}")
        print(f"   Inséré {N_LIGNE_BT} lignes BT.")

        # --- 9) Lignes branchement (240 000) : 2 par poteau BT ---
        print("9) Lignes branchement (par lots de 20 000)...")
        BATCH_BR = 20_000
        geom_linestring = "ST_Transform(ST_SetSRID(ST_GeomFromText('LINESTRING(0 0, 0.001 0.001)'), 4326), 32630)"
        for start in range(0, N_LIGNE_BRCHT, BATCH_BR):
            for i in range(start, min(start + BATCH_BR, N_LIGNE_BRCHT)):
                gid = gid_uuid("ligne_brcht", i)
                pbt_idx = i // 2
                dep_bt_gid = depart_bt_gids[(pbt_idx % N_POTEAU_BT) // 40]
                poteau_bt_gid = poteau_bt_gids[pbt_idx % N_POTEAU_BT]
                run_sql(cur, """
                    INSERT INTO ligne_brcht (gid, numero, id_ligne_brcht_nature, id_ligne_brcht_type_cable, id_ligne_brcht_section_cable,
                    id_depart_bt, id_poteau_bt, collecte_par, validation, geom)
                    VALUES (%s, %s, 1, 1, 1, %s, %s, %s, 1, """ + geom_linestring + """)
                """, (gid, f"LBR-SAHEL-{i+1:06d}", dep_bt_gid, poteau_bt_gid, COLLECTE))
            print(f"   Lignes branchement: {min(start + BATCH_BR, N_LIGNE_BRCHT)}/{N_LIGNE_BRCHT}")
        print(f"   Inséré {N_LIGNE_BRCHT} lignes branchement.")

        # --- 10) Points raccordement (240 000) ---
        print("10) Points raccordement (par lots de 20 000)...")
        for start in range(0, N_POINT_RACCORDEMENT, BATCH_BR):
            for i in range(start, min(start + BATCH_BR, N_POINT_RACCORDEMENT)):
                gid = gid_uuid("point_raccordement", i)
                ligne_gid = gid_uuid("ligne_brcht", i)
                lon, lat = random_point()
                run_sql(cur, """
                    INSERT INTO point_raccordement (gid, numero, numero_abonne, id_point_raccord_organe, id_point_raccord_exploitation,
                    id_ligne_brcht, collecte_par, validation, geom)
                    VALUES (%s, %s, %s, 1, 1, %s, %s, 1, """ + geom_transform_wkt(wkt_point(lon, lat)) + """)
                """, (gid, f"PR-SAHEL-{i+1:06d}", f"ABO-SAHEL-{i+1:06d}", ligne_gid, COLLECTE))
            print(f"   Points raccordement: {min(start + BATCH_BR, N_POINT_RACCORDEMENT)}/{N_POINT_RACCORDEMENT}")
        print(f"   Inséré {N_POINT_RACCORDEMENT} points raccordement.")

        # --- 11) Abonnés (240 000) ---
        print("11) Abonnés (par lots de 20 000)...")
        prenoms = ("Boukary", "Fati", "Ibrahim", "Aminata", "Ousmane", "Mariam", "Abdou", "Kadidia", "Moussa", "Ramatou")
        noms = ("OUEDRAOGO", "TANKOANO", "SAWADOGO", "KABORE", "COMPAORE", "ZONGO", "KINDO", "ILBOUDO", "BAZIE", "SANOGO")
        for start in range(0, N_ABONNE, BATCH_BR):
            for i in range(start, min(start + BATCH_BR, N_ABONNE)):
                gid = gid_uuid("abonne", i)
                run_sql(cur, """
                    INSERT INTO abonne (gid, num_abonne, nom, prenoms, telephone, puissance_souscrite,
                    id_abonne_usage, id_abonne_type, id_abonne_nature, id_abonne_activite, collecte_par, validation)
                    VALUES (%s, %s, %s, %s, %s, %s, 1, 1, 1, 1, %s, 1)
                """, (gid, f"ABO-SAHEL-{i+1:06d}", noms[i % 10], prenoms[i % 10], f"70{i+1:06d}", random.choice((3, 6, 9)), COLLECTE))
            print(f"   Abonnés: {min(start + BATCH_BR, N_ABONNE)}/{N_ABONNE}")
        print(f"   Inséré {N_ABONNE} abonnés.")

        # --- 12) Branchements (240 000) ---
        print("12) Branchements (par lots de 20 000)...")
        for start in range(0, N_BRANCHEMENT, BATCH_BR):
            for i in range(start, min(start + BATCH_BR, N_BRANCHEMENT)):
                gid = gid_uuid("branchement", i)
                pr_gid = gid_uuid("point_raccordement", i)
                run_sql(cur, """
                    INSERT INTO branchement (gid, numero, id_point_raccordement, id_branchement_type, id_branchement_rapport_transfo,
                    existence_compteur, code_client, nom, prenoms, telephone, collecte_par, validation)
                    VALUES (%s, %s, %s, 1, 1, TRUE, %s, %s, %s, %s, %s, 1)
                """, (gid, i + 1, pr_gid, f"CLI-SAHEL-{i+1:06d}", noms[i % 10], prenoms[i % 10], f"70{i+1:06d}", COLLECTE))
            print(f"   Branchements: {min(start + BATCH_BR, N_BRANCHEMENT)}/{N_BRANCHEMENT}")
        print(f"   Inséré {N_BRANCHEMENT} branchements.")

    print("\n" + "=" * 60)
    print("Terminé. Toutes les données Sahel (Dori) ont été insérées.")
    print("Collecte_par = 'jeu_dori_volumineux' pour identification / suppression.")


if __name__ == "__main__":
    main()
