# CineFIBO  
### JSON-Native Shot Planning & Storyboarding for Real Production Workflows

CineFIBO is a production-oriented shot planning and storyboarding application built on **Bria FIBO’s JSON-native visual generation**.  
It enables creators and film teams to plan shots, design coverage, and iteratively refine visuals using structured, controllable parameters instead of brittle prompt engineering.

---

## Why CineFIBO Exists

CineFIBO was created from two real motivations:

### Learning Cinematography as a Content Creator
As a beginner in content creation, understanding:
- camera placement
- lens choice
- lighting setups
- shot coverage  

can be overwhelming. CineFIBO makes cinematography concepts tangible by visually demonstrating how changes in camera and lighting decisions affect the final frame.

### Real Production Inspiration
My brother works in the film industry as a **director / assistant director**, where pre-production planning, coverage decisions, and visual clarity are critical — and costly when done inefficiently.

CineFIBO was designed with real production constraints in mind:
- limited time on set
- the need for clear shot lists
- efficient coverage planning
- iteration before production begins

The goal is not to replace creative professionals, but to **augment pre-production workflows**, reduce iteration cost, and save time.

---

## Core Features

### 🎬 Shot Director (Scene → Frame)
- Input a natural language scene description
- Generate a cinematic frame using Bria FIBO
- Inspect the **structured JSON prompt** driving the image
- Iteratively tune:
  - camera angle
  - focal length
  - lighting
  - mood
  - color palette
- Regenerate images deterministically based on structured changes

This demonstrates Bria FIBO’s disentangled, controllable generation beyond prompt trial-and-error.

---

### 🎥 Coverage Planner (Agentic Workflow)
- Describe the scene and what kind of project is being created (film, YouTube, short-form, etc.)
- Automatically generate a **multi-shot coverage plan**
- Each shot includes:
  - shot intent
  - framing
  - camera angle
  - lens suggestion
  - lighting notes
- Generate visual frames for each planned shot

This models how real productions think about **coverage**, not just single hero images.

---

### 📋 Storyboards (Production-Ready Iteration)
- Save selected shots into named storyboards
- Persist projects and shots across sessions
- Open any storyboard frame and:
  - tweak camera and lighting
  - regenerate the image
  - keep changes in context
- Maintain a living, editable storyboard instead of static frames

This enables **non-destructive iteration**, similar to professional pre-production workflows.

---

### 🧩 JSON-Native Visual Control
At every stage, CineFIBO exposes and uses Bria FIBO’s structured JSON output:

- JSON is treated as a **first-class artifact**
- Parameters are:
  - inspectable
  - editable
  - reusable
  - persistent
- Visual changes are driven by structured control, not fragile prompt hacks

This is the core technical innovation of the project.

---

## Why Bria FIBO

CineFIBO was built specifically around **Bria FIBO’s JSON-native architecture** because:

- Visual parameters are explicit and disentangled
- Camera, lighting, and composition are controllable
- Outputs are consistent and production-friendly
- Content is safe for commercial workflows

The project intentionally moves away from prompt-only image generation toward **structured visual systems**.

---

## Category Alignment

### 🏆 Best JSON-Native or Agentic Workflow (Primary)
- Natural language → structured JSON → deterministic generation
- Automated coverage planning and shot orchestration
- JSON used as a reusable, persistent control surface

### 🏆 Best New User Experience or Professional Tool
- Designed for real creators and production teams
- Mirrors real pre-production workflows
- Practical, iterative, and production-oriented UX

### 🏆 Best Controllability (Secondary)
- Explicit control over camera, lens, lighting, mood, and color
- Deterministic regeneration using structured parameters

---

## Architecture & System Design

### High-Level Architecture



### System Design Principles

- Frontend never accesses API keys  
- Backend orchestrates all AI calls  
- Structured prompts are preserved and reused  
- UX mirrors real production workflows  

---

## How to Use CineFIBO

### Shot Director

1. Enter a scene description  
2. Generate a cinematic frame  
3. Inspect the structured JSON  
4. Adjust camera, lens, lighting, or mood  
5. Regenerate deterministically  

### Coverage Planner

1. Describe the scene and project type  
2. Generate a multi-shot coverage plan  
3. Review each shot’s intent and frame  
4. Select shots to save into a storyboard  

### Storyboards

1. Create or select a storyboard  
2. View saved shots  
3. Click a shot to expand and tune  
4. Regenerate and persist updates  

---

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add API keys, check .env.example for what keys to add before running.
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev