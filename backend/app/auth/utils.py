import os
import shutil
import uuid
from flask import current_app
from werkzeug.utils import secure_filename


def setup_default_avatar(user_id):
    """
    Copy the default avatar image to the uploads folder for a new user.
    Returns the avatar URL to be stored in the database.
    """
    try:
        # Get the directory where this file is located
        utils_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Path to the default avatar in the backend assets
        # From backend/app/auth, go up 1 level to app, then into assets
        default_avatar_src = os.path.join(
            utils_dir,
            '../assets/default_avatar.png'
        )
        default_avatar_src = os.path.abspath(default_avatar_src)
        
        current_app.logger.info(f"Attempting to find default avatar at: {default_avatar_src}")

        # Check if default avatar exists
        if not os.path.exists(default_avatar_src):
            current_app.logger.error(f"Default avatar not found at {default_avatar_src}")
            return None

        current_app.logger.info(f"Default avatar found, copying for user {user_id}")

        # Create uploads folder if it doesn't exist
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        current_app.logger.info(f"Upload folder: {upload_folder}")

        # Generate unique filename: user_id_uuid.png
        unique_id = str(uuid.uuid4())[:8]
        avatar_filename = f"{user_id}_{unique_id}.png"
        avatar_path = os.path.join(upload_folder, avatar_filename)

        # Copy default avatar to uploads folder
        shutil.copy2(default_avatar_src, avatar_path)
        
        current_app.logger.info(f"Avatar copied to {avatar_path}")

        # Return the relative URL path for the avatar (must match the route in __init__.py)
        avatar_url = f"/uploads/{avatar_filename}"
        
        current_app.logger.info(f"Default avatar setup successful for user {user_id}: {avatar_url}")

        return avatar_url

    except Exception as e:
        current_app.logger.error(f"Failed to setup default avatar for user {user_id}: {str(e)}", exc_info=True)
        return None
