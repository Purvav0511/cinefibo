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

type Tab = "director" | "playground";

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

  // ----- Shot Controls (derived from JSON, editable) -----
  const [controlAngle, setControlAngle] = useState<string>("");
  const [controlLens, setControlLens] = useState<string>("");
  const [controlMood, setControlMood] = useState<string>("");
  const [controlColor, setControlColor] = useState<string>("");

  const [tuneLoading, setTuneLoading] = useState(false);
  const [tuneError, setTuneError] = useState<string | null>(null);
  const [showShotJson, setShowShotJson] = useState(false);

  // ----- Storyboard -----
  const [storyboard, setStoryboard] = useState<StoryboardShot[]>([]);
  const [selectedStoryboardShot, setSelectedStoryboardShot] =
    useState<StoryboardShot | null>(null);

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
        const text = await res.text();
        throw new Error(`Backend error (${res.status}): ${text}`);
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
        const text = await res.text();
        throw new Error(`Backend error (${res.status}): ${text}`);
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
        const text = await res.text();
        throw new Error(`Backend error (${res.status}): ${text}`);
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

  // Storyboard handlers
  const handleAddToStoryboard = () => {
    if (!shotData) return;

    const id = `${shotData.request_id}-${Date.now()}`;

    setStoryboard((prev) => [
      ...prev,
      {
        id,
        shot_prompt: shotData.shot_prompt,
        image_url: shotData.image_url,
        structured_prompt: shotData.structured_prompt,
        request_id: shotData.request_id,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleClearStoryboard = () => {
    setStoryboard([]);
    setSelectedStoryboardShot(null);
  };

  const handleRemoveStoryboardShot = (id: string) => {
    setStoryboard((prev) => prev.filter((s) => s.id !== id));
    setSelectedStoryboardShot((prev) =>
      prev && prev.id === id ? null : prev
    );
  };

  const handleOpenStoryboardShot = (shot: StoryboardShot) => {
    setSelectedStoryboardShot(shot);
  };

  const handleCloseStoryboardShot = () => {
    setSelectedStoryboardShot(null);
  };

  // ========== RENDER HELPERS ==========

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

  // ========== MAIN RENDER ==========

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center">
      <div className="w-full max-w-6xl px-6 py-4 space-y-6">
        {/* Top nav / header */}
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

        {/* Tabs */}
        {activeTab === "director" && (
          <section className="space-y-8">
            {/* Shot Director input */}
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

            {/* Shot Director result */}
            {shotData && (
              <>
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

                  {/* RIGHT: Controls + JSON toggle below */}
                  <div className="space-y-4 lg:col-span-1">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                        Shot controls
                      </h3>
                      <div className="bg-slate-900 border border-slate-800 rounded-md p-3 space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="block font-medium">
                            Camera angle
                          </label>
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
                          <label className="block font-medium">
                            Color scheme
                          </label>
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
                          onClick={handleAddToStoryboard}
                          disabled={!shotData}
                          className="mt-1 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-xs font-medium w-full"
                        >
                          Add shot to storyboard
                        </button>
                      </div>
                    </div>

                    {/* JSON toggle directly below controls */}
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

                {/* Storyboard */}
                {storyboard.length > 0 && (
                  <section className="pt-8 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Storyboard</h2>
                      <button
                        onClick={handleClearStoryboard}
                        className="text-xs px-3 py-1 rounded-md border border-slate-600 hover:bg-slate-800"
                      >
                        Clear storyboard
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      A sequence of saved frames from this scene, with camera
                      choices baked in.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {storyboard.map((shot, idx) => {
                        const sp = shot.structured_prompt || {};
                        const photo = sp.photographic_characteristics || {};
                        const aesthetics = sp.aesthetics || {};

                        return (
                          <div
                            key={shot.id}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col gap-2 cursor-pointer hover:border-slate-500 transition-colors"
                            onClick={() => handleOpenStoryboardShot(shot)}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>Shot {idx + 1}</span>
                              <button
                                className="px-2 py-0.5 rounded-full border border-slate-600 hover:bg-slate-800 text-[10px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveStoryboardShot(shot.id);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={shot.image_url}
                              alt={`Storyboard shot ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-md border border-slate-700"
                            />
                            <div className="text-[10px] text-slate-400 flex justify-between">
                              <span className="truncate max-w-[60%]">
                                {new Date(
                                  shot.createdAt
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-100 line-clamp-3">
                              {shot.shot_prompt}
                            </div>
                            <div className="text-[10px] text-slate-300 space-y-1">
                              {photo.camera_angle && (
                                <div>
                                  <span className="font-semibold">
                                    Angle:{" "}
                                  </span>
                                  {photo.camera_angle}
                                </div>
                              )}
                              {photo.lens_focal_length && (
                                <div>
                                  <span className="font-semibold">
                                    Lens:{" "}
                                  </span>
                                  {photo.lens_focal_length}
                                </div>
                              )}
                              {aesthetics.mood_atmosphere && (
                                <div>
                                  <span className="font-semibold">
                                    Mood:{" "}
                                  </span>
                                  {aesthetics.mood_atmosphere}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Expanded storyboard shot (overlay) */}
                {selectedStoryboardShot && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                    <div className="bg-slate-950 border border-slate-700 rounded-xl max-w-4xl w-full mx-4 p-4 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400">
                          Storyboard shot
                        </div>
                        <button
                          onClick={handleCloseStoryboardShot}
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
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                              Shot prompt
                            </h3>
                            <p className="text-xs bg-slate-900 border border-slate-800 rounded-md p-3">
                              {selectedStoryboardShot.shot_prompt}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
                              Shot metadata
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
              </>
            )}
          </section>
        )}

        {activeTab === "playground" && (
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">FIBO Playground</h2>
              <p className="text-xs text-slate-400">
                Directly send prompts to Bria FIBO and inspect its structured
                output. Useful for testing and debugging.
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
