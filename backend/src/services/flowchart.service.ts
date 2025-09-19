import OpenAI from 'openai';

interface FlowchartNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'end' | 'input' | 'output';
  label: string;
  x?: number;
  y?: number;
}

interface FlowchartEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  title: string;
  description: string;
}

class FlowchartService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env['OPENROUTER_API_KEY'],
      baseURL: process.env['OPENROUTER_BASE_URL'] || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        "HTTP-Referer": "https://lexical-app.com",
        "X-Title": "LexiCal - AI Flowchart Generator",
      },
    });
  }

  private async makeRequestWithRetry<T>(requestFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error (429) or server error (5xx)
        const isRetriableError = 
          error?.status === 429 || 
          error?.code === 'rate_limit_exceeded' ||
          (error?.status >= 500 && error?.status < 600) ||
          error?.message?.includes('429') ||
          error?.message?.includes('rate limit') ||
          error?.message?.includes('Provider returned error');
        
        if (!isRetriableError || attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff: wait 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limit hit, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all retries failed
    console.error('All retry attempts failed:', lastError);
    
    // Return a user-friendly error based on the error type
    if (lastError?.status === 429 || lastError?.message?.includes('429') || lastError?.message?.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please wait a moment and try again. Consider upgrading your API plan for higher limits.');
    } else if (lastError?.status >= 500) {
      throw new Error('AI service is temporarily unavailable. Please try again in a few minutes.');
    } else {
      throw lastError;
    }
  }

  async generateFlowchart(prompt: string) {
    return this.makeRequestWithRetry(async () => {
      const systemPrompt = `You are an expert flowchart designer. Given a user's description, create a comprehensive flowchart that visualizes the process, workflow, or concept they describe.

Return your response as a valid JSON object with this exact structure:

{
  "title": "Brief title for the flowchart",
  "description": "Short description of what the flowchart represents",
  "nodes": [
    {
      "id": "unique_id",
      "type": "start|process|decision|end|input|output",
      "label": "Node text content"
    }
  ],
  "edges": [
    {
      "id": "unique_edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "label": "optional edge label"
    }
  ]
}

Node types:
- "start": Beginning of process (oval shape)
- "process": Action or process step (rectangle)
- "decision": Decision point with yes/no branches (diamond)
- "input": Data input (parallelogram)
- "output": Data output (parallelogram)
- "end": End of process (oval shape)

Guidelines:
1. Always start with a "start" node and end with an "end" node
2. Use meaningful, concise labels (max 50 characters)
3. For decision nodes, create edges with "Yes" and "No" labels
4. Create a logical flow that's easy to follow
5. Include 5-15 nodes for optimal clarity
6. Use unique IDs for all nodes and edges
7. Make sure all edges connect valid source and target nodes

User's request: "${prompt}"

Return only the JSON object, no additional text or explanation.`;

      const response = await this.client.chat.completions.create({
        model: process.env['DEEPSEEK_MODEL'] || 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Parse the JSON response
      let flowchartData: FlowchartData;
      try {
        flowchartData = JSON.parse(content);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          flowchartData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }

      // Validate the structure
      if (!flowchartData.nodes || !flowchartData.edges || !flowchartData.title) {
        throw new Error('Invalid flowchart structure');
      }

      return {
        success: true,
        data: flowchartData,
        usage: response.usage,
      };
    });
  }

  async refineFlowchart(currentFlowchart: FlowchartData, refinementRequest: string) {
    return this.makeRequestWithRetry(async () => {
      const systemPrompt = `You are refining an existing flowchart based on user feedback. 

Current flowchart:
${JSON.stringify(currentFlowchart, null, 2)}

User's refinement request: "${refinementRequest}"

Please modify the flowchart according to the user's request and return the updated version in the same JSON format. Maintain the same structure but make the requested changes.

Return only the JSON object, no additional text or explanation.`;

      const response = await this.client.chat.completions.create({
        model: process.env['DEEPSEEK_MODEL'] || 'deepseek/deepseek-chat-v3-0324:free',
        messages: [{ role: 'user', content: systemPrompt }],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '';
      
      let flowchartData: FlowchartData;
      try {
        flowchartData = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          flowchartData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }

      return {
        success: true,
        data: flowchartData,
        usage: response.usage,
      };
    });
  }
}

export default new FlowchartService();
