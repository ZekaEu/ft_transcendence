from flask import Flask
from flask_cors import CORS
import os

from app.core.extensions import db, migrate, jwt, socketio
from app.core.config import Config


def create_app(config_class=Config):
    """Application factory – creates and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ── Extensions ──────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config.get('FRONTEND_URL', '*')}})
    socketio.init_app(app, cors_allowed_origins=app.config.get('FRONTEND_URL', '*'))

    # ── Blueprints ──────────────────────────
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.users import users_bp
    app.register_blueprint(users_bp, url_prefix='/api/users')

    from app.chat import chat_bp
    app.register_blueprint(chat_bp, url_prefix='/api/chat')

    from app.game import game_bp
    app.register_blueprint(game_bp, url_prefix='/api/game')

    from app.friends import friends_bp
    app.register_blueprint(friends_bp, url_prefix='/api/friends')

    from app.memory import memory_bp
    app.register_blueprint(memory_bp, url_prefix='/api/memory')

    # ── Static files (uploads) ───────────────
    upload_folder = app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    @app.route('/uploads/<filename>')
    def serve_upload(filename):
        from flask import send_from_directory, abort
        try:
            return send_from_directory(upload_folder, filename)
        except FileNotFoundError:
            abort(404)

    # ── Database tables ─────────────────────
    with app.app_context():
        from app.auth import models  # noqa: F401
        from app.chat import models as chat_models  # noqa: F401
        from app.game import models as game_models  # noqa: F401
        from app.friends import models as friends_models  # noqa: F401
        from app.memory import models as memory_models  # noqa: F401
        db.create_all()

    # ── JWT error handlers ──────────────────
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token has expired', 'error': 'token_expired'}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Invalid token', 'error': 'invalid_token'}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'message': 'Missing authorization token', 'error': 'authorization_required'}, 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token has been revoked', 'error': 'token_revoked'}, 401

    # ── Health check ────────────────────────
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok'}, 200

    # ── Online users count ──────────────────
    @app.route('/api/stats/online')
    def online_count():
        from app.auth.models import User
        count = User.query.filter_by(is_online=True, is_active=True).count()
        return {'online_count': count}, 200

    return app
