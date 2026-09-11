# backend/services/inference_worker.py
from datetime import datetime
from threading import Thread
from typing import Optional

from flask import current_app

from models import AudioSample, InferenceResult, db
from services.analytics import record_daily_aggregate
from services.ser_provider import MODEL_NAME, infer_audio
from services.transcription import transcribe_audio

def schedule_inference(sample_id: int, include_transcript: bool = False) -> Optional[int]:
    """Persist a running inference entry and execute in a background thread."""
    app = current_app._get_current_object()

    with app.app_context():
        sample = db.session.get(AudioSample, sample_id)
        if not sample:
            return None

        result = InferenceResult(
            sample_id=sample_id, 
            model=MODEL_NAME, 
            status="running",
            include_transcript=include_transcript
        )
        db.session.add(result)
        db.session.commit()
        result_id = result.id

    thread = Thread(
        target=_execute_inference,
        args=(app, result_id, include_transcript),
        daemon=True,
    )
    thread.start()
    return result_id

def _execute_inference(app, result_id: int, include_transcript: bool):
    with app.app_context():
        result = db.session.get(InferenceResult, result_id)
        if not result:
            return

        sample = db.session.get(AudioSample, result.sample_id)
        if not sample:
            result.status = "failed"
            result.error_message = "Audio sample missing"
            db.session.commit()
            return

        try:
            # Perform emotion recognition
            payload = infer_audio(sample.storage_path)
            result.model = payload.get("model", result.model)
            result.pred_label = payload.get("label")
            result.confidence = payload.get("confidence")
            result.probs = payload.get("probabilities")
            processing_ms = payload.get("processing_ms")
            if processing_ms is None and sample.duration_sec is not None:
                processing_ms = int(sample.duration_sec * 1000)
            result.duration_ms = processing_ms
            result.status = "succeeded"
            result.error_message = None

            # Record daily aggregate
            if result.pred_label:
                record_daily_aggregate(
                    user_id=sample.user_id,
                    event_time=datetime.utcnow(),
                    label=result.pred_label,
                    confidence=result.confidence,
                )

            # Perform transcription if requested
            if include_transcript:
                try:
                    transcript = transcribe_audio(sample.storage_path)
                    result.transcript = transcript
                    db.session.commit()
                except Exception as exc:
                    app.logger.warning(f"Transcription failed for sample {sample.id}: {exc}")
                    # Don't fail the whole inference if transcription fails
                    db.session.commit()
        except Exception as exc:
            app.logger.exception(f"Inference failed for sample {sample.id}")
            result.status = "failed"
            result.error_message = str(exc)[:255]
        finally:
            db.session.commit()