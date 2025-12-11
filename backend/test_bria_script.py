import time
import json
import httpx
from app.config import settings  # loads .env


def bria_generate(prompt: str):
    headers = {
        "api_token": settings.bria_api_key,
        "Content-Type": "application/json",
    }

    base = settings.bria_api_base.rstrip("/")
    submit_url = f"{base}/image/generate"
    payload = {"prompt": prompt, "num_results": 1}

    print("➡️ Sending request to Bria...")
    r = httpx.post(submit_url, json=payload, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()

    print("🔹 Submitted!")
    request_id = data["request_id"]
    status_url = data["status_url"]
    print("request_id:", request_id)
    print("status_url:", status_url)

    print("\n⏳ Polling for result...")
    while True:
        s = httpx.get(status_url, headers=headers, timeout=30)
        s.raise_for_status()
        sd = s.json()

        status = sd.get("status", "")
        print("Status:", status)

        if status.upper() == "COMPLETED":
            result = sd.get("result", {})
            image_url = result.get("image_url")
            structured_raw = result.get("structured_prompt")

            # Normalize structured_prompt into a dict
            structured_parsed = {}
            if isinstance(structured_raw, dict):
                structured_parsed = structured_raw
            elif isinstance(structured_raw, str):
                try:
                    structured_parsed = json.loads(structured_raw)
                except Exception:
                    print("\n⚠️ structured_prompt is a string but not valid JSON, keeping raw.")
                    structured_parsed = {}

            if not image_url:
                raise RuntimeError(
                    f"✅ Completed but no image_url in result:\n{sd}"
                )

            return {
                "image_url": image_url,
                "structured_prompt": structured_parsed,
                "request_id": request_id,
            }

        if status.upper() == "ERROR":
            raise RuntimeError(f"❌ Generation failed:\n{sd}")

        time.sleep(2)


if __name__ == "__main__":
    test_prompt = "A cinematic wide shot of a cozy living room with warm lighting."
    result = bria_generate(test_prompt)

    print("\n✅ SUCCESS — FIBO Responded!")
    print("Image URL:", result["image_url"])
    print("Request ID:", result["request_id"])
    sp = result["structured_prompt"]
    print("Structured Prompt Type:", type(sp).__name__)
    print("Structured Prompt Keys:", list(sp.keys()))
