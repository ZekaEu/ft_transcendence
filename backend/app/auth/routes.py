import requests
from datetime import datetime, timezone

from flask import request, jsonify, current_app, redirect
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

from app.auth import auth_bp
from app.core.extensions import db
from app.auth.models import User, OAuthAccount, RevokedToken


# ──────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data:
        return jsonify({'message': 'No data provided'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'message': 'Username, email, and password are required'}), 400

    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters'}), 400

    if len(username) < 3 or len(username) > 64:
        return jsonify({'message': 'Username must be between 3 and 64 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already registered'}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already taken'}), 409

    user = User(username=username, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Account created successfully',
        'token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
    }), 201


# ──────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({'message': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'message': 'Account is deactivated'}), 403

    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': 'Login successful',
        'token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
    }), 200


# ──────────────────────────────────────────────
# Get current user
# ──────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'message': 'User not found'}), 404

    return jsonify(user.to_dict()), 200


# ──────────────────────────────────────────────
# Logout
# ──────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()['jti']
    user_id = get_jwt_identity()

    revoked = RevokedToken(jti=jti, user_id=int(user_id))
    db.session.add(revoked)

    user = User.query.get(int(user_id))
    if user:
        user.is_online = False
        user.last_seen = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({'message': 'Logged out successfully'}), 200


# ──────────────────────────────────────────────
# Refresh token
# ──────────────────────────────────────────────
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)

    return jsonify({
        'token': access_token,
    }), 200


# ──────────────────────────────────────────────
# Check if token is revoked (callback)
# ──────────────────────────────────────────────
from app.core.extensions import jwt as jwt_manager  # noqa: E402


@jwt_manager.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    token = RevokedToken.query.filter_by(jti=jti).first()
    return token is not None


# ──────────────────────────────────────────────
# OAuth 42 – Step 1: redirect to 42 authorization
# ──────────────────────────────────────────────
@auth_bp.route('/oauth/42/authorize', methods=['GET'])
def oauth_42_authorize():
    client_id = current_app.config['OAUTH_42_CLIENT_ID']
    redirect_uri = current_app.config['OAUTH_42_REDIRECT_URI']
    authorize_url = current_app.config['OAUTH_42_AUTHORIZE_URL']

    url = (
        f"{authorize_url}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=public"
    )

    return jsonify({'authorization_url': url}), 200


# ──────────────────────────────────────────────
# OAuth 42 – Step 2: callback (exchange code for token)
# ──────────────────────────────────────────────
@auth_bp.route('/oauth/42/callback', methods=['GET'])
def oauth_42_callback():
    code = request.args.get('code')

    if not code:
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=no_code"
        )

    # Exchange code for access token
    token_url = current_app.config['OAUTH_42_TOKEN_URL']
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': current_app.config['OAUTH_42_CLIENT_ID'],
        'client_secret': current_app.config['OAUTH_42_CLIENT_SECRET'],
        'code': code,
        'redirect_uri': current_app.config['OAUTH_42_REDIRECT_URI'],
    }

    try:
        token_response = requests.post(token_url, data=token_data, timeout=10)
        token_response.raise_for_status()
        token_json = token_response.json()
    except requests.RequestException as e:
        current_app.logger.error(f"42 OAuth token exchange failed: {e}")
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=token_exchange_failed"
        )

    oauth_access_token = token_json.get('access_token')
    if not oauth_access_token:
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=no_access_token"
        )

    # Fetch user profile from 42 API
    api_url = current_app.config['OAUTH_42_API_URL']
    headers = {'Authorization': f'Bearer {oauth_access_token}'}

    try:
        user_response = requests.get(api_url, headers=headers, timeout=10)
        user_response.raise_for_status()
        user_data = user_response.json()
    except requests.RequestException as e:
        current_app.logger.error(f"42 OAuth user fetch failed: {e}")
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=user_fetch_failed"
        )

    provider_user_id = str(user_data.get('id'))
    login_42 = user_data.get('login', '')
    email_42 = user_data.get('email', '')
    avatar_42 = None
    image_data = user_data.get('image')
    if isinstance(image_data, dict):
        avatar_42 = image_data.get('link')

    # Check if OAuth account already exists
    oauth_account = OAuthAccount.query.filter_by(
        provider='42', provider_user_id=provider_user_id
    ).first()

    if oauth_account:
        # Existing user – update tokens
        oauth_account.access_token = oauth_access_token
        user = oauth_account.user
    else:
        # New user – check if email already registered
        user = User.query.filter_by(email=email_42).first()

        if not user:
            # Create brand-new user
            base_username = login_42
            username = base_username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                username=username,
                email=email_42,
                display_name=login_42,
                avatar_url=avatar_42,
            )
            db.session.add(user)
            db.session.flush()

        # Create the OAuth link
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider='42',
            provider_user_id=provider_user_id,
            access_token=oauth_access_token,
        )
        db.session.add(oauth_account)

    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.session.commit()

    # Issue our own JWT tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    # Redirect to frontend with the token
    frontend_url = current_app.config['FRONTEND_URL']
    return redirect(
        f"{frontend_url}/login?token={access_token}&refresh_token={refresh_token}"
    )


# ──────────────────────────────────────────────
# OAuth Google – Step 1: redirect to Google authorization
# ──────────────────────────────────────────────
@auth_bp.route('/oauth/google/authorize', methods=['GET'])
def oauth_google_authorize():
    client_id = current_app.config['OAUTH_GOOGLE_CLIENT_ID']
    redirect_uri = current_app.config['OAUTH_GOOGLE_REDIRECT_URI']
    authorize_url = current_app.config['OAUTH_GOOGLE_AUTHORIZE_URL']

    url = (
        f"{authorize_url}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
    )

    return jsonify({'authorization_url': url}), 200


# ──────────────────────────────────────────────
# OAuth Google – Step 2: callback (exchange code for token)
# ──────────────────────────────────────────────
@auth_bp.route('/oauth/google/callback', methods=['GET'])
def oauth_google_callback():
    code = request.args.get('code')

    if not code:
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=no_code"
        )

    # Exchange code for access token
    token_url = current_app.config['OAUTH_GOOGLE_TOKEN_URL']
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': current_app.config['OAUTH_GOOGLE_CLIENT_ID'],
        'client_secret': current_app.config['OAUTH_GOOGLE_CLIENT_SECRET'],
        'code': code,
        'redirect_uri': current_app.config['OAUTH_GOOGLE_REDIRECT_URI'],
    }

    try:
        token_response = requests.post(token_url, data=token_data, timeout=10)
        token_response.raise_for_status()
        token_json = token_response.json()
    except requests.RequestException as e:
        current_app.logger.error(f"Google OAuth token exchange failed: {e}")
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=token_exchange_failed"
        )

    oauth_access_token = token_json.get('access_token')
    if not oauth_access_token:
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=no_access_token"
        )

    # Fetch user profile from Google API
    userinfo_url = current_app.config['OAUTH_GOOGLE_USERINFO_URL']
    headers = {'Authorization': f'Bearer {oauth_access_token}'}

    try:
        user_response = requests.get(userinfo_url, headers=headers, timeout=10)
        user_response.raise_for_status()
        user_data = user_response.json()
    except requests.RequestException as e:
        current_app.logger.error(f"Google OAuth user fetch failed: {e}")
        return redirect(
            f"{current_app.config['FRONTEND_URL']}/login?error=user_fetch_failed"
        )

    provider_user_id = str(user_data.get('id'))
    google_name = user_data.get('name', '')
    google_email = user_data.get('email', '')
    google_avatar = user_data.get('picture')

    # Check if OAuth account already exists
    oauth_account = OAuthAccount.query.filter_by(
        provider='google', provider_user_id=provider_user_id
    ).first()

    if oauth_account:
        oauth_account.access_token = oauth_access_token
        user = oauth_account.user
    else:
        user = User.query.filter_by(email=google_email).first()

        if not user:
            base_username = google_name.replace(' ', '_').lower()
            if not base_username:
                base_username = google_email.split('@')[0]
            username = base_username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                username=username,
                email=google_email,
                display_name=google_name,
                avatar_url=google_avatar,
            )
            db.session.add(user)
            db.session.flush()

        oauth_account = OAuthAccount(
            user_id=user.id,
            provider='google',
            provider_user_id=provider_user_id,
            access_token=oauth_access_token,
        )
        db.session.add(oauth_account)

    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    frontend_url = current_app.config['FRONTEND_URL']
    return redirect(
        f"{frontend_url}/login?token={access_token}&refresh_token={refresh_token}"
    )


# ──────────────────────────────────────────────
# Generic OAuth callback (from frontend with code)
# ──────────────────────────────────────────────
@auth_bp.route('/oauth/callback', methods=['POST'])
def oauth_callback_from_frontend():
    """
    Called by the frontend after the OAuth redirect.
    The frontend sends { provider, code }.
    """
    data = request.get_json()
    provider = data.get('provider')
    code = data.get('code')

    if not provider or not code:
        return jsonify({'message': 'Provider and code are required'}), 400

    if provider == '42':
        # Exchange code for token
        token_url = current_app.config['OAUTH_42_TOKEN_URL']
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': current_app.config['OAUTH_42_CLIENT_ID'],
            'client_secret': current_app.config['OAUTH_42_CLIENT_SECRET'],
            'code': code,
            'redirect_uri': current_app.config['OAUTH_42_REDIRECT_URI'],
        }

        try:
            token_response = requests.post(token_url, data=token_data, timeout=10)
            token_response.raise_for_status()
            token_json = token_response.json()
        except requests.RequestException:
            return jsonify({'message': 'Failed to exchange code for token'}), 502

        oauth_access_token = token_json.get('access_token')
        if not oauth_access_token:
            return jsonify({'message': 'No access token received'}), 502

        # Fetch user info
        api_url = current_app.config['OAUTH_42_API_URL']
        headers = {'Authorization': f'Bearer {oauth_access_token}'}

        try:
            user_response = requests.get(api_url, headers=headers, timeout=10)
            user_response.raise_for_status()
            user_data = user_response.json()
        except requests.RequestException:
            return jsonify({'message': 'Failed to fetch user info'}), 502

        provider_user_id = str(user_data.get('id'))
        login_42 = user_data.get('login', '')
        email_42 = user_data.get('email', '')
        avatar_42 = None
        image_data = user_data.get('image')
        if isinstance(image_data, dict):
            avatar_42 = image_data.get('link')

        oauth_account = OAuthAccount.query.filter_by(
            provider='42', provider_user_id=provider_user_id
        ).first()

        if oauth_account:
            oauth_account.access_token = oauth_access_token
            user = oauth_account.user
        else:
            user = User.query.filter_by(email=email_42).first()
            if not user:
                base_username = login_42
                username = base_username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User(
                    username=username,
                    email=email_42,
                    display_name=login_42,
                    avatar_url=avatar_42,
                )
                db.session.add(user)
                db.session.flush()

            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='42',
                provider_user_id=provider_user_id,
                access_token=oauth_access_token,
            )
            db.session.add(oauth_account)

        user.is_online = True
        user.last_seen = datetime.now(timezone.utc)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        refresh_token_jwt = create_refresh_token(identity=str(user.id))

        return jsonify({
            'message': 'OAuth login successful',
            'token': access_token,
            'refresh_token': refresh_token_jwt,
            'user': user.to_dict(),
        }), 200

    if provider == 'google':
        token_url = current_app.config['OAUTH_GOOGLE_TOKEN_URL']
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': current_app.config['OAUTH_GOOGLE_CLIENT_ID'],
            'client_secret': current_app.config['OAUTH_GOOGLE_CLIENT_SECRET'],
            'code': code,
            'redirect_uri': current_app.config['OAUTH_GOOGLE_REDIRECT_URI'],
        }

        try:
            token_response = requests.post(token_url, data=token_data, timeout=10)
            token_response.raise_for_status()
            token_json = token_response.json()
        except requests.RequestException:
            return jsonify({'message': 'Failed to exchange code for token'}), 502

        oauth_access_token = token_json.get('access_token')
        if not oauth_access_token:
            return jsonify({'message': 'No access token received'}), 502

        userinfo_url = current_app.config['OAUTH_GOOGLE_USERINFO_URL']
        headers = {'Authorization': f'Bearer {oauth_access_token}'}

        try:
            user_response = requests.get(userinfo_url, headers=headers, timeout=10)
            user_response.raise_for_status()
            user_data = user_response.json()
        except requests.RequestException:
            return jsonify({'message': 'Failed to fetch user info'}), 502

        provider_user_id = str(user_data.get('id'))
        google_name = user_data.get('name', '')
        google_email = user_data.get('email', '')
        google_avatar = user_data.get('picture')

        oauth_account = OAuthAccount.query.filter_by(
            provider='google', provider_user_id=provider_user_id
        ).first()

        if oauth_account:
            oauth_account.access_token = oauth_access_token
            user = oauth_account.user
        else:
            user = User.query.filter_by(email=google_email).first()
            if not user:
                base_username = google_name.replace(' ', '_').lower()
                if not base_username:
                    base_username = google_email.split('@')[0]
                username = base_username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User(
                    username=username,
                    email=google_email,
                    display_name=google_name,
                    avatar_url=google_avatar,
                )
                db.session.add(user)
                db.session.flush()

            oauth_account = OAuthAccount(
                user_id=user.id,
                provider='google',
                provider_user_id=provider_user_id,
                access_token=oauth_access_token,
            )
            db.session.add(oauth_account)

        user.is_online = True
        user.last_seen = datetime.now(timezone.utc)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        refresh_token_jwt = create_refresh_token(identity=str(user.id))

        return jsonify({
            'message': 'OAuth login successful',
            'token': access_token,
            'refresh_token': refresh_token_jwt,
            'user': user.to_dict(),
        }), 200

    return jsonify({'message': f'Unsupported provider: {provider}'}), 400
