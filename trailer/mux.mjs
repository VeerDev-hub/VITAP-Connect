// Joins out/video.mp4 + out/audio.wav into the final films:
//   out/vitap-connect-trailer.mp4        1080p60, H.264 + AAC (portfolio / YouTube / LinkedIn)
//   out/vitap-connect-trailer-web.mp4    720p30, small enough for a website <video> tag
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
const audioFx = "highpass=f=28,equalizer=f=70:t=q:w=1:g=-2,equalizer=f=3000:t=q:w=1.5:g=1.5,loudnorm=I=-14:TP=-1:LRA=9";
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
};

ff(["-i", path.join(out, "video.mp4"), "-i", path.join(out, "audio.wav"), "-map", "0:v", "-map", "1:a",
  "-c:v", "copy", "-af", audioFx, "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-t", "60", "-movflags", "+faststart",
  path.join(out, "vitap-connect-trailer.mp4")]);

ff(["-i", path.join(out, "vitap-connect-trailer.mp4"), "-vf", "scale=1280:720:flags=lanczos,fps=30", "-c:v", "libx264", "-preset", "slow",
  "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", path.join(out, "vitap-connect-trailer-web.mp4")]);

console.log("done → out/vitap-connect-trailer.mp4, out/vitap-connect-trailer-web.mp4");
