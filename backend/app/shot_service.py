# backend/app/shot_service.py

import json
from typing import List, Dict, Any, Optional

from openai import OpenAI
from .config import settings

client = OpenAI(api_key=settings.openai_api_key)


def build_shot_prompt(scene_text: str) -> str:
    """
    Turn a single scene/beat into one detailed, camera-aware shot prompt.
    Used by /api/shot/generate.
    """
    system_prompt = """
You are a senior cinematographer and shot designer.

Given a scene description, you write ONE highly detailed, camera-aware,
cinematic shot description. The description should mention:

- shot type (wide, medium, close-up, etc.)
- subject and composition
- camera angle and movement (if any)
- lens or focal length feeling (wide / normal / telephoto)
- lighting and mood
- any relevant production design that matters for framing

Return ONLY a single paragraph of natural language description, no bullet points.
"""
    user_prompt = f"Scene description:\n{scene_text}\n\nWrite one cinematic shot description."

    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )

    return resp.choices[0].message.content.strip()


def plan_coverage_shots(
    scene_text: str,
    num_shots: int = 6,
    project_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Plan a small coverage pack (multiple shots) for a scene.

    The coverage should adapt to the type of production:
    - narrative film / short
    - YouTube show / podcast
    - TikTok / short-form content
    - commercial / corporate
    - documentary / interview
    - or anything else the user specifies via project_type.
    """
    system_prompt = """
You are a cinematographer planning coverage for a small-to-mid scale production.

The production type may vary: narrative film, YouTube show, interview, commercial,
live stream, short-form content, etc. You must adapt shot choices to the described
scene and the production context.

You MUST respond with pure JSON of the form:

{
  "shots": [
    {
      "id": 1,
      "label": "Wide establishing",
      "shot_type": "wide establishing",
      "description": "Full view of the environment and key subjects...",
      "camera_angle": "eye-level, slightly angled toward the host side",
      "lens": "24mm wide",
      "framing": "What is inside the frame (how many people, key objects, composition)",
      "lighting": "Key lighting notes for this shot",
      "purpose": "What this shot is used for in the edit"
    },
    ...
  ]
}

Guidelines:
- Think in terms of efficient coverage: establish the space, key subjects, reaction shots,
  useful cutaways, and any important details.
- Include at least one shot that helps the viewer understand the ROOM / SPACE LAYOUT.
- Lighting notes should be practical (soft key, motivated by practical lamps, backlight, etc.).
- `label` should be short but descriptive (good for UI).
- Limit yourself to the requested number of shots.
"""
    context_line = f"\nProduction type: {project_type}\n" if project_type else "\n"

    user_prompt = (
        f"Scene description:\n{scene_text}\n"
        f"{context_line}\n"
        f"Plan {num_shots} distinct shots that together cover the scene well "
        f"for this type of production."
    )

    resp = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )

    content = resp.choices[0].message.content
    data = json.loads(content)

    shots = data.get("shots", [])
    for idx, shot in enumerate(shots, start=1):
        shot.setdefault("id", idx)

    return shots
