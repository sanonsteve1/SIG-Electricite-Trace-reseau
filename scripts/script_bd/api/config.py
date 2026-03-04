# -*- coding: utf-8 -*-
"""Configuration de l'API (base de données et chemin du schéma)."""
import os

# Base de données (même config que extract_tables.py, surchargeable par variables d'env)
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "goughin_backup"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "2023"),
}

# Fichier de structure des tables (relatif au dossier script_bd)
STRUCTURE_JSON_PATH = os.getenv(
    "STRUCTURE_JSON",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "..", "database_structure.json"),
)
