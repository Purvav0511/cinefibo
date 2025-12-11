# CineFIBO 🎬

Script-to-shot director powered by **Bria FIBO** + **OpenAI**.

Paste a scene, get:
- A **camera-aware cinematic shot prompt**
- A **rendered frame** from Bria FIBO
- Full **JSON-native controls** for camera, lens, mood, color
- A **storyboard** of multiple saved shots

Built for the Bria FIBO hackathon to showcase JSON-native control and production workflows.

---

## 🏗 Architecture

Monorepo:

- `backend/` – FastAPI service
  - `/api/fibo/generate` – direct FIBO playground
  - `/api/shot/generate` – scene → camera-aware prompt → FIBO
  - `/api/shot/tune` – JSON-native shot tuning (camera/lens/mood/color)
- `frontend/` – Next.js + Tailwind UI
  - Shot Director
  - Storyboard view
  - FIBO Playground (raw prompt → JSON)

CineFIBO uses:

- **OpenAI** for turning raw scene text into a detailed shot description
- **Bria FIBO** for:
  - text → image
  - JSON-native controllability (camera, lighting, aesthetics)

---

## ⚙️ Backend Setup (`backend/`)

```bash
cd backend

# Create virtualenv
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Copy env template and fill in your keys
cp .env.example .env
# edit .env and set:
# BRIA_API_KEY=...
# OPENAI_API_KEY=...

# Run FastAPI
uvicorn app.main:app --reload --port 8000

Backend runs at: http://localhost:8000

Health check:

curl http://localhost:8000/health
# {"status":"ok"}

Requires Node.js >= 20.9.0.

cd frontend

# Install deps
npm install

# Run dev server
npm run dev


Frontend runs at: http://localhost:3000

Make sure the backend is running on port 8000

const BACKEND_URL = "http://localhost:8000";
in src/pages/index.tsx.


🎥 How CineFIBO Works
1. Shot Director (main tab)

Paste a scene or beat (1–2 pages max).

Click "Generate Cinematic Shot".

Backend:

Uses OpenAI to build a camera-aware shot prompt.

Calls Bria FIBO to generate an image + structured_prompt JSON.

UI shows:

Frame (image)

Shot prompt (natural language)

Shot metadata (camera, lens, lighting, mood)

2. JSON-Native Shot Controls

You can adjust:

Camera angle – eye-level, low-angle, high-angle, top-down

Lens / Focal length – 24mm, 35mm, 50mm, 85mm

Mood / Atmosphere – serene & cozy, dramatic & tense, bright & energetic, melancholic & quiet

Color scheme – warm, cool, neutral, high-contrast

When you click "Apply controls & regenerate":

Backend updates the structured_prompt coherently:

photographic_characteristics.camera_angle

photographic_characteristics.lens_focal_length

aesthetics.mood_atmosphere

aesthetics.color_scheme

lighting.conditions / lighting.shadows (linked to mood)

It also builds a text prompt from the JSON and sends both

prompt

structured_prompt (JSON string)

Bria FIBO returns a new frame and updated JSON.

This demonstrates JSON-native control + agentic workflows.

3. Storyboard

Each shot can be:

Saved as a storyboard frame (“Add shot to storyboard”)

Viewed in a compact grid

Expanded to see:

Large frame

Shot prompt

Shot metadata

Removed individually or cleared all at once.

🚧 Limitations / Future Work

Current flow is per scene/beat.
For full scripts, the roadmap is:

Upload a PDF

Auto-split into scenes

Generate coverage per scene.

Coverage packs (multiple shots per scene) and architecture/real estate camera simulator are planned next.

🧪 FIBO Playground

The FIBO Playground tab lets you:

Send a raw prompt to /api/fibo/generate

Inspect the returned structured_prompt JSON

Experiment with how Bria FIBO’s schema responds

Useful for debugging and for exploring new control dimensions.