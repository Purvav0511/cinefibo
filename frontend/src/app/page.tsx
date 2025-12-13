"use client";

import { useEffect, useState } from "react";

type FiboResponse = {
  image_url: string;
  structured_prompt: Record<string, any>;
  request_id: string;
};

type ShotResponse = {
  shot_prompt: string;
  image_url: string;
  structured_prompt: Record<string, any>;
  request_id: string;
};

type StoryboardShot = {
  id: string;
  shot_prompt: string;
  image_url: string;
  structured_prompt: Record<string, any>;
  request_id: string;
  createdAt: string;
};

type CoverageShotPlan = {
  id: number;
  label: string;
  shot_type: string;
  description: string;
  camera_angle: string;
  lens: string;
  framing: string;
  lighting: string;
  purpose?: string | null;
};

type CoverageShotResult = {
  plan: CoverageShotPlan;
  image_url: string;
  structured_prompt: Record<string, any>;
  request_id: string;
};

type StoryboardProject = {
  id: string;
  name: string;
  createdAt: string;
  shots: StoryboardShot[];
};

type Tab = "director" | "coverage" | "storyboards" | "playground";

const STORAGE_KEY = "cinefibo-storyboards";
const ACTIVE_PROJECT_KEY = "cinefibo-active-project";

// --- Persistence helpers (localStorage) ---
const saveProjectsToStorage = (projectsData: StoryboardProject[]) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsData));
  } catch (err) {
    console.warn("Failed to save projects:", err);
  }
};

const loadProjectsFromStorage = (): StoryboardProject[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function Home() {
  const BACKEND_URL = "http://localhost:8000";

  // ----- Global nav -----
  const [activeTab, setActiveTab] = useState<Tab>("director");

  // ----- Playground (raw FIBO) state -----
  const [prompt, setPrompt] = useState(
    "A cinematic wide shot of a cozy living room with warm lighting."
  );
  const [playgroundData, setPlaygroundData] = useState<FiboResponse | null>(
    null
  );
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [showPlaygroundJson, setShowPlaygroundJson] = useState(false);

  // ----- Shot Director state -----
  const [sceneText, setSceneText] = useState(
    "INT. LIVING ROOM - EVENING\n\nWarm golden-hour light pours through a large window. A lone person sits on a couch, surrounded by books and a mug of tea, lost in thought."
  );
  const [shotData, setShotData] = useState<ShotResponse | null>(null);
  const [shotLoading, setShotLoading] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);

  // ----- Shot Director Controls (derived from JSON, editable) -----
  const [controlAngle, setControlAngle] = useState<string>("");
  const [controlLens, setControlLens] = useState<string>("");
  const [controlMood, setControlMood] = useState<string>("");
  const [controlColor, setControlColor] = useState<string>("");

  const [tuneLoading, setTuneLoading] = useState(false);
  const [tuneError, setTuneError] = useState<string | null>(null);
  const [showShotJson, setShowShotJson] = useState(false);

  // ----- Storyboard projects -----
  const [projects, setProjects] = useState<StoryboardProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [storyboardsViewProjectId, setStoryboardsViewProjectId] =
    useState<string | null>(null);
  const [selectedStoryboardShot, setSelectedStoryboardShot] =
    useState<StoryboardShot | null>(null);

  // ----- Storyboard shot tuning (in Storyboards tab) -----
  const [sbControlAngle, setSbControlAngle] = useState<string>("");
  const [sbControlLens, setSbControlLens] = useState<string>("");
  const [sbControlMood, setSbControlMood] = useState<string>("");
  const [sbControlColor, setSbControlColor] = useState<string>("");
  const [sbTuneLoading, setSbTuneLoading] = useState(false);
  const [sbTuneError, setSbTuneError] = useState<string | null>(null);
  const [sbShowJson, setSbShowJson] = useState(false);

  // ----- Coverage Planner -----
  const [coverageSceneText, setCoverageSceneText] = useState(
    "A group of friends are filming a homemade Jeopardy-style quiz game. There is a host at a podium, three contestants with buzzers, and a screen showing the board."
  );
  const [coverageProjectType, setCoverageProjectType] = useState(
    "YouTube game show with friends"
  );
  const [coverageNumShots, setCoverageNumShots] = useState<number>(6);
  const [coverageShots, setCoverageShots] = useState<CoverageShotResult[] | null>(
    null
  );
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [selectedCoverageShot, setSelectedCoverageShot] =
    useState<CoverageShotResult | null>(null);
  const [showCoverageJson, setShowCoverageJson] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const storyboardsViewProject =
    projects.find((p) => p.id === storyboardsViewProjectId) || null;

  // ========== Shared helper for moderation-aware errors ==========

  const handleFiboError = async (res: Response): Promise<never> => {
    const text = await res.text();
    const lower = text.toLowerCase();

    if (res.status === 422 && lower.includes("content moderation")) {
      throw new Error(
        "FIBO blocked this request due to its content moderation rules. Try adjusting the scene text to be less sensitive."
      );
    }

    throw new Error(`Backend error (${res.status}): ${text}`);
  };

  // ========== Helpers for projects / storyboard ==========

  const createProject = (initialName?: string): StoryboardProject => {
    const baseName =
      initialName && initialName.trim().length > 0
        ? initialName.trim()
        : "Untitled storyboard";

    const project: StoryboardProject = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: baseName,
      createdAt: new Date().toISOString(),
      shots: [],
    };

    setProjects((prev) => [...prev, project]);
    setActiveProjectId(project.id);
    return project;
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));

    // Clean up selection if we deleted the active/view project
    setActiveProjectId((prev) => (prev === projectId ? null : prev));
    setStoryboardsViewProjectId((prev) => (prev === projectId ? null : prev));

    // Close overlay if it’s open
    setSelectedStoryboardShot(null);

    // Also clean localStorage active-project key
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (stored === projectId) {
        window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
    }
  };

  const addShotToProject = (shot: StoryboardShot, projectId?: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === (projectId || activeProjectId)
          ? { ...p, shots: [...p.shots, shot] }
          : p
      )
    );
  };

  const updateShotInProject = (
    projectId: string,
    shotId: string,
    updated: Partial<StoryboardShot>
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          shots: p.shots.map((s) =>
            s.id === shotId ? { ...s, ...updated } : s
          ),
        };
      })
    );
  };

  const removeShotFromProject = (projectId: string, shotId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, shots: p.shots.filter((s) => s.id !== shotId) }
          : p
      )
    );
  };

  const renderShotMetadata = (sp: Record<string, any> | null | undefined) => {
    if (!sp) return null;

    const aesthetics = sp.aesthetics || {};
    const lighting = sp.lighting || {};
    const photo = sp.photographic_characteristics || {};

    return (
      <div className="space-y-2 text-xs">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">
            Camera & Lens
          </h4>
          <ul className="list-disc list-inside text-slate-200">
            {photo.camera_angle && (
              <li>
                <span className="font-medium">Angle:</span>{" "}
                {photo.camera_angle}
              </li>
            )}
            {photo.lens_focal_length && (
              <li>
                <span className="font-medium">Lens:</span>{" "}
                {photo.lens_focal_length}
              </li>
            )}
            {photo.depth_of_field && (
              <li>
                <span className="font-medium">Depth of field:</span>{" "}
                {photo.depth_of_field}
              </li>
            )}
            {photo.focus && (
              <li>
                <span className="font-medium">Focus:</span> {photo.focus}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-100">Lighting</h4>
          <ul className="list-disc list-inside text-slate-200">
            {lighting.conditions && (
              <li>
                <span className="font-medium">Conditions:</span>{" "}
                {lighting.conditions}
              </li>
            )}
            {lighting.direction && (
              <li>
                <span className="font-medium">Direction:</span>{" "}
                {lighting.direction}
              </li>
            )}
            {lighting.shadows && (
              <li>
                <span className="font-medium">Shadows:</span>{" "}
                {lighting.shadows}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-100">Aesthetics</h4>
          <ul className="list-disc list-inside text-slate-200">
            {aesthetics.mood_atmosphere && (
              <li>
                <span className="font-medium">Mood:</span>{" "}
                {aesthetics.mood_atmosphere}
              </li>
            )}
            {aesthetics.color_scheme && (
              <li>
                <span className="font-medium">Color scheme:</span>{" "}
                {aesthetics.color_scheme}
              </li>
            )}
            {aesthetics.aesthetic_score && (
              <li>
                <span className="font-medium">Aesthetic score:</span>{" "}
                {aesthetics.aesthetic_score}
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  };

  // ========== Persistence Effects ==========

  // Load stored projects + active project on first mount
  useEffect(() => {
    const storedProjects = loadProjectsFromStorage();
    if (storedProjects && storedProjects.length > 0) {
      setProjects(storedProjects);
    }
    if (typeof window !== "undefined") {
      const storedActive = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (storedActive) {
        setActiveProjectId(storedActive);
        setStoryboardsViewProjectId(storedActive);
      }
    }
  }, []);

  // Save projects whenever they change
  useEffect(() => {
    saveProjectsToStorage(projects);
  }, [projects]);

  // Persist active project id
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeProjectId) {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    }
  }, [activeProjectId]);

  // ========== PLAYGROUND HANDLERS ==========

  const handlePlaygroundGenerate = async () => {
    setPlaygroundLoading(true);
    setPlaygroundError(null);
    setPlaygroundData(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/fibo/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        await handleFiboError(res);
      }

      const json: FiboResponse = await res.json();
      setPlaygroundData(json);
    } catch (err: any) {
      setPlaygroundError(err.message || "Something went wrong");
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // ========== SHOT DIRECTOR HANDLERS ==========

  const handleShotGenerate = async () => {
    setShotLoading(true);
    setShotError(null);
    setShotData(null);
    setTuneError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shot/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_text: sceneText }),
      });

      if (!res.ok) {
        await handleFiboError(res);
      }

      const json: ShotResponse = await res.json();
      setShotData(json);
    } catch (err: any) {
      setShotError(err.message || "Something went wrong");
    } finally {
      setShotLoading(false);
    }
  };

  // When we get new shotData, initialize controls from its JSON
  useEffect(() => {
    if (!shotData) return;

    const sp = shotData.structured_prompt || {};
    const photo = sp.photographic_characteristics || {};
    const aesthetics = sp.aesthetics || {};

    setControlAngle(photo.camera_angle || "");
    setControlLens(photo.lens_focal_length || "");
    setControlMood(aesthetics.mood_atmosphere || "");
    setControlColor(aesthetics.color_scheme || "");
  }, [shotData]);

  const handleTuneShot = async () => {
    if (!shotData) return;
    setTuneLoading(true);
    setTuneError(null);

    try {
      const body = {
        structured_prompt: shotData.structured_prompt,
        camera_angle: controlAngle || undefined,
        lens_focal_length: controlLens || undefined,
        mood: controlMood || undefined,
        color_scheme: controlColor || undefined,
      };

      const res = await fetch(`${BACKEND_URL}/api/shot/tune`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        await handleFiboError(res);
      }

      const json = (await res.json()) as {
        image_url: string;
        structured_prompt: Record<string, any>;
        request_id: string;
      };

      setShotData((prev) =>
        prev
          ? {
              ...prev,
              image_url: json.image_url,
              structured_prompt: json.structured_prompt,
              request_id: json.request_id,
            }
          : {
              shot_prompt: "",
              image_url: json.image_url,
              structured_prompt: json.structured_prompt,
              request_id: json.request_id,
            }
      );
    } catch (err: any) {
      setTuneError(err.message || "Something went wrong");
    } finally {
      setTuneLoading(false);
    }
  };

  const handleAddShotDirectorToStoryboard = () => {
    if (!shotData) return;

    let targetProject = activeProject;
    if (!targetProject) {
      const defaultName =
        coverageProjectType.trim() ||
        sceneText.trim().slice(0, 40) ||
        "New storyboard";
      targetProject = createProject(defaultName);
    }

    const id = `${shotData.request_id}-${Date.now()}`;
    const newShot: StoryboardShot = {
      id,
      shot_prompt: shotData.shot_prompt,
      image_url: shotData.image_url,
      structured_prompt: shotData.structured_prompt,
      request_id: shotData.request_id,
      createdAt: new Date().toISOString(),
    };

    addShotToProject(newShot, targetProject.id);
  };

  // ========== COVERAGE HANDLERS ==========

  const handleCoverageGenerate = async () => {
    setCoverageLoading(true);
    setCoverageError(null);
    setCoverageShots(null);
    setSelectedCoverageShot(null);
    setShowCoverageJson(false);

    try {
      const trimmedProjectType = coverageProjectType.trim();

      const payload: any = {
        scene_text: coverageSceneText,
        num_shots: coverageNumShots,
      };

      if (trimmedProjectType) {
        payload.project_type = trimmedProjectType;
      }

      const res = await fetch(`${BACKEND_URL}/api/shot/coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await handleFiboError(res);
      }

      const json = (await res.json()) as { shots: CoverageShotResult[] };
      setCoverageShots(json.shots || []);
    } catch (err: any) {
      setCoverageError(err.message || "Something went wrong");
    } finally {
      setCoverageLoading(false);
    }
  };

  const handleOpenCoverageShot = (shot: CoverageShotResult) => {
    setSelectedCoverageShot(shot);
    setShowCoverageJson(false);
  };

  const handleCloseCoverageShot = () => {
    setSelectedCoverageShot(null);
    setShowCoverageJson(false);
  };

  // FIX: allow explicit project id override (prevents "Add all" making multiple projects)
  const handleAddCoverageShotToStoryboard = (
    shot: CoverageShotResult,
    projectIdOverride?: string
  ) => {
    const projectId = projectIdOverride || activeProjectId;

    let finalProjectId = projectId;
    if (!finalProjectId) {
      const defaultName =
        coverageProjectType.trim() ||
        coverageSceneText.trim().slice(0, 40) ||
        "New storyboard";
      const p = createProject(defaultName);
      finalProjectId = p.id;
    }

    const id = `${shot.request_id}-${shot.plan.id}-${Date.now()}`;
    const prompt =
      shot.plan.description ||
      `Coverage shot ${shot.plan.id}: ${shot.plan.label}`;

    const newShot: StoryboardShot = {
      id,
      shot_prompt: prompt,
      image_url: shot.image_url,
      structured_prompt: shot.structured_prompt,
      request_id: shot.request_id,
      createdAt: new Date().toISOString(),
    };

    addShotToProject(newShot, finalProjectId);
  };

  // FIX: add all shots to ONE project
  const handleAddAllCoverageToStoryboard = () => {
    if (!coverageShots || coverageShots.length === 0) return;

    let targetProjectId = activeProjectId;

    if (!targetProjectId) {
      const defaultName =
        coverageProjectType.trim() ||
        coverageSceneText.trim().slice(0, 40) ||
        "New storyboard";
      const p = createProject(defaultName);
      targetProjectId = p.id;

      setStoryboardsViewProjectId(p.id);
      setActiveProjectId(p.id);
    }

    coverageShots.forEach((shot) =>
      handleAddCoverageShotToStoryboard(shot, targetProjectId!)
    );
  };

  // ========== STORYBOARDS TAB: open & tune shot ==========

  const handleOpenStoryboardShot = (shot: StoryboardShot) => {
    setSelectedStoryboardShot(shot);
    setSbTuneError(null);
    setSbShowJson(false);

    const sp = shot.structured_prompt || {};
    const photo = sp.photographic_characteristics || {};
    const aesthetics = sp.aesthetics || {};

    setSbControlAngle(photo.camera_angle || "");
    setSbControlLens(photo.lens_focal_length || "");
    setSbControlMood(aesthetics.mood_atmosphere || "");
    setSbControlColor(aesthetics.color_scheme || "");
  };

  const handleCloseStoryboardShotOverlay = () => {
    setSelectedStoryboardShot(null);
    setSbShowJson(false);
    setSbTuneError(null);
  };

  const handleStoryboardTuneShot = async () => {
    if (!selectedStoryboardShot || !storyboardsViewProject) return;

    setSbTuneLoading(true);
    setSbTuneError(null);

    try {
      const body = {
        structured_prompt: selectedStoryboardShot.structured_prompt,
        camera_angle: sbControlAngle || undefined,
        lens_focal_length: sbControlLens || undefined,
        mood: sbControlMood || undefined,
        color_scheme: sbControlColor || undefined,
      };

      const res = await fetch(`${BACKEND_URL}/api/shot/tune`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        await handleFiboError(res);
      }

      const json = (await res.json()) as {
        image_url: string;
        structured_prompt: Record<string, any>;
        request_id: string;
      };

      // Update local overlay shot
      const updatedShot: StoryboardShot = {
        ...selectedStoryboardShot,
        image_url: json.image_url,
        structured_prompt: json.structured_prompt,
        request_id: json.request_id,
      };
      setSelectedStoryboardShot(updatedShot);

      // Update in project
      updateShotInProject(storyboardsViewProject.id, selectedStoryboardShot.id, {
        image_url: json.image_url,
        structured_prompt: json.structured_prompt,
        request_id: json.request_id,
      });
    } catch (err: any) {
      setSbTuneError(err.message || "Something went wrong");
    } finally {
      setSbTuneLoading(false);
    }
  };

  // ========== MAIN RENDER ==========

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center">
      <div className="w-full max-w-6xl px-6 py-4 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center text-xs font-bold">
              CF
            </div>
            <div>
              <h1 className="text-lg font-semibold">CineFIBO</h1>
              <p className="text-xs text-slate-400">
                Script-to-shot director powered by Bria FIBO.
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-xs bg-slate-900 rounded-full p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("director")}
              className={`px-3 py-1 rounded-full ${
                activeTab === "director"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Shot Director
            </button>
            <button
              onClick={() => setActiveTab("coverage")}
              className={`px-3 py-1 rounded-full ${
                activeTab === "coverage"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Coverage Planner
            </button>
            <button
              onClick={() => setActiveTab("storyboards")}
              className={`px-3 py-1 rounded-full ${
                activeTab === "storyboards"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Storyboards
            </button>
            <button
              onClick={() => setActiveTab("playground")}
              className={`px-3 py-1 rounded-full ${
                activeTab === "playground"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              FIBO Playground
            </button>
          </nav>
        </header>

        {/* Shot Director */}
        {activeTab === "director" && (
          <section className="space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Shot Director</h2>
                <p className="text-xs text-slate-400">
                  Paste a scene — get a cinematic frame + camera plan.
                </p>
              </div>

              <textarea
                value={sceneText}
                onChange={(e) => setSceneText(e.target.value)}
                className="w-full h-32 rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                onClick={handleShotGenerate}
                disabled={shotLoading}
                className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
              >
                {shotLoading ? "Generating shot..." : "Generate Cinematic Shot"}
              </button>

              {shotError && (
                <div className="mt-2 text-xs text-red-400">
                  Error: {shotError}
                </div>
              )}
            </div>

            {shotData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT: Frame */}
                <div className="space-y-2 lg:col-span-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Frame
                  </h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shotData.image_url}
                    alt="Shot Director output"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900"
                  />
                  <p className="text-[10px] text-slate-500 break-all">
                    request_id: {shotData.request_id}
                  </p>
                </div>

                {/* MIDDLE: Prompt + metadata */}
                <div className="space-y-4 lg:col-span-1">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Shot prompt (camera-aware)
                    </h3>
                    <p className="text-xs bg-slate-900 border border-slate-800 rounded-md p-3">
                      {shotData.shot_prompt}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                      Shot metadata
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-md p-3">
                      {renderShotMetadata(shotData.structured_prompt)}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Controls + JSON toggle */}
                <div className="space-y-4 lg:col-span-1">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                      Shot controls
                    </h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-md p-3 space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="block font-medium">Camera angle</label>
                        <select
                          value={controlAngle}
                          onChange={(e) => setControlAngle(e.target.value)}
                          className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                        >
                          <option value="">Keep current</option>
                          <option value="eye-level">Eye-level</option>
                          <option value="low-angle">Low angle</option>
                          <option value="high-angle">High angle</option>
                          <option value="top-down">Top-down</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-medium">
                          Lens (focal length)
                        </label>
                        <select
                          value={controlLens}
                          onChange={(e) => setControlLens(e.target.value)}
                          className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                        >
                          <option value="">Keep current</option>
                          <option value="24mm wide-angle">24mm wide-angle</option>
                          <option value="35mm">35mm</option>
                          <option value="50mm">50mm</option>
                          <option value="85mm close-up">85mm close-up</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-medium">
                          Mood / atmosphere
                        </label>
                        <select
                          value={controlMood}
                          onChange={(e) => setControlMood(e.target.value)}
                          className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                        >
                          <option value="">Keep current</option>
                          <option value="serene and cozy">
                            Serene &amp; cozy
                          </option>
                          <option value="dramatic and tense">
                            Dramatic &amp; tense
                          </option>
                          <option value="bright and energetic">
                            Bright &amp; energetic
                          </option>
                          <option value="melancholic and quiet">
                            Melancholic &amp; quiet
                          </option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-medium">Color scheme</label>
                        <select
                          value={controlColor}
                          onChange={(e) => setControlColor(e.target.value)}
                          className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                        >
                          <option value="">Keep current</option>
                          <option value="warm, golden tones">
                            Warm, golden tones
                          </option>
                          <option value="cool, bluish tones">
                            Cool, bluish tones
                          </option>
                          <option value="neutral, soft grays and beiges">
                            Neutral, soft grays &amp; beiges
                          </option>
                          <option value="high-contrast, deep shadows">
                            High contrast, deep shadows
                          </option>
                        </select>
                      </div>

                      {tuneError && (
                        <div className="text-red-400 text-xs">
                          Error: {tuneError}
                        </div>
                      )}

                      <button
                        onClick={handleTuneShot}
                        disabled={tuneLoading}
                        className="mt-1 px-3 py-1 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-medium w-full"
                      >
                        {tuneLoading
                          ? "Regenerating shot..."
                          : "Apply controls & regenerate"}
                      </button>

                      <button
                        onClick={handleAddShotDirectorToStoryboard}
                        disabled={!shotData}
                        className="mt-1 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-medium w-full"
                      >
                        Save shot to storyboard
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Structured prompt (JSON)
                      </h3>
                      <button
                        onClick={() => setShowShotJson((v) => !v)}
                        className="text-[10px] px-2 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                      >
                        {showShotJson ? "Hide JSON" : "Show JSON"}
                      </button>
                    </div>
                    {showShotJson && (
                      <pre className="text-xs bg-slate-900 border border-slate-800 rounded-md p-3 max-h-72 overflow-auto">
                        {JSON.stringify(shotData.structured_prompt, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Coverage Planner */}
        {activeTab === "coverage" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Coverage Planner</h2>
                <p className="text-xs text-slate-400">
                  Plan multi-shot coverage. Then pick which frames belong in
                  your storyboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* LEFT: Storyboard projects list */}
              <aside className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Storyboards
                  </h3>
                  <button
                    className="text-[10px] px-2 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                    onClick={() => {
                      const defaultName =
                        coverageProjectType.trim() ||
                        coverageSceneText.trim().slice(0, 40) ||
                        "New storyboard";
                      const p = createProject(defaultName);
                      setStoryboardsViewProjectId(p.id);
                    }}
                  >
                    + New
                  </button>
                </div>
                {projects.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No storyboard yet. Create one, then add coverage shots.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActiveProjectId(p.id);
                          setStoryboardsViewProjectId(p.id);
                          setActiveTab("storyboards");
                        }}
                        className={`w-full text-left text-xs rounded-md px-2 py-2 border ${
                          activeProjectId === p.id
                            ? "border-emerald-500 bg-slate-950"
                            : "border-slate-700 bg-slate-950 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-100">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.shots.length} shots
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </aside>

              {/* RIGHT: Coverage main */}
              <div className="md:col-span-3 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Scene input */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-200">
                        Scene / moment you&apos;re shooting
                      </label>
                      <textarea
                        value={coverageSceneText}
                        onChange={(e) => setCoverageSceneText(e.target.value)}
                        className="w-full h-28 rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500">
                        Describe what happens, where you are, who&apos;s on
                        camera, key props, etc.
                      </p>
                    </div>
                  </div>

                  {/* Project type / shots / generate */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-200">
                        What are you making? (optional)
                      </label>
                      <input
                        type="text"
                        value={coverageProjectType}
                        onChange={(e) => setCoverageProjectType(e.target.value)}
                        className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="e.g. YouTube quiz show, narrative short film, TikTok sketch"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-200">
                        Number of shots
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={coverageNumShots}
                        onChange={(e) =>
                          setCoverageNumShots(
                            Number.isNaN(parseInt(e.target.value, 10))
                              ? 6
                              : Math.min(
                                  12,
                                  Math.max(1, parseInt(e.target.value, 10))
                                )
                          )
                        }
                        className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <button
                      onClick={handleCoverageGenerate}
                      disabled={coverageLoading}
                      className="mt-2 w-full px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm font-medium"
                    >
                      {coverageLoading
                        ? "Planning coverage..."
                        : "Generate coverage pack"}
                    </button>

                    {coverageError && (
                      <div className="text-xs text-red-400 mt-1">
                        Error: {coverageError}
                      </div>
                    )}

                    {coverageShots && coverageShots.length > 0 && (
                      <button
                        onClick={handleAddAllCoverageToStoryboard}
                        className="w-full mt-1 px-3 py-2 rounded-md border border-emerald-500 text-emerald-300 text-xs hover:bg-emerald-500/10"
                      >
                        Add all coverage shots to storyboard
                      </button>
                    )}
                  </div>
                </div>

                {/* Coverage results grid */}
                {coverageShots && coverageShots.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                          Coverage shots
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Pick which frames belong in your storyboard.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {coverageShots.map((shot) => (
                        <div
                          key={shot.request_id + shot.plan.id}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 cursor-pointer hover:border-slate-500 transition-colors"
                          onClick={() => handleOpenCoverageShot(shot)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.image_url}
                            alt={shot.plan.label}
                            className="w-full h-32 object-cover rounded-md border border-slate-700"
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold">
                              Shot {shot.plan.id}: {shot.plan.label}
                            </span>
                            <button
                              className="px-2 py-0.5 rounded-full border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddCoverageShotToStoryboard(shot);
                              }}
                            >
                              + Storyboard
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-100 line-clamp-3">
                            {shot.plan.description}
                          </div>
                          <p className="text-[9px] text-slate-500 break-all">
                            request_id: {shot.request_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coverage shot overlay */}
                {selectedCoverageShot && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="bg-slate-950 border border-slate-700 rounded-xl max-w-5xl w-full mx-4 p-4 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                          Coverage shot {selectedCoverageShot.plan.id}:{" "}
                          <span className="font-semibold text-slate-200">
                            {selectedCoverageShot.plan.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleAddCoverageShotToStoryboard(
                                selectedCoverageShot
                              )
                            }
                            className="text-[10px] px-3 py-1 rounded-full border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
                          >
                            Add to storyboard
                          </button>
                          <button
                            onClick={() =>
                              setShowCoverageJson((prev) => !prev)
                            }
                            className="text-[10px] px-3 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                          >
                            {showCoverageJson ? "Hide JSON" : "Show JSON"}
                          </button>
                          <button
                            onClick={handleCloseCoverageShot}
                            className="text-xs px-3 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedCoverageShot.image_url}
                            alt={selectedCoverageShot.plan.label}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900"
                          />
                          <p className="text-[10px] text-slate-500 break-all">
                            request_id: {selectedCoverageShot.request_id}
                          </p>
                          {showCoverageJson && (
                            <pre className="text-[10px] bg-slate-900 border border-slate-800 rounded-md p-2 max-h-60 overflow-auto mt-2">
                              {JSON.stringify(
                                selectedCoverageShot.structured_prompt,
                                null,
                                2
                              )}
                            </pre>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                              Shot description
                            </h3>
                            <p className="text-xs bg-slate-900 border border-slate-800 rounded-md p-3">
                              {selectedCoverageShot.plan.description}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                              Coverage plan
                            </h3>
                            <div className="bg-slate-900 border border-slate-800 rounded-md p-3 text-xs text-slate-200 space-y-1">
                              {selectedCoverageShot.plan.shot_type && (
                                <div>
                                  <span className="font-semibold">Type: </span>
                                  {selectedCoverageShot.plan.shot_type}
                                </div>
                              )}
                              {selectedCoverageShot.plan.framing && (
                                <div>
                                  <span className="font-semibold">
                                    Framing:{" "}
                                  </span>
                                  {selectedCoverageShot.plan.framing}
                                </div>
                              )}
                              {selectedCoverageShot.plan.camera_angle && (
                                <div>
                                  <span className="font-semibold">Angle: </span>
                                  {selectedCoverageShot.plan.camera_angle}
                                </div>
                              )}
                              {selectedCoverageShot.plan.lens && (
                                <div>
                                  <span className="font-semibold">Lens: </span>
                                  {selectedCoverageShot.plan.lens}
                                </div>
                              )}
                              {selectedCoverageShot.plan.lighting && (
                                <div>
                                  <span className="font-semibold">
                                    Lighting:{" "}
                                  </span>
                                  {selectedCoverageShot.plan.lighting}
                                </div>
                              )}
                              {selectedCoverageShot.plan.purpose && (
                                <div>
                                  <span className="font-semibold">
                                    Purpose:{" "}
                                  </span>
                                  {selectedCoverageShot.plan.purpose}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                              Shot metadata (from FIBO)
                            </h3>
                            <div className="bg-slate-900 border border-slate-800 rounded-md p-3">
                              {renderShotMetadata(
                                selectedCoverageShot.structured_prompt
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Storyboards Tab */}
        {activeTab === "storyboards" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Storyboards</h2>
                <p className="text-xs text-slate-400">
                  Pick a project to review frames. Tune camera &amp; lighting
                  directly in the storyboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Projects list */}
              <aside className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Storyboards
                  </h3>
                  <button
                    className="text-[10px] px-2 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                    onClick={() => {
                      const p = createProject("Untitled storyboard");
                      setStoryboardsViewProjectId(p.id);
                    }}
                  >
                    + New
                  </button>
                </div>
                {projects.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No storyboard yet. Create one or add shots from Coverage.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className={`w-full text-xs rounded-md px-2 py-2 border cursor-pointer ${
                          storyboardsViewProjectId === p.id
                            ? "border-emerald-500 bg-slate-950"
                            : "border-slate-700 bg-slate-950 hover:border-slate-500"
                        }`}
                        onClick={() => setStoryboardsViewProjectId(p.id)}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <input
                            value={p.name}
                            onChange={(e) =>
                              setProjects((prev) =>
                                prev.map((proj) =>
                                  proj.id === p.id
                                    ? { ...proj, name: e.target.value }
                                    : proj
                                )
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent flex-1 text-slate-100 border-b border-slate-600 focus:outline-none text-[11px] px-1 pb-[1px]"
                          />

                          <span className="text-[10px] text-slate-400">
                            {p.shots.length}
                          </span>

                          <button
                            className="text-[10px] px-2 py-1 rounded-full border border-red-600 text-red-300 hover:bg-red-600/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              const ok = confirm(
                                `Delete storyboard "${p.name}"? This cannot be undone.`
                              );
                              if (ok) deleteProject(p.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>

              {/* Project details */}
              <div className="md:col-span-3 space-y-4">
                {!storyboardsViewProject && (
                  <p className="text-xs text-slate-500">
                    Select a storyboard to view its shots.
                  </p>
                )}

                {storyboardsViewProject && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">
                          {storyboardsViewProject.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {storyboardsViewProject.shots.length} shots in this
                          storyboard.
                        </p>
                      </div>
                    </div>

                    {storyboardsViewProject.shots.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No shots yet. Add from Coverage or Shot Director.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {storyboardsViewProject.shots.map((shot, idx) => (
                          <div
                            key={shot.id}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col gap-2 cursor-pointer hover:border-slate-500 transition-colors"
                            onClick={() => handleOpenStoryboardShot(shot)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={shot.image_url}
                              alt={`Storyboard shot ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-md border border-slate-700"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Shot {idx + 1}</span>
                              <button
                                className="px-2 py-0.5 rounded-full border border-slate-600 hover:bg-slate-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeShotFromProject(
                                    storyboardsViewProject.id,
                                    shot.id
                                  );
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-100 line-clamp-3">
                              {shot.shot_prompt}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Storyboard shot overlay with tuning */}
            {storyboardsViewProject && selectedStoryboardShot && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                <div className="bg-slate-950 border border-slate-700 rounded-xl max-w-5xl w-full mx-4 p-4 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Storyboard shot
                    </div>
                    <button
                      onClick={handleCloseStoryboardShotOverlay}
                      className="text-xs px-3 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedStoryboardShot.image_url}
                        alt="Storyboard shot enlarged"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900"
                      />
                      <p className="text-[10px] text-slate-500 break-all">
                        request_id: {selectedStoryboardShot.request_id}
                      </p>
                      {sbShowJson && (
                        <pre className="text-[10px] bg-slate-900 border border-slate-800 rounded-md p-2 max-h-60 overflow-auto mt-2">
                          {JSON.stringify(
                            selectedStoryboardShot.structured_prompt,
                            null,
                            2
                          )}
                        </pre>
                      )}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                          Shot description
                        </h3>
                        <p className="bg-slate-900 border border-slate-800 rounded-md p-3">
                          {selectedStoryboardShot.shot_prompt}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                          Tweak camera &amp; look
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 rounded-md p-3 space-y-2">
                          <div className="space-y-1">
                            <label className="block font-medium">
                              Camera angle
                            </label>
                            <select
                              value={sbControlAngle}
                              onChange={(e) => setSbControlAngle(e.target.value)}
                              className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                            >
                              <option value="">Keep current</option>
                              <option value="eye-level">Eye-level</option>
                              <option value="low-angle">Low angle</option>
                              <option value="high-angle">High angle</option>
                              <option value="top-down">Top-down</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block font-medium">
                              Lens (focal length)
                            </label>
                            <select
                              value={sbControlLens}
                              onChange={(e) => setSbControlLens(e.target.value)}
                              className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                            >
                              <option value="">Keep current</option>
                              <option value="24mm wide-angle">
                                24mm wide-angle
                              </option>
                              <option value="35mm">35mm</option>
                              <option value="50mm">50mm</option>
                              <option value="85mm close-up">
                                85mm close-up
                              </option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block font-medium">
                              Mood / atmosphere
                            </label>
                            <select
                              value={sbControlMood}
                              onChange={(e) => setSbControlMood(e.target.value)}
                              className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                            >
                              <option value="">Keep current</option>
                              <option value="serene and cozy">
                                Serene &amp; cozy
                              </option>
                              <option value="dramatic and tense">
                                Dramatic &amp; tense
                              </option>
                              <option value="bright and energetic">
                                Bright &amp; energetic
                              </option>
                              <option value="melancholic and quiet">
                                Melancholic &amp; quiet
                              </option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block font-medium">
                              Color scheme
                            </label>
                            <select
                              value={sbControlColor}
                              onChange={(e) =>
                                setSbControlColor(e.target.value)
                              }
                              className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-1"
                            >
                              <option value="">Keep current</option>
                              <option value="warm, golden tones">
                                Warm, golden tones
                              </option>
                              <option value="cool, bluish tones">
                                Cool, bluish tones
                              </option>
                              <option value="neutral, soft grays and beiges">
                                Neutral, soft grays &amp; beiges
                              </option>
                              <option value="high-contrast, deep shadows">
                                High contrast, deep shadows
                              </option>
                            </select>
                          </div>

                          {sbTuneError && (
                            <div className="text-red-400 text-xs">
                              Error: {sbTuneError}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <button
                              onClick={handleStoryboardTuneShot}
                              disabled={sbTuneLoading}
                              className="px-3 py-1 rounded-md bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-xs font-medium"
                            >
                              {sbTuneLoading
                                ? "Regenerating..."
                                : "Apply & regenerate shot"}
                            </button>
                            <button
                              onClick={() => setSbShowJson((v) => !v)}
                              className="text-[10px] px-2 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                            >
                              {sbShowJson ? "Hide JSON" : "Show JSON"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                          Shot metadata (from FIBO)
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 rounded-md p-3">
                          {renderShotMetadata(
                            selectedStoryboardShot.structured_prompt
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Playground */}
        {activeTab === "playground" && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">FIBO Playground</h2>
              <p className="text-xs text-slate-400">
                Directly send prompts to Bria FIBO and inspect its structured
                output.
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-28 rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={handlePlaygroundGenerate}
                disabled={playgroundLoading}
                className="px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-sm font-medium"
              >
                {playgroundLoading ? "Generating..." : "Generate with FIBO"}
              </button>
              {playgroundError && (
                <div className="mt-2 text-xs text-red-400">
                  Error: {playgroundError}
                </div>
              )}
            </div>

            {playgroundData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Image
                  </h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={playgroundData.image_url}
                    alt="FIBO output"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900"
                  />
                  <p className="text-[10px] text-slate-500 break-all">
                    request_id: {playgroundData.request_id}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                      Structured prompt (JSON)
                    </h3>
                    <button
                      onClick={() => setShowPlaygroundJson((v) => !v)}
                      className="text-[10px] px-2 py-1 rounded-full border border-slate-600 hover:bg-slate-800"
                    >
                      {showPlaygroundJson ? "Hide JSON" : "Show JSON"}
                    </button>
                  </div>
                  {showPlaygroundJson && (
                    <pre className="text-xs bg-slate-900 border border-slate-800 rounded-md p-3 max-h-96 overflow-auto">
                      {JSON.stringify(
                        playgroundData.structured_prompt,
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
