import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(cors());

// Initialize Firebase for server-side uploads
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let storage: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  const firebaseApp = initializeApp(firebaseConfig);
  storage = getStorage(firebaseApp);
}

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  // Proxy for downloading files
  app.get('/api/proxy-storage/*', async (req, res) => {
    try {
      const targetPath = req.params[0];
      const queryParams = new URLSearchParams(req.query as any).toString();
      const targetUrl = `https://firebasestorage.googleapis.com/${targetPath}${queryParams ? '?' + queryParams : ''}`;
      
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        return res.status(response.status).send(response.statusText);
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(value);
          }
        };
        await pump();
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Proxy error');
    }
  });

  // Upload endpoint
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!storage) {
        return res.status(500).json({ error: 'Firebase Storage not configured on server' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const userId = req.body.userId;
      const folder = req.body.folder || 'misc';
      const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, req.file.buffer, {
        contentType: req.file.mimetype,
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      res.json({ url: downloadURL });
    } catch (error: any) {
      console.error('Upload error:', error);
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
