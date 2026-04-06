from fastapi import FastAPI, HTTPException

from ..schemas import TraceConfigCreateRequest
from ..services.trace_service import create_trace_config
from ..validators.trace import validate_phase


def register(app: FastAPI) -> None:
    @app.post("/un/trace/configuration")
    def post_trace_config(req: TraceConfigCreateRequest):
        try:
            validate_phase(req.phase_cible)
            return create_trace_config(
                req.code,
                req.max_depth,
                req.ignorer_ouvert,
                req.phase_cible,
                req.include_containment,
                req.include_structure,
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec config trace: {exc}") from exc

