import { GoogleGenAI, FunctionDeclaration, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { EBook, MarketData, UserLevel } from "../types";

// Tool Definitions
const createEBookTool: FunctionDeclaration = {
  name: "create_ebook",
  description: "Generates the e-book structure (titles and outlines). Content is generated separately.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      author: { type: Type.STRING },
      description: { type: Type.STRING },
      theme: {
        type: Type.STRING,
        enum: ["modern", "classic", "fantasy", "technical", "sci-fi", "horror", "romance", "historical", "comic", "cyberpunk", "steampunk", "minimalist"]
      },
      format: { type: Type.STRING, enum: ["novel", "comic"] },
      chapters: {
        type: Type.ARRAY,
        description: "List of chapters with outlines.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            outline: { type: Type.STRING, description: "Detailed outline/plot summary of this chapter. Do NOT write the full content here." },
            imageKeyword: { type: Type.STRING, description: "A unique, descriptive visual keyword for this specific chapter." }
          },
          required: ["title", "outline", "imageKeyword"]
        }
      }
    },
    required: ["title", "author", "description", "theme", "chapters", "format"]
  }
};

const editChapterTool: FunctionDeclaration = {
  name: "edit_chapter",
  description: "Edits a specific chapter.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chapterIndex: { type: Type.INTEGER },
      newContent: { type: Type.STRING }
    },
    required: ["chapterIndex", "newContent"]
  }
};

const analyzeMarketTool: FunctionDeclaration = {
  name: "analyze_market",
  description: "Analyzes market potential.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING },
      difficultyScore: { type: Type.NUMBER },
      potentialEarnings: { type: Type.NUMBER },
      trendData: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { month: { type: Type.STRING }, value: { type: Type.NUMBER } } }
      },
      forecastData: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT, properties: { month: { type: Type.STRING }, value: { type: Type.NUMBER } } }
      },
      topKeywords: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            volume: { type: Type.STRING },
            competition: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
          }
        }
      },
      competitorInsights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            marketShare: { type: Type.NUMBER },
            strength: { type: Type.STRING },
            weakness: { type: Type.STRING }
          }
        }
      }
    },
    required: ["topic", "difficultyScore", "potentialEarnings", "trendData", "forecastData", "topKeywords", "competitorInsights"]
  }
};

const SYSTEM_INSTRUCTION_BASE = `
You are BookSmith Pro, a Professional Ebook Creator AI who writes premium, sell-ready ebooks.

**CORE DIRECTIVES:**
1. **PLANNING PHASE (CRITICAL):**
   - When asked for a book, FIRST design a logical, compelling structure.
   - Use \`create_ebook\` to define this structure.
   - **IMPORTANT:** Keep the \`outline\` for each chapter **CONCISE** (3-4 sentences max). 
   - **DO NOT** write long summaries in the JSON. This ensures the plan is created successfully without timeout.
   
   **EBOOK CREATION FORMAT (Follow EXACTLY):**
   - **Ebook Title + Subtitle**
   - **Chapter Structure:** Aim for a comprehensive list.
   - **Visuals:** For every chapter, you MUST provide a unique \`imageKeyword\` that describes a **16:9 infographic, chart, diagram, or professional illustration**. 
     - Examples: "Infographic timeline of AI history", "Pie chart showing market trends", "Flowchart of success steps", "Minimalist vector illustration of a team".
     - **AVOID** generic "cinematic" descriptions. Focus on **visual data** and **clean illustrations**.

2. **QUALITY OVER QUANTITY:**
   - Ensure chapter titles are creative and intriguing.
   - Select \`imageKeyword\` that creates a stunning visual knowing it will be used for AI art.

3. **STRICT USER ADHERENCE:** If the user provides specific details (Chapter Count, Plot Points, Names), you MUST use them exactly.

4. **NO CENSORSHIP ON FICTION:** 
   - This is a creative writing tool. Do not block fictional conflict, horror, or romance unless it violates safety policies.
`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chat: any;
  private apiKey: string;
  private currentLevel: UserLevel = 'Beginner';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Helper to wait (for rate limiting)
  private wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Minimalist vector art, symbolic illustration, or abstract data visualization of: ${prompt}. Clean lines, flat design, high contrast, trending on behance, corporate tech style. NO TEXT, NO WORDS, NO LABELS, NO NUMBERS. Visual metaphor only.` }]
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("No image data found in response");
    } catch (e) {
      console.error("Image generation failed:", e);
      throw e;
    }
  }

  private async generateChapterContent(book: any, chapter: any): Promise<string> {
    const prompt = `
    ACT AS: A Professional Ebook Creator AI.
    TASK: Write the full content for a chapter in a ${book.format}.

    **Book Metadata:**
    - Title: ${book.title}
    - Theme: ${book.theme}
    - Format: ${book.format}

    **Current Chapter:**
    - Title: ${chapter.title}
    - Context/Outline: ${chapter.outline}

    **WRITING STYLE RULES (EXTREMELY IMPORTANT):**
    - **LANGUAGE LEVEL:** Write in **very simple, conversational English** (Grade 6-7 level).
    - **NO COMPLEX WORDS:** Do not use difficult words or jargon. Use "easy to understand" words. (e.g., use "use" instead of "utilize", "help" instead of "facilitate").
    - **Human-Like:** Write as if explaining to a friend. Be warm, encouraging, and direct.
    - **Short Sentences:** Keep sentences short and punchy.
    - **Formatting:** Use bolding for key points. Use bullet points often.

    **CHAPTER CONTENT STRUCTURE (Follow EXACTLY):**
    1. **Simple Explanation:** Explain the concept simply.
    2. **Real Examples:** Give a relatable example.
    3. **Step-by-Step Guide:** Clear instructions (Step 1, Step 2...).
    4. **Checklist:** A simple list of things to do.
    5. **Summary:** One sentence wrap-up.

    **Length:** Write a substantial chapter (approx 800-1000 words).
    **Tone:** Friendly, Professional, Simple.
    
    Take your time and craft a masterpiece.
    `;

    let attempts = 0;
    while (attempts < 3) {
      try {
        const result = await this.ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt
        });
        return result.text || "";
      } catch (e: any) {
        console.error(`Failed to generate content for chapter: ${chapter.title} (Attempt ${attempts + 1})`, e);
        if (e.status === 429 || e.toString().includes('429')) {
          const waitTime = Math.pow(2, attempts) * 2000; // 2s, 4s, 8s
          console.log(`Rate limit hit. Waiting ${waitTime}ms...`);
          await this.wait(waitTime);
          attempts++;
          continue;
        }
        return `(Content generation failed. Outline: ${chapter.outline})`;
      }
    }
    return `(Content generation failed after retries. Outline: ${chapter.outline})`;
  }

  async startChat(level: UserLevel) {
    this.currentLevel = level;

    this.chat = this.ai.chats.create({
      model: "gemini-1.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        tools: [{ functionDeclarations: [createEBookTool, analyzeMarketTool, editChapterTool] }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });
  }

  async sendMessage(
    message: string,
    onEBookGenerated: (book: EBook) => void,
    onMarketAnalyzed: (data: MarketData) => void,
    onChapterEdited: (index: number, content: string) => void
  ): Promise<string> {

    if (!this.chat) await this.startChat('Beginner');

    let attempts = 0;
    const maxAttempts = 3;
    let lastError = "";

    while (attempts < maxAttempts) {
      try {
        let finalMessage = message;

        if (attempts > 0) {
          finalMessage += " (Focus on valid JSON. Keep outlines CONCISE.)";
        }

        const response = await this.chat.sendMessage({ message: finalMessage });
        const candidate = response.candidates?.[0];

        if (candidate?.finishReason === "MALFORMED_FUNCTION_CALL") {
          console.warn("Malformed JSON detected. Retrying...");
          throw new Error("MALFORMED_JSON");
        }

        if (candidate?.finishReason === "SAFETY") throw new Error("SAFETY_BLOCK");

        if (!response.text && (!response.functionCalls || response.functionCalls.length === 0)) {
          throw new Error("EMPTY_RESPONSE");
        }

        let responseText = response.text || "";
        const calls = response.functionCalls;

        if (calls && calls.length > 0) {
          const functionResponseParts = [];

          for (const call of calls) {
            const { name, args, id } = call;
            try {
              if (name === "create_ebook") {
                const bookData = args as any;

                // 1. Initialize book with outlines but empty content (or loading state)
                const initialChapters = bookData.chapters.map((ch: any) => ({
                  title: ch.title,
                  imageKeyword: ch.imageKeyword,
                  content: "" // Empty content initially
                }));

                bookData.chapters = initialChapters;

                // 2. Update UI immediately with the book structure
                onEBookGenerated(bookData as EBook);

                // 3. Start background generation (Fire and forget, but process updates)
                // We use a non-awaiting function or just let the loop continue?
                // Actually, we must return a response to the AI so IT stops waiting.
                // So we pushed the success response to functionResponseParts.
                functionResponseParts.push({ functionResponse: { name, response: { result: "Structure created. Generating content in background." }, id } });

                // 4. Trigger background generation process
                (async () => {
                  for (let i = 0; i < bookData.chapters.length; i++) {
                    const ch = bookData.chapters[i];
                    // Artificial delay to respect rate limits
                    if (i > 0) await this.wait(2000);

                    const content = await this.generateChapterContent(bookData, { ...ch, outline: args.chapters[i].outline }); // Use original outline

                    // Update UI
                    onChapterEdited(i, content);
                  }
                })();

              } else if (name === "analyze_market") {
                onMarketAnalyzed(args as unknown as MarketData);
                functionResponseParts.push({ functionResponse: { name, response: { result: "Success" }, id } });
              } else if (name === "edit_chapter") {
                onChapterEdited(args.chapterIndex, args.newContent);
                functionResponseParts.push({ functionResponse: { name, response: { result: "Success" }, id } });
              }
            } catch (toolError) {
              console.error(`Tool Execution Error (${name}):`, toolError);
              functionResponseParts.push({ functionResponse: { name, response: { error: "Processing failed" }, id } });
            }
          }

          if (functionResponseParts.length > 0) {
            try {
              const toolResponse = await this.chat.sendMessage({ message: functionResponseParts });
              if (toolResponse.text) responseText += "\n\n" + toolResponse.text;
            } catch (e) {
              console.warn("Tool acknowledgment skipped (non-fatal).");
            }
          }
        }

        return responseText || "Content generated successfully!";

      } catch (error: any) {
        console.error(`Gemini Error (Attempt ${attempts + 1}):`, error);
        lastError = error.message || error.toString();

        const errStr = lastError.toLowerCase();

        if (errStr.includes('429') || errStr.includes('503')) {
          const waitTime = (attempts + 1) * 2000;
          console.log(`Limit hit. Waiting ${waitTime}ms...`);
          await this.wait(waitTime);
          attempts++;
          continue;
        }

        if (errStr.includes('403') || errStr.includes('key not valid')) throw error;

        attempts++;
        if (attempts >= maxAttempts) break;
        await this.wait(1500);
      }
    }
    return `I encountered an error: "${lastError}". Please try asking for fewer chapters (e.g., 5) or a shorter story.`;
  }
}