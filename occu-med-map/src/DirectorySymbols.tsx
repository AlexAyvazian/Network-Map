import { useId } from "react";

export type DirectorySymbolName =
  | "us-providers-facilities"
  | "vaccines"
  | "international-providers-facilities"
  | "us-faa-examiners"
  | "dot-examiners"
  | "audiology"
  | "imaging"
  | "labs"
  | "dentists"
  | "urgent-cares"
  | "occupational-health-clinics"
  | "specialists";

type Props = {
  name: DirectorySymbolName;
  className?: string;
};

export function DirectorySymbol({ name, className }: Props) {
  const rawId = useId().replace(/:/g, "");
  const silver = "directory-silver-" + rawId;
  const glow = "directory-glow-" + rawId;

  const common = {
    fill: "none",
    stroke: "url(#" + silver + ")",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const art = (() => {
    switch (name) {
      case "us-providers-facilities":
        return (
          <>
            <path
              {...common}
              d="M13 20 18 15l5 1 4-4 6 1 4-3 5 2 5-4 6 4 3 7-4 4 1 5-5 2-2 7-6-1-4 5-6-2-4 4-5-4-6 1-3-5-7-1-2-5-5-2 1-5-4-3 2-6 5-1Z"
            />
            <path {...common} d="M36 19c-5.1 0-9.2 4.1-9.2 9.2 0 7.2 9.2 15.6 9.2 15.6s9.2-8.4 9.2-15.6C45.2 23.1 41.1 19 36 19Z" />
            <circle cx="36" cy="28.2" r="3.2" fill={"url(#" + silver + ")"} />
          </>
        );
      case "vaccines":
        return (
          <>
            <path {...common} d="m23 15 26 26M28 10l5 5M45 27l5 5M19 19l8-8 26 26-8 8Z" />
            <path {...common} d="m17 43 9 9M13 47l4 4M27 37l11-11M39 25l4-4M15 49l-5 5" />
            <path {...common} d="M39 13h11M44.5 7.5v11" />
          </>
        );
      case "international-providers-facilities":
        return (
          <>
            <circle {...common} cx="32" cy="32" r="22" />
            <path {...common} d="M10 32h44M32 10c7 6.7 10.5 14 10.5 22S39 47.3 32 54c-7-6.7-10.5-14-10.5-22S25 16.7 32 10Z" />
            <path {...common} d="M15 21h34M15 43h34" />
          </>
        );
      case "us-faa-examiners":
        return (
          <>
            <path {...common} d="m10 36 17-8 5-18 5 1-1 17 16-8 3 4-18 14-1 15-5 1-4-14-11 4Z" />
            <path {...common} d="M12 50h14" />
            <path {...common} d="m47 43 3 3 6-7" />
          </>
        );
      case "dot-examiners":
        return (
          <>
            <path {...common} d="M11 19h30v25H11Z" />
            <path {...common} d="M41 27h8l6 8v9H41Z" />
            <circle cx="21" cy="47" r="5" fill={"url(#" + silver + ")"} />
            <circle cx="48" cy="47" r="5" fill={"url(#" + silver + ")"} />
            <path {...common} d="M16 28h14M16 34h20" />
          </>
        );
      case "audiology":
        return (
          <>
            <path {...common} d="M36 51c-4.5 0-8-3.1-8-7.2 0-3.6 2.2-5.5 5.3-7.5 3.4-2.1 5.7-4.3 5.7-8.4 0-5.2-3.8-8.9-8.8-8.9-5.8 0-9.5 4.2-9.5 9.8" />
            <path {...common} d="M33 43c0-2.8 1.7-4.1 4.4-5.8 4.8-3 7.6-6.4 7.6-12.1C45 16.2 38.7 10 30.3 10 21 10 15 16.9 15 26" />
            <path {...common} d="M49 20c2 2 3 4.5 3 7.4M52 13c4 4 6 9 6 14.4" />
          </>
        );
      case "imaging":
        return (
          <>
            <path {...common} d="M13 23V13h10M41 13h10v10M51 41v10H41M23 51H13V41" />
            <circle {...common} cx="32" cy="32" r="10" />
            <path {...common} d="M19 32h26M32 19v26" opacity=".75" />
          </>
        );
      case "labs":
        return (
          <>
            <path {...common} d="M24 10h16M27 10v13L16 46c-1.5 3.2.8 7 4.3 7h23.4c3.5 0 5.8-3.8 4.3-7L37 23V10" />
            <path {...common} d="M21 39h22" />
            <path {...common} d="M25 34c3 2 5 2 8 0s5-2 8 0" />
          </>
        );
      case "dentists":
        return (
          <path {...common} d="M20 13c5-2 8 1 12 1s7-3 12-1c7 3 9 11 6 19-2 6-4 10-6 16-1.5 4-3 7-6 7-4 0-3-7-4-12-.7-4-1.1-7-2-7s-1.3 3-2 7c-1 5 0 12-4 12-3 0-4.5-3-6-7-2-6-4-10-6-16-3-8-1-16 6-19Z" />
        );
      case "urgent-cares":
        return (
          <>
            <path {...common} d="M12 34h11l4-9 8 18 5-9h12" />
            <path {...common} d="M32 55S11 44 11 27c0-8 5-14 13-14 4.8 0 7.1 2.2 8 4 1-1.8 3.2-4 8-4 8 0 13 6 13 14 0 17-21 28-21 28Z" opacity=".9" />
          </>
        );
      case "occupational-health-clinics":
        return (
          <>
            <path {...common} d="M13 52V23h14V12h10v11h14v29Z" />
            <path {...common} d="M28 23h8M32 19v8" />
            <path {...common} d="M20 32h6M20 39h6M38 32h6M38 39h6" />
            <path {...common} d="M28 52V42h8v10" />
          </>
        );
      case "specialists":
        return (
          <>
            <path {...common} d="M32 8v48M8 32h48M15 15l34 34M49 15 15 49" opacity=".75" />
            <circle cx="32" cy="32" r="13" fill="rgba(255,255,255,.04)" stroke={"url(#" + silver + ")"} strokeWidth="2.25" />
            <path {...common} d="M26 32h12M32 26v12" />
          </>
        );
    }
  })();

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      focusable="false"
      style={{ filter: "url(#" + glow + ")" }}
    >
      <defs>
        <linearGradient id={silver} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".36" stopColor="#edf5ff" />
          <stop offset=".72" stopColor="#b9c9dd" />
          <stop offset="1" stopColor="#f8fbff" />
        </linearGradient>
        <filter id={glow} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="1.15" result="softGlow" />
          <feColorMatrix
            in="softGlow"
            type="matrix"
            values="0 0 0 0 0.72  0 0 0 0 0.84  0 0 0 0 1  0 0 0 .55 0"
            result="blueGlow"
          />
          <feMerge>
            <feMergeNode in="blueGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {art}
    </svg>
  );
}

export default DirectorySymbol;
