import express from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { parseFile } from "music-metadata";

const app = express();
const PORT = 3000;

const MUSIC_DIR = path.join(process.cwd(), "music");
const PUBLIC_DIR = path.join(process.cwd(), "public");

app.use(express.static(PUBLIC_DIR));
app.use("/music", express.static(MUSIC_DIR));

const playlist = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith(".m4a"));
if (playlist.length === 0) throw new Error("No MP3 files found");

let currentSong = null;
let songStartTime = 0;
let songDuration = 0;

/* ---------- helpers ---------- */

function getRandomSong() {
  return playlist[Math.floor(Math.random() * playlist.length)];
}

function getMp3Duration(filePath) {
  return new Promise((resolve, reject) => {
  //require ffprobe (ffmpeg)
   execFile("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]
   /*execFile("C:\\ffmpeg\\bin\\ffprobe.exe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]*/
, (err, stdout) => {
      if (err) reject(err);
      else resolve(Math.floor(parseFloat(stdout)));
    });
  });
}

async function rotateSong() {
  currentSong = getRandomSong();
  songStartTime = Date.now();
  songDuration = await getMp3Duration(
    path.join(MUSIC_DIR, currentSong)
  );

  console.log(`Now playing: ${currentSong} (${songDuration}s)`);
  console.log(await getMetadata(path.join(MUSIC_DIR, currentSong)))
}

async function getMetadata(filePath) {
  const metadata = await parseFile(filePath);

  return {
    title: metadata.common.title,
    artist: metadata.common.artist,
    album: metadata.common.album,
    track: metadata.common.track?.no,
    year: metadata.common.year,
    duration: Math.floor(metadata.format.duration),
    bitrate: metadata.format.bitrate,
    codec: metadata.format.codec
  };
}

async function getArt(filePath)
{
    const metadata = await parseFile(filePath);

    const picture = metadata.common.picture?.[0];
    if(picture)
    {
        const buffer = Buffer.from(picture.data);
        const base64 = buffer.toString("base64");
        const mimeType = picture.format;
        return `data:${mimeType};base64,${base64}`;
    }

    const defaultPath = path.join("public", "default-cover.png");
    const defaultData = fs.readFileSync(defaultPath).toString("base64");
    return `data:image/png;base64,${defaultData}`;
}

/* ---------- initial start ---------- */

await rotateSong();

/* ---------- rotation loop ---------- */

setInterval(async () => {
  const elapsed = (Date.now() - songStartTime) / 1000;
  if (elapsed >= songDuration) {
    await rotateSong();
  }
}, 1000);

/* ---------- API ---------- */

app.get("/now-playing", (req, res) => {
  const offset = Math.floor((Date.now() - songStartTime) / 1000);

  res.json({
    song: currentSong,
    offset
  });
});

app.get("/metadata", async (req, res) => {
  res.json(await getMetadata(path.join(MUSIC_DIR, currentSong)));
});

app.get("/cover-art", async (req, res) => {
  res.send(await getArt(path.join(MUSIC_DIR, currentSong)));
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
