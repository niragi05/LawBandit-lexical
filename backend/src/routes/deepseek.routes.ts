import { Router } from 'express';
import multer from 'multer';
import { processSyllabus, generateResponse } from '../controllers/deepseek.controller';

// Configure multer for this route
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

const router = Router();

// Process syllabus PDF file and extract structured data
router.post('/syllabus/process', upload.single('file'), processSyllabus);

// General AI response generation
router.post('/generate', generateResponse);

export default router;
