from fastapi import FastAPI, HTTPException

from ..schemas import IncrementalRecalcRequest
from ..services.subnetwork_service import recalc_incremental


def register(app: FastAPI) -> None:
    @app.post("/un/subnetwork/recalc-incremental")
    def post_recalc_incremental(req: IncrementalRecalcRequest):
        try:
            nb = recalc_incremental(req.objet_table, req.objet_id)
            return {"objets_impactes": nb}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec recalcul incremental: {exc}") from exc

