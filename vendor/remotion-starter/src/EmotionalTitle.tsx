import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const emotionalTitleSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  mood: z.enum(["hopeful", "tense", "melancholic", "triumphant"]),
});

const MOODS: Record<
  string,
  { from: string; to: string; accent: string; ease: number }
> = {
  hopeful: { from: "#0b1e3d", to: "#1c4d8f", accent: "#ffd166", ease: 26 },
  tense: { from: "#1a0b0b", to: "#4d1c1c", accent: "#ff5959", ease: 8 },
  melancholic: { from: "#101418", to: "#2c3a4a", accent: "#9fb4c7", ease: 40 },
  triumphant: { from: "#231403", to: "#7a4b12", accent: "#ffc93c", ease: 14 },
};

/**
 * Kinetic typography title card with mood-driven motion:
 * - hopeful/triumphant: springy rise + glow pulse
 * - tense: fast hard cuts, jitter
 * - melancholic: slow drift, long fades
 */
export const EmotionalTitle: React.FC<z.infer<typeof emotionalTitleSchema>> = ({
  title,
  subtitle,
  mood,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const cfg = MOODS[mood] ?? MOODS.hopeful;

  const rise = spring({ frame, fps, config: { damping: 200, mass: cfg.ease / 10 } });
  const y = interpolate(rise, [0, 1], [80, 0]);
  const opacity = interpolate(frame, [0, 20, durationInFrames - 25, durationInFrames], [0, 1, 1, 0]);
  const letterSpace = interpolate(frame, [0, durationInFrames], [6, mood === "melancholic" ? 14 : 2]);
  const glow = 10 + 6 * Math.sin(frame / 12);

  const jitter = mood === "tense" && frame % 14 < 2 ? (Math.random() - 0.5) * 6 : 0;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${cfg.from}, ${cfg.to})`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Georgia, serif",
        transform: `translateX(${jitter}px)`,
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 700,
          color: "#f5f1e8",
          textShadow: `0 0 ${glow}px ${cfg.accent}`,
          letterSpacing: letterSpace,
          transform: `translateY(${y}px)`,
          opacity,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 34,
          color: cfg.accent,
          marginTop: 18,
          opacity: interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
