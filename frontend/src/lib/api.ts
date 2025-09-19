import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // This will be proxied to http://localhost:5000/api
});

export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API connection error:', error);
    throw error;
  }
};

// Types for assignment extraction
export interface Assignment {
  title: string;
  tag: "read" | "write" | "oral" | "evaluation" | "other";
}

export interface AssignmentData {
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  assignments: Assignment[];
}

// DeepSeek API endpoints
export const extractAssignments = async (file: File): Promise<{
  success: boolean;
  data?: AssignmentData[];
  error?: string;
  statusCode?: number;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/deepseek/syllabus/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Assignment extraction error:', error);
    
    let errorMessage = 'Failed to process the PDF file. Please try again.';
    let statusCode = 500;
    
    if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      errorMessage = error.response.data?.error || error.response.data?.message || error.message;
      
      if (statusCode >= 400 && statusCode < 500) {
        // 4xx client errors
        switch (statusCode) {
          case 400:
            errorMessage = error.response.data?.error || 'Invalid file or request format';
            break;
          case 401:
            errorMessage = 'Authentication failed. Please check API credentials.';
            break;
          case 403:
            errorMessage = 'Access forbidden. Please check permissions.';
            break;
          case 404:
            errorMessage = 'Service not found. Please contact support.';
            break;
          case 429:
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            break;
          default:
            errorMessage = error.response.data?.error || `Client error (${statusCode})`;
        }
      } else if (statusCode >= 500) {
        // 5xx server errors
        switch (statusCode) {
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          case 502:
            errorMessage = 'Service temporarily unavailable. Please try again.';
            break;
          case 503:
            errorMessage = 'Service unavailable. Please try again later.';
            break;
          default:
            errorMessage = error.response.data?.error || `Server error (${statusCode})`;
        }
      }
    } else if (error.request) {
      // Network error
      errorMessage = 'Network error. Please check your connection and try again.';
      statusCode = 0;
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode
    };
  }
};

export const generateAIResponse = async (prompt: string, options?: {
  maxTokens?: number;
  temperature?: number;
}) => {
  try {
    const response = await api.post('/deepseek/generate', { prompt, options });
    return response.data;
  } catch (error) {
    console.error('AI response generation error:', error);
    throw error;
  }
};

// Flowchart API types
export interface FlowchartNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'end' | 'input' | 'output';
  label: string;
  x?: number;
  y?: number;
}

export interface FlowchartEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  title: string;
  description: string;
}

// Flowchart API endpoints
export const generateFlowchart = async (prompt: string): Promise<{
  success: boolean;
  data?: FlowchartData;
  error?: string;
  usage?: any;
}> => {
  try {
    const response = await api.post('/flowchart/generate', { prompt });
    return response.data;
  } catch (error) {
    console.error('Flowchart generation error:', error);
    throw error;
  }
};

export const refineFlowchart = async (
  currentFlowchart: FlowchartData,
  refinementRequest: string
): Promise<{
  success: boolean;
  data?: FlowchartData;
  error?: string;
  usage?: any;
}> => {
  try {
    const response = await api.post('/flowchart/refine', {
      currentFlowchart,
      refinementRequest,
    });
    return response.data;
  } catch (error) {
    console.error('Flowchart refinement error:', error);
    throw error;
  }
};

export default api;
