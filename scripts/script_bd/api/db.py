# -*- coding: utf-8 -*-
"""Connexion à la base PostgreSQL."""
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from .config import DB_CONFIG


@contextmanager
def get_connection():
    """Contexte de connexion avec curseur RealDictCursor."""
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
    """Curseur qui renvoie des dictionnaires."""
    return conn.cursor(cursor_factory=RealDictCursor)
