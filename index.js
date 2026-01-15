import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 8080;

/* CORS */
app.use(cors({ origin: "*" }));

/* Upload */
const upload = multer({ dest: "uploads/" });

/* Health check */
app.get("/", (_, res) => {
  res.send("Motion Backend OK");
});

/* Render */
app.post("/render-mp4", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Arquivo não recebido" });
  }

  const input = req.file.path;
  const output = `${input}.mp4`;
  const duration = Number(req.body.duration || 3);

  // 🔒 FFmpeg SIMPLES E SEGURO
  const cmd =
    `ffmpeg -y -loop 1 -i ${input} ` +
    `-vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" ` +
    `-t ${duration} -r 30 -pix_fmt yuv420p ${output}`;

  exec(cmd, (err) => {
    if (err) {
      console.error("FFmpeg error:", err);
      return res.status(500).json({ error: "FFmpeg failed" });
    }

    res.download(output, () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
