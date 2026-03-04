#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Synchronise les données collectées depuis ArcGIS (Feature Service / Field Maps)
vers l'API GIS. Applique les valeurs par défaut (form-defaults) aux champs vides.

Usage:
  python -m fieldmaps.sync_from_arcgis --config fieldmaps_config.json [--dry-run]
  Variables d'environnement: API_BASE_URL, ARCGIS_SERVICE_URL (surchargent la config).
"""
from __future__ import annotations

import argparse
import json
import os
import sys

try:
    import requests
except ImportError:
    requests = None

from .geometry_utils import feature_geometry_to_wkt

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.normpath(os.path.join(_SCRIPT_DIR, ".."))


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def query_arcgis_layer(service_url: str, layer_id: int, where: str = "1=1", out_fields: str = "*", batch_size: int = 100) -> list[dict]:
    """Interroge une couche d'un Feature Service (retourne les features)."""
    if not requests:
        raise RuntimeError("Install requests: pip install requests")
    base = f"{service_url.rstrip('/')}/{layer_id}"
    url = f"{base}/query"
    params = {
        "where": where,
        "outFields": out_fields,
        "returnGeometry": "true",
        "f": "json",
        "resultRecordCount": batch_size,
    }
    r = requests.get(url, params=params, timeout=60)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"])
    return data.get("features", [])


def get_form_defaults(api_base_url: str, table_slug: str) -> dict:
    """Récupère les valeurs par défaut pour une couche depuis l'API."""
    if not requests:
        return {}
    url = f"{api_base_url.rstrip('/')}/gis/{table_slug}/form-defaults"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json().get("defaults", {})
    except Exception:
        return {}


def apply_defaults_to_record(record: dict, defaults: dict, exclude: set | None = None) -> None:
    """Complète les champs vides du record avec les valeurs par défaut (modifie record)."""
    exclude = exclude or {"objectid", "id", "geom"}
    for key, value in defaults.items():
        k = key.lower()
        if k in exclude:
            continue
        if key not in record:
            continue
        if record[key] is None or (isinstance(record[key], str) and record[key].strip() == ""):
            record[key] = value


def map_feature_to_api_body(
    feature: dict,
    field_mapping: dict,
    geometry_field: str,
    geom_wkt: str | None,
) -> dict:
    """Construit le body pour POST /gis/{slug} à partir d'un feature Esri."""
    attrs = feature.get("attributes") or {}
    body = {}
    for arcgis_name, api_name in field_mapping.items():
        if arcgis_name in attrs:
            body[api_name] = attrs[arcgis_name]
    # Si pas de mapping explicite, prendre tous les attributs (noms en minuscules)
    if not field_mapping:
        for k, v in attrs.items():
            if k.lower() not in ("shape", "shape_length", "shape_area"):
                body[k] = v
    if geom_wkt:
        body["geom"] = geom_wkt
    return body


def sync_layer(
    api_base_url: str,
    service_url: str,
    arcgis_layer_id: int,
    table_slug: str,
    field_mapping: dict,
    geometry_field: str,
    apply_defaults: bool,
    where: str,
    batch_size: int,
    dry_run: bool,
) -> tuple[int, int]:
    """Synchronise une couche : ArcGIS → API. Retourne (créés, erreurs)."""
    features = query_arcgis_layer(service_url, arcgis_layer_id, where=where, batch_size=batch_size)
    defaults = get_form_defaults(api_base_url, table_slug) if apply_defaults else {}
    created, errors = 0, 0
    post_url = f"{api_base_url.rstrip('/')}/gis/{table_slug}"
    for feat in features:
        geom_wkt = feature_geometry_to_wkt(feat)
        body = map_feature_to_api_body(feat, field_mapping, geometry_field, geom_wkt)
        apply_defaults_to_record(body, defaults)
        if dry_run:
            created += 1
            continue
        try:
            r = requests.post(post_url, json=body, timeout=30)
            r.raise_for_status()
            created += 1
        except Exception as e:
            errors += 1
            print(f"  Erreur feature {feat.get('attributes', {}).get('OBJECTID', '?')}: {e}", file=sys.stderr)
    return created, errors


def main() -> int:
    if not requests:
        print("Installer requests: pip install requests", file=sys.stderr)
        return 1
    ap = argparse.ArgumentParser(description="Sync ArcGIS Feature Service → API GIS (avec défauts formulaire).")
    ap.add_argument("--config", "-c", required=True, help="Fichier config JSON (voir config.example.json).")
    ap.add_argument("--dry-run", action="store_true", help="Ne pas envoyer les données à l'API.")
    args = ap.parse_args()
    config = load_config(args.config)
    api_base_url = os.getenv("API_BASE_URL") or config.get("api_base_url") or "http://localhost:8000"
    service_url = os.getenv("ARCGIS_SERVICE_URL") or config.get("arcgis_feature_service_url")
    if not service_url:
        print("Config: arcgis_feature_service_url ou ARCGIS_SERVICE_URL requis.", file=sys.stderr)
        return 1
    sync_opts = config.get("sync_options", {})
    where = sync_opts.get("where_clause", "1=1")
    batch_size = sync_opts.get("batch_size", 100)
    total_created, total_errors = 0, 0
    for layer_cfg in config.get("layers", []):
        slug = layer_cfg.get("table_slug")
        lid = layer_cfg.get("arcgis_layer_id", 0)
        if slug is None:
            continue
        print(f"Couche ArcGIS {lid} → {slug} ...", file=sys.stderr)
        c, e = sync_layer(
            api_base_url=api_base_url,
            service_url=service_url,
            arcgis_layer_id=lid,
            table_slug=slug,
            field_mapping=layer_cfg.get("field_mapping", {}),
            geometry_field=layer_cfg.get("geometry_field", "geom"),
            apply_defaults=layer_cfg.get("apply_defaults_from_api", True),
            where=where,
            batch_size=batch_size,
            dry_run=args.dry_run,
        )
        total_created += c
        total_errors += e
        print(f"  → {c} enregistrement(s), {e} erreur(s)", file=sys.stderr)
    print(f"Total: {total_created} créés, {total_errors} erreurs", file=sys.stderr)
    return 0 if total_errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
