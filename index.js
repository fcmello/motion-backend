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
app.get("/", (req, res) => {
  res.send("Motion Backend OK");
});

/* Render MP4 */
app.post("/render-mp4", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo não recebido" });
    }

    const input = req.file.path;
    const output = `${input}.mp4`;
    const duration = Number(req.body.duration || 3);
    const motion = req.body.motion || "zoom_in";

    let filter;

    if (motion === "zoom_in") {
      filter = `
zoompan=
z='1+0.15*(t/${duration})':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
s=1920x1080:
fps=30
      `;
    } 
    else if (motion === "zoom_out") {
      filter = `
zoompan=
z='1.15-0.15*(t/${duration})':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
s=1920x1080:
fps=30
      `;
    } 
    else if (motion === "ken_burns_lr") {
      filter = `
zoompan=
z='1+0.12*(t/${duration})':
x='(iw-ow)*(t/${duration})':
y='ih/2-(ih/zoom/2)':
s=1920x1080:
fps=30
      `;
    } 
    else {
      filter = `
zoompan=
z='1.1':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
s=1920x1080:
fps=30
      `;
    }

    const cmd = `
ffmpeg -y -loop 1 -i ${input}
-vf "${filter}"
-t ${duration}
-r 30
-pix_fmt yuv420p
${output}
    `;

    exec(cmd, (err) => {
      if (err) {
        console.error("FFmpeg error:", err);
        return res.status(500).json({ error: "Erro ao renderizar vídeo" });
      }

      res.download(output, "motion.mp4", () => {
        fs.unlinkSync(input);
        fs.unlinkSync(output);
      });
    });

  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* Start server */
app.listen(PORT, () => {
  console.log("Motion backend running on port", PORT);
});
