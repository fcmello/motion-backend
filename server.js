import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/render-mp4", upload.single("image"), (req, res) => {
  const { motion, duration } = req.body;
  const input = req.file.path;
  const output = `output_${Date.now()}.mp4`;

  const fps = 30;
  const frames = duration * fps;

  let zoomExpr = "1";
  let xExpr = "iw/2-(iw/zoom/2)";
  let yExpr = "ih/2-(ih/zoom/2)";

  if (motion === "zoom_in") zoomExpr = "1+0.0015*t";
  if (motion === "zoom_out") zoomExpr = "1+0.0015*(frames-t)";
  if (motion === "ken_burns_lr") {
    zoomExpr = "1+0.0015*t";
    xExpr = "(iw-iw/zoom)*t/frames";
  }
  if (motion === "ken_burns_tb") {
    zoomExpr = "1+0.0015*t";
    yExpr = "(ih-ih/zoom)*t/frames";
  }

  const cmd = `
ffmpeg -y -loop 1 -i ${input} -vf "
scale=3840:2160,
zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${frames}
" -t ${duration} -r ${fps} -c:v libx264 -pix_fmt yuv420p ${output}
`;

  exec(cmd, err => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erro ao gerar vídeo");
    }

    res.download(output, () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("FFmpeg backend rodando");
});
