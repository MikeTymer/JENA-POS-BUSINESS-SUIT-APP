import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generatePaymentReminder(customerName: string, amount: number, currency: string = 'UGX') {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a polite and professional payment reminder message for a customer named ${customerName} who has an outstanding debt of ${amount} ${currency}. The message should be suitable for SMS or Email. Keep it concise but friendly.`,
    });

    return response.text || `Dear ${customerName}, this is a friendly reminder of your outstanding balance of ${amount} ${currency}. Please settle it at your earliest convenience. Thank you!`;
  } catch (error) {
    console.error("Error generating reminder:", error);
    return `Dear ${customerName}, this is a friendly reminder of your outstanding balance of ${amount} ${currency}. Please settle it at your earliest convenience. Thank you!`;
  }
}
