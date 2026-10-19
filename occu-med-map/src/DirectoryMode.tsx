import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import GlassCard from "./components/smoothui/GlassCard";
import DirectorySymbol, { type DirectorySymbolName } from "./DirectorySymbols";
import "./directory-mode.css";

type DirectoryCategory = {
  id: DirectorySymbolName;
  label: string;
};

const CATEGORIES: DirectoryCategory[] = [
  { id: "us-providers-facilities", label: "U.S. Providers & Facilities" },
  { id: "vaccines", label: "Vaccines" },
  { id: "international-providers-facilities", label: "International Providers & Facilities" },
  { id: "us-faa-examiners", label: "U.S. FAA Examiners" },
  { id: "dot-examiners", label: "DOT Examiners" },
  { id: "audiology", label: "Audiology" },
  { id: "imaging", label: "Imaging" },
  { id: "labs", label: "Labs" },
  { id: "dentists", label: "Dentists" },
  { id: "urgent-cares", label: "Urgent Cares" },
  { id: "occupational-health-clinics", label: "Occupational Health Clinics" },
  { id: "specialists", label: "Specialists" },
];

function syncDimensionToggle(directoryOpen: boolean) {
  const control = document.querySelector<HTMLElement>(".map-dimension-toggle");
  if (!control) return;

  const directoryButton = control.querySelector<HTMLButtonElement>("button[data-directory-mode]");
  const mapButtons = Array.from(control.querySelectorAll<HTMLButtonElement>("button[data-map-mode]"));
  const mapMode = window.__NETWORK_MAP_GLOBE__?.getMode?.() || "2d";

  directoryButton?.classList.toggle("active", directoryOpen);
  directoryButton?.setAttribute("aria-pressed", directoryOpen ? "true" : "false");

  for (const button of mapButtons) {
    const selected = !directoryOpen && button.dataset.mapMode === mapMode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }

  control.classList.toggle("directory-selected", directoryOpen);
}

export function DirectoryMode() {
  const [phase, setPhase] = useState<"closed" | "entering" | "open">("closed");
  const transitionVideoRef = useRef<HTMLVideoElement>(null);
  const transitionAudioRef = useRef<HTMLAudioElement>(null);
  const open = phase === "open";
  const transitioning = phase === "entering";

  const finishEnter = useCallback(() => {
    const audio = transitionAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPhase("open");
  }, []);

  const beginEnter = useCallback(() => {
    const video = transitionVideoRef.current;
    const audio = transitionAudioRef.current;

    setPhase("entering");
    syncDimensionToggle(true);

    if (video) {
      video.pause();
      video.src = "/218489.mp4";
      video.load();
      video.currentTime = 0;
    }
    if (audio) {
      audio.pause();
      audio.src = "/ES_Magic, Spell, Holy Magic, Ethereal, Incantation, Cast - Epidemic Sound (1).mp3";
      audio.load();
      audio.currentTime = 0;
      audio.volume = 0.78;
    }

    void audio?.play().catch(() => {
      // The transition remains usable if a browser blocks audio playback.
    });

    const playback = video?.play();
    if (playback) {
      void playback.catch(() => finishEnter());
    } else {
      finishEnter();
    }
  }, [finishEnter]);

  const closeDirectory = useCallback(() => {
    const video = transitionVideoRef.current;
    const audio = transitionAudioRef.current;
    video?.pause();
    audio?.pause();

    if (video) {
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load();
    }
    if (audio) {
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }

    setPhase("closed");
  }, []);

  useEffect(() => {
    window.addEventListener("network-map:directory-open", beginEnter);
    window.addEventListener("network-map:directory-close", closeDirectory);
    return () => {
      window.removeEventListener("network-map:directory-open", beginEnter);
      window.removeEventListener("network-map:directory-close", closeDirectory);
    };
  }, [beginEnter, closeDirectory]);

  useEffect(() => {
    const active = phase !== "closed";
    document.body.classList.toggle("directory-mode-open", open);
    document.body.classList.toggle("directory-mode-transitioning", transitioning);
    syncDimensionToggle(active);

    return () => {
      document.body.classList.remove("directory-mode-open", "directory-mode-transitioning");
    };
  }, [open, phase, transitioning]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        window.dispatchEvent(new CustomEvent("network-map:directory-close"));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div
        className={`directory-transition${transitioning ? " is-active" : ""}`}
        aria-hidden={!transitioning}
      >
        <video
          ref={transitionVideoRef}
          className="directory-transition-video"
          muted
          playsInline
          preload="none"
          onEnded={finishEnter}
          onError={finishEnter}
          aria-hidden="true"
        />
        <audio ref={transitionAudioRef} preload="none" aria-hidden="true" />
      </div>

      {open && (
        <section className="directory-mode" aria-label="Provider directory">
          <video
            className="directory-wallpaper"
            src="/5200-183786525.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <div className="directory-wallpaper-tone" aria-hidden="true" />
          <div className="directory-wallpaper-vignette" aria-hidden="true" />

          <div className="directory-shell">
            <header className="directory-header">
              <div>
                <span className="directory-eyebrow">OCCU-MED NETWORK MANAGEMENT</span>
                <h1>Directory</h1>
                <p>Choose a directory to browse.</p>
              </div>
              <button
                type="button"
                className="directory-back-button"
                onClick={() => window.dispatchEvent(new CustomEvent("network-map:directory-close"))}
              >
                <X size={17} aria-hidden="true" />
                Back to Map
              </button>
            </header>

            <div className="directory-category-heading">
              <div>
                <strong>Provider Directories</strong>
                <span>{CATEGORIES.length} main categories</span>
              </div>
            </div>

            <div className="directory-category-grid">
              {CATEGORIES.map(({ id, label }) => (
                <button
                  type="button"
                  key={id}
                  className="directory-category-button-shell"
                  data-directory-category={id}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("network-map:directory-category", {
                        detail: { id, label },
                      }),
                    )
                  }
                >
                  <GlassCard
                    className="directory-category-glass"
                    blur={13}
                    radius={28}
                    refraction={25}
                    rimWidth={11}
                    tint="rgba(8, 27, 53, 0.16)"
                  >
                    <div className="directory-category-card">
                      <DirectorySymbol name={id} className="directory-category-symbol" />
                      <span className="directory-category-label">{label}</span>
                    </div>
                  </GlassCard>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default DirectoryMode;
