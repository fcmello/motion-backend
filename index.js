import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "*" }));

const upload = multer({ dest: "uploads/" });

app.get("/", (_, res) => {
  res.send("Motion Backend OK (frame-by-frame)");
});

/**
 * Render MP4 (Frame-by-Frame)
 */
app.post("/render-mp4", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Arquivo não recebido" });
  }

  const duration = Number(req.body.duration || 3);
  const motion = req.body.motion || "zoom_in";
  const fps = 30;
  const totalFrames = duration * fps;

  const inputPath = req.file.path;
  const workDir = `frames_${Date.now()}`;
  const outputVideo = `${workDir}.mp4`;

  fs.mkdirSync(workDir);

  try {
    const img = await loadImage(inputPath);

    const W = 1920;
    const H = 1080;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const baseScale = Math.max(W / img.width, H / img.height);
    const zoomStart = motion === "zoom_out" ? 1.15 : 1.0;
    const zoomEnd = motion === "zoom_out" ? 1.0 : 1.15;

    for (let i = 0; i < totalFrames; i++) {
      const t = i / (totalFrames - 1);
      const ease = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const zoom = zoomStart + (zoomEnd - zoomStart) * ease;
      const scale = baseScale * zoom;

      const drawW = img.width * scale;
      const drawH = img.height * scale;

      const x = (W - drawW) / 2;
      const y = (H - drawH) / 2;

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, x, y, drawW, drawH);

      const framePath = path.join(
        workDir,
        `frame_${String(i).padStart(4, "0")}.png`
      );

      fs.writeFileSync(framePath, canvas.toBuffer("image/png"));
    }

    const cmd = `
ffmpeg -y -framerate ${fps} -i ${workDir}/frame_%04d.png \
-c:v libx264 -pix_fmt yuv420p -movflags +faststart \
${outputVideo}
    `;

    exec(cmd, (err) => {
      if (err) {
        console.error("FFmpeg error:", err);
        return res.status(500).json({ error: "Erro ao montar vídeo" });
      }

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", "attachment; filename=motion.mp4");

      const stream = fs.createReadStream(outputVideo);
      stream.pipe(res);

      stream.on("close", () => {
        fs.rmSync(workDir, { recursive: true, force: true });
        fs.unlinkSync(outputVideo);
        fs.unlinkSync(inputPath);
      });
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.listen(PORT, () => {
  console.log("Motion backend (frame-by-frame) running on", PORT);
});
