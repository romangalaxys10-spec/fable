import React from "react";
import { Composition } from "remotion";
import { EmotionalTitle, emotionalTitleSchema } from "./EmotionalTitle";
import { AiClipWithCaption, aiClipSchema } from "./AiClipWithCaption";

/**
 * fable-remotion-starter — two ready compositions:
 *   EmotionalTitle     kinetic typography title card (30fps, 4s)
 *   AiClipWithCaption  AI-generated clip + burned-in caption (loop a rendered clip)
 * Register your own Compositions here; timing is frames (30fps default).
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EmotionalTitle"
        component={EmotionalTitle}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "The Last Signal",
          subtitle: "a short film",
          mood: "hopeful",
        }}
        schema={emotionalTitleSchema}
      />
      <Composition
        id="AiClipWithCaption"
        component={AiClipWithCaption}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          // Path relative to the project's public/ folder (Remotion StaticFile).
          videoSrc: "clips/shot-01.mp4",
          caption: '<MAYA> (softly): "We made it."',
          speaker: "MAYA",
        }}
        schema={aiClipSchema}
      />
    </>
  );
};
