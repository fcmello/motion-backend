import express from "express";
import cors from "cors";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

// 🔒 garante uploads/
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use(cors({ origin: "*" }));

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Motion Backend OK");
});

/**
 * 🔍 TESTE 1 — FFmpeg puro (SEM UPLOAD)
 * Acesse: /test-ffmpeg
 */
app.get("/test-ffmpeg", (req, res) => {
  const ffmpeg = spawn("/usr/bin/ffmpeg", ["-version"]);

  let output = "";

  ffmpeg.stdout.on("data", d => output += d.toString());
  ffmpeg.stderr.on("data", d => output += d.toString());

  ffmpeg.on("close", code => {
    res.json({
      exitCode: code,
      output
    });
  });
});

/**
 * 🎬 RENDER MP4 REAL
 */
app.post("/render-mp4", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Arquivo não recebido" });
  }

  const input = req.file.path;
  const output = path.join("uploads", `${req.file.filename}.mp4`);

  const duration = Number(req.body.duration || 3);
  const motion = req.body.motion || "zoom_in";

  let filter =
    "scale=iw*1.15:ih*1.15,crop=1920:1080:(in_w-1920)/2:(in_h-1080)/2,fps=30";

  const args = [
    "-y",
    "-loop", "1",
    "-i", input,
    "-vf", filter,
    "-t", String(duration),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    output
  ];

  console.log("▶ FFmpeg CMD:", "/usr/bin/ffmpeg", args.join(" "));

  const ffmpeg = spawn("/usr/bin/ffmpeg", args);

  ffmpeg.stderr.on("data", d => {
    console.log("FFmpeg:", d.toString());
  });

  ffmpeg.on("error", err => {
    console.error("Spawn error:", err);
    return res.status(500).json({ error: "Erro ao iniciar FFmpeg" });
  });

  ffmpeg.on("close", code => {
    if (code !== 0) {
      console.error("FFmpeg exited with code", code);
      return res.status(500).json({ error: "Erro ao renderizar video" });
    }

    res.download(output, "motion.mp4", () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
