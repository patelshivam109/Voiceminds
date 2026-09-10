# backend/models.py
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship

db = SQLAlchemy()

# Keep these 4 emotion labels throughout the app
EMOTION_LABELS = ["angry", "happy", "sad", "neutral"]


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    audio_samples = relationship(
        "AudioSample",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User {self.id} {self.email}>"


class AudioSample(db.Model):
    __tablename__ = "audio_samples"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    mime = db.Column(db.String(100), nullable=False)
    duration_sec = db.Column(db.Float)
    size_bytes = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audio_samples")
    results = relationship(
        "InferenceResult",
        back_populates="sample",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    @property
    def latest_result(self):
        return self.results.order_by(InferenceResult.created_at.desc()).first()

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "storage_path": self.storage_path,
            "mime": self.mime,
            "duration_sec": self.duration_sec,
            "size_bytes": self.size_bytes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<AudioSample {self.id} user={self.user_id} {self.filename}>"


class InferenceResult(db.Model):
    __tablename__ = "inference_results"

    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey("audio_samples.id"), nullable=False, index=True)
    model = db.Column(db.String(128), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="pending")
    pred_label = db.Column(db.String(32))
    confidence = db.Column(db.Float)
    probs = db.Column(db.JSON)  # {angry: x, ...}
    duration_ms = db.Column(db.Integer)
    error_message = db.Column(db.Text)
    transcript = db.Column(db.Text)
    ai_analysis = db.Column(db.JSON)  # {"analysis": "...", "model": "..."}
    include_transcript = db.Column(db.Boolean, default=False)
    include_ai_analysis = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    sample = relationship("AudioSample", back_populates="results")

    def to_dict(self):
        return {
            "id": self.id,
            "sample_id": self.sample_id,
            "model": self.model,
            "status": self.status,
            "pred_label": self.pred_label,
            "confidence": self.confidence,
            "probabilities": self.probs,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
            "transcript": self.transcript,
            "ai_analysis": self.ai_analysis,
            "include_transcript": self.include_transcript,
            "include_ai_analysis": self.include_ai_analysis,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<InferenceResult {self.id} sample={self.sample_id} status={self.status}>"


class MoodDaily(db.Model):
    __tablename__ = "mood_daily"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    day = db.Column(db.Date, nullable=False)
    counts_by_label = db.Column(db.JSON, nullable=False)
    sample_count = db.Column(db.Integer, default=0)
    total_confidence = db.Column(db.Float, default=0.0)
    avg_confidence = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")

    def normalised_counts(self):
        counts = dict(self.counts_by_label or {})
        for label in EMOTION_LABELS:
            counts.setdefault(label, 0)
        return counts

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "day": self.day.isoformat() if self.day else None,
            "counts_by_label": self.counts_by_label,
            "sample_count": self.sample_count,
            "total_confidence": self.total_confidence,
            "avg_confidence": self.avg_confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<MoodDaily {self.id} user={self.user_id} day={self.day}>"
