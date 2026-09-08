# VoiceMind - AI-Powered Speech Emotion Recognition

VoiceMind is an intelligent web application that detects and analyses human emotions from speech. By combining a modern React interface with a Flask backend and an SER (speech emotion recognition) model, the platform provides actionable feedback for mental health tracking, customer support training, and personal coaching.

---

## Key Features

- **User authentication** powered by JWTs for secure session management.
- **Audio library** with upload, drag-and-drop, and in-browser recording.
- **Historical dashboard** that visualises trends and confidence over time.
- **Responsive, theme-aware UI** with a rich component kit and dark/light toggle.
- **Future SER integration** ready to plug into the audio workflow.

---

## Tech Stack

### Frontend
- React (Vite tooling)
- Tailwind CSS + custom design tokens
- React Context API for auth state
- LocalStorage for theme and token persistence

### Backend
- Flask with Flask-JWT-Extended
- SQLAlchemy ORM backed by PostgreSQL
- Flask-Limiter, Flask-CORS, and Werkzeug security helpers
- Mutagen for lightweight audio metadata extraction

---

## Architecture Overview

```
Frontend (React/Vite)  <--REST-->  Backend (Flask API)  <--SQLAlchemy-->  PostgreSQL
                                                  \-->  SER Model (PyTorch)
```

The frontend communicates with the Flask API over HTTPS, while the backend persists data in PostgreSQL and performs inference with the emotion model. Authentication is handled with stateless JWTs issued by the backend and stored client-side.

---

## Phase 1 – Audio I/O Plumbing

**Backend**
- `audio_samples` table captures filename, mime, duration, size, and storage path per user.
- Upload directory is partitioned by user id.
- Endpoints:
  | Method | Path | Description |
  | ------ | ---- | ----------- |
  | POST | `/api/audio/upload` | Multipart upload (`file` field). Validates mime/size and stores metadata. |
  | GET | `/api/audio/list` | Paginated list of the current user's recent audio samples. |
  | DELETE | `/api/audio/<id>` | Removes metadata and the stored file. |
- Validation: wav/mp3/m4a/webm/ogg ≤ 10 MB, duration auto-detected with optional client hint.

**Frontend**
- Microphone recorder with MediaRecorder preview and upload.
- Drag-and-drop uploads with toast notifications.
- Dashboard and recent list are now driven by live API data.


## Phase 2 – Emotion Inference Service

**Backend**
- Hugging Face `superb/wav2vec2-base-superb-er` runs in a lightweight worker thread.
- `inference_results` table stores logits, probabilities, confidence, and failure state.
- Endpoints:
  | Method | Path | Description |
  | ------ | ---- | ----------- |
  | POST | `/api/audio/<id>/infer` | Queue inference for an existing sample. |
  | GET | `/api/audio/<id>/result` | Retrieve the most recent inference result. |
- Uploads automatically queue inference; failures are captured and surfaced to the client.

**Frontend**
- Dashboard cards now reflect real results (emotion + confidence).
- Samples poll for completion with retry on failure and probability breakdowns.

**Notes**
- First inference downloads ~300 MB of model weights; subsequent runs take 2–6 s on CPU.
- Backend tests cover upload → inference → result with a stubbed worker.


## Phase 3 – Persistence & Analytics

**Backend**
- `mood_daily` rollups aggregate counts/avg confidence per user per day.
- On each successful inference the daily aggregate is updated in-place.
- `/api/stats/summary?range=30d` returns trend arrays, totals, and sessions today.

**Frontend**
- Dashboard now displays emotion distribution bars, a confidence/sessions trend, and live metrics.
- Range selector (7/30/90 days) updates charts in real time.
- “View all” library page adds emotion/date filters and quick actions for retry/delete.

**Reliability**
- Summary endpoint returns a consistent payload even when no data exists.
- Charts and metrics degrade gracefully with empty states.

---

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   pip install -r backend/requirements.txt
   ```

2. **Environment variables**
   ```env
   FLASK_ENV=development
   SECRET_KEY=...
   JWT_SECRET_KEY=...
   DATABASE_URL=postgresql+psycopg2://...
   CORS_ORIGINS=http://localhost:5173
   UPLOAD_FOLDER=./uploads  # optional override
   ```

3. **Run services**
   ```bash
   # Backend
   python backend/app.py

   # Frontend (run in a new shell, allow PowerShell scripts if required)
   Set-ExecutionPolicy -Scope Process Bypass
   npm run dev
   ```

4. **Testing**
   ```bash
   npm run lint           # frontend linting
   python -m pytest backend/tests  # backend tests including audio flows
   ```

---

## Roadmap

- Move inference + aggregation into a dedicated worker/queue for horizontal scale.
- Add refresh tokens and rotate JWT secrets on a schedule; migrate to secure cookies.
- Stream audio uploads directly to object storage (S3/GCS) and add virus scanning.
- Enrich analytics with cohort comparisons, exportable CSVs, and anomaly alerts.
- Build SER model fallback/ensemble support for multilingual detection.

For more details, review the codebase and the issues backlog. Contributions and suggestions are welcome!
