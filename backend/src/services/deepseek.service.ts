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
    const prompt = `
You are an expert Legal Syllabus Data Extractor. Read the uploaded syllabus PDF and extract all assignment-related details (readings, writing tasks, oral arguments, evaluations, other work).

You must output a JSON array where **each calendar date (or date range) is one object**. Never combine the whole term into one object.

=== VARIABLES (provided to you) ===
COURSE_START_DATE: ISO date string (YYYY-MM-DD) for the first actual class meeting (e.g., 2024-08-26).
MEETING_DAYS: array of meeting-day abbreviations in weekly order, e.g., ["M","W"], ["F"], ["T","R"], ["M","T","W"], etc.
MEETING_TIME: optional time block like "09:00-10:50" (24h) or null if unknown.
INSTITUTION_TIMEZONE: e.g., "America/Phoenix" (reasoning only; do not output).
KNOWN_HOLIDAYS_OR_BREAKS: optional labels/dates mentioned in the syllabus (e.g., "Labor Day", "Spring Break"); if present, treat as "no class" on the mapped date.

=== OUTPUT SCHEMA (tag-grouped for UL rendering) ===
Each object MUST include all fields exactly as shown (arrays may be empty):
{
  "startDate": "YYYY-MM-DD" | null,
  "endDate": "YYYY-MM-DD" | null,
  "startTime": "HH:MM" | null,
  "endTime": "HH:MM" | null,
  "location": string | null,

  // Group items by tag so the UI can render bullets under each tag
  "itemsByTag": {
    "read": [],
    "write": [],
    "oral": [],
    "evaluation": [],
    "other": []
  },

  // Back-compat flat list (duplicate of the above, one entry per item)
  "assignments": [
    { "title": string, "tag": "read" | "write" | "oral" | "evaluation" | "other" }
  ]
}

=== CORE RULES ===
1) **One object per calendar date (or date range).** If multiple items share the same date, append them under the correct tag in "itemsByTag" and also list them in "assignments".
2) Normalize all dates to YYYY-MM-DD. If a range appears (e.g., "April 3–4" or "Apr 3-4"), set "startDate" to the first day and "endDate" to the last day.
3) Normalize times to 24-hour format:
   - If explicit times are given, parse them.
   - Else if MEETING_TIME exists and the item is tied to a class meeting, use MEETING_TIME's start and end.
   - Else set both "startTime" and "endTime" to null.
4) Capture room/location if present; otherwise set "location" to null.
5) Titles must be concise but specific; preserve case names, page ranges, UCC/Restatement cites, and article titles.

=== TAGGING ===
- "read": readings/listening (cases, chapters, UCC/Restatement cites, articles, PDFs).
- "write": any written work (drafts, briefs, memos, motions, papers, reports).
- "oral": oral arguments/presentations.
- "evaluation": surveys or course evaluations.
- "other": anything else (announcements, quizzes/tests without clearer category, "No Class / Holiday", administrative tasks).

=== DATE LOGIC — HANDLE BOTH SYLLABUS STYLES ===
A) Syllabi with explicit calendar dates (e.g., "Mon Aug 26", "Jan 17"):
   - Use those dates as the source of truth and normalize to YYYY-MM-DD.
   - If a due time is explicitly given, parse to 24-hour format; else, if MEETING_TIME exists and the item is tied to a class meeting, use MEETING_TIME; otherwise leave times null.

B) Week-only syllabi ("Week N" without calendar dates):
   - Compute dates from COURSE_START_DATE and MEETING_DAYS.

   **Week mapping:**
   - Week 1 begins on COURSE_START_DATE (the first class meeting).
   - For Week N: week_start = COURSE_START_DATE + 7*(N-1) days.
   - Map day letters to dates in that week using MEETING_DAYS order:
       M=Mon, T=Tue, W=Wed, R=Thu, F=Fri, Sa=Sat, Su=Sun.
       Example: MEETING_DAYS=["M","W"] → in any week, "M" = week_start; "W" = week_start + 2 days.
       Example: MEETING_DAYS=["F"] → in any week, date = Friday of that week.
   - If a week lists items labeled by day letters (e.g., "M: Read X; W: Draft due"), place each item on that week's mapped day.
   - If a week lists unlabeled/unspecified items and there is **one** meeting day, place them all on that meeting day (and group under tags).
   - If there are **multiple** meeting days and the syllabus implies sequence (readings first, then quiz, etc.), distribute items in MEETING_DAYS order across that week. If unclear, place the first item on the first meeting day, then continue in order until items are assigned.

   **Holidays / No Class:**
   - If the syllabus indicates "No Class", "Holiday", or a break (e.g., "Labor Day", "Spring Break"), still create a JSON object for that computed date with:
       "itemsByTag.other": ["No Class — <label>"]
       and an equivalent entry in "assignments" with tag "other".
   - Do **not** shift later items to different dates unless the syllabus explicitly says so.

   **Due-by-day phrasing:**
   - "Due by Friday of Week N" → map to the actual Friday of Week N (even if Friday is not in MEETING_DAYS).

   **Ranges within a week:**
   - If an activity spans two mapped meeting days in the same week (e.g., "Oral Arguments this week on M and W"), output a single object with "startDate" = Monday date and "endDate" = Wednesday date, tag "oral", concise title.

=== MULTIPLE ITEMS ON THE SAME DAY ===
- When more than one item occurs on one date (e.g., two readings), add each title to the appropriate "itemsByTag.<tag>" array (so the UI can render bullets) and also include each as a separate element in "assignments".
- Preserve syllabus order **within each tag array**.

=== DISAMBIGUATION & SANITY CHECKS ===
- Prefer explicit dates over computed ones wherever both appear.
- De-duplicate identical items on the same date (keep one).
- If “room” or location is mentioned (for course or a specific session), include it.
- If ambiguous (e.g., unlabeled items with multiple meeting days), make the most reasonable mapping per rules above; if still unclear, place on the **first** meeting day of that week.

=== SORT ORDER ===
- Sort the final JSON array by "startDate" ascending (use "endDate" to break ties if needed). For items on the same date, preserve syllabus order within each tag list.

=== OUTPUT REQUIREMENTS ===
- Return **only valid JSON** (no commentary).
- Every date object must include all five tag arrays in "itemsByTag" (use empty arrays if none).
- Titles must not include trailing punctuation unless part of a citation.

Now, extract all assignments from the syllabus and return them strictly as a JSON array of objects, one per date (or date range).

Syllabus text:
${text}`;

    return this.generateResponse(prompt, { maxTokens: 3000, temperature: 0.1 });
  }
}

export default new DeepSeekService();
