import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "*" }));

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Motion Backend OK");
});

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

    // 🎥 MOVIMENTO SUAVE (SEM TREMIDO)
    if (motion === "zoom_in") {
      filter =
        "zoompan=z='min(1.15,1+0.0005*on)':" +
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':" +
        "d=1:s=1920x1080";
    } else if (motion === "zoom_out") {
      filter =
        "zoompan=z='max(1,1.15-0.0005*on)':" +
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':" +
        "d=1:s=1920x1080";
    } else {
      filter =
        "zoompan=z=1.1:" +
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':" +
        "d=1:s=1920x1080";
    }

    const cmd = `
      ffmpeg -y -loop 1 -i ${input} \
      -vf "${filter}" \
      -t ${duration} \
      -r 30 \
      -pix_fmt yuv420p \
      ${output}
    `;

    console.log("FFmpeg command:", cmd);

    exec(cmd, (error) => {
      if (error) {
        console.error("FFmpeg error:", error);
        return res.status(500).json({ error: "Erro ao renderizar video" });
      }

      res.download(output, "motion.mp4", () => {
        fs.unlinkSync(input);
        fs.unlinkSync(output);
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
