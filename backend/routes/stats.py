from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.analytics import get_summary

stats_bp = Blueprint("stats", __name__, url_prefix="/api/stats")


def _parse_range_param(raw: str | None) -> int:
    default = 30
    if not raw:
        return default
    try:
        if raw.endswith("d"):
            raw = raw[:-1]
        days = int(raw)
    except ValueError:
        return default
    days = max(1, min(days, 180))
    return days


@stats_bp.get("/summary")
@jwt_required()
def stats_summary():
    user_id = int(get_jwt_identity())
    range_param = request.args.get("range", "30d")
    range_days = _parse_range_param(range_param)
    summary = get_summary(user_id=user_id, range_days=range_days)
    summary["range"] = f"{range_days}d"
    return jsonify(summary)
