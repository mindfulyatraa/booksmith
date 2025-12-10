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
You are BookSmith Pro.

**CORE DIRECTIVES:**
1. **STRUCTURE FIRST:** When asked to create a book, use \`create_ebook\` to define the structure (chapters and outlines). 
   - **DO NOT** write the full chapter content in the JSON.
   - Just provide a detailed \`outline\` for each chapter.
   - The system will automatically generate the full text content based on your outlines.
2. **STRICT USER ADHERENCE:** If the user provides specific details (Chapter Count, Plot Points, Names), you MUST use them exactly.
3. **VISUALS:** Every chapter MUST have a unique, highly descriptive \`imageKeyword\` for generating illustrations.
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
          parts: [{ text: `Cinematic, highly detailed, atmospheric illustration of: ${prompt}. Digital art style, 8k resolution, professional lighting.` }]
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
    Write the full content for a chapter in a ${book.format}.
    
    **Book Title:** ${book.title}
    **Theme:** ${book.theme}
    **Chapter Title:** ${chapter.title}
    **Chapter Outline:** ${chapter.outline}
    
    **Instructions:**
    - Write extensive, detailed content (approx 800-1000 words).
    - Include dialogue, sensory details, and proper pacing.
    - Do NOT include the chapter title at the start, just the story text.
    - Format in Markdown.
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      return result.text || "";
    } catch (e) {
      console.error(`Failed to generate content for chapter: ${chapter.title}`, e);
      return `(Content generation failed. Outline: ${chapter.outline})`;
    }
  }

  async startChat(level: UserLevel) {
    this.currentLevel = level;

    this.chat = this.ai.chats.create({
      model: "gemini-2.5-flash",
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

    while (attempts < maxAttempts) {
      try {
        let finalMessage = message;

        if (attempts === 1) {
          finalMessage += " (Ensure valid JSON output.)";
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

        const errStr = error.toString().toLowerCase();

        if (errStr.includes('429') || errStr.includes('503')) {
          const waitTime = (attempts + 1) * 2000;
          console.log(`Limit hit. Waiting ${waitTime}ms...`);
          await this.wait(waitTime);
          attempts++;
          continue;
        }

        if (errStr.includes('403') || errStr.includes('key not valid')) throw error;

        attempts++;
        if (attempts >= maxAttempts) throw error;
        await this.wait(1500);
      }
    }
    return "I'm having trouble generating that much content at once. Please try asking for fewer chapters or a shorter story.";
  }
}