
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API KEY found in environment");
    return;
  }
  
  console.log("Using API Key: " + apiKey.substring(0, 5) + "...");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Try to list models (if the SDK supports it easily, or just try a generation)
    // The SDK doesn't always expose listModels directly in the main client class in older versions, 
    // but let's try a simple generation with 'gemini-1.5-flash' first.
    
    console.log("Testing generation with gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("Response: " + response.text());
    
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.message);
    
    // Fallback test
    try {
        console.log("Testing generation with gemini-pro...");
        const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
        const resultPro = await modelPro.generateContent("Hello?");
        const responsePro = await resultPro.response;
        console.log("Response from Pro: " + responsePro.text());
    } catch (err2) {
        console.error("Error with gemini-pro:", err2.message);
    }
  }
}

run();
