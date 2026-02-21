import os
from datetime import timedelta


class Config:
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')

    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_NAME = os.getenv('DB_NAME', 'triviadb')
    DB_USER = os.getenv('DB_USER', 'triviauser')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'triviapass')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-dev-secret')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000))
    )
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # OAuth 42
    OAUTH_42_CLIENT_ID = os.getenv('OAUTH_42_CLIENT_ID', '')
    OAUTH_42_CLIENT_SECRET = os.getenv('OAUTH_42_CLIENT_SECRET', '')
    OAUTH_42_REDIRECT_URI = os.getenv(
        'OAUTH_42_REDIRECT_URI',
        'https://localhost:8443/api/auth/oauth/42/callback'
    )
    OAUTH_42_AUTHORIZE_URL = 'https://api.intra.42.fr/oauth/authorize'
    OAUTH_42_TOKEN_URL = 'https://api.intra.42.fr/oauth/token'
    OAUTH_42_API_URL = 'https://api.intra.42.fr/v2/me'

    # OAuth Google
    OAUTH_GOOGLE_CLIENT_ID = os.getenv('OAUTH_GOOGLE_CLIENT_ID', '')
    OAUTH_GOOGLE_CLIENT_SECRET = os.getenv('OAUTH_GOOGLE_CLIENT_SECRET', '')
    OAUTH_GOOGLE_REDIRECT_URI = os.getenv(
        'OAUTH_GOOGLE_REDIRECT_URI',
        'https://localhost:8443/api/auth/oauth/google/callback'
    )
    OAUTH_GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
    OAUTH_GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
    OAUTH_GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

    # Frontend
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://localhost:8443')

    # File Upload
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), '../../uploads'))
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 5 * 1024 * 1024))  # 5MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
