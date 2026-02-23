
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API KEY found");
    return;
  }
  
  // Custom fetch to list models since the high-level SDK doesn't expose it easily
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => {
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
             console.log(`- ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log("No models returned. Error:", data);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

listModels();
