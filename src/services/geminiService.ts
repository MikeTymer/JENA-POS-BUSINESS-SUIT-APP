import { GoogleGenAI } from "@google/genai";

// Safe way to access environment variables in both Node and Browser
const getApiKey = () => {
  try {
    // Try Vite's import.meta.env first (for client-side)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
    // Try process.env (for server-side or polyfilled environments)
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
};

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = getApiKey();
    if (apiKey) {
      aiInstance = new GoogleGenAI(apiKey);
    }
  }
  return aiInstance;
}

export async function generatePaymentReminder(customerName: string, amount: number, currency: string = 'UGX') {
  try {
    const ai = getAi();
    if (!ai) {
      throw new Error("Gemini API key not configured");
    }

    // Using the API pattern expected by @google/genai
    const response = await (ai as any).models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Generate a polite and professional payment reminder message for a customer named ${customerName} who has an outstanding debt of ${amount} ${currency}. The message should be suitable for SMS or Email. Keep it concise but friendly.`,
    });

    return response.text || `Dear ${customerName}, this is a friendly reminder of your outstanding balance of ${amount} ${currency}. Please settle it at your earliest convenience. Thank you!`;
  } catch (error) {
    console.error("Error generating reminder:", error);
    return `Dear ${customerName}, this is a friendly reminder of your outstanding balance of ${amount} ${currency}. Please settle it at your earliest convenience. Thank you!`;
  }
}
