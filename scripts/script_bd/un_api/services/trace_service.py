from typing import Any, Dict, Optional

from ..db import get_connection, get_cursor
from .common import fetch_one_dict


def run_trace_legacy(noeud_depart_id: str, type_trace: str, niveau_reseau: Optional[str], utilisateur: str) -> str:
    row = fetch_one_dict(
        """
        SELECT reseau.lancer_trace(
            %s::uuid,
            %s::varchar,
            %s::varchar,
            %s::varchar
        )::text AS trace_id
        """,
        (noeud_depart_id, type_trace, niveau_reseau, utilisateur),
    )
    return row["trace_id"]


def run_trace_advanced(
    noeud_depart_id: str,
    type_trace: str,
    trace_config_id: Optional[str],
    niveau_reseau: Optional[str],
    utilisateur: str,
) -> str:
    row = fetch_one_dict(
        """
        SELECT reseau.lancer_trace_avancee(
            %s::uuid,
            %s::varchar,
            %s::uuid,
            %s::varchar,
            %s::varchar
        )::text AS trace_id
        """,
        (noeud_depart_id, type_trace, trace_config_id, niveau_reseau, utilisateur),
    )
    return row["trace_id"]


def run_trace_impact(noeud_depart_id: str, niveau_reseau: Optional[str], utilisateur: str) -> str:
    row = fetch_one_dict(
        """
        SELECT reseau.lancer_trace_impact_client(
            %s::uuid,
            %s::varchar,
            %s::varchar
        )::text AS trace_id
        """,
        (noeud_depart_id, niveau_reseau, utilisateur),
    )
    return row["trace_id"]


def add_trace_barrier(
    trace_id: str,
    barriere_type: str,
    noeud_id: Optional[str],
    arete_id: Optional[str],
    condition_sql: Optional[str],
    description: Optional[str],
) -> Dict[str, Any]:
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                """
                INSERT INTO reseau.trace_barriere
                (trace_id, barriere_type, noeud_id, arete_id, condition_sql, description)
                VALUES (%s::uuid, %s::varchar, %s::uuid, %s::uuid, %s::text, %s::text)
                RETURNING id, trace_id::text, barriere_type, noeud_id::text, arete_id::text, description
                """,
                (trace_id, barriere_type, noeud_id, arete_id, condition_sql, description),
            )
            return dict(cur.fetchone())


def create_trace_config(
    code: str,
    max_depth: int,
    ignorer_ouvert: bool,
    phase_cible: Optional[str],
    include_containment: bool,
    include_structure: bool,
) -> Dict[str, Any]:
    with get_connection() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                """
                INSERT INTO reseau.trace_configuration
                (code, max_depth, ignorer_ouvert, phase_cible, include_containment, include_structure)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (code) DO UPDATE
                SET max_depth = EXCLUDED.max_depth,
                    ignorer_ouvert = EXCLUDED.ignorer_ouvert,
                    phase_cible = EXCLUDED.phase_cible,
                    include_containment = EXCLUDED.include_containment,
                    include_structure = EXCLUDED.include_structure
                RETURNING id::text, code, max_depth, ignorer_ouvert, phase_cible, include_containment, include_structure
                """,
                (code, max_depth, ignorer_ouvert, phase_cible, include_containment, include_structure),
            )
            return dict(cur.fetchone())

