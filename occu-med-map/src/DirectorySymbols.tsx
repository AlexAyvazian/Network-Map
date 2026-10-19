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
  const metal = "directory-metal-" + rawId;
  const edge = "directory-edge-" + rawId;
  const gloss = "directory-gloss-" + rawId;
  const glow = "directory-glow-" + rawId;

  const stroke = {
    fill: "none",
    stroke: "url(#" + edge + ")",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const art = (() => {
    switch (name) {
      case "us-providers-facilities":
        return (
          <>
            <path
              d="M8 24 13 18l7 1 4-4 8 2 4-4 7 2 6-5 7 5-2 8 3 4-5 5-2 8-7-1-5 6-7-2-5 4-5-4-6 1-4-6-6-1-3-6-5-2 1-6-4-3 3-6 5-1Z"
              fill={"url(#" + metal + ")"}
              stroke={"url(#" + edge + ")"}
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M37 19c-5.5 0-10 4.5-10 10 0 7.7 10 16.6 10 16.6S47 36.7 47 29c0-5.5-4.5-10-10-10Z"
              fill={"url(#" + metal + ")"}
              stroke="#f7fbff"
              strokeWidth="1.6"
            />
            <circle cx="37" cy="29" r="3.2" fill="#24354b" stroke="#fff" strokeWidth="1.2" />
          </>
        );

      case "vaccines":
        return (
          <>
            <g transform="rotate(-45 32 32)">
              <rect x="25" y="17" width="14" height="25" rx="3" fill={"url(#" + metal + ")"} stroke={"url(#" + edge + ")"} strokeWidth="1.8" />
              <path d="M27.5 23h9M27.5 28h9M27.5 33h9" stroke="#6e839e" strokeWidth="1.2" strokeLinecap="round" />
              <rect x="23" y="12" width="18" height="6" rx="2.5" fill={"url(#" + metal + ")"} stroke={"url(#" + edge + ")"} strokeWidth="1.6" />
              <rect x="28.5" y="42" width="7" height="8" rx="2" fill={"url(#" + metal + ")"} stroke={"url(#" + edge + ")"} strokeWidth="1.5" />
              <path d="M32 50v8" stroke={"url(#" + edge + ")"} strokeWidth="2.3" strokeLinecap="round" />
            </g>
            <path d="M47 12h9M51.5 7.5v9" {...stroke} strokeWidth="2.4" />
          </>
        );

      case "international-providers-facilities":
        return (
          <>
            <circle cx="32" cy="32" r="22" fill="rgba(255,255,255,.035)" stroke={"url(#" + edge + ")"} strokeWidth="3" />
            <path d="M10 32h44M32 10c7 6.8 10.7 14.2 10.7 22S39 47.2 32 54c-7-6.8-10.7-14.2-10.7-22S25 16.8 32 10Z" {...stroke} />
            <path d="M15 21h34M15 43h34" {...stroke} strokeWidth="2.5" />
          </>
        );

      case "us-faa-examiners":
        return (
          <>
            <path
              d="M8 35.5 27 28l5-19 5 1.2-.8 17.8L53 20l4 4.4-19.8 13.3-1 15.8-5.1 1.1-4.4-14.2-11.7 4.3Z"
              fill={"url(#" + metal + ")"}
              stroke={"url(#" + edge + ")"}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="47" r="8" fill="rgba(9,22,42,.5)" stroke={"url(#" + edge + ")"} strokeWidth="1.6" />
            <path d="m46.3 47 2.4 2.5 5-5.8" {...stroke} strokeWidth="2.2" />
          </>
        );

      case "dot-examiners":
        return (
          <>
            <path d="M9 20h31v24H9Z" fill={"url(#" + metal + ")"} stroke={"url(#" + edge + ")"} strokeWidth="1.7" />
            <path d="M40 28h8.5L56 36v8H40Z" fill={"url(#" + metal + ")"} stroke={"url(#" + edge + ")"} strokeWidth="1.7" />
            <path d="M44 31h4l4 5h-8Z" fill="#2a3e57" opacity=".9" />
            <circle cx="20" cy="47" r="5" fill="#27384d" stroke="#f8fbff" strokeWidth="2" />
            <circle cx="48" cy="47" r="5" fill="#27384d" stroke="#f8fbff" strokeWidth="2" />
            <path d="M14 27h19M14 33h19" stroke="#748aa6" strokeWidth="1.3" strokeLinecap="round" />
          </>
        );

      case "audiology":
        return (
          <>
            <path
              d="M38 50c-6 0-10-4.2-10-9.3 0-4.8 2.8-7.2 6.8-9.7 3.6-2.3 5.7-4.7 5.7-8.8 0-6.1-4.4-10.2-10.5-10.2-7.4 0-12 5.4-12 12.6"
              {...stroke}
            />
            <path
              d="M34 42c0-3 1.9-4.5 4.5-6.1 5.6-3.6 9-7.5 9-14.2C47.5 13 40.6 7 31.2 7 20.4 7 13 14.8 13 25"
              {...stroke}
              strokeWidth="2.5"
            />
            <circle cx="36.5" cy="51" r="3.2" fill={"url(#" + metal + ")"} />
          </>
        );

      case "imaging":
        return (
          <>
            <rect x="11" y="11" width="42" height="42" rx="11" fill="rgba(255,255,255,.035)" stroke={"url(#" + edge + ")"} strokeWidth="2.6" />
            <path d="M18 26V18h8M38 18h8v8M46 38v8h-8M26 46h-8v-8" {...stroke} strokeWidth="2.5" />
            <circle cx="32" cy="32" r="8.5" fill={"url(#" + metal + ")"} opacity=".92" />
            <circle cx="32" cy="32" r="3.5" fill="#26384f" />
          </>
        );

      case "labs":
        return (
          <>
            <path
              d="M23 9h18M27 9v15L16 47c-1.6 3.4.9 7.2 4.6 7.2h22.8c3.7 0 6.2-3.8 4.6-7.2L37 24V9"
              fill={"url(#" + metal + ")"}
              stroke={"url(#" + edge + ")"}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M20 39h24" stroke="#6d86a4" strokeWidth="1.7" />
            <path d="M24 35c3.2 1.8 5.5 1.8 8.4 0 3-1.8 5.2-1.8 8.5 0" stroke="#d9e9fa" strokeWidth="1.4" fill="none" />
          </>
        );

      case "dentists":
        return (
          <path
            d="M20 12c5.1-2.2 8.2 1.2 12 1.2S38.9 9.8 44 12c7.4 3.2 9.3 11.5 6.2 20.2-2.2 6.1-4.2 10.2-6.3 16.3-1.5 4.2-3 7.5-6.1 7.5-4.3 0-3.4-7.3-4.4-12.2-.8-4.2-1.2-7.3-2.4-7.3s-1.6 3.1-2.4 7.3C27.6 48.7 28.5 56 24.2 56c-3.1 0-4.6-3.3-6.1-7.5-2.1-6.1-4.1-10.2-6.3-16.3C8.7 23.5 10.6 15.2 18 12Z"
            fill={"url(#" + metal + ")"}
            stroke={"url(#" + edge + ")"}
            strokeWidth="1.7"
          />
        );

      case "urgent-cares":
        return (
          <>
            <path
              d="M32 55S10 43.6 10 26.7C10 18.5 15.2 12 23.3 12c5.1 0 7.5 2.4 8.7 4.4C33.2 14.4 35.6 12 40.7 12 48.8 12 54 18.5 54 26.7 54 43.6 32 55 32 55Z"
              fill="rgba(255,255,255,.04)"
              stroke={"url(#" + edge + ")"}
              strokeWidth="2.5"
            />
            <path d="M15 33h11l4-9 8 18 5-9h7" {...stroke} strokeWidth="2.8" />
          </>
        );

      case "occupational-health-clinics":
        return (
          <>
            <path d="M12 53V22h15V11h10v11h15v31Z" fill={"url(#" + metal + ")"} stroke={"url(#" + edge + ")"} strokeWidth="1.7" />
            <path d="M28 22h8M32 18v8" stroke="#26364b" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M19 32h6M19 39h6M39 32h6M39 39h6" stroke="#6f849f" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M28 53V42h8v11" fill="#2a3c53" stroke="#f7fbff" strokeWidth="1.2" />
          </>
        );

      case "specialists":
        return (
          <>
            <path
              d="M32 8 37 23l15-5-7 14 13 8-15 2 2 15-13-9-13 9 2-15-15-2 13-8-7-14 15 5Z"
              fill={"url(#" + metal + ")"}
              stroke={"url(#" + edge + ")"}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="32" r="10" fill="#2a3c53" stroke="#f6fbff" strokeWidth="1.4" />
            <path d="M26 32h12M32 26v12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
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
    >
      <defs>
        <linearGradient id={metal} x1="12" y1="8" x2="51" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".2" stopColor="#dce8f5" />
          <stop offset=".48" stopColor="#8297b0" />
          <stop offset=".66" stopColor="#eef5fb" />
          <stop offset="1" stopColor="#a4b5c8" />
        </linearGradient>
        <linearGradient id={edge} x1="8" y1="4" x2="55" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".42" stopColor="#dbe8f4" />
          <stop offset=".76" stopColor="#93a8c0" />
          <stop offset="1" stopColor="#f8fbff" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".86" />
          <stop offset=".55" stopColor="#ffffff" stopOpacity=".08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodColor="#ffffff" floodOpacity=".48" />
          <feDropShadow dx="0" dy="4" stdDeviation="4.2" floodColor="#80bfff" floodOpacity=".34" />
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#07101d" floodOpacity=".48" />
        </filter>
      </defs>

      <g filter={"url(#" + glow + ")"}>
        {art}
      </g>

      <ellipse
        cx="32"
        cy="11"
        rx="18"
        ry="6"
        fill={"url(#" + gloss + ")"}
        opacity=".22"
        pointerEvents="none"
      />
    </svg>
  );
}

export default DirectorySymbol;
