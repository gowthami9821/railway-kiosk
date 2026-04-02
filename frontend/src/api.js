
// import axios from "axios";

// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// /**
//  * Send recorded audio blob to backend and receive audio response
//  * @param {Blob} audioBlob - The recorded audio blob
//  * @returns {Promise<{ audioBlob: Blob, transcript: string, intent: string, responseText: string }>}
//  */
// export async function sendVoiceMessage(audioBlob) {
//   const formData = new FormData();
  
//   // Append audio blob as a file
//   formData.append("audio", audioBlob, "audio.wav");

//   const response = await axios.post(`${API_BASE}/voice`, formData, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//     responseType: "arraybuffer", // Important: receive binary audio data
//     timeout: 30000,
//   });

//   // Extract metadata from response headers
//   const transcript = decodeURIComponent(
//     response.headers["x-transcript"] || ""
//   );
//   const intent = response.headers["x-intent"] || "unknown";
//   const responseText = decodeURIComponent(
//     response.headers["x-response-text"] || ""
//   );

//   // Convert arraybuffer to Blob for audio playback
//   const audioResponseBlob = new Blob([response.data], { type: "audio/wav" });

//   return { audioBlob: audioResponseBlob, transcript, intent, responseText };
// }

// /**
//  * Send text query to backend (fallback/testing)
//  * @param {string} text - The text query
//  * @returns {Promise<{ audioBlob: Blob, intent: string, responseText: string }>}
//  */
// export async function sendTextMessage(text) {
//   const response = await axios.post(
//     `${API_BASE}/text`,
//     { text },
//     {
//       headers: { "Content-Type": "application/json" },
//       responseType: "arraybuffer",
//       timeout: 30000,
//     }
//   );

//   const intent = response.headers["x-intent"] || "unknown";
//   const responseText = decodeURIComponent(
//     response.headers["x-response-text"] || ""
//   );
//   const audioBlob = new Blob([response.data], { type: "audio/wav" });

//   return { audioBlob, intent, responseText };
// }

// /**
//  * Check backend health
//  */
// export async function checkHealth() {
//   const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
//   return response.data;
// }
// api.js - API calls to the Railway Voice Bot Backend
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Send recorded audio blob to backend and receive audio response
 * @param {Blob} audioBlob - The recorded audio blob
 * @param {string} language - Language code: 'en-IN' | 'hi-IN' | 'te-IN'
 */
export async function sendVoiceMessage(audioBlob, language = "en-IN") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.webm");
  formData.append("language", language);

  const response = await axios.post(`${API_BASE}/voice`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "arraybuffer",
    timeout: 30000,
  });

  const transcript = decodeURIComponent(response.headers["x-transcript"] || "");
  const intent = response.headers["x-intent"] || "unknown";
  const responseText = decodeURIComponent(response.headers["x-response-text"] || "");
  const audioResponseBlob = new Blob([response.data], { type: "audio/wav" });

  return { audioBlob: audioResponseBlob, transcript, intent, responseText };
}

/**
 * Send text query to backend
 * @param {string} text - The text query
 * @param {string} language - Language code
 */
export async function sendTextMessage(text, language = "en-IN") {
  const response = await axios.post(
    `${API_BASE}/text`,
    { text, language },
    {
      headers: { "Content-Type": "application/json" },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );

  const intent = response.headers["x-intent"] || "unknown";
  const responseText = decodeURIComponent(response.headers["x-response-text"] || "");
  const audioBlob = new Blob([response.data], { type: "audio/wav" });

  return { audioBlob, intent, responseText };
}

export async function checkHealth() {
  const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
  return response.data;
}
