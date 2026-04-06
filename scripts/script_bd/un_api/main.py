from api.main import app as gis_app

from .routes.health import register as register_health
from .routes.subnetwork_rebuild import register as register_subnetwork_rebuild
from .routes.subnetwork_recalc_incremental import register as register_subnetwork_recalc_incremental
from .routes.tests_run import register as register_tests_run
from .routes.topology_validate import register as register_topology_validate
from .routes.trace import register as register_trace
from .routes.trace_barrier import register as register_trace_barrier
from .routes.trace_configuration import register as register_trace_configuration

# App unifiee:
# - routes GIS historiques (/, /gis/...) venant de api.main
# - routes UN ajoutees ci-dessous (/health, /un/...)
app = gis_app

register_health(app)
register_trace(app)
register_topology_validate(app)
register_subnetwork_rebuild(app)
register_subnetwork_recalc_incremental(app)
register_trace_barrier(app)
register_trace_configuration(app)
register_tests_run(app)

