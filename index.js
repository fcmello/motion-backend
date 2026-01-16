import express from "express";
import cors from "cors";
import multer from "multer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

app.use(cors({ origin: "*" }));
const upload = multer({ dest: "uploads/" });

app.get("/", (_, res) => {
  res.send("Motion Backend OK");
});

app.post("/render-mp4", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Arquivo não recebido" });
  }

  const input = req.file.path;
  const output = path.join("uploads", `${req.file.filename}.mp4`);
  const duration = Number(req.body.duration || 5);

  /**
   * ✅ MOVIMENTO SEGURO (micro zoom)
   * - não usa t
   * - não usa crop
   * - não quebra
   */
  const filter =
    "zoompan=" +
    "z='1+0.0004*on':" +
    "x='iw/2-(iw/zoom/2)':" +
    "y='ih/2-(ih/zoom/2)':" +
    "d=1:" +
    "s=1920x1080:" +
    "fps=30";

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

  console.log("FFmpeg:", args.join(" "));

  const ffmpeg = spawn("/usr/bin/ffmpeg", args);

  ffmpeg.stderr.on("data", d => console.log(d.toString()));

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
