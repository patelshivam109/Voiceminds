from datetime import date, datetime, timedelta
from typing import Dict, Iterable

from models import EMOTION_LABELS, MoodDaily, db


def _empty_counts() -> Dict[str, int]:
    return {label: 0 for label in EMOTION_LABELS}


def record_daily_aggregate(user_id: int, event_time: datetime, label: str | None, confidence: float | None) -> MoodDaily:
    """Update or create the daily aggregate for a user."""
    if event_time is None:
        event_time = datetime.utcnow()
    day = event_time.date()

    entry: MoodDaily | None = MoodDaily.query.filter_by(user_id=user_id, day=day).first()

    if entry is None:
        entry = MoodDaily(user_id=user_id, day=day, counts_by_label=_empty_counts())
        db.session.add(entry)
        db.session.flush()

    counts = entry.normalised_counts()
    if label and label in counts:
        counts[label] = counts.get(label, 0) + 1
    entry.counts_by_label = counts

    entry.sample_count = (entry.sample_count or 0) + 1
    entry.total_confidence = (entry.total_confidence or 0.0) + float(confidence or 0.0)
    if entry.sample_count:
        entry.avg_confidence = entry.total_confidence / entry.sample_count
    else:
        entry.avg_confidence = 0.0

    return entry


def _default_summary(range_days: int):
    return {
        "range": f"{range_days}d",
        "days": [],
        "totals": {
            "counts_by_label": _empty_counts(),
            "avg_confidence": 0.0,
            "sample_count": 0,
            "days": 0,
        },
        "sessions_today": 0,
    }


def get_summary(user_id: int, range_days: int) -> dict:
    today = date.today()
    start_day = today - timedelta(days=range_days - 1)

    rows: Iterable[MoodDaily] = (
        MoodDaily.query.filter(
            MoodDaily.user_id == user_id,
            MoodDaily.day >= start_day,
            MoodDaily.day <= today,
        )
        .order_by(MoodDaily.day.asc())
        .all()
    )

    summary = _default_summary(range_days)
    totals = summary["totals"]
    counts_total = totals["counts_by_label"]
    weighted_confidence = 0.0

    for row in rows:
        counts = row.normalised_counts()
        total_samples = int(sum(counts.values()))
        top_label = max(counts.items(), key=lambda kv: kv[1])[0] if total_samples else None
        day_entry = {
            "day": row.day.isoformat(),
            "top_label": top_label,
            "avg_confidence": float(row.avg_confidence or 0.0),
            "distribution": counts,
            "sample_count": total_samples,
        }
        summary["days"].append(day_entry)
        totals["days"] += 1
        totals["sample_count"] += total_samples

        for label, value in counts.items():
            counts_total[label] = counts_total.get(label, 0) + int(value)

        weighted_confidence += (row.avg_confidence or 0.0) * total_samples

        if row.day == today:
            summary["sessions_today"] = total_samples

    if totals["sample_count"]:
        totals["avg_confidence"] = weighted_confidence / totals["sample_count"]

    # Ensure counts include all labels even if no data
    for label in EMOTION_LABELS:
        counts_total.setdefault(label, 0)

    return summary
