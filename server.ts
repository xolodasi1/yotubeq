import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

app.use(cors());
app.use(express.json());

// Set up local storage
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
  }
});
const upload = multer({ storage: storage });

async function setupDatabase() {
  const db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      displayName TEXT,
      photoURL TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      category TEXT,
      videoUrl TEXT,
      thumbnailUrl TEXT,
      authorId TEXT,
      authorName TEXT,
      authorPhotoUrl TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration TEXT
    );
  `);

  return db;
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

async function startServer() {
  const db = await setupDatabase();

  // --- AUTH ENDPOINTS ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      const photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;

      await db.run(
        'INSERT INTO users (id, email, password, displayName, photoURL) VALUES (?, ?, ?, ?, ?)',
        [id, email, hashedPassword, displayName, photoURL]
      );

      const token = jwt.sign({ id, email, displayName, photoURL }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { uid: id, email, displayName, photoURL } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid password' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, displayName: user.displayName, photoURL: user.photoURL }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { uid: user.id, email: user.email, displayName: user.displayName, photoURL: user.photoURL } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: { uid: req.user.id, email: req.user.email, displayName: req.user.displayName, photoURL: req.user.photoURL } });
  });

  // --- UPLOAD ENDPOINT ---
  app.post('/api/upload', authenticateToken, upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // --- VIDEO ENDPOINTS ---
  app.post('/api/videos', authenticateToken, async (req: any, res) => {
    try {
      const { title, description, category, videoUrl, thumbnailUrl, duration } = req.body;
      const id = crypto.randomUUID();
      
      await db.run(
        `INSERT INTO videos (id, title, description, category, videoUrl, thumbnailUrl, authorId, authorName, authorPhotoUrl, duration) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, description, category, videoUrl, thumbnailUrl, req.user.id, req.user.displayName, req.user.photoURL, duration || '10:00']
      );

      const newVideo = await db.get('SELECT * FROM videos WHERE id = ?', [id]);
      res.json(newVideo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/videos', async (req, res) => {
    try {
      const { authorId } = req.query;
      let videos;
      if (authorId) {
        videos = await db.all('SELECT * FROM videos WHERE authorId = ? ORDER BY createdAt DESC', [authorId]);
      } else {
        videos = await db.all('SELECT * FROM videos ORDER BY createdAt DESC');
      }
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const video = await db.get('SELECT * FROM videos WHERE id = ?', [req.params.id]);
      if (!video) return res.status(404).json({ error: 'Video not found' });
      
      // Increment views
      await db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
      video.views += 1;
      
      res.json(video);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
