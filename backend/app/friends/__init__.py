from flask import Blueprint

friends_bp = Blueprint('friends', __name__)

from app.friends import models  # noqa: E402, F401
from app.friends import routes  # noqa: E402, F401
from app.friends import events  # noqa: E402, F401
