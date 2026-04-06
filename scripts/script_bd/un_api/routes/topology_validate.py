from fastapi import FastAPI, HTTPException

from ..schemas import ValidationTopoRequest
from ..services.topology_service import validate_topology


def register(app: FastAPI) -> None:
    @app.post("/un/topology/validate")
    def post_validate_topology(req: ValidationTopoRequest):
        try:
            return validate_topology(req.max_records)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec validation topo: {exc}") from exc

