# public/

Static assets for Remotion's `staticFile()`:

- `clips/` — AI-generated video clips (ViMax / Veo / Runway `rw-generate-video` output)
- `audio/` — dialogue, ambience, music stems
- `posters/` — poster frames used as `posterSrc`

Paths passed to components are relative to this folder, e.g.
`videoSrc: "clips/shot-01.mp4"`.
