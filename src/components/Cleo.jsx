// ─── Cleo — Clasloop's official mascot ─────────────────────────────────────
// Redesign (cleaner): a friendly, self-contained character — a soft rounded
// blue body, a small gold 3-point crown, big bright eyes, blush cheeks and a
// gentle "w" smile. Flat fills + one consistent outline weight, so she reads
// crisp at any size and sits nicely as a small brand accent (e.g. peeking by
// the "Got a code?" dialog).
//
// Self-contained and centered in a 100×100 viewBox (no occlusion tricks), so
// she can be dropped anywhere. Height scales 1:1 with `size`.
//
// Usage:
//   <Cleo />            // 96px default
//   <Cleo size={120} /> // any size
import { useId } from "react";

export default function Cleo({ size = 96, className = "", style = {}, title = "Cleo" }) {
  // Unique gradient ids per instance so multiple Cleos don't share/clip a def.
  const uid = useId().replace(/:/g, "");
  const bodyGrad = `cleo-body-${uid}`;
  const crownGrad = `cleo-crown-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9AD6F7" />
          <stop offset="1" stopColor="#5BA8DE" />
        </linearGradient>
        <linearGradient id={crownGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD968" />
          <stop offset="1" stopColor="#F4B53C" />
        </linearGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="50" cy="90" rx="24" ry="4.5" fill="#20425E" opacity="0.12" />

      {/* ── Arms (behind body) ── */}
      {/* left arm, raised in a little wave */}
      <path d="M27 60 Q15 56 12 46" fill="none" stroke="#4E97CE" strokeWidth="6" strokeLinecap="round" />
      <circle cx="12" cy="45" r="5" fill="#9AD6F7" stroke="#20425E" strokeWidth="2.5" />
      {/* right arm, resting */}
      <path d="M73 64 Q85 66 88 74" fill="none" stroke="#4E97CE" strokeWidth="6" strokeLinecap="round" />
      <circle cx="88" cy="75" r="5" fill="#9AD6F7" stroke="#20425E" strokeWidth="2.5" />

      {/* ── Crown ── */}
      <g>
        <path
          d="M35 33 L41 23 L50 30 L59 23 L65 33 Z"
          fill={`url(#${crownGrad})`}
          stroke="#20425E"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="41" cy="22" r="2.2" fill="#FFE8A3" stroke="#20425E" strokeWidth="1.4" />
        <circle cx="59" cy="22" r="2.2" fill="#FFE8A3" stroke="#20425E" strokeWidth="1.4" />
        <circle cx="50" cy="29" r="2.2" fill="#FFE8A3" stroke="#20425E" strokeWidth="1.4" />
      </g>

      {/* ── Body ── */}
      <path
        d="M50 34
           C68 34 80 47 80 62
           C80 78 67 86 50 86
           C33 86 20 78 20 62
           C20 47 32 34 50 34 Z"
        fill={`url(#${bodyGrad})`}
        stroke="#20425E"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* soft highlight */}
      <ellipse cx="38" cy="48" rx="12" ry="8" fill="#FFFFFF" opacity="0.35" />

      {/* ── Cheeks ── */}
      <ellipse cx="32" cy="64" rx="6" ry="4" fill="#FF9DBE" opacity="0.7" />
      <ellipse cx="68" cy="64" rx="6" ry="4" fill="#FF9DBE" opacity="0.7" />

      {/* ── Eyes ── */}
      <ellipse cx="40" cy="56" rx="5.4" ry="7" fill="#1F3149" />
      <ellipse cx="60" cy="56" rx="5.4" ry="7" fill="#1F3149" />
      {/* highlights */}
      <circle cx="42" cy="53" r="2" fill="#fff" />
      <circle cx="62" cy="53" r="2" fill="#fff" />
      <circle cx="38.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
      <circle cx="58.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />

      {/* ── "w" smile (signature) ── */}
      <path
        d="M44 67 Q47 71.5 50 68 Q53 71.5 56 67"
        fill="none"
        stroke="#1F3149"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
