import express from "express";
import fs, { readdirSync } from "fs";
import path from "path";
import { parseFile } from "music-metadata";

class Playlist
{
   constructor(name,files)
   {
      this.Name = name
      this.Files = files
      this.CurrentSong = {};
      this.SongStartTime = undefined;

      setInterval(this.CheckFinished.bind(this), 1000);
      this.RotateSong();
   }

   static async init(playListPath=undefined)
   {
      let files = undefined;
      let name = "default";
      if(playListPath)
      {
        files = await this.#ParsePlaylistFile(playListPath);
        name = path.parse(playListPath).name;
      }
      else
        files = await this.#GetAudioFiles(MUSIC_DIR);

      if(files.length==0)
        return;

      return new Playlist(name,files)
   }
  
   static async #ParsePlaylistFile(filepath)
   {
      let returner = []
      const songs = fs.readFileSync(filepath, 'utf8').split(/\r?\n/) .map(l => l.trim()) .filter(l => l.length > 0 && !l.startsWith('#'));
      for(var s of songs)
      {
        let filePath = s.match(/\\music\\.*/i);
        filePath = filePath[0].replace(/\\music\\/i,"");
        filePath = filePath.replace(/\..*/,"");
        filePath = this.#GetFileFromName(filePath);
        if(!filePath || !AUDIO_EXTS.has(path.extname(filePath)))
          continue;
        returner.push(await Song.init(filePath));
      }
      return returner;
   }

   static #GetFileFromName(pathNoExtension)
   {
      let files = readdirSync(MUSIC_DIR,{withFileTypes:true,recursive:true});
      for(var f of files)
      {
        if(f.isFile() && path.join(f.parentPath,f.name).includes(pathNoExtension))
          return pathNoExtension + path.extname(f.name);
      }
      return;
   }

    static async #GetAudioFiles(dir)
    {
      var returner = [];
      const files = readdirSync(dir,{withFileTypes:true,recursive:true});
      for(var f of files)
      {
        if(f.isFile() && AUDIO_EXTS.has(path.extname(f.name)))
          returner.push(await Song.init(path.join(path.relative(dir,f.parentPath),f.name)));
      }
      return returner
    }

  GetRandomSong()
  {
    return this.Files[Math.floor(Math.random() * this.Files.length)];
  }

  async RotateSong()
  {
    this.CurrentSong = this.GetRandomSong(); 
    this.SongStartTime = Date.now();
    console.log(`${this.Name} Now playing: ${this.CurrentSong.Path} (${this.SongStartTime}s)`);
    console.log(this.CurrentSong.Metadata);
  }

  async CheckFinished()
  {
    const elapsed = (Date.now() - this.SongStartTime) / 1000;
    if (elapsed >= this.CurrentSong.Duration)
      await this.RotateSong();
  }
}

class Song
{
  constructor(filepath,fullpath,duration,metadata,art)
  {
    this.Path = filepath;
    this.FullPath = fullpath;
    this.Duration = duration;
    this.Metadata = metadata
    this.Art = art;
  }

  static async init(filepath)
  {
    let fullpath = path.join(MUSIC_DIR,filepath);
    let metadata = await this.#GetMetadata(fullpath);
    let duration = metadata.duration;
    let art = await this.#GetArt(metadata.picture);
    delete metadata.picture;
    return new Song(filepath,fullpath,duration,metadata,art);
  }

  GetPath()
  {
    return this.FilePath
  }
  static async #GetMetadata(filePath)
  {
    const metadata = await parseFile(filePath);

    return{title: metadata.common.title,
           artist: metadata.common.artist,
           album: metadata.common.album,
           track: metadata.common.track?.no,
           year: metadata.common.year,
           duration: Math.floor(metadata.format.duration),
           bitrate: metadata.format.bitrate,
           codec: metadata.format.codec,
           picture: metadata.common.picture?.[0]};
  }

  static async #GetArt(picture,fromPath=false)
  {
    if(fromPath)
    {
      const metadata = await parseFile(picture);
      picture = metadata.common.picture?.[0];
    }
    
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
}

const app = express();
const PORT = 3000;

const MUSIC_DIR = path.join(path.resolve(process.cwd(), ".."), "music");
const PLAYLIST_DIR = path.join(path.resolve(process.cwd(), ".."), "playlist");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const AUDIO_EXTS = new Set([".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus", ".wma", ".aiff", ".alac"]);

app.use(express.static(PUBLIC_DIR));
app.use("/music", express.static(MUSIC_DIR));

let playlists = [];
playlists.push(await Playlist.init());

let playlistFiles = getPlaylistFiles();
for(var pf of playlistFiles)
  playlists.push(await Playlist.init(pf));
playlists = playlists.filter(i => i!=undefined)
playlists.forEach((f) => {console.log(f.Name+": "+f.Files.length + "songs")})

function getPlaylistFiles()
{
  var returner = [];
  const files = readdirSync(PLAYLIST_DIR,{withFileTypes:true,recursive:true});
  for(var f of files)
  {
    if(f.isFile() && path.extname(f.name) == ".m3u8")
      returner.push(path.join(f.parentPath,f.name))
  }
  return returner
}

function getPlaylist(name)
{
  const playlist = playlists.filter(i => i.Name.toLowerCase() == name.toLowerCase());
  if(playlist.length==0)
    throw "Playlist doesn't exist";
  return playlist[0];
}


/* ---------- API ---------- */

app.get("/now-playing/:playlist", (req, res) => {
  let playlist = undefined
  try{playlist = getPlaylist(req.params.playlist);}catch(err){res.status(400).send("err");}

  const offset = Math.floor((Date.now() - playlist.SongStartTime) / 1000);
  res.json({song: playlist.CurrentSong.Path,offset:offset});
});

app.get("/metadata/:playlist", async (req, res) => {
  let playlist = undefined
  try{playlist = getPlaylist(req.params.playlist);}catch(err){res.status(400).send("err");}
  
  res.json(playlist.CurrentSong.Metadata);
});

app.get("/cover-art/:playlist", async (req, res) => {
  let playlist = undefined
  try{playlist = getPlaylist(req.params.playlist);}catch(err){res.status(400).send("err");}

  res.send(playlist.CurrentSong.Art);
});

app.get("/playlists", async (req, res) => {
  res.send(playlists.map(o => ({name:o.Name,nowPlaying:o.CurrentSong.Metadata.artist + " - " + o.CurrentSong.Metadata.title})));
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});