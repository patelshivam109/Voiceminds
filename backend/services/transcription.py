# backend/services/transcription.py
import os
import logging
from pathlib import Path
from functools import lru_cache

logger = logging.getLogger(__name__)

try:
    import whisper

    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    logger.warning("Whisper not available. Install with: pip install openai-whisper")

try:
    from faster_whisper import WhisperModel

    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    logger.warning("Faster Whisper not available. Install with: pip install faster-whisper")


@lru_cache(maxsize=1)
def _load_whisper_model(model_name="base"):
    """Load and cache a Whisper model."""
    if not WHISPER_AVAILABLE:
        raise ImportError("Whisper is not installed")

    logger.info(f"Loading Whisper model: {model_name}")
    return whisper.load_model(model_name)


@lru_cache(maxsize=1)
def _load_faster_whisper_model(model_name="base"):
    """Load and cache a Faster Whisper model."""
    if not FASTER_WHISPER_AVAILABLE:
        raise ImportError("Faster Whisper is not installed")

    logger.info(f"Loading Faster Whisper model: {model_name}")
    return WhisperModel(model_name, device="cpu", compute_type="int8")


def transcribe_audio(audio_path, model_name="base", use_faster=True):
    """
    Transcribe audio file to text.

    Args:
        audio_path (str): Path to the audio file
        model_name (str): Model size (tiny, base, small, medium, large)
        use_faster (bool): Whether to use faster-whisper if available

    Returns:
        str: Transcribed text or None if transcription fails
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        if use_faster and FASTER_WHISPER_AVAILABLE:
            model = _load_faster_whisper_model(model_name)
            segments, _ = model.transcribe(str(audio_path), beam_size=5)
            text = " ".join(segment.text for segment in segments)
            return text.strip()
        elif WHISPER_AVAILABLE:
            model = _load_whisper_model(model_name)
            result = model.transcribe(str(audio_path))
            return result.get("text", "").strip()
        else:
            logger.error("No transcription backend available")
            return None
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return None