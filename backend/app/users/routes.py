from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import os
from werkzeug.utils import secure_filename
import uuid

from app.users import users_bp
from app.core.extensions import db
from app.auth.models import User


# ──────────────────────────────────────────────
# Get user profile
# ──────────────────────────────────────────────
@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get user profile by ID"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({'message': 'User not found'}), 404

    return jsonify(user.to_dict()), 200


# ──────────────────────────────────────────────
# Update user profile
# ──────────────────────────────────────────────
@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user profile (username, email, display_name, bio)"""
    current_user_id = int(get_jwt_identity())

    # Only allow users to update their own profile
    if current_user_id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)

    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()

    if not data:
        return jsonify({'message': 'No data provided'}), 400

    # Update username
    if 'username' in data:
        new_username = data['username'].strip()
        if not new_username or len(new_username) < 3 or len(new_username) > 64:
            return jsonify({'message': 'Username must be between 3 and 64 characters'}), 400

        # Check if username is already taken by another user
        existing_user = User.query.filter_by(username=new_username).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'message': 'Username already taken'}), 409

        user.username = new_username

    # Update email
    if 'email' in data:
        new_email = data['email'].strip().lower()
        if not new_email or '@' not in new_email:
            return jsonify({'message': 'Invalid email format'}), 400

        # Check if email is already taken by another user
        existing_user = User.query.filter_by(email=new_email).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'message': 'Email already registered'}), 409

        user.email = new_email

    # Update display_name
    if 'display_name' in data:
        display_name = data['display_name'].strip()
        if len(display_name) > 128:
            return jsonify({'message': 'Display name must be 128 characters or less'}), 400
        user.display_name = display_name if display_name else None

    # Update bio
    if 'bio' in data:
        bio = data['bio'].strip()
        if len(bio) > 500:
            return jsonify({'message': 'Bio must be 500 characters or less'}), 400
        user.bio = bio if bio else None

    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify(user.to_dict()), 200


# ──────────────────────────────────────────────
# Upload/update avatar
# ──────────────────────────────────────────────
@users_bp.route('/<int:user_id>/avatar', methods=['POST'])
@jwt_required()
def upload_avatar(user_id):
    """Upload and update user avatar"""
    current_user_id = int(get_jwt_identity())

    # Only allow users to update their own avatar
    if current_user_id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)

    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Check if file is in the request
    if 'avatar' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['avatar']

    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    # Validate file extension
    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

    if not allowed_file(file.filename):
        return jsonify({
            'message': 'Invalid file type. Allowed types: ' + ', '.join(current_app.config['ALLOWED_EXTENSIONS'])
        }), 400

    # Validate file size (Flask MAX_CONTENT_LENGTH handles this, but we can add extra check)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > current_app.config['MAX_CONTENT_LENGTH']:
        return jsonify({
            'message': f'File too large. Maximum size: {current_app.config["MAX_CONTENT_LENGTH"] // (1024*1024)}MB'
        }), 413

    try:
        # Create uploads folder if it doesn't exist
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

        # Generate unique filename: user_id_uuid.ext
        original_filename = secure_filename(file.filename)
        if '.' not in original_filename:
            return jsonify({'message': 'Invalid filename - missing extension'}), 400
        
        ext = original_filename.rsplit('.', 1)[1].lower()
        filename = f"user_{user_id}_{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(upload_folder, filename)

        # Save file
        file.save(filepath)

        # Update user avatar_url (store relative path or URL)
        # For now, we'll store the filename, and you can serve it via a static route
        user.avatar_url = f"/uploads/{filename}"
        user.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            'message': 'Avatar uploaded successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        current_app.logger.error(f"Avatar upload error: {str(e)}")
        return jsonify({'message': 'Failed to upload avatar'}), 500

