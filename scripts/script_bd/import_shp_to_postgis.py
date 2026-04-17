#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import batch de shapefiles vers PostGIS.

Usage typique (PowerShell):
  python import_shp_to_postgis.py --shp-root "F:\\CIE\\SHP"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable


def _env(name: str, default: str) -> str:
    return os.getenv(name, default).strip()


DB_CONFIG = {
    "host": _env("DB_HOST", "localhost"),
    "port": _env("DB_PORT", "5432"),
    "database": _env("DB_NAME", "pre_prod_test1"),
    "user": _env("DB_USER", "postgres"),
    "password": _env("DB_PASSWORD", "2023"),
}


def normalize_token(value: str) -> str:
    token = value.lower().strip()
    token = re.sub(r"[^a-z0-9]+", "_", token)
    token = re.sub(r"_+", "_", token).strip("_")
    return token


def build_table_name(base_root: Path, shp_path: Path) -> str:
    rel = shp_path.relative_to(base_root)
    parts = [normalize_token(p) for p in rel.parts[:-1] if normalize_token(p)]
    stem = normalize_token(shp_path.stem) or "layer"
    pieces = [*parts, stem]
    name = "_".join(pieces)
    if not name:
        name = "layer"
    # Limite PostgreSQL: 63 chars.
    return name[:63]


def discover_shapefiles(root: Path) -> list[Path]:
    # Recherche insensible a la casse de l'extension.
    return sorted(
        [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() == ".shp"]
    )


def build_pg_dsn() -> str:
    return (
        f"PG:host={DB_CONFIG['host']} "
        f"port={DB_CONFIG['port']} "
        f"dbname={DB_CONFIG['database']} "
        f"user={DB_CONFIG['user']} "
        f"password={DB_CONFIG['password']}"
    )


def has_postgresql_driver() -> bool:
    try:
        out = subprocess.run(
            ["ogrinfo", "--formats"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False
    # Eviter le faux positif "PGDUMP ... PostgreSQL SQL dump".
    for line in out.stdout.splitlines():
        # Exemple attendu:
        #   PostgreSQL -vector- (rw+): PostgreSQL/PostGIS
        if re.match(r"^\s*PostgreSQL\s+-", line):
            return True
    return False


def run_ogr2ogr_postgresql(shp_path: Path, table_name: str, target_srid: int, overwrite: bool) -> None:
    mode_args = ["-overwrite"] if overwrite else ["-append"]
    cmd = [
        "ogr2ogr",
        "-f",
        "PostgreSQL",
        build_pg_dsn(),
        str(shp_path),
        "-nln",
        f"public.{table_name}",
        "-lco",
        "GEOMETRY_NAME=geom",
        "-lco",
        "FID=gid",
        "-lco",
        "PRECISION=NO",
        "-nlt",
        "PROMOTE_TO_MULTI",
        "-t_srs",
        f"EPSG:{target_srid}",
        *mode_args,
    ]
    subprocess.run(cmd, check=True)


def run_ogr2ogr_pgdump(shp_path: Path, sql_path: Path, table_name: str, target_srid: int, overwrite: bool) -> None:
    if sql_path.exists():
        sql_path.unlink()
    mode_args = ["-lco", "CREATE_TABLE=OFF"] if not overwrite else []
    cmd = [
        "ogr2ogr",
        "-f",
        "PGDump",
        str(sql_path),
        str(shp_path),
        "-nln",
        f"public.{table_name}",
        "-lco",
        "GEOMETRY_NAME=geom",
        "-lco",
        "FID=gid",
        "-lco",
        "PRECISION=NO",
        "-nlt",
        "PROMOTE_TO_MULTI",
        "-t_srs",
        f"EPSG:{target_srid}",
        *mode_args,
    ]
    subprocess.run(cmd, check=True)


def run_psql(sql_path: Path) -> None:
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_CONFIG["password"]
    cmd = [
        "psql",
        "-h",
        DB_CONFIG["host"],
        "-p",
        DB_CONFIG["port"],
        "-U",
        DB_CONFIG["user"],
        "-d",
        DB_CONFIG["database"],
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        str(sql_path),
    ]
    subprocess.run(cmd, check=True, env=env)


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Importe tous les shapefiles d'un dossier dans PostGIS."
    )
    parser.add_argument(
        "--shp-root",
        default=r"F:\CIE\SHP",
        help="Dossier racine contenant les shapefiles (defaut: F:\\CIE\\SHP)",
    )
    parser.add_argument(
        "--target-srid",
        type=int,
        default=4326,
        help="SRID cible pour les geometries (defaut: 4326).",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Recree la table a chaque import (sinon append).",
    )
    parser.add_argument(
        "--mapping-out",
        default="shp_import_mapping.json",
        help="Fichier JSON de sortie du mapping source -> table.",
    )
    parser.add_argument(
        "--force-pgdump",
        action="store_true",
        help="Force le mode PGDump + psql meme si le driver PostgreSQL est disponible.",
    )
    parser.add_argument(
        "--keep-sql",
        action="store_true",
        help="Conserve les fichiers SQL temporaires generes en mode PGDump.",
    )
    return parser.parse_args(list(argv))


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    root = Path(args.shp_root).resolve()

    if not root.exists() or not root.is_dir():
        print(f"Erreur: dossier introuvable: {root}")
        return 1

    print("Configuration DB:")
    print(
        f"  {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    )
    print(f"Dossier SHP: {root}")

    shp_files = discover_shapefiles(root)
    if not shp_files:
        print("Aucun fichier .shp detecte dans le dossier.")
        print("Verifie la presence des fichiers .shp/.dbf/.shx (pas seulement .prj/.cpg/.shp.xml).")
        return 2

    print(f"{len(shp_files)} shapefile(s) detecte(s).")
    use_direct_postgres = has_postgresql_driver() and not args.force_pgdump
    mode_label = "PostgreSQL direct (ogr2ogr)" if use_direct_postgres else "Fallback PGDump + psql"
    print(f"Mode import: {mode_label}")
    if not use_direct_postgres:
        print("  Le driver OGR 'PostgreSQL' est absent (ou force-pgdump actif).")
        print("  Import via dump SQL puis execution psql.")

    mapping: list[dict[str, str]] = []
    failed = 0
    sql_dir_path: Path | None = None
    temp_dir_obj: tempfile.TemporaryDirectory[str] | None = None
    if not use_direct_postgres:
        if args.keep_sql:
            sql_dir_path = (Path.cwd() / "shp_sql_dumps").resolve()
            sql_dir_path.mkdir(parents=True, exist_ok=True)
        else:
            temp_dir_obj = tempfile.TemporaryDirectory(prefix="shp_pgdump_")
            sql_dir_path = Path(temp_dir_obj.name)

    for shp in shp_files:
        table_name = build_table_name(root, shp)
        print(f"\nImport: {shp}")
        print(f"  -> table: public.{table_name}")
        try:
            if use_direct_postgres:
                run_ogr2ogr_postgresql(shp, table_name, args.target_srid, args.overwrite)
            else:
                assert sql_dir_path is not None
                sql_path = sql_dir_path / f"{table_name}.sql"
                run_ogr2ogr_pgdump(shp, sql_path, table_name, args.target_srid, args.overwrite)
                run_psql(sql_path)
            mapping.append({"source": str(shp), "table": table_name})
            print("  OK")
        except subprocess.CalledProcessError as exc:
            failed += 1
            print(f"  ECHEC (code {exc.returncode})")

    out = Path(args.mapping_out)
    out.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nMapping ecrit dans: {out.resolve()}")
    print(f"Imports reussis: {len(mapping)} | Echecs: {failed}")

    if failed:
        if temp_dir_obj is not None:
            temp_dir_obj.cleanup()
        return 3

    print("\nEtape suivante recommandee:")
    print("  python extract_tables.py")
    print("  (pour exposer les nouvelles tables dans l'API)")
    if temp_dir_obj is not None:
        temp_dir_obj.cleanup()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
