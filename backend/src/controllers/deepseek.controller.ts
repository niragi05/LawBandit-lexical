import { Request, Response } from 'express';
import deepseekService from '../services/deepseek.service';

// Extend Request type to include multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const processSyllabus = async (req: MulterRequest, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: 'Only PDF files are allowed'
      });
    }

    const result = await deepseekService.extractAssignmentsFromFile(req.file.buffer);

    if (result.success) {
      try {
        let jsonString: string = result.content || '';

        // Clean markdown code block formatting if present
        if (jsonString.includes('```json')) {
          // Extract content between ```json and ```
          const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1].trim();
          }
        } else if (jsonString.includes('```')) {
          // Fallback for any markdown code blocks
          const codeMatch = jsonString.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch && codeMatch[1]) {
            jsonString = codeMatch[1].trim();
          }
        }

        // Parse the cleaned JSON string
        const parsedData = JSON.parse(jsonString);

        // Validate that it's an array
        if (!Array.isArray(parsedData)) {
          throw new Error('AI response is not a valid JSON array');
        }

        res.json({
          success: true,
          data: parsedData,
          usage: result.usage
        });
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw content:', result.content);
        res.status(500).json({
          success: false,
          error: 'Failed to parse AI response. The response may not be valid JSON.'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const generateResponse = async (req: Request, res: Response) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const result = await deepseekService.generateResponse(prompt, options);
    console.log("AI Response : ", result);

    if (result.success) {
      res.json({
        success: true,
        content: result.content,
        usage: result.usage
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
