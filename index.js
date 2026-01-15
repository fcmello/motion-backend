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
 let filter;

if (req.body.motion === "zoom_in") {
  filter = "zoompan=z='1+0.0015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:d=1";
}
else if (req.body.motion === "zoom_out") {
  filter = "zoompan=z='1.5-0.0015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:d=1";
}
else {
  filter = "zoompan=z=1.2:s=1920x1080:d=1";
}

const cmd =
  `ffmpeg -y -loop 1 -i ${input} ` +
  `-vf "${filter},scale=1920:1080,setsar=1" ` +
  `-t ${duration} -r 30 -pix_fmt yuv420p ${output}`;
    });
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
