import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const aiClipSchema = z.object({
  // Path relative to public/ (use `npx remotion browser ensure` to check assets).
  videoSrc: z.string(),
  caption: z.string(),
  speaker: z.string(),
  audioSrc: z.string().optional(),
  posterSrc: z.string().optional(),
});

/**
 * Burn a ViMax-style caption (with speaker + emotion) over an AI-generated
 * clip, e.g. the output of `runway-api` rw-generate-video or Veo.
 * Caption bar bottom-left, speaker name in accent color, subtle fade-in.
 */
export const AiClipWithCaption: React.FC<z.infer<typeof aiClipSchema>> = ({
  videoSrc,
  caption,
  speaker,
  audioSrc,
  posterSrc,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const captionIn = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const captionOut = interpolate(frame, [durationInFrames - 20, durationInFrames - 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const [name, ...rest] = caption.split("):");
  const speakerLine = name.includes("(") ? `${name})` : speaker;
  const dialogue = rest.join("):").trim() || caption;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {posterSrc ? (
        <Img src={staticFile(posterSrc)} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
      ) : null}
      <OffthreadVideo
        src={staticFile(videoSrc)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          padding: 64,
          opacity: Math.min(captionIn, captionOut),
        }}
      >
        <div
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0))",
            borderRadius: 12,
            padding: "18px 28px",
            maxWidth: "72%",
          }}
        >
          <div style={{ color: "#ffd166", fontSize: 26, fontFamily: "Georgia, serif", marginBottom: 6 }}>
            {speakerLine}
          </div>
          <div style={{ color: "#fff", fontSize: 40, fontFamily: "Georgia, serif", lineHeight: 1.25 }}>
            {dialogue}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
