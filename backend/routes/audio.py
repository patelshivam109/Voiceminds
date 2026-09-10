import os
import uuid
from pathlib import Path

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename
from mutagen import File as MutagenFile

from models import AudioSample, InferenceResult, db
from services.inference_worker import schedule_inference

from flask import Blueprint

audio_bp = Blueprint("audio", __name__, url_prefix="/api/audio")


def _truthy(value):
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _ensure_user_dir(base_path: Path, user_id: int) -> Path:
    user_dir = base_path / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _allowed_file(filename: str, mimetype: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    config = current_app.config
    return (
            ext in config["ALLOWED_AUDIO_EXTENSIONS"]
            and mimetype in config["ALLOWED_AUDIO_MIME_TYPES"]
    )


def _calculate_duration(file_path: Path) -> float | None:
    try:
        audio = MutagenFile(file_path)
        if audio and audio.info and getattr(audio.info, "length", None):
            return round(float(audio.info.length), 2)
    except Exception as exc:  # pragma: no cover - defensive
        current_app.logger.warning("Could not calculate duration for %s: %s", file_path, exc)
    return None


def _sample_to_payload(sample: AudioSample):
    payload = sample.to_dict()
    latest = sample.latest_result
    payload["latest_result"] = latest.to_dict() if latest else None
    return payload


@audio_bp.post("/upload")
@jwt_required()
def upload_audio():
    if "file" not in request.files:
        return jsonify({"message": "Missing file field"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"message": "Empty filename"}), 400

    if not _allowed_file(file.filename, file.mimetype):
        return jsonify({"message": "Unsupported audio format"}), 400

    stream = file.stream
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(0)

    max_size = current_app.config["MAX_AUDIO_FILE_SIZE"]
    if size > max_size:
        return jsonify({"message": "File too large. Max 10MB"}), 413

    user_id = int(get_jwt_identity())
    base_dir = Path(current_app.config["UPLOAD_FOLDER"])
    _ensure_user_dir(base_dir, user_id)

    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}" if filename else f"{uuid.uuid4().hex}.{ext}"
    storage_path = base_dir / str(user_id) / unique_name

    file.save(storage_path)
    include_transcript = _truthy(request.form.get("include_transcript"))

    duration_override = request.form.get("duration_sec")
    duration = _calculate_duration(storage_path)
    if duration is None and duration_override:
        try:
            duration = round(float(duration_override), 2)
        except ValueError:
            current_app.logger.info("Ignoring invalid duration override: %s", duration_override)

    sample = AudioSample(
        user_id=user_id,
        filename=filename or unique_name,
        storage_path=str(storage_path),
        mime=file.mimetype,
        duration_sec=duration,
        size_bytes=size,
    )
    db.session.add(sample)
    db.session.commit()

    job_id = schedule_inference(sample.id, include_transcript)
    latest = db.session.get(InferenceResult, job_id) if job_id else None
    response_payload = sample.to_dict()
    response_payload["latest_result"] = latest.to_dict() if latest else None

    return jsonify({"sample": response_payload}), 201


@audio_bp.get("/list")
@jwt_required()
def list_audio():
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return jsonify({"message": "Invalid pagination parameters"}), 400

    user_id = int(get_jwt_identity())
    query = (
        AudioSample.query.filter_by(user_id=user_id)
        .order_by(AudioSample.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    samples = [_sample_to_payload(sample) for sample in query]
    return jsonify({"items": samples, "count": len(samples)}), 200



@audio_bp.post("/<int:sample_id>/infer")
@jwt_required()
def trigger_inference(sample_id: int):
    user_id = int(get_jwt_identity())
    sample = AudioSample.query.filter_by(id=sample_id, user_id=user_id).first()
    if not sample:
        return jsonify({"message": "Sample not found"}), 404

    include_transcript = _truthy(request.args.get("include_transcript"))
    job_id = schedule_inference(sample.id, include_transcript)
    if not job_id:
        return jsonify({"message": "Unable to schedule inference"}), 500

    latest = db.session.get(InferenceResult, job_id)
    return jsonify({"result": latest.to_dict() if latest else None}), 202


@audio_bp.get("/<int:sample_id>/result")
@jwt_required()
def get_inference_result(sample_id: int):
    user_id = int(get_jwt_identity())
    sample = AudioSample.query.filter_by(id=sample_id, user_id=user_id).first()
    if not sample:
        return jsonify({"message": "Sample not found"}), 404

    latest = sample.latest_result
    if not latest:
        return jsonify({"message": "No inference result"}), 404

    return jsonify({"result": latest.to_dict()}), 200


@audio_bp.delete("/<int:sample_id>")
@jwt_required()
def delete_audio(sample_id: int):
    user_id = int(get_jwt_identity())
    sample = AudioSample.query.filter_by(id=sample_id, user_id=user_id).first()
    if not sample:
        return jsonify({"message": "Sample not found"}), 404

    try:
        Path(sample.storage_path).unlink(missing_ok=True)
    except OSError as exc:  # pragma: no cover
        current_app.logger.warning("Failed to remove %s: %s", sample.storage_path, exc)

    db.session.delete(sample)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


@audio_bp.post("/<int:sample_id>/enhanced-infer")
@jwt_required()
def trigger_enhanced_inference(sample_id: int):
    user_id = int(get_jwt_identity())
    sample = AudioSample.query.filter_by(id=sample_id, user_id=user_id).first()
    if not sample:
        return jsonify({"message": "Sample not found"}), 404

    include_transcript = _truthy(request.args.get("include_transcript"))
    include_ai_analysis = _truthy(request.args.get("include_ai_analysis"))
    ai_model = request.args.get("ai_model", "mistral")

    # Check if AI service is available if AI analysis is requested
    if include_ai_analysis:
        from services.local_ai_provider import get_local_ai_provider
        ai_provider = get_local_ai_provider()
        if not ai_provider.check_connection():
            return jsonify({"message": "AI service is not available"}), 503

    from services.enhanced_inference_worker import schedule_enhanced_inference
    job_id = schedule_enhanced_inference(
        sample.id,
        include_transcript,
        include_ai_analysis,
        ai_model
    )

    if not job_id:
        return jsonify({"message": "Unable to schedule inference"}), 500

    latest = db.session.get(InferenceResult, job_id)
    return jsonify({"result": latest.to_dict() if latest else None}), 202