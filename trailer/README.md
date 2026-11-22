# VITAP Connect: product trailer

A 60-second animated trailer with no narration. The animation and the soundtrack are both generated from code.

| File | What it is |
| --- | --- |
| `trailer.html` | The film itself: ten scenes, each a function of time. Open it in a browser to preview it with sound. Add `?t=29` to start at a given second. |
| `audio.mjs` | Synthesizes the 120 BPM score and every sound effect, cued to the same timeline. No samples are used. |
| `render.mjs` | Renders the film frame by frame with Playwright and pipes the frames into ffmpeg. |
| `mux.mjs` | Joins the picture and the sound, normalizes loudness to −14 LUFS, and writes the 1080p60 and 720p web versions. |
| `shots/` | Real screenshots of the redesigned app, taken from the Docker demo account. |

## Build

Requires Node 20+ and ffmpeg on your `PATH`.

```bash
cd trailer
npm install
npm run build        # audio → 3600 frames → out/vitap-connect-trailer.mp4
```

The output lands in `out/`, which is git-ignored.

## Scenes

| Time | Scene |
| --- | --- |
| 0–5 s | Cold open: "Hackathon in 3 weeks. Team of one. Sound familiar?" |
| 5–9 s | Logo assembles from three flying nodes |
| 9–17 s | Matching graph: radar scan, then a match-score breakdown using the real Neo4j weights |
| 17–23 s | Dashboard and Discover, with a live search for "Neo4j" |
| 23–29 s | Posting a project and accepting a join request |
| 29–37 s | Real-time chat: typing indicator, read receipts, and messages scrambling to show encryption at rest |
| 37–42 s | Incoming call, then a video call with screen sharing |
| 42–49 s | Light-to-dark theme wipe, then three phones |
| 49–53 s | Architecture diagram |
| 53–60 s | End card |
