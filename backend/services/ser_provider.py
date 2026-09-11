# backend/services/ser_provider.py
import time
import logging
from functools import lru_cache
from pathlib import Path
from transformers import pipeline

logger = logging.getLogger(__name__)

MODEL_NAME = "superb/wav2vec2-base-superb-er"

# Expanded alias map (includes "ang", "hap", "neu")
EMOTION_MAP = {
    "angry":   {"angry", "anger", "ang"},
    "happy":   {"happy", "happiness", "hap", "surprise", "surprised"},
    "sad":     {"sad", "sadness"},
    "neutral": {"neutral", "neu", "calm"},
}

def _map_label(raw_label: str) -> str:
    if not raw_label:
        return "neutral"
    label = raw_label.strip().lower()
    for target, aliases in EMOTION_MAP.items():
        if label in aliases:
            return target
    logger.warning("Unknown emotion label '%s', mapping to neutral", raw_label)
    return "neutral"

@lru_cache(maxsize=1)
def _load_pipeline():
    logger.info("Loading SER model: %s", MODEL_NAME)
    # device=-1 => CPU; top_k=None returns all labels
    return pipeline("audio-classification", model=MODEL_NAME, top_k=None, device=-1)

def infer_audio(path: str):
    audio_path = Path(path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    cls = _load_pipeline()
    t0 = time.perf_counter()
    raw = cls(str(audio_path))
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    logger.debug("Raw predictions: %s", raw)

    agg = {k: 0.0 for k in EMOTION_MAP}
    best_label = None
    best_score = -1.0

    for entry in raw:
        mapped = _map_label(entry["label"])
        score = float(entry["score"])
        agg[mapped] += score
        if score > best_score:
            best_score = score
            best_label = mapped

    total = sum(agg.values()) or 1.0
    for k in agg:
        agg[k] = float(max(0.0, min(1.0, agg[k] / total)))

    pred = max(agg, key=agg.get)
    conf = float(agg[pred])
    if best_label and best_score > conf:
        pred, conf = best_label, float(min(1.0, max(0.0, best_score)))

    logger.debug("Aggregated emotions: %s", agg)
    logger.debug("Predicted: %s with confidence %s", pred, conf)

    return {
        "model": MODEL_NAME,
        "label": pred,
        "confidence": conf,
        "probabilities": agg,
        "processing_ms": elapsed_ms,
        "raw": raw,
    }

__all__ = ["infer_audio", "MODEL_NAME"]
