# backend/app/models.py
from typing import Optional, Dict, Any
from pydantic import BaseModel


class FiboGenerateRequest(BaseModel):
    prompt: Optional[str] = None
    structured_prompt: Optional[Dict[str, Any]] = None


class FiboGenerateResponse(BaseModel):
    image_url: str
    structured_prompt: Dict[str, Any]
    request_id: str


class ShotGenerateRequest(BaseModel):
    scene_text: str


class ShotGenerateResponse(BaseModel):
    shot_prompt: str
    image_url: str
    structured_prompt: Dict[str, Any]
    request_id: str


class ShotTuneRequest(BaseModel):
    structured_prompt: Dict[str, Any]
    camera_angle: Optional[str] = None
    lens_focal_length: Optional[str] = None
    mood: Optional[str] = None
    color_scheme: Optional[str] = None


class ShotTuneResponse(BaseModel):
    image_url: str
    structured_prompt: Dict[str, Any]
    request_id: str
