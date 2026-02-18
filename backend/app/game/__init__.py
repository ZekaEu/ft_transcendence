from flask import Blueprint

game_bp = Blueprint('game', __name__)

from app.game import models  # noqa: E402, F401
from app.game import routes  # noqa: E402, F401
from app.game import events  # noqa: E402, F401
