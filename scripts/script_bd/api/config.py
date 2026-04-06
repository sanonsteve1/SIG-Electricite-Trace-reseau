# -*- coding: utf-8 -*-
"""Configuration de l'API (base de données et chemin du schéma)."""
import os

# Base de données (même config que extract_tables.py, surchargeable par variables d'env)
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "UN_BD_DEV"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "2023"),
}

# Fichier de structure des tables : uniquement script_bd/database_structure.json
# (chaque table de ce fichier aura sa propre API : GET/POST/DELETE par table)
_script_bd_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRUCTURE_JSON_PATH = os.getenv(
    "STRUCTURE_JSON",
    os.path.join(_script_bd_dir, "database_structure.json"),
)
