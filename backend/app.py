# app.py
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

from routes.insights import insights_bp

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from config import Config
from models import db, User
from routes import audio_bp, stats_bp  # Add insights_bp

def create_app(config_override=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_override:
        app.config.update(config_override)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

    # --- Extensions ---
    db.init_app(app)

    jwt = JWTManager(app)  # keep ref to add handlers below
    print(f"--- JWT KEY LOADED: '{app.config.get('JWT_SECRET_KEY')}' ---")

    # Allow Vite dev server with credentials
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=True,
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Authorization"],
        methods=["GET", "POST", "DELETE", "OPTIONS"],
        max_age=86400,  # cache preflights
    )

    # Simple rate limits to slow brute-force
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["200 per hour"],
        storage_uri="memory://",
    )

    # Create tables on boot (add Alembic later when schema grows)
    with app.app_context():
        if config_override and "SQLALCHEMY_DATABASE_URI" in config_override:
            db.engine.dispose()
        db.create_all()

    @app.before_request
    def _early_ok_for_options():
        if request.method == "OPTIONS":
            # mark as exempt for various flask-limiter versions
            try:
                request.limit_exempt = True
            except Exception:
                pass
            return ("", 204)

    # --- JWT error handlers (nice UX, consistent 401s) ---
    @jwt.expired_token_loader
    def expired_callback(jwt_header, jwt_payload):
        return jsonify({"message": "token expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        logger.error(f"Invalid token: {reason}")
        return jsonify({"message": "invalid token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        logger.error(f"Missing token: {reason}")
        return jsonify({"message": "missing authorization"}), 401

    # --- Health ---
    @app.get("/api/health")
    def health():
        return {"ok": True}

    # --- Helpers ---
    def normalize_email(email_raw: str) -> str:
        try:
            v = validate_email((email_raw or "").strip(), check_deliverability=False)
            return v.normalized  # canonical form
        except EmailNotValidError as e:
            raise ValueError(str(e))

    def check_password_policy(pw: str):
        if not pw or len(pw) < 8:
            return "Password must be at least 8 characters."
        has_letter = any(c.isalpha() for c in pw)
        has_digit = any(c.isdigit() for c in pw)
        if not (has_letter and has_digit):
            return "Password must include at least one letter and one number."
        return None

    # --- Auth: Register ---
    @app.post("/api/auth/register")
    @limiter.limit("5 per minute")
    def register():
        data = request.get_json() or {}

        try:
            email = normalize_email(data.get("email"))
        except ValueError as e:
            return jsonify({"message": f"Invalid email: {e}"}), 400

        name = (data.get("name") or "").strip()
        password = data.get("password") or ""

        policy_msg = check_password_policy(password)
        if policy_msg:
            return jsonify({"message": policy_msg}), 400

        try:
            u = User(email=email, name=name, password_hash=generate_password_hash(password))
            db.session.add(u)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({"message": "Email already exists."}), 409

        token = create_access_token(identity=str(u.id))  # uses 7-day expiry from Config
        return jsonify({"token": token, "user": {"id": u.id, "email": u.email, "name": u.name}}), 201

    # --- Auth: Login ---
    @app.post("/api/auth/login")
    @limiter.limit("10 per minute")
    def login():
        data = request.get_json() or {}

        try:
            email = normalize_email(data.get("email"))
        except ValueError:
            return jsonify({"message": "Invalid email or password."}), 401

        password = data.get("password") or ""
        u = User.query.filter_by(email=email).first()
        if not u or not check_password_hash(u.password_hash, password):
            return jsonify({"message": "Invalid email or password."}), 401

        token = create_access_token(identity=str(u.id))  # 7-day expiry applied
        return jsonify({"token": token, "user": {"id": u.id, "email": u.email, "name": u.name}})

    # --- Protected example ---
    @app.get("/api/me")
    @jwt_required()
    def me():
        try:
            raw_identity = get_jwt_identity()
            try:
                uid = int(raw_identity)
            except (TypeError, ValueError):
                logger.error(f"Invalid identity payload: {raw_identity!r}")
                return jsonify({"message": "Invalid token payload"}), 401

            u = db.session.get(User, uid)
            if not u:
                return jsonify({"message": "User not found"}), 404
            return {"id": u.id, "email": u.email, "name": u.name}
        except Exception as e:
            logger.error(f"Error in /api/me: {str(e)}")
            return jsonify({"message": str(e)}), 401

    # --- Token verification endpoint ---
    @app.post("/api/auth/verify")
    @jwt_required()
    def verify_token():
        try:
            # Get the raw JWT token
            jwt_data = get_jwt()
            logger.debug(f"JWT data: {jwt_data}")

            raw_identity = get_jwt_identity()
            try:
                uid = int(raw_identity)
            except (TypeError, ValueError):
                logger.error(f"Invalid identity payload: {raw_identity!r}")
                return jsonify({"valid": False, "message": "Invalid token payload"}), 401

            logger.debug(f"User ID from token: {uid}")

            u = db.session.get(User, uid)
            if not u:
                logger.error(f"User not found for ID: {uid}")
                return jsonify({"valid": False, "message": "User not found"}), 404

            logger.debug(f"User found: {u.email}")
            return {"valid": True, "user": {"id": u.id, "email": u.email, "name": u.name}}
        except Exception as e:
            logger.error(f"Error in token verification: {str(e)}")
            return jsonify({"valid": False, "error": str(e)}), 401

    # --- Debug endpoint to check headers ---
    @app.post("/api/debug/headers")
    def debug_headers():
        headers = dict(request.headers)
        auth_header = headers.get('Authorization', 'Not found')
        logger.debug(f"Authorization header: {auth_header}")
        return {"headers": headers, "auth_header": auth_header}

    app.register_blueprint(audio_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(insights_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    # Run on 8000 to avoid conflict with Vite (5173)
    app.run(host="127.0.0.1", port=8000, debug=True)
