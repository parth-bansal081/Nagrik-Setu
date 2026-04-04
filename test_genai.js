require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: ['Hello World!']
        });
        console.log(response.text);
    } catch (e) {
        console.error(e);
    }
}
test();
