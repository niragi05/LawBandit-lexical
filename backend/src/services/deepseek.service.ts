import OpenAI from 'openai';

class DeepSeekService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env['OPENROUTER_API_KEY'],
      baseURL: process.env['OPENROUTER_BASE_URL'] || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        "HTTP-Referer": "https://lexical-app.com", // Site URL for rankings on openrouter.ai
        "X-Title": "LexiCal - Law Syllabus to Calendar", // Site title for rankings on openrouter.ai
      },
    });
  }

  async generateResponse(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
  }) {
    try {
      const response = await this.client.chat.completions.create({
        model: process.env['DEEPSEEK_MODEL'] || 'deepseek/deepseek-chat-v3-0324:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      });

      return {
        success: true,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
      };
    } catch (error) {
      console.error('DeepSeek API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async extractAssignmentsFromFile(fileBuffer: Buffer) {
    try {
      // Import pdf-parse dynamically
      const pdfParse = await import('pdf-parse');

      // Parse PDF buffer to extract text
      const data = await pdfParse.default(fileBuffer);
      const text = data.text;

      // If PDF has no extractable text, return error
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in PDF. The file might be image-based or corrupted.');
      }

      return this.extractAssignments(text);
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractAssignments(text: string) {
    const prompt = `You are an expert Legal Syllabus Data Extractor. Your task is to carefully read the uploaded syllabus PDF and extract all assignment-related details, whether they are readings, writing tasks, oral arguments, evaluations, or other work.

You must output the results as a JSON array where **each date or date range is its own separate object**. Never group all assignments into one object for the whole semester.

Schema for each object:

{
  "startDate": string in YYYY-MM-DD format if available, otherwise null,
  "endDate": string in YYYY-MM-DD format if available, otherwise null,
  "startTime": string in HH:MM (24-hour) format if available, otherwise null,
  "endTime": string in HH:MM (24-hour) format if available, otherwise null,
  "location": string if available, otherwise null,
  "assignments": [
    {
      "title": string (short descriptive title of the assignment),
      "tag": one of ["read", "write", "oral", "evaluation", "other"]
    }
  ]
}

Instructions:
1. **Each session date must correspond to one object in the JSON array.** If multiple assignments happen on the same date, include them in the "assignments" array for that date.
2. Normalize all dates to YYYY-MM-DD. If a date range is given (e.g., April 3–4), use "startDate" as the first day and "endDate" as the last day.
3. Normalize times to 24-hour format. If none are given, "startTime" and "endTime" must be null.
4. Capture room/location if present; otherwise set "location" to null.
5. Be concise but clear in "title".
6. Tagging rules:
   - "read" for readings/listening.
   - "write" for written work (drafts, briefs, motions, reports).
   - "oral" for oral arguments/presentations.
   - "evaluation" for surveys or course evaluations.
   - "other" for anything else.
7. Output only valid JSON. No commentary or explanation.

Now, extract all assignments from the syllabus and return them strictly as a JSON array of objects, one per date.

Syllabus text:
${text}`;

    return this.generateResponse(prompt, { maxTokens: 3000, temperature: 0.1 });
  }
}

export default new DeepSeekService();
