# services/local_ai_provider.py
import requests
import json
import logging
import os
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class LocalAIProvider:
    def __init__(self, model="gemini-1.5-flash"):
        # Repurposed to use Google Gemini
        self.model = model
        self.timeout = 30  # seconds

    def _make_request(self, prompt: str, system_prompt: str = None) -> Optional[str]:
        """Make a request to Gemini API"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY is not set.")
            return None

        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            data = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            
            if system_prompt:
                data["systemInstruction"] = {
                    "parts": [{"text": system_prompt}]
                }

            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={api_key}",
                headers=headers,
                json=data,
                timeout=self.timeout
            )

            if response.status_code == 200:
                result = response.json()
                return result["candidates"][0]["content"]["parts"][0]["text"]
            else:
                logger.error(f"Error from Gemini: {response.status_code} - {response.text}")
                return None
        except requests.exceptions.Timeout:
            logger.error("Timeout when connecting to Gemini")
            return None
        except requests.exceptions.ConnectionError:
            logger.error("Connection error when connecting to Gemini")
            return None
        except Exception as e:
            logger.error(f"Error making request to Gemini: {e}")
            return None

    def check_connection(self) -> bool:
        """Check if Gemini API key is provided"""
        return bool(os.getenv("GEMINI_API_KEY"))

    def list_models(self) -> List[str]:
        """List available models for Gemini"""
        return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"]

    def analyze_emotion_context(self, transcript: str, detected_emotion: str, confidence: float) -> Optional[
        Dict[str, Any]]:
        """Analyze the emotional context of the transcript using local AI"""
        system_prompt = "You are an expert in emotional intelligence and psychology. Analyze the emotional context of the provided transcript and give insights about the detected emotion."

        prompt = f"""
        Transcript: "{transcript}"
        Detected emotion: {detected_emotion}
        Confidence: {confidence}

        Provide a brief analysis of:
        1. Why this emotion might have been expressed
        2. Possible triggers or context
        3. Suggestions for emotional regulation if needed
        4. Confidence assessment based on the transcript content

        Keep your response concise and insightful.
        """

        response = self._make_request(prompt, system_prompt)

        if response:
            return {
                "analysis": response,
                "model": self.model
            }

        return None

    def generate_emotional_insights(self, emotion_history: List[Dict]) -> Optional[Dict[str, Any]]:
        """Generate insights based on emotion history"""
        system_prompt = "You are an expert in emotional intelligence and psychology. Analyze the emotion history and provide meaningful insights."

        # Format emotion history for the prompt
        history_text = "\n".join([
            f"Date: {entry.get('date')}, Emotion: {entry.get('emotion')}, Confidence: {entry.get('confidence')}"
            for entry in emotion_history[-10:]  # Last 10 entries
        ])

        prompt = f"""
        Emotion History:
        {history_text}

        Provide insights about:
        1. Emotional patterns and trends
        2. Possible triggers or patterns
        3. Recommendations for emotional well-being

        Keep your response concise and actionable.
        """

        response = self._make_request(prompt, system_prompt)

        if response:
            return {
                "insights": response,
                "model": self.model
            }

        return None

    def generate_emotional_summary(self, emotions: Dict[str, int], time_range: str) -> Optional[Dict[str, Any]]:
        """Generate a summary of emotional distribution over a time range"""
        system_prompt = "You are an expert in emotional intelligence and psychology. Analyze the emotional distribution and provide a summary."

        # Format emotions for the prompt
        emotions_text = "\n".join([
            f"{emotion}: {count} times" for emotion, count in emotions.items()
        ])

        prompt = f"""
        Emotional Distribution over {time_range}:
        {emotions_text}

        Provide a brief summary of:
        1. Overall emotional state
        2. Notable patterns
        3. Recommendations for emotional well-being

        Keep your response concise and insightful.
        """

        response = self._make_request(prompt, system_prompt)

        if response:
            return {
                "summary": response,
                "model": self.model
            }

        return None


# Create a singleton instance
_local_ai_provider = None


def get_local_ai_provider():
    """Get or create a singleton instance of LocalAIProvider"""
    global _local_ai_provider
    if _local_ai_provider is None:
        _local_ai_provider = LocalAIProvider()
    return _local_ai_provider


def set_local_ai_provider(provider):
    """Set the LocalAIProvider instance (for testing)"""
    global _local_ai_provider
    _local_ai_provider = provider