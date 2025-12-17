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

CineFIBO is designed as a modular, production-oriented system that separates user experience, orchestration logic, and AI services.  
The architecture emphasizes **JSON-native visual control**, **agentic planning**, and **secure backend orchestration**.

---

### High-Level System Architecture

The diagram below shows how CineFIBO connects the frontend, backend services, and external AI systems.

- The **Next.js frontend** handles user interaction, tuning, and storyboards
- The **FastAPI backend** orchestrates planning, validation, and generation
- **OpenAI** is used for scene understanding and coverage planning
- **Bria FIBO** performs JSON-native image generation
- Storyboards and structured prompts are persisted client-side

![CineFIBO High-Level Architecture](docs/architecture.png)

---

### Coverage Planner – Agentic Workflow

The following sequence diagram illustrates how CineFIBO generates a full coverage plan from a scene description.

1. The user submits a scene and project context
2. The backend uses OpenAI to reason about coverage
3. Each planned shot is generated using Bria FIBO with structured JSON
4. Results are returned as a complete coverage pack
5. Selected shots are saved into storyboards for iteration

![CineFIBO Coverage Planner Sequence](docs/coverage-sequence.png)

---

### Design Principles

- **JSON as a First-Class Artifact**  
  Structured prompts are preserved, editable, and reusable throughout the workflow.

- **Agentic Orchestration**  
  Coverage planning and shot generation are coordinated dynamically, not hard-coded.

- **Production-Oriented UX**  
  The system mirrors real pre-production workflows used in film and content creation.

- **Secure Key Management**  
  API keys are stored only in the backend and never exposed to the frontend.


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
```

## Challenges & Future Development

CineFIBO was built as a production-oriented prototype within a limited timeframe. While it demonstrates the core ideas of JSON-native, controllable visual generation, there are several challenges and opportunities for future improvement.

### Current Challenges

#### 1. Long-Form Scripts and Large Scenes
At present, CineFIBO works best when users provide:
- a single scene
- a short sequence
- or a focused moment within a larger script

Handling full screenplays or long-form scripts introduces challenges such as:
- context length limitations
- identifying meaningful scene boundaries
- mapping narrative beats to visual coverage

Future iterations would benefit from automatic script chunking, scene detection, and beat-level planning.

---

#### 2. Model Dependency and Cost Constraints
CineFIBO currently integrates with Bria FIBO and OpenAI for:
- image generation
- scene reasoning and coverage planning

While this enables high-quality results, it introduces:
- cost considerations
- rate limits
- dependency on third-party availability

The system architecture is intentionally modular so that alternative image generation or planning models can be integrated in the future without changing the core UX.

---

#### 3. Content Moderation and Creative Constraints
As with any production-safe visual AI system, content moderation can occasionally block certain prompts.

This highlights an important real-world tradeoff:
- balancing creative freedom
- maintaining safe, commercially viable outputs

Future work could include:
- clearer feedback on blocked content
- automated prompt softening or rewriting
- better guidance for creators when moderation is triggered

---

### Future Development

#### 1. Expanded Camera and Lighting Controls
Future versions of CineFIBO could support:
- more granular lens metadata
- camera movement (dolly, crane, handheld)
- advanced lighting setups
- HDR or 16-bit color workflows

This would further align the tool with professional cinematography pipelines.

---

#### 2. Advanced Coverage Intelligence
The coverage planner can be extended to:
- adapt shot plans based on genre
- optimize coverage for budget or time constraints
- suggest alternatives when shots overlap
- dynamically adjust coverage based on storyboards already created

This moves the system closer to an intelligent pre-production assistant.

---

#### 3. Export and Collaboration Features
To support real production teams, future improvements could include:
- exporting storyboards to PDF or JSON for sharing
- versioned storyboards
- collaborative editing
- integration with post-production and scheduling tools

---

#### 4. Multi-Backend Visual Generation
CineFIBO is designed to be backend-agnostic.

Future development could allow creators to:
- switch between different image generation engines
- compare outputs across models
- choose generation strategies based on cost, quality, or style

This would make CineFIBO more resilient and production-flexible.

---

### Closing Thoughts

CineFIBO is intentionally positioned as a **thinking tool for pre-production**, not just an image generator.

The project explores how structured, controllable visual AI can:
- reduce iteration cost
- improve creative decision-making
- and support real-world production workflows

This submission represents a foundation that can evolve into a robust, production-grade system as visual AI continues to mature.

## Repository Status

This repository represents a prototype built for the Bria FIBO Hackathon to demonstrate
JSON-native visual control, agentic workflows, and production-oriented UX.

The code is shared publicly for review and evaluation purposes.

CineFIBO is an actively evolving project. Future iterations may replace underlying models,
refactor orchestration logic, and transition to private repositories as the system
moves toward commercial readiness.

## Contributors
<table>
	<tbody>
		<tr>
         <td align="center">
             <a href="https://github.com/Purvav0511">
                 <img src="https://avatars.githubusercontent.com/u/50676996?v=4" width="100;" alt="Purvav"/>
                 <br />
                 <sub>Purvav Punyani</sub>
             </a>
         </td>
		</tr>
	<tbody>
</table>

© 2025. All rights reserved.
This repository is shared for evaluation purposes and is not licensed for reuse.
