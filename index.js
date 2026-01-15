import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "*" }));

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
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

  if (motion === "zoom_in") {
    filter =
      "zoompan=z=1+0.0003*on:" +
      "x=iw/2-(iw/zoom/2):" +
      "y=ih/2-(ih/zoom/2):" +
      "s=1920x1080:fps=30:d=1";
  } else if (motion === "zoom_out") {
    filter =
      "zoompan=z=1.05-0.0003*on:" +
      "x=iw/2-(iw/zoom/2):" +
      "y=ih/2-(ih/zoom/2):" +
      "s=1920x1080:fps=30:d=1";
  } else {
    filter =
      "zoompan=z=1.02:" +
      "x=iw/2-(iw/zoom/2):" +
      "y=ih/2-(ih/zoom/2):" +
      "s=1920x1080:fps=30:d=1";
  }

  const cmd =
    `ffmpeg -y -loop 1 -i ${input} ` +
    `-vf "${filter}" ` +
    `-t ${duration} ` +
    `-r 30 -pix_fmt yuv420p ${output}`;

  console.log("FFmpeg CMD:", cmd);

  exec(cmd, (err) => {
    if (err) {
      console.error("FFmpeg error:", err);
      return res.status(500).json({ error: "Erro ao renderizar vídeo" });
    }

    if (!fs.existsSync(output)) {
      return res.status(500).json({ error: "MP4 não gerado" });
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
