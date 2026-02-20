from flask import Blueprint

freeform_bp = Blueprint('freeform', __name__)

from app.freeform import models  # noqa: E402, F401
from app.freeform import routes  # noqa: E402, F401
