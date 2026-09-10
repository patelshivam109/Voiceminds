# routes/insights.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.local_ai_provider import get_local_ai_provider
from services.analytics import get_summary

insights_bp = Blueprint("insights", __name__, url_prefix="/api/insights")


@insights_bp.get("/models")
@jwt_required()
def list_ai_models():
    """List available AI models from Ollama"""
    try:
        ai_provider = get_local_ai_provider()
        if not ai_provider.check_connection():
            return jsonify({"message": "AI service is not available"}), 503

        models = ai_provider.list_models()
        return jsonify({"models": models}), 200
    except Exception as e:
        return jsonify({"message": f"Failed to list models: {str(e)}"}), 500


@insights_bp.get("/emotional")
@jwt_required()
def get_emotional_insights():
    """Get emotional insights based on user's emotion history"""
    user_id = int(get_jwt_identity())
    range_param = request.args.get("range", "30d")

    # Parse range parameter
    default = 30
    if range_param:
        try:
            if range_param.endswith("d"):
                range_param = range_param[:-1]
            days = int(range_param)
            days = max(1, min(days, 180))
        except ValueError:
            days = default
    else:
        days = default

    try:
        # Get emotion summary
        summary = get_summary(user_id=user_id, range_days=days)

        # Get AI insights
        ai_provider = get_local_ai_provider()
        if not ai_provider.check_connection():
            return jsonify({
                "summary": summary,
                "insights": None,
                "message": "AI service is not available"
            }), 200

        # Generate emotional insights
        insights = ai_provider.generate_emotional_insights(summary.get("days", []))

        # Generate emotional summary
        emotional_summary = ai_provider.generate_emotional_summary(
            summary.get("totals", {}).get("counts_by_label", {}),
            f"{days} days"
        )

        return jsonify({
            "summary": summary,
            "insights": insights,
            "emotional_summary": emotional_summary
        }), 200
    except Exception as e:
        return jsonify({"message": f"Failed to get insights: {str(e)}"}), 500


@insights_bp.post("/analyze")
@jwt_required()
def analyze_emotion():
    """Analyze emotion context for a specific transcript"""
    data = request.get_json() or {}

    transcript = data.get("transcript")
    emotion = data.get("emotion")
    confidence = data.get("confidence", 0.0)
    model = data.get("model", "mistral")

    if not transcript or not emotion:
        return jsonify({"message": "Missing transcript or emotion"}), 400

    try:
        ai_provider = get_local_ai_provider()
        if not ai_provider.check_connection():
            return jsonify({"message": "AI service is not available"}), 503

        # Update the model if a different one is specified
        if ai_provider.model != model:
            ai_provider.model = model

        analysis = ai_provider.analyze_emotion_context(transcript, emotion, confidence)

        if not analysis:
            return jsonify({"message": "Failed to analyze emotion"}), 500

        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({"message": f"Failed to analyze emotion: {str(e)}"}), 500