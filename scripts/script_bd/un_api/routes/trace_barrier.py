from fastapi import FastAPI, HTTPException

from ..schemas import AffectBarrierRequest
from ..services.trace_service import add_trace_barrier
from ..validators.trace import validate_barrier_payload


def register(app: FastAPI) -> None:
    @app.post("/un/trace/barrier")
    def post_trace_barrier(req: AffectBarrierRequest):
        try:
            validate_barrier_payload(req.barriere_type, req.noeud_id, req.arete_id, req.condition_sql)
            return add_trace_barrier(
                req.trace_id,
                req.barriere_type,
                req.noeud_id,
                req.arete_id,
                req.condition_sql,
                req.description,
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec ajout barriere: {exc}") from exc

