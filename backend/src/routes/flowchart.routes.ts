import { Router } from 'express';
import { generateFlowchart, refineFlowchart } from '../controllers/flowchart.controller';

const router = Router();

// Generate flowchart from prompt
router.post('/generate', generateFlowchart);

// Refine existing flowchart
router.post('/refine', refineFlowchart);

export default router;

