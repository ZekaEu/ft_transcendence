from flask import Blueprint

chat_bp = Blueprint('chat', __name__)

from app.chat import models  # noqa: E402, F401
from app.chat import routes  # noqa: E402, F401
from app.chat import events  # noqa: E402, F401
