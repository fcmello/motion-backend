import express from "express";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

/* =======================
   CORS — ESSENCIAL
======================= */
app.use(cors({
  origin: "*",
  methods: ["POST", "GET", "OPTIONS"],
}));

/* =======================
   UPLOAD
======================= */
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

/* =======================
   RENDER ENDPOINT
======================= */
app.post("/render-mp4", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo não recebido" });
    }

    const motion = req.body.motion || "zoom_in";
    const duration = parseInt(req.body.duration || "3");

    const input = req.file.path;
    const output = `${input}.mp4`;

    /* =======================
       MOVIMENTO
    ======================= */
    let filter = "";

    if (motion === "zoom_in") {
      filter = `zoompan=z='1+0.0015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1`;
    } else if (motion === "zoom_out") {
      filter = `zoompan=z='1.5-0.0015*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1`;
    } else if (motion === "pan_left") {
      filter = `zoompan=z=1.2:x='on*2':y='ih/2-(ih/zoom/2)':d=1`;
    } else if (motion === "pan_right") {
      filter = `zoompan=z=1.2:x='iw-on*2':y='ih/2-(ih/zoom/2)':d=1`;
    } else {
      filter = `zoompan=z=1.2:d=1`;
    }

    /* =======================
       FFmpeg
    ======================= */
    const cmd = `
ffmpeg -y -loop 1 -i "${input}" \
-vf "
scale=1920:1080:force_original_aspect_ratio=increase,
crop=1920:1080,
zoompan=z='min(zoom+0.0015,1.5)':
x='iw/2-(iw/zoom/2)':
y='ih/2-(ih/zoom/2)':
d=1:s=1920x1080
" \
-t ${duration} \
-r 30 \
-pix_fmt yuv420p \
-movflags +faststart \
"${output}"
`;

/* =======================
   HEALTH CHECK
======================= */
app.get("/", (_, res) => {
  res.send("Motion Backend OK");
});

app.listen(PORT, () => {
  console.log("Backend rodando na porta", PORT);
});
