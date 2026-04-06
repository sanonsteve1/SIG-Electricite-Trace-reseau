from fastapi import HTTPException
from typing import Optional


VALID_TRACE_TYPES = {"Amont", "Aval", "Isolement", "Impact_Client"}
VALID_BARRIER_TYPES = {"Noeud", "Arete", "Condition"}
VALID_PHASES = {"A", "B", "C", "AB", "BC", "CA", "ABC"}


def validate_trace_type(type_trace: str) -> None:
    if type_trace not in VALID_TRACE_TYPES:
        raise HTTPException(status_code=422, detail=f"type_trace invalide: {type_trace}")


def validate_barrier_payload(
    barriere_type: str,
    noeud_id: Optional[str],
    arete_id: Optional[str],
    condition_sql: Optional[str],
) -> None:
    if barriere_type not in VALID_BARRIER_TYPES:
        raise HTTPException(status_code=422, detail=f"barriere_type invalide: {barriere_type}")

    if barriere_type == "Noeud" and not noeud_id:
        raise HTTPException(status_code=422, detail="noeud_id requis pour barriere_type=Noeud")
    if barriere_type == "Arete" and not arete_id:
        raise HTTPException(status_code=422, detail="arete_id requis pour barriere_type=Arete")
    if barriere_type == "Condition" and not condition_sql:
        raise HTTPException(status_code=422, detail="condition_sql requis pour barriere_type=Condition")


def validate_phase(phase_cible: Optional[str]) -> None:
    if phase_cible and phase_cible not in VALID_PHASES:
        raise HTTPException(status_code=422, detail=f"phase_cible invalide: {phase_cible}")

