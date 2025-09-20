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
LOCATION: optional room string for normal class meetings (or null).
INSTITUTION_TIMEZONE: e.g., "America/Phoenix" (reasoning only; do not output).
KNOWN_HOLIDAYS_OR_BREAKS: optional labels/dates mentioned in the syllabus (e.g., "Labor Day", "Spring Break"); if present, treat as "no class" on the mapped date.
SEMESTER_LABEL: optional string like "Fall 2024" or "Spring 2025" (used only to infer standard breaks/holidays if unlabeled in the PDF).

=== OUTPUT SCHEMA (tag-grouped for UL rendering) ===
Each object MUST include all fields exactly as shown (arrays may be empty):
{
"startDate": "YYYY-MM-DD" | null,
"endDate": "YYYY-MM-DD" | null,
"startTime": "HH:MM" | null,
"endTime": "HH:MM" | null,
"location": string | null,

"itemsByTag": {
"read": [],
"write": [],
"oral": [],
"evaluation": [],
"other": []
},

"assignments": [
{ "title": string, "tag": "read" | "write" | "oral" | "evaluation" | "other" }
]
}

=== CORE RULES ===

One object per calendar date (or date range). If multiple items share the same date, append them under the correct tag in "itemsByTag" and also list them in "assignments".

Normalize all dates to YYYY-MM-DD. If a range appears (e.g., "April 3-4" or "Apr 3-4"), set "startDate" to the first day and "endDate" to the last day.

Normalize times to 24-hour format:

If explicit times are given, parse them.

Else if MEETING_TIME exists and the item is tied to a class meeting, use MEETING_TIME's start and end.

Else set both "startTime" and "endTime" to null.

Set "location" to a session's room if explicitly attached to that session; otherwise, if it's a normal class meeting and LOCATION is provided, use LOCATION; else null.

Titles must be concise but specific; preserve case names, page ranges, UCC/Restatement cites, and article titles.

=== TAGGING ===

"read": readings/listening (cases, chapters, UCC/Restatement cites, articles, PDFs).

"write": any written work (drafts, briefs, memos, motions, papers, reports).

"oral": oral arguments/presentations.

"evaluation": surveys or course evaluations.

"other": anything else (announcements, quizzes/tests without clearer category, "No Class / Holiday", administrative tasks).

=== DATE LOGIC — HANDLE BOTH SYLLABUS STYLES ===
A) Syllabi with explicit calendar dates:

Use those dates as the source of truth and normalize to YYYY-MM-DD.

If a due time is explicitly given, parse to 24-hour format; else, if MEETING_TIME exists and the item is tied to a class meeting, use MEETING_TIME; otherwise leave times null.

B) Week-only syllabi ("Week N" without calendar dates):

Compute dates from COURSE_START_DATE and MEETING_DAYS.

Week mapping:

Week 1 begins on COURSE_START_DATE (the first class meeting).

For Week N: week_start = COURSE_START_DATE + 7*(N-1) days.

Map day letters to dates in that week using MEETING_DAYS order:
M=Mon, T=Tue, W=Wed, R=Thu, F=Fri, Sa=Sat, Su=Sun.
Example: MEETING_DAYS=["M","W"] → in any week, "M" = week_start; "W" = week_start + 2 days.
Example: MEETING_DAYS=["F"] → in any week, date = Friday of that week.

Assigning items within a week:

If a week lists items labeled by day letters (e.g., "M:", "W:"), place each item on that mapped date.

If a week lists unlabeled/unspecified items and there is one meeting day, place them all on that meeting day.

If there are multiple meeting days and the syllabus implies sequence, distribute items in MEETING_DAYS order. If unclear, place the first item on the first meeting day, then continue in order.

Holidays / Breaks (CRUCIAL) — no double-booking:

Build a set of blocked dates from:

KNOWN_HOLIDAYS_OR_BREAKS (explicit dates), and

Inferred U.S. academic/federal holidays for the year of COURSE_START_DATE when the syllabus mentions them by name without a date:

Labor Day = first Monday in September.

Thanksgiving = fourth Thursday in November (optionally also treat the following Friday as break if the syllabus states “Thanksgiving Break”).

Fall/Spring Break = if the syllabus names it with a specific week, block that week (Mon–Sun).

MLK Day = third Monday in January.

Presidents Day = third Monday in February.

Memorial Day = last Monday in May.

Independence Day = July 4 (if within the course window).

(Only infer holidays that are explicitly named in the syllabus text; do not invent breaks.)

If a mapped class meeting falls on a blocked date, create a single object for that date with:

itemsByTag.other: ["No Class — <label>"]

assignments: [{ "title": "No Class — <label>", "tag": "other" }]

Use MEETING_TIME/LOCATION if it's the normal class slot; otherwise null.

Do NOT attach any readings/writings/orals to that same date.

Do not shift the week's other items to different dates unless the syllabus explicitly says so. If the week lists, for example, “M: Labor Day Holiday; W: pp 153–172,” then only Wednesday gets the reading; Monday is a standalone “No Class” entry.

Due-by-day phrasing:

"Due by Friday of Week N" → map to the actual Friday of Week N (even if Friday is not in MEETING_DAYS).

Ranges within a week:

If an activity spans two mapped meeting days in the same week (e.g., "Oral Arguments this week on M and W"), output a single object with "startDate" = Monday date and "endDate" = Wednesday date, tag "oral", concise title.

=== MULTIPLE ITEMS ON THE SAME DAY ===

If more than one item occurs on one date (e.g., two readings), add each title to the appropriate "itemsByTag.<tag>" array and also include each as a separate element in "assignments".

Preserve syllabus order within each tag array.

=== DISAMBIGUATION & SANITY CHECKS ===

Prefer explicit dates over computed ones wherever both appear.

De-duplicate identical items on the same date (keep one).

If a session lists both a holiday and assignments on the same labeled day, treat the holiday as a hard block and do not place class work on that date unless the syllabus expressly says the assignment is still due that day (then include only the due item, not “class reading”).

If ambiguous, place items on the first meeting day of that week.

If “room” is given only once (course header), use it as LOCATION for normal meetings.

=== SORT ORDER ===

Sort the final JSON array by "startDate" ascending (use "endDate" to break ties if needed). For items on the same date, preserve syllabus order within each tag list.

=== EXAMPLE CLARIFICATION (non-normative) ===
If SEMESTER_LABEL = "Fall 2024", MEETING_DAYS=["M","W"], MEETING_TIME="09:00-10:50", LOCATION="Room F402", and the syllabus says “Week 3 — M: Labor Day Holiday; W: pp 153-172,” compute Labor Day = 2024-09-02 (first Monday of September) and create:

2024-09-02 → other: ["No Class — Labor Day"]

2024-09-04 → read: ["pp 153-172"]
Do not attach any readings to 2024-09-02. (This matches the PDF's “Week 3: M Labor Day Holiday; W pp 153-172” and header info MW 9:00-10:50, Room F402.)
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
