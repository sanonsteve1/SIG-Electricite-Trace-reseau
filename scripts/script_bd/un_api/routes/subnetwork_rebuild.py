from fastapi import FastAPI, HTTPException

from ..schemas import SousReseauRebuildRequest
from ..services.subnetwork_service import rebuild_subnetwork


def register(app: FastAPI) -> None:
    @app.post("/un/subnetwork/rebuild")
    def post_rebuild_subnetwork(req: SousReseauRebuildRequest):
        try:
            nb = rebuild_subnetwork(req.sous_reseau_id, req.utilisateur or "api-un")
            return {"sous_reseau_id": req.sous_reseau_id, "elements_reconstruits": nb}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Echec reconstruction sous-reseau: {exc}") from exc

