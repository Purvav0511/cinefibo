# backend/app/main.py

from copy import deepcopy
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .bria_client import generate_image_with_fibo, BriaFiboError
from .shot_service import build_shot_prompt


# ---------- Pydantic models ----------


class FiboGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Natural language prompt to send to FIBO")


class FiboGenerateResponse(BaseModel):
    image_url: str
    structured_prompt: Dict[str, Any]
    request_id: str


class ShotGenerateRequest(BaseModel):
    scene_text: str = Field(
        ...,
        description="Raw scene text or description from which to craft a camera-aware cinematic shot prompt.",
    )


class ShotGenerateResponse(BaseModel):
    shot_prompt: str
    image_url: str
    structured_prompt: Dict[str, Any]
    request_id: str


class ShotTuneRequest(BaseModel):
    structured_prompt: Dict[str, Any] = Field(
        ...,
        description="Existing structured prompt JSON returned from FIBO.",
    )
    camera_angle: Optional[str] = Field(
        None, description="Override camera angle (e.g., 'low-angle', 'eye-level')."
    )
    lens_focal_length: Optional[str] = Field(
        None,
        description="Override lens description (e.g., '24mm wide-angle', '85mm close-up').",
    )
    mood: Optional[str] = Field(
        None,
        description="Override mood/atmosphere (e.g., 'serene and cozy', 'dramatic and tense').",
    )
    color_scheme: Optional[str] = Field(
        None,
        description="Override color scheme description.",
    )


class ShotTuneResponse(BaseModel):
    image_url: str
    structured_prompt: Dict[str, Any]
    request_id: str


# ---------- FastAPI setup ----------

app = FastAPI(title="CineFIBO Backend", version="0.1.0")

# Open up CORS for dev/hackathon – easiest way to kill preflight issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 🔓 allow any origin (localhost, 127.0.0.1, etc.)
    allow_credentials=True,
    allow_methods=["*"],      # allow all HTTP methods
    allow_headers=["*"],      # allow all headers
)


# ---------- Helpers for tuning ----------

CAMERA_ANGLE_DESCRIPTIONS: Dict[str, str] = {
    "eye-level": "an eye-level camera angle, placing the viewer at the character's eye line",
    "low-angle": "a low-angle shot looking up at the subject, making them feel powerful and dominant",
    "high-angle": "a high-angle shot looking down on the subject, making them feel small or vulnerable",
    "top-down": "a top-down, overhead camera angle",
}

LENS_DESCRIPTIONS: Dict[str, str] = {
    "24mm wide-angle": "a 24mm wide-angle lens that emphasizes space and environment",
    "35mm": "a 35mm lens that balances subject and environment",
    "50mm": "a 50mm lens for a natural, cinematic perspective",
    "85mm close-up": "an 85mm telephoto lens for intimate, compressed close-ups",
}


def apply_shot_overrides(
    structured_prompt: Dict[str, Any],
    req: ShotTuneRequest,
) -> Dict[str, Any]:
    """
    Apply high-level user controls onto the structured_prompt in a coherent way,
    touching camera, aesthetics, and lighting together.
    """
    sp = deepcopy(structured_prompt)

    photo = sp.setdefault("photographic_characteristics", {})
    aesthetics = sp.setdefault("aesthetics", {})
    lighting = sp.setdefault("lighting", {})

    # ---- Camera angle ----
    if req.camera_angle:
        raw = req.camera_angle
        description = CAMERA_ANGLE_DESCRIPTIONS.get(raw, raw)
        photo["camera_angle"] = description

    # ---- Lens ----
    if req.lens_focal_length:
        raw = req.lens_focal_length
        description = LENS_DESCRIPTIONS.get(raw, raw)
        photo["lens_focal_length"] = description

    # ---- Mood + lighting ----
    if req.mood:
        mood = req.mood
        aesthetics["mood_atmosphere"] = mood

        # Tie lighting to mood a bit more aggressively
        if "dramatic" in mood or "tense" in mood:
            lighting.setdefault(
                "conditions",
                "low-key, dramatic lighting with strong contrast between light and shadow",
            )
            lighting.setdefault(
                "shadows",
                "deep, pronounced shadows that add tension and mystery",
            )
        elif "bright" in mood or "energetic" in mood:
            lighting.setdefault(
                "conditions",
                "bright, high-key lighting that fills the space with energy",
            )
            lighting.setdefault(
                "shadows",
                "very soft, minimal shadows to keep the mood light",
            )
        elif "melancholic" in mood or "quiet" in mood:
            lighting.setdefault(
                "conditions",
                "soft, dim lighting with cool or muted tones",
            )
            lighting.setdefault(
                "shadows",
                "gentle but noticeable shadows that add introspection",
            )
        elif "serene" in mood or "cozy" in mood:
            lighting.setdefault(
                "conditions",
                "warm, soft lighting that feels intimate and inviting",
            )
            lighting.setdefault(
                "shadows",
                "soft, diffuse shadows that wrap gently around forms",
            )

    # ---- Color scheme ----
    if req.color_scheme:
        aesthetics["color_scheme"] = req.color_scheme

    return sp


def build_prompt_from_structured_prompt(sp: Dict[str, Any]) -> str:
    """
    Turn the structured prompt into a strong, camera-aware text prompt
    that reinforces our overrides.
    """
    short = sp.get("short_description") or ""
    context = sp.get("context") or ""
    aesthetics = sp.get("aesthetics", {})
    photo = sp.get("photographic_characteristics", {})

    mood = aesthetics.get("mood_atmosphere")
    color = aesthetics.get("color_scheme")
    angle = photo.get("camera_angle")
    lens = photo.get("lens_focal_length")

    parts = []

    if short:
        parts.append(short)
    elif context:
        parts.append(context)

    camera_bits = []
    if angle:
        camera_bits.append(str(angle))
    if lens:
        camera_bits.append(str(lens))

    if camera_bits:
        parts.append("The shot uses " + " and ".join(camera_bits) + ".")

    look_bits = []
    if mood:
        look_bits.append(str(mood))
    if color:
        look_bits.append(f"with {color}")
    if look_bits:
        parts.append("The overall look is " + ", ".join(look_bits) + ".")

    if not parts:
        return "A cinematic, well-composed shot suitable for film pre-production."

    return " ".join(parts)


# ---------- Routes ----------

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/fibo/generate", response_model=FiboGenerateResponse)
def fibo_generate(req: FiboGenerateRequest):
    """
    Simple pass-through endpoint to call Bria FIBO with a natural language prompt.
    """
    try:
        result = generate_image_with_fibo(prompt=req.prompt)
    except BriaFiboError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return FiboGenerateResponse(
        image_url=result["image_url"],
        structured_prompt=result["structured_prompt"],
        request_id=result["request_id"],
    )


@app.post("/api/shot/generate", response_model=ShotGenerateResponse)
def shot_generate(req: ShotGenerateRequest):
    """
    Takes raw scene text, asks OpenAI to craft a camera-aware cinematic shot prompt,
    then renders that shot with FIBO.
    """
    if not req.scene_text or not req.scene_text.strip():
        raise HTTPException(status_code=400, detail="scene_text cannot be empty.")

    try:
        # 1) Use OpenAI (or other LLM) to derive a camera-aware prompt
        shot_prompt = build_shot_prompt(req.scene_text)

        # 2) Call FIBO with that prompt
        result = generate_image_with_fibo(prompt=shot_prompt)
    except BriaFiboError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ShotGenerateResponse(
        shot_prompt=shot_prompt,
        image_url=result["image_url"],
        structured_prompt=result["structured_prompt"],
        request_id=result["request_id"],
    )


@app.post("/api/shot/tune", response_model=ShotTuneResponse)
def shot_tune(req: ShotTuneRequest):
    """
    Takes an existing structured_prompt plus user overrides for camera / mood / color,
    applies the changes coherently, and regenerates the shot via FIBO using both
    structured JSON and a derived text prompt.
    """
    if not req.structured_prompt:
        raise HTTPException(status_code=400, detail="structured_prompt is required.")

    try:
        updated_sp = apply_shot_overrides(req.structured_prompt, req)
        prompt_text = build_prompt_from_structured_prompt(updated_sp)

        # Send BOTH prompt + structured_prompt to FIBO
        result = generate_image_with_fibo(
            prompt=prompt_text,
            structured_prompt=updated_sp,
        )
    except BriaFiboError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ShotTuneResponse(
        image_url=result["image_url"],
        structured_prompt=result["structured_prompt"],
        request_id=result["request_id"],
    )
