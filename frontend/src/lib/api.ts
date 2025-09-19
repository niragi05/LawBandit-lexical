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
  } catch (error) {
    console.error('Assignment extraction error:', error);
    throw error;
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
