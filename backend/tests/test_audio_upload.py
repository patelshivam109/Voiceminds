import io
import wave
from datetime import datetime

import pytest

from app import create_app
from models import AudioSample, InferenceResult, db
from services.analytics import record_daily_aggregate


def generate_wav(duration_seconds=1, framerate=44100):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(framerate)
        num_frames = int(duration_seconds * framerate)
        wf.writeframes(b"\x00\x00" * num_frames)
    buffer.seek(0)
    return buffer


@pytest.fixture
def app(tmp_path, monkeypatch):
    uploads_dir = tmp_path / "uploads"
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "test-secret",
            "UPLOAD_FOLDER": str(uploads_dir),
        }
    )
    with test_app.app_context():
        db.drop_all()
        db.create_all()

    # Stub inference scheduling to avoid loading the HF model during tests
    from routes import audio as audio_routes

    def fake_schedule(sample_id: int):
        with test_app.app_context():
            sample = db.session.get(AudioSample, sample_id)
            if not sample:
                return None

            result = InferenceResult(
                sample_id=sample_id,
                model="test-model",
                status="succeeded",
                pred_label="neutral",
                confidence=0.9,
                probs={"neutral": 0.9, "angry": 0.05, "happy": 0.03, "sad": 0.02},
            )
            db.session.add(result)
            record_daily_aggregate(
                user_id=sample.user_id,
                event_time=datetime.utcnow(),
                label="neutral",
                confidence=0.9,
            )
            db.session.commit()
            return result.id

    monkeypatch.setattr(audio_routes, "schedule_inference", fake_schedule)

    return test_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Sample", "email": "sample@example.com", "password": "Passw0rd!"},
    )
    token = response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def upload_sample(client, auth_headers, filename="test.wav"):
    wav_file = generate_wav(2)
    data = {"file": (wav_file, filename)}
    upload_resp = client.post(
        "/api/audio/upload",
        data=data,
        headers=auth_headers,
        content_type="multipart/form-data",
    )
    assert upload_resp.status_code == 201
    return upload_resp.get_json()["sample"]


def test_upload_and_list_audio(client, auth_headers):
    sample = upload_sample(client, auth_headers)
    assert sample["filename"] == "test.wav"
    assert sample["mime"].startswith("audio")
    assert sample["latest_result"]["status"] == "succeeded"

    list_resp = client.get("/api/audio/list", headers=auth_headers)
    assert list_resp.status_code == 200
    items = list_resp.get_json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == sample["id"]
    assert items[0]["latest_result"]["pred_label"] == "neutral"


def test_get_inference_result(client, auth_headers):
    sample = upload_sample(client, auth_headers)
    resp = client.get(f"/api/audio/{sample['id']}/result", headers=auth_headers)
    assert resp.status_code == 200
    result = resp.get_json()["result"]
    assert result["status"] == "succeeded"


def test_trigger_inference_endpoint(client, auth_headers):
    sample = upload_sample(client, auth_headers)
    resp = client.post(f"/api/audio/{sample['id']}/infer", headers=auth_headers)
    assert resp.status_code == 202
    data = resp.get_json()["result"]
    assert data["status"] == "succeeded"


def test_stats_summary_endpoint(client, auth_headers):
    for _ in range(2):
        upload_sample(client, auth_headers)

    resp = client.get("/api/stats/summary?range=7d", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["range"] == "7d"
    assert isinstance(data["days"], list)
    assert "totals" in data
    totals = data["totals"]
    assert "counts_by_label" in totals
    assert totals["counts_by_label"]["neutral"] >= 1
