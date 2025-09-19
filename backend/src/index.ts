import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import deepseekRoutes from './routes/deepseek.routes';
import flowchartRoutes from './routes/flowchart.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LexiCal Backend is running' });
});

// DeepSeek AI routes
app.use('/api/deepseek', deepseekRoutes);

// Flowchart AI routes
app.use('/api/flowchart', flowchartRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LexiCal Backend server is running on port ${PORT}`);
});

export default app;
