"""
Entrypoint — expõe 'app' para o gunicorn e permite 'python run.py' em dev.
"""
import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402
from app.core.extensions import socketio  # noqa: E402

app = create_app()

if __name__ == '__main__':
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=os.getenv('FLASK_ENV', 'development') == 'development',
        allow_unsafe_werkzeug=True,
    )
