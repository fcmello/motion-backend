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
  if (!req.file) return res.status(400).json({ error: "Arquivo não recebido" });

  const input = req.file.path;
  const output = `${input}.mp4`;
  const duration = Number(req.body.duration || 3);
  const motion = req.body.motion || "zoom_in";

  /**
   * Estratégia:
   * 1. Escala a imagem maior que o frame
   * 2. Move o crop suavemente (SEM recalcular zoom)
   */

  let vf;

  if (motion === "zoom_in") {
    vf = `
scale=2400:1350,
crop=1920:1080:
(2400-1920)/2:
(1350-1080)/2
    `;
  } else if (motion === "zoom_out") {
    vf = `
scale=1920:1080,
crop=1920:1080:0:0
    `;
  } else {
    vf = `
scale=2400:1350,
crop=1920:1080:
(2400-1920)*(n/${duration * 30}):
(1350-1080)/2
    `;
  }

  const cmd = `
ffmpeg -y -loop 1 -i ${input}
-vf "${vf}"
-t ${duration}
-r 30
-pix_fmt yuv420p
${output}
  `;

  console.log("FFmpeg CMD:", cmd);

  exec(cmd, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao renderizar vídeo" });
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", "attachment; filename=motion.mp4");

    const stream = fs.createReadStream(output);
    stream.pipe(res);

    stream.on("close", () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.listen(PORT, () => {
  console.log("Motion backend running on port", PORT);
});
