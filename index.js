import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 8080;

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
  const output = `${input}.mp4`;

  const duration = Number(req.body.duration || 3);
  const motion = req.body.motion || "zoom_in";

  let filter;

  /**
   * 🎥 FILTROS SUAVES (SEM TREMIDA)
   * Zoom controlado por TEMPO (t)
   */
  if (motion === "zoom_in") {
    filter = `
      scale=1920:1080,
      zoompan=
        z='1+0.1*t/${duration}':
        x='iw/2-(iw/zoom/2)':
        y='ih/2-(ih/zoom/2)':
        d=1:
        s=1920x1080,
      fps=30
    `;
  } else if (motion === "zoom_out") {
    filter = `
      scale=1920:1080,
      zoompan=
        z='1.1-0.1*t/${duration}':
        x='iw/2-(iw/zoom/2)':
        y='ih/2-(ih/zoom/2)':
        d=1:
        s=1920x1080,
      fps=30
    `;
  } else {
    filter = `
      scale=1920:1080,
      zoompan=
        z='1.05':
        x='iw/2-(iw/zoom/2)':
        y='ih/2-(ih/zoom/2)':
        d=1:
        s=1920x1080,
      fps=30
    `;
  }

  const cmd = `
    ffmpeg -y -loop 1 -i ${input}
    -vf "${filter.replace(/\s+/g, " ")}"
    -t ${duration}
    -pix_fmt yuv420p
    ${output}
  `;

  exec(cmd, (err) => {
    if (err) {
      console.error("FFmpeg error:", err);
      return res.status(500).json({ error: "Erro ao renderizar vídeo" });
    }

    res.download(output, () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Motion backend running on port ${PORT}`);
});
