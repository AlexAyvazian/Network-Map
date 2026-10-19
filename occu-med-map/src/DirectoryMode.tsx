import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";
import {
  Ear,
  FlaskConical,
  Globe2,
  HeartPulse,
  Hospital,
  MapPinned,
  Plane,
  ScanLine,
  Search,
  Stethoscope,
  Syringe,
  Truck,
  X,
} from "lucide-react";
import "./directory-mode.css";

type DirectoryCategory = {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

function ToothIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.1 3.4c1.8-.8 3.2.2 4.9.2s3.1-1 4.9-.2c2.6 1.2 3.4 4.4 2.4 7.6-.7 2.4-1.7 4-2.6 6.4-.6 1.7-1.2 3.2-2.3 3.2-1.4 0-1.2-2.4-1.5-4.3-.2-1.5-.4-2.7-.9-2.7s-.7 1.2-.9 2.7c-.3 1.9-.1 4.3-1.5 4.3-1.1 0-1.7-1.5-2.3-3.2-.9-2.4-1.9-4-2.6-6.4-1-3.2-.2-6.4 2.4-7.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CATEGORIES: DirectoryCategory[] = [
  { id: "us-providers-facilities", label: "U.S. Providers & Facilities", Icon: MapPinned },
  { id: "vaccines", label: "Vaccines", Icon: Syringe },
  { id: "international-providers-facilities", label: "International Providers & Facilities", Icon: Globe2 },
  { id: "us-faa-examiners", label: "U.S. FAA Examiners", Icon: Plane },
  { id: "dot-examiners", label: "DOT Examiners", Icon: Truck },
  { id: "audiology", label: "Audiology", Icon: Ear },
  { id: "imaging", label: "Imaging", Icon: ScanLine },
  { id: "labs", label: "Labs", Icon: FlaskConical },
  { id: "dentists", label: "Dentists", Icon: ToothIcon },
  { id: "urgent-cares", label: "Urgent Cares", Icon: HeartPulse },
  { id: "occupational-health-clinics", label: "Occupational Health Clinics", Icon: Hospital },
  { id: "specialists", label: "Specialists", Icon: Stethoscope },
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
  const [query, setQuery] = useState("");
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

    // Load and play transition media only after the Directory button is clicked.
    // This keeps browser acceptance from opening/cancelling media requests during idle page load.
    void audio?.play().catch(() => {
      // The visual transition still runs if sound playback is blocked.
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

  const categoryCount = useMemo(() => CATEGORIES.length, []);

  const submitSearch = () => {
    const value = query.trim();
    if (!value) return;
    window.dispatchEvent(
      new CustomEvent("network-map:directory-search", {
        detail: { query: value, scope: "all-records" },
      }),
    );
  };

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
        <audio
          ref={transitionAudioRef}
          preload="none"
          aria-hidden="true"
        />
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
            <p>Search all saved records or open a provider directory.</p>
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

        <div className="directory-search-glass">
          <Search size={21} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitSearch();
            }}
            placeholder="Search all records"
            aria-label="Search all directory records"
          />
          <button type="button" onClick={submitSearch} disabled={!query.trim()}>
            Search All Records
          </button>
        </div>

        <div className="directory-category-heading">
          <div>
            <strong>Provider Directories</strong>
            <span>{categoryCount} main categories</span>
          </div>
        </div>

        <div className="directory-category-grid">
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              className="directory-category-card"
              data-directory-category={id}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("network-map:directory-category", {
                    detail: { id, label },
                  }),
                )
              }
            >
              <span className="directory-category-icon" aria-hidden="true">
                <Icon className="directory-category-svg" />
              </span>
              <span className="directory-category-label">{label}</span>
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
