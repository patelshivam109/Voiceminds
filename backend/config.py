# config.py
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_UPLOADS_DIR = os.path.join(os.path.dirname(BASE_DIR), "uploads")

def _cors_origins_from_env():
    # Support comma-separated list; default to both localhost + 127.0.0.1
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]

class Config:
    # Flask / JWT
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "devjwt-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    JWT_ALGORITHM = "HS256"

    # DB
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS
    CORS_ORIGINS = _cors_origins_from_env()

    # File uploads
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", DEFAULT_UPLOADS_DIR)
    MAX_AUDIO_FILE_SIZE = int(os.getenv("MAX_AUDIO_FILE_SIZE", 10 * 1024 * 1024))
    ALLOWED_AUDIO_MIME_TYPES = {
        "audio/wav","audio/x-wav","audio/mpeg","audio/mp3","audio/mp4",
        "audio/x-m4a","audio/aac","audio/mp4a-latm","audio/webm",
        "audio/ogg","audio/3gpp",
    }
    ALLOWED_AUDIO_EXTENSIONS = {"wav","mp3","m4a","aac","webm","ogg"}
