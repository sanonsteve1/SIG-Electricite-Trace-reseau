from fastapi import FastAPI, HTTPException

from ..schemas import TraceRequest, TraceResponse
from ..services.trace_service import run_trace_advanced, run_trace_impact, run_trace_legacy
from ..validators.trace import validate_trace_type


def register(app: FastAPI) -> None:
    @app.post("/un/trace", response_model=TraceResponse)
    def post_trace(req: TraceRequest):
        try:
            validate_trace_type(req.type_trace)
            if req.type_trace == "Impact_Client":
                trace_id = run_trace_impact(req.noeud_depart_id, req.niveau_reseau, req.utilisateur or "api-un")
            elif req.trace_config_id:
                trace_id = run_trace_advanced(
                    req.noeud_depart_id,
                    req.type_trace,
                    req.trace_config_id,
                    req.niveau_reseau,
                    req.utilisateur or "api-un",
                )
            else:
                trace_id = run_trace_legacy(
                    req.noeud_depart_id,
                    req.type_trace,
                    req.niveau_reseau,
                    req.utilisateur or "api-un",
                )
            return TraceResponse(trace_id=trace_id)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec trace: {exc}") from exc

