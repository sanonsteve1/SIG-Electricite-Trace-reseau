from typing import Optional

from pydantic import BaseModel, Field


class TraceRequest(BaseModel):
    noeud_depart_id: str = Field(..., description="UUID du noeud de depart")
    type_trace: str = Field(..., description="Amont, Aval, Isolement ou Impact_Client")
    niveau_reseau: Optional[str] = Field(default=None, description="Transport, Distribution_MT, Distribution_BT, Client")
    utilisateur: Optional[str] = Field(default="api-un")
    trace_config_id: Optional[str] = Field(default=None, description="UUID de reseau.trace_configuration")


class TraceResponse(BaseModel):
    trace_id: str


class ValidationTopoRequest(BaseModel):
    max_records: int = Field(default=10000, ge=1, le=1000000)


class SousReseauRebuildRequest(BaseModel):
    sous_reseau_id: str = Field(..., description="UUID du sous-reseau")
    utilisateur: Optional[str] = Field(default="api-un")


class AffectBarrierRequest(BaseModel):
    trace_id: str
    barriere_type: str = Field(..., description="Noeud, Arete ou Condition")
    noeud_id: Optional[str] = None
    arete_id: Optional[str] = None
    condition_sql: Optional[str] = None
    description: Optional[str] = None


class TraceConfigCreateRequest(BaseModel):
    code: str
    max_depth: int = Field(default=200, ge=1, le=5000)
    ignorer_ouvert: bool = False
    phase_cible: Optional[str] = None
    include_containment: bool = False
    include_structure: bool = False


class IncrementalRecalcRequest(BaseModel):
    objet_table: str
    objet_id: str

