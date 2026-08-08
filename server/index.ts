import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { loadData } from './data/dataLoader';
import interviewRouter from './routes/interview';

dotenv.config();

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

// Register routers
app.use('/api', interviewRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[Server] ABTalks AI Interview Agent backend running on port ${port}`);
});
