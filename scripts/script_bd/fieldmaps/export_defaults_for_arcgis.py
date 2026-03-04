#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exporte les valeurs par défaut des formulaires (form_defaults) dans un format
utilisable pour configurer ArcGIS Field Maps ou d'autres applications de collecte.

Usage:
  python -m fieldmaps.export_defaults_for_arcgis [--api URL] [--output fichier.json]
  Si --api est omis, lit api/form_defaults.json depuis le projet.
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

# Répertoire du module fieldmaps
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.normpath(os.path.join(_SCRIPT_DIR, ".."))
_DEFAULTS_PATH = os.path.join(_PROJECT_ROOT, "api", "form_defaults.json")


def load_defaults_from_api(api_base_url: str) -> list[dict]:
    """Récupère l'export des défauts depuis l'API GET /gis/form-defaults/export."""
    if not requests:
        raise RuntimeError("Install requests: pip install requests")
    url = f"{api_base_url.rstrip('/')}/gis/form-defaults/export"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    return data.get("layers", [])


def load_defaults_from_file() -> list[dict]:
    """Construit la liste des défauts à partir de form_defaults.json (sans table_name)."""
    if not os.path.isfile(_DEFAULTS_PATH):
        return []
    with open(_DEFAULTS_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    # On n'a pas la liste des tables ici, on exporte les entrées explicites (hors pattern)
    layers = []
    for key, values in raw.items():
        if not key.endswith("*") and isinstance(values, dict) and values:
            layers.append({"slug": key, "table": key.replace("-", "_"), "defaults": values})
    return sorted(layers, key=lambda x: x["slug"])


def export_for_arcgis(layers: list[dict], output_path: str | None) -> str:
    """
    Génère un JSON et une version lisible pour configuration manuelle dans ArcGIS.
    Format de sortie : même structure que l'API export, avec en plus une section
    "instructions" pour Field Maps.
    """
    doc = {
        "description": "Valeurs par défaut pour pré-remplissage des formulaires (API GIS ABUN). À utiliser pour configurer les valeurs par défaut dans ArcGIS Field Maps (propriétés du champ ou règles d'attribut) ou pour la synchro vers l'API.",
        "source": "form_defaults.json / GET /gis/form-defaults/export",
        "layers": layers,
        "instructions_fieldmaps": [
            "Dans ArcGIS Online / Portal : ouvrir la couche (Feature Service).",
            "Pour chaque champ listé dans 'defaults', définir la valeur par défaut dans le formulaire (Form Builder) ou dans les propriétés du champ.",
            "Alternative : utiliser le script sync_from_arcgis.py pour synchroniser les données collectées vers l'API ; les défauts sont alors appliqués côté API lors de l'import.",
        ],
    }
    json_str = json.dumps(doc, ensure_ascii=False, indent=2)
    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json_str)
        return output_path
    print(json_str)
    return "<stdout>"


def main() -> int:
    ap = argparse.ArgumentParser(description="Export des valeurs par défaut pour Field Maps / collecte.")
    ap.add_argument("--api", default="", help="URL de base de l'API GIS (ex: http://localhost:8000). Si vide, lecture depuis form_defaults.json.")
    ap.add_argument("--output", "-o", default="", help="Fichier de sortie JSON. Sinon affichage stdout.")
    args = ap.parse_args()
    if args.api:
        try:
            layers = load_defaults_from_api(args.api)
        except Exception as e:
            print("Erreur API:", e, file=sys.stderr)
            return 1
    else:
        layers = load_defaults_from_file()
    path = export_for_arcgis(layers, args.output or None)
    if path and path != "<stdout>":
        print("Export écrit dans", path, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
