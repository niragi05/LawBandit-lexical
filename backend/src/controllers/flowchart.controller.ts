import { Request, Response } from 'express';
import flowchartService from '../services/flowchart.service';

export const generateFlowchart = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string',
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Prompt must be less than 1000 characters',
      });
    }

    const result = await flowchartService.generateFlowchart(prompt);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Generate flowchart error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const refineFlowchart = async (req: Request, res: Response) => {
  try {
    const { currentFlowchart, refinementRequest } = req.body;

    if (!currentFlowchart || !refinementRequest) {
      return res.status(400).json({
        success: false,
        error: 'Current flowchart and refinement request are required',
      });
    }

    if (typeof refinementRequest !== 'string' || refinementRequest.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Refinement request must be a string with less than 500 characters',
      });
    }

    const result = await flowchartService.refineFlowchart(currentFlowchart, refinementRequest);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Refine flowchart error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

