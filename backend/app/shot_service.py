from openai import OpenAI

from .config import settings

# Create a single OpenAI client using our API key from .env
client = OpenAI(api_key=settings.openai_api_key)

SHOT_SYSTEM_PROMPT = """
You are a cinematographer AI. Your job is to take a raw scene description
(from a script, creator notes, or story idea) and turn it into a single,
concise prompt optimized for a text-to-image model with cinematic control.

Your output MUST:
- Be a single sentence or short paragraph.
- Explicitly mention: camera angle, lens focal length range, shot type,
  lighting, and mood.
- Avoid dialogue and screenplay formatting.
- Focus on what the camera sees, not script directions.
"""


def build_shot_prompt(scene_text: str) -> str:
    """
    Use OpenAI to turn raw scene text into a camera-aware prompt for FIBO.
    """
    scene_text = scene_text.strip()
    if not scene_text:
        return ""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SHOT_SYSTEM_PROMPT},
            {"role": "user", "content": scene_text},
        ],
        temperature=0.7,
        max_tokens=200,
    )

    content = response.choices[0].message.content or ""
    return content.strip()
