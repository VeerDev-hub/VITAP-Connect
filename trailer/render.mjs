// Renders trailer.html frame-by-frame into an MP4 (video only; audio is muxed by build.mjs).
//   node render.mjs stills 0.6,5.9,...        → out/stills/*.jpg
//   node render.mjs video [fps] [workers]     → out/video.mp4
// Needs Playwright (chromium) and ffmpeg on PATH.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "out");
const url = pathToFileURL(path.join(here, "trailer.html")).href + "?render=1";
const [mode = "stills", arg = "", arg2 = ""] = process.argv.slice(2);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return { page, errors };
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["pipe", "ignore", "pipe"], ...opts });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-2000)))));
    resolve.proc = p;
    run.last = p;
  });
}

if (mode === "stills") {
  mkdirSync(path.join(out, "stills"), { recursive: true });
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser);
  for (const t of arg.split(",").map(Number)) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: path.join(out, "stills", `t${t.toFixed(2)}.jpg`), type: "jpeg", quality: 85 });
  }
  await browser.close();
  console.log(errors.length ? errors.join("\n") : "stills ok");
} else {
  const fps = Number(arg || 60), workers = Number(arg2 || 8);
  mkdirSync(path.join(out, "seg"), { recursive: true });
  const total = Math.round(60 * fps);
  const per = Math.ceil(total / workers);
  const started = Date.now();
  let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const from = w * per, to = Math.min(total, from + per);
    const browser = await chromium.launch();
    const { page, errors } = await openPage(browser);
    const file = path.join(out, "seg", `seg${String(w).padStart(2, "0")}.mp4`);
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-r", String(fps), file], { stdio: ["pipe", "ignore", "inherit"] });
    const closed = new Promise((r) => ff.on("close", r));
    for (let i = from; i < to; i++) {
      await page.evaluate((t) => window.seek(t), i / fps);
      const buf = await page.screenshot({ type: "jpeg", quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      done++;
      if (done % 200 === 0) console.log(`${done}/${total} frames · ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await closed;
    await browser.close();
    if (errors.length) console.log(`worker ${w} errors:\n${errors.join("\n")}`);
  }));
  writeFileSync(path.join(out, "seg", "list.txt"), Array.from({ length: workers }, (_, w) => `file 'seg${String(w).padStart(2, "0")}.mp4'`).join("\n"));
  await new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(out, "seg", "list.txt"), "-c", "copy", path.join(out, "video.mp4")], { stdio: "inherit" });
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error("concat failed"))));
  });
  console.log(`video done in ${((Date.now() - started) / 1000).toFixed(0)}s → out/video.mp4`);
}
