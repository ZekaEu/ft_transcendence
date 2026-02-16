from flask import Flask
from flask_cors import CORS

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

    # ── Database tables ─────────────────────
    with app.app_context():
        from app.auth import models  # noqa: F401
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

    return app
