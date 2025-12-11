# backend/app/bria_client.py

import time
import json
from typing import Optional, Dict, Any

import httpx

from .config import settings


class BriaFiboError(Exception):
    """Custom exception for Bria / FIBO-related errors."""
    pass


def generate_image_with_fibo(
    prompt: Optional[str] = None,
    structured_prompt: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Submit a request to Bria FIBO and poll until it is completed.

    Args:
        prompt: Optional natural language prompt for FIBO.
        structured_prompt: Optional structured JSON prompt (Python dict).
                           Will be JSON-encoded as a string when sent to Bria.

    Returns:
        Dict with:
            - image_url: str
            - structured_prompt: dict
            - request_id: str
    """
    if not prompt and not structured_prompt:
        raise ValueError("Either prompt or structured_prompt must be provided")

    headers = {
        "api_token": settings.bria_api_key,
        "Content-Type": "application/json",
    }

    base = settings.bria_api_base.rstrip("/")
    submit_url = f"{base}/image/generate"

    payload: Dict[str, Any] = {
        "num_results": 1,
    }

    if prompt:
        payload["prompt"] = prompt

    if structured_prompt is not None:
        # Bria expects structured_prompt as a STRING containing JSON
        if isinstance(structured_prompt, dict):
            payload["structured_prompt"] = json.dumps(structured_prompt)
        else:
            # if caller already passed a JSON string, just forward it
            payload["structured_prompt"] = structured_prompt

    # ---- Step 1: submit generation request ----
    try:
        resp = httpx.post(submit_url, json=payload, headers=headers, timeout=30)
    except Exception as e:
        raise BriaFiboError(f"Error contacting Bria generate endpoint: {e}") from e

    if resp.status_code >= 400:
        raise BriaFiboError(
            f"Bria submit error {resp.status_code}: {resp.text}"
        )

    data = resp.json()

    request_id = data.get("request_id")
    status_url = data.get("status_url")

    if not status_url or not request_id:
        raise BriaFiboError(
            f"Bria submit response missing status_url or request_id: {data}"
        )

    # ---- Step 2: poll status until COMPLETED ----
    while True:
        try:
            status_resp = httpx.get(status_url, headers=headers, timeout=30)
        except Exception as e:
            raise BriaFiboError(f"Error contacting Bria status endpoint: {e}") from e

        if status_resp.status_code >= 400:
            raise BriaFiboError(
                f"Bria status error {status_resp.status_code}: {status_resp.text}"
            )

        sd = status_resp.json()
        status = sd.get("status", "")

        if status.upper() == "COMPLETED":
            result = sd.get("result", {}) or {}

            image_url = result.get("image_url")
            structured_raw = result.get("structured_prompt")

            # Normalize structured_prompt back into a dict
            structured_parsed: Dict[str, Any] = {}
            if isinstance(structured_raw, dict):
                structured_parsed = structured_raw
            elif isinstance(structured_raw, str):
                try:
                    structured_parsed = json.loads(structured_raw)
                except Exception:
                    # If parsing fails, keep it as empty dict to avoid breaking callers
                    structured_parsed = {}

            if not image_url:
                raise BriaFiboError(
                    f"Completed but no image_url in result: {sd}"
                )

            return {
                "image_url": image_url,
                "structured_prompt": structured_parsed,
                "request_id": request_id,
            }

        if status.upper() == "ERROR":
            raise BriaFiboError(f"Bria generation error: {sd}")

        # Still in progress
        time.sleep(2)
