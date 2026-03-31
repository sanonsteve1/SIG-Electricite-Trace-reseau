#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Codifie les equipements GIS avec un code metier unique."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone

import psycopg2
from psycopg2 import sql

from api.config import DB_CONFIG


# Tables metier a codifier (hors tables de reference l_* et tables techniques).
TABLE_TYPE_CODES = {
    "abonne": "ABN",
    "arrivee": "ARR",
    "armement_ferrure": "ARF",
    "branchement": "BRN",
    "cellule": "CEL",
    "coffret": "CFT",
    "coffret_repiquage": "CRP",
    "compteur": "CPT",
    "depart": "DEP",
    "depart_bt": "DBT",
    "jonction_hta": "JHT",
    "ocr": "OCR",
    "parafoudre": "PRF",
    "point_raccordement": "PRC",
    "poste_cabine": "PCB",
    "poste_source": "PSR",
    "poste_sur_poteau": "PSP",
    "poteau_bt": "PBT",
    "poteau_hta": "PHT",
    "transfo_ht_bt": "THB",
    "transfo_poteau": "TPO",
    "transformateur_ps": "TPS",
    "tur": "TUR",
}


def ensure_schema(cur) -> None:
    cur.execute(
        """
        CREATE SEQUENCE IF NOT EXISTS equipement_code_seq START WITH 1 INCREMENT BY 1;

        CREATE TABLE IF NOT EXISTS equipement_codification (
            id BIGSERIAL PRIMARY KEY,
            table_name TEXT NOT NULL,
            equipement_id TEXT NOT NULL,
            type_code VARCHAR(8) NOT NULL,
            code_equipement VARCHAR(64) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (table_name, equipement_id),
            UNIQUE (code_equipement)
        );

        CREATE INDEX IF NOT EXISTS idx_equipement_codification_table_gid
            ON equipement_codification (table_name, equipement_id);
        """
    )


def table_exists(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = %s
        )
        """,
        (table_name,),
    )
    return bool(cur.fetchone()[0])


def table_has_gid(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = 'gid'
        )
        """,
        (table_name,),
    )
    return bool(cur.fetchone()[0])


def backfill_table(cur, table_name: str, type_code: str, year_short: str) -> int:
    query = sql.SQL(
        """
        WITH src AS (
            SELECT DISTINCT t.gid::text AS gid
            FROM {table_ident} t
            WHERE t.gid IS NOT NULL
        )
        INSERT INTO equipement_codification (table_name, equipement_id, type_code, code_equipement)
        SELECT
            %s,
            src.gid,
            %s,
            'EQ-' || %s || '-' || %s || '-' || LPAD(nextval('equipement_code_seq')::text, 6, '0')
        FROM src
        LEFT JOIN equipement_codification ec
            ON ec.table_name = %s
           AND ec.equipement_id = src.gid
        WHERE ec.id IS NULL
        """
    ).format(table_ident=sql.Identifier(table_name))

    cur.execute(query, (table_name, type_code, type_code, year_short, table_name))
    return cur.rowcount


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Cree la structure de codification et attribue un code unique "
            "a tous les equipements existants."
        )
    )
    parser.add_argument(
        "--year",
        default=datetime.now(timezone.utc).strftime("%y"),
        help="Annee sur 2 chiffres incluse dans le code (defaut: annee courante UTC).",
    )
    args = parser.parse_args()

    if len(args.year) != 2 or not args.year.isdigit():
        raise SystemExit("Le parametre --year doit etre au format 2 chiffres (ex: 26).")

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            ensure_schema(cur)

            total = 0
            for table_name, type_code in TABLE_TYPE_CODES.items():
                if not table_exists(cur, table_name):
                    print(f"[SKIP] table absente: {table_name}")
                    continue
                if not table_has_gid(cur, table_name):
                    print(f"[SKIP] pas de colonne gid: {table_name}")
                    continue

                inserted = backfill_table(cur, table_name, type_code, args.year)
                total += inserted
                print(f"[OK] {table_name:<22} +{inserted}")

            conn.commit()
            print(f"\nTermine. Nouveaux codes generes: {total}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
