import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private currentModel: string = 'gemini-3-flash-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public initializeChat(systemInstruction: string, chatHistoryContext: string = '') {
    // We inject the chat history into the system instruction so the model knows the "Room Context"
    // even though it wasn't part of the direct API session history.
    const fullInstruction = `
${systemInstruction}

CONTEXT - RECENT CHAT HISTORY OF THE CHANNEL:
${chatHistoryContext}
(End of History)
`;

    this.chatSession = this.ai.chats.create({
      model: this.currentModel,
      config: {
        systemInstruction: fullInstruction,
        temperature: 0.9, 
      },
    });
  }

  public async *sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
    if (!this.chatSession) {
      throw new Error("Chat session not initialized");
    }

    try {
      const result = await this.chatSession.sendMessageStream({ message });

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      yield " [Error: Could not connect to the AI service. Please check your API key or connection.]";
    }
  }
}

export const geminiService = new GeminiService();
