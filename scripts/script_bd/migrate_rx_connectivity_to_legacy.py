#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration "compatibilité" :
1) utilise les couches importées `rx_*` (lignes + points) pour reconstruire une connectivité
   compatible avec le moteur de tracé existant (tables legacy : `ligne_hta`, `ligne_bt`, `ligne_brcht`).
2) insère des lignes "RXCOMPAT" dans les tables legacy, en snapant les extrémités des lignes
   sur les nœuds (poste-hta / poste-h59).

Objectif : permettre au tracé amont/aval de suivre le réseau sans refonte complète du graphe.
"""

from __future__ import annotations

import os
import re
import uuid
import argparse

import psycopg2
from psycopg2 import sql


def _env(name: str, default: str) -> str:
    return os.getenv(name, default).strip()


DB_CONFIG = {
    "host": _env("DB_HOST", "localhost"),
    "port": int(_env("DB_PORT", "5432")),
    "database": _env("DB_NAME", "pre_prod_test1"),
    "user": _env("DB_USER", "postgres"),
    "password": _env("DB_PASSWORD", "2023"),
}


EDGE_TAG_PREFIX = "RXCOMPAT|"


def discover_tables(cur, like_patterns: list[str]) -> list[str]:
    # like_patterns: [ 'rx_hta_%troncons', ... ]
    cond = " OR ".join(["table_name LIKE %s"] * len(like_patterns))
    q = f"""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema='public'
          AND table_type='BASE TABLE'
          AND ({cond})
        ORDER BY table_name
    """
    cur.execute(q, like_patterns)
    return [r[0] for r in cur.fetchall() or []]


def build_union_geom_table(cur, table_names: list[str]) -> tuple[str, list[str]]:
    # Construit un UNION ALL qui expose : (gid, geom, centroid_wkt)
    # Retourne (sql_fragment, params_tables) où sql_fragment contient les noms déjà quotés.
    if not table_names:
        return "", []

    parts = []
    for t in table_names:
        parts.append(
            sql.SQL("SELECT gid, geom, ST_AsText(ST_Centroid(geom)) AS centroid_wkt FROM {}").format(
                sql.Identifier(t)
            )
        )
    union = sql.SQL(" UNION ALL ").join(parts)
    return union.as_string(cur.connection), table_names


def find_nearest_node_gid(cur, union_sql: str, endpoint_wkt: str, tolerance_m: float) -> str | None:
    q = f"""
        SELECT gid
        FROM ({union_sql}) n
        WHERE n.geom IS NOT NULL
          AND ST_DWithin(n.geom::geography, ST_GeogFromText(%s), %s)
        ORDER BY ST_Distance(n.geom::geography, ST_GeogFromText(%s))
        LIMIT 1
    """
    cur.execute(q, (endpoint_wkt, tolerance_m, endpoint_wkt))
    row = cur.fetchone()
    if not row:
        return None
    return str(row[0]).strip()


def find_nearest_node_centroid_wkt(
    cur,
    union_sql: str,
    endpoint_wkt: str,
    tolerance_m: float,
) -> tuple[str, str] | None:
    q = f"""
        SELECT gid, centroid_wkt
        FROM ({union_sql}) n
        WHERE n.geom IS NOT NULL
          AND ST_DWithin(n.geom::geography, ST_GeogFromText(%s), %s)
        ORDER BY ST_Distance(n.geom::geography, ST_GeogFromText(%s))
        LIMIT 1
    """
    cur.execute(q, (endpoint_wkt, tolerance_m, endpoint_wkt))
    row = cur.fetchone()
    if not row:
        return None
    return str(row[0]).strip(), str(row[1]).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Snap rx_* sur legacy (ligne_hta/ligne_bt/ligne_brcht).")
    parser.add_argument("--tolerance-m", type=float, default=80.0, help="Tolérance de snap (mètres).")
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Si non fourni : mode dry-run (affiche actions, ne modifie pas la base).",
    )
    args = parser.parse_args()

    tol = float(args.tolerance_m)

    print("Connexion DB...")
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            # Candidats HTA/B T node tables
            rx_hta_line_tables = discover_tables(cur, ["rx_hta_%troncons"])
            rx_bt_line_tables = discover_tables(cur, ["rx_bt_%cable_bt"])

            rx_hta_node_tables = discover_tables(cur, ["rx_hta_%poste_hta%"])
            rx_bt_node_tables = discover_tables(cur, ["rx_bt_%poste_h59%"])

            if not rx_hta_line_tables and not rx_bt_line_tables:
                raise RuntimeError("Aucune table rx_* line detectee (rx_hta_%troncons / rx_bt_%cable_bt).")
            if not rx_hta_node_tables:
                raise RuntimeError("Aucune table rx_* node HTA detectee (rx_hta_%poste_hta%).")
            if not rx_bt_node_tables:
                raise RuntimeError("Aucune table rx_* node BT detectee (rx_bt_%poste_h59%).")

            print(f"HTA lignes: {len(rx_hta_line_tables)}")
            print(f"BT lignes : {len(rx_bt_line_tables)}")
            print(f"HTA nodes : {len(rx_hta_node_tables)}")
            print(f"BT nodes  : {len(rx_bt_node_tables)}")

            # Dry-run
            print(f"Tolerance: {tol} m")
            if not args.commit:
                print("MODE: dry-run (aucune insertion/suppression).")

            # Nettoyage des edges déjà migrées (tag RXCOMPAT|)
            del_sql = [
                ("ligne_hta", "numero", "ligne_hta", "numero"),
                ("ligne_bt", "numero", "ligne_bt", "numero"),
                ("ligne_brcht", "numero", "ligne_brcht", "numero"),
            ]
            # (on ignore si numero est null : LIKE ne match pas)
            if args.commit:
                for edge_table in ("ligne_hta", "ligne_bt", "ligne_brcht"):
                    cur.execute(
                        f"DELETE FROM {sql.Identifier(edge_table).as_string(cur.connection)} WHERE numero LIKE %s",
                        (EDGE_TAG_PREFIX + "%",),
                    )
                    print(f"  - Nettoyage {edge_table}")
            else:
                for edge_table in ("ligne_hta", "ligne_bt", "ligne_brcht"):
                    print(f"  - Dry-run: nettoyage {edge_table} (numero LIKE '{EDGE_TAG_PREFIX}%' )")

            # Union nodes (HTA / BT)
            # (pour brcht, on a besoin du centroid en plus)
            hta_union_sql, _ = build_union_geom_table(cur, rx_hta_node_tables)
            bt_union_sql, _ = build_union_geom_table(cur, rx_bt_node_tables)

            # Récupérer toutes les lignes rx_hta et rx_bt et insérer une edge legacy par feature
            inserted_hta = 0
            inserted_bt = 0
            inserted_brcht = 0

            # Helper insert
            def insert_hta_edge(rx_table: str, rx_gid: str, rx_num: str, sp_wkt: str, ep_wkt: str) -> None:
                nonlocal inserted_hta
                start_gid = find_nearest_node_gid(cur, hta_union_sql, sp_wkt, tol)
                end_gid = find_nearest_node_gid(cur, hta_union_sql, ep_wkt, tol)
                if not start_gid or not end_gid:
                    return
                edge_gid = str(uuid.uuid4())
                compat_num = f"{EDGE_TAG_PREFIX}{rx_table}|{rx_gid}"

                if not args.commit:
                    print(f"[HTA edge] would insert {compat_num} id_depart_hta={start_gid} id_poteau_hta={end_gid}")
                    inserted_hta += 1
                    return

                q = sql.SQL(
                    """
                    INSERT INTO ligne_hta (gid, numero, geom, id_depart_hta, id_poteau_hta)
                    SELECT %s::varchar, %s, ST_LineMerge(ST_Transform(t.geom, 32630))::geometry(LineString,32630), %s, %s
                    FROM {} t
                    WHERE {_canon_sql_expr}
                    """
                )

                # On ne peut pas utiliser _canon_sql_expr ici ; on suppose gid stocké tel quel en varchar.
                cur.execute(
                    f"""
                    INSERT INTO ligne_hta (gid, numero, geom, id_depart_hta, id_poteau_hta)
                    SELECT %s::varchar, %s,
                           ST_LineMerge(ST_Transform(t.geom, 32630))::geometry(LineString,32630),
                           %s, %s
                    FROM {sql.Identifier(rx_table).as_string(cur.connection)} t
                    WHERE CAST(t.gid AS TEXT) = %s
                    """,
                    (edge_gid, compat_num, start_gid, end_gid, rx_gid),
                )
                inserted_hta += 1

            def insert_bt_edge(rx_table: str, rx_gid: str, rx_num: str, sp_wkt: str, ep_wkt: str) -> None:
                nonlocal inserted_bt
                start_gid = find_nearest_node_gid(cur, bt_union_sql, sp_wkt, tol)
                end_gid = find_nearest_node_gid(cur, bt_union_sql, ep_wkt, tol)
                if not start_gid or not end_gid:
                    return
                edge_gid = str(uuid.uuid4())
                compat_num = f"{EDGE_TAG_PREFIX}{rx_table}|{rx_gid}"

                if not args.commit:
                    print(f"[BT edge] would insert {compat_num} id_depart_bt={start_gid} id_poteau_bt={end_gid}")
                    inserted_bt += 1
                    return

                cur.execute(
                    f"""
                    INSERT INTO ligne_bt (gid, numero, geom, id_depart_bt, id_poteau_bt)
                    SELECT %s::varchar, %s,
                           ST_LineMerge(ST_Transform(t.geom, 32630))::geometry(LineString,32630),
                           %s, %s
                    FROM {sql.Identifier(rx_table).as_string(cur.connection)} t
                    WHERE CAST(t.gid AS TEXT) = %s
                    """,
                    (edge_gid, compat_num, start_gid, end_gid, rx_gid),
                )
                inserted_bt += 1

            print("Insertion HTA edges...")
            for rx_table in rx_hta_line_tables:
                q = f"""
                    SELECT
                        gid::text AS rx_gid,
                        -- Certaines tables rx_* n'ont pas toutes les mêmes attributs.
                        -- Pour la compatibilité connectivité, seul le gid est nécessaire.
                        CAST(gid AS TEXT) AS rx_num,
                        ST_AsText(ST_StartPoint(ST_LineMerge(geom))) AS sp_wkt,
                        ST_AsText(ST_EndPoint(ST_LineMerge(geom))) AS ep_wkt
                    FROM {sql.Identifier(rx_table).as_string(cur.connection)}
                    WHERE geom IS NOT NULL
                """
                cur.execute(q)
                for rx_gid, rx_num, sp_wkt, ep_wkt in cur.fetchall() or []:
                    if not sp_wkt or not ep_wkt:
                        continue
                    insert_hta_edge(rx_table, rx_gid, rx_num, sp_wkt, ep_wkt)

            print("Insertion BT edges...")
            for rx_table in rx_bt_line_tables:
                q = f"""
                    SELECT
                        gid::text AS rx_gid,
                        -- Pour la connectivité, seul le gid est nécessaire.
                        CAST(gid AS TEXT) AS rx_num,
                        ST_AsText(ST_StartPoint(ST_LineMerge(geom))) AS sp_wkt,
                        ST_AsText(ST_EndPoint(ST_LineMerge(geom))) AS ep_wkt
                    FROM {sql.Identifier(rx_table).as_string(cur.connection)}
                    WHERE geom IS NOT NULL
                """
                cur.execute(q)
                for rx_gid, rx_num, sp_wkt, ep_wkt in cur.fetchall() or []:
                    if not sp_wkt or not ep_wkt:
                        continue
                    insert_bt_edge(rx_table, rx_gid, rx_num, sp_wkt, ep_wkt)

            # Insertion brcht edges (BT node -> nearest HTA node)
            print("Insertion brcht edges...")
            # We'll iterate over all BT nodes across their tables.
            for bt_table in rx_bt_node_tables:
                q_bt = f"""
                    SELECT gid::text AS bt_gid, ST_AsText(ST_Centroid(geom)) AS bt_centroid_wkt
                    FROM {sql.Identifier(bt_table).as_string(cur.connection)}
                    WHERE geom IS NOT NULL
                """
                cur.execute(q_bt)
                for bt_gid, bt_centroid_wkt in cur.fetchall() or []:
                    if not bt_centroid_wkt:
                        continue
                    nearest = find_nearest_node_centroid_wkt(cur, hta_union_sql, bt_centroid_wkt, tol)
                    if not nearest:
                        continue
                    hta_gid, hta_centroid_wkt = nearest
                    if not hta_centroid_wkt:
                        continue
                    edge_gid = str(uuid.uuid4())
                    compat_num = f"{EDGE_TAG_PREFIX}brcht|{bt_table}|{bt_gid}|{hta_gid}"

                    if not args.commit:
                        print(
                            f"[BRCHT edge] would insert {compat_num} bt_gid={bt_gid} hta_gid={hta_gid}"
                        )
                        inserted_brcht += 1
                        continue

                    cur.execute(
                        """
                        INSERT INTO ligne_brcht (gid, numero, geom, id_depart_bt, id_poteau_bt, id_poteau_hta)
                        VALUES (
                            %s::varchar,
                            %s,
                            ST_MakeLine(
                                ST_Transform(ST_GeomFromText(%s, 4326), 32630),
                                ST_Transform(ST_GeomFromText(%s, 4326), 32630)
                            )::geometry(LineString,32630),
                            %s,
                            %s,
                            %s
                        )
                        """,
                        (
                            edge_gid,
                            compat_num,
                            bt_centroid_wkt,
                            hta_centroid_wkt,
                            bt_gid,
                            bt_gid,
                            hta_gid,
                        ),
                    )
                    inserted_brcht += 1

            print(f"Result: HTA edges={inserted_hta}, BT edges={inserted_bt}, BRCHT edges={inserted_brcht}")

        if args.commit:
            conn.commit()
            print("COMMIT OK")
        else:
            conn.rollback()
            print("ROLLBACK (dry-run)")

    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

