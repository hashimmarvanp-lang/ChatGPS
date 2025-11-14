
import { GoogleGenAI, GenerateContentResponse, Content, Part } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// fix: Use the 'latest' tag for gemini-flash-lite model as per guidelines.
const flashLiteModel = 'gemini-flash-lite-latest';
const flashModel = 'gemini-2.5-flash';
const proModel = 'gemini-2.5-pro';

export const generateText = async (
    prompt: string, 
    history: Content[],
    useLiteModel: boolean
): Promise<GenerateContentResponse> => {
    const model = useLiteModel ? flashLiteModel : flashModel;
    const chat = ai.chats.create({
        model,
        history,
        config: {
            systemInstruction: "You are ChatGPS, an AI assistant for students. Help with school service questions, homework like solving equations, and other academic inquiries. Be friendly, helpful, and accurate.",
        }
    });
    const response = await chat.sendMessage({ message: prompt });
    return response;
};

export const generateTextAndImage = async (
    prompt: string,
    image: { mimeType: string; data: string }
): Promise<GenerateContentResponse> => {
    const imagePart = {
        inlineData: image
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: flashModel,
        contents: { parts: [imagePart, textPart] }
    });
    return response;
};

export const generateTextAndVideo = async (
    prompt: string,
    frames: { mimeType: string; data: string }[]
): Promise<GenerateContentResponse> => {
    const textPart = { text: prompt };
    const imageParts: Part[] = frames.map(frame => ({
        inlineData: frame
    }));
    
    // Add a preamble to guide the model
    const preamble: Part = { text: "Analyze the following sequence of video frames to answer the user's question." };

    const response = await ai.models.generateContent({
        model: proModel,
        contents: { parts: [preamble, textPart, ...imageParts] }
    });
    return response;
};