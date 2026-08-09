import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadData } from './data/dataLoader';
import interviewRouter from './routes/interview';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for frontend local development
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Load static assets/databases
loadData();

// Register API routers
app.use('/api', interviewRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static assets from React client in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Wildcard route to handle React Router navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`[Server] ABTalks AI Interview Agent backend running on port ${port}`);
  });
}

export default app;
