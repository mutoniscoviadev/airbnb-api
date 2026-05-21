import { ChatGroq } from "@langchain/groq";

// Main model — for general use (creative responses)
export const model = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  apiKey: process.env["GROQ_API_KEY"],
});

// Filter extraction model — temperature: 0 for deterministic JSON output
export const filterModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  apiKey: process.env["GROQ_API_KEY"],
});