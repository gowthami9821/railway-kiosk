// server.js - Railway Voice Bot Backend — Updated
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { speechToText, textToSpeech, sarvamChat } = require("./sarvam");
const { detectIntent } = require("./intent");

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================
// MIDDLEWARE
// =============================================

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

const cors = require("cors");

app.use(cors({
  origin: "https://rkp-net.netlify.app", // your frontend URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// =============================================
// MULTER CONFIGURATION
// =============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadsDir); },
  filename: (req, file, cb) => {
    const uniqueName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("audio/") ||
      file.originalname.endsWith(".wav") ||
      file.originalname.endsWith(".webm") ||
      file.originalname.endsWith(".ogg")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"), false);
    }
  },
});

// =============================================
// HELPER - Cleanup
// =============================================

function cleanupFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("[Cleanup] Deleted:", path.basename(filePath));
    }
  } catch (err) {
    console.error("[Cleanup] Error:", err.message);
  }
}

// =============================================
// HELPER - Build final response text
// =============================================

/**
 * Route the query:
 * - Known intents (train info, platform, timing, etc.) → use static text from intent.js
 *   which already has perfect Hindi/Telugu number-words.
 * - Unknown / dynamic queries (help, general questions) → Sarvam Chat AI
 *
 * CRITICAL: Static text from intent.js already formats times and numbers
 * correctly in each language. Chat AI is only for truly unknown queries.
 */
async function buildResponseText(userQuery, intentData, staticText, language) {
  // These intents use static text (already perfectly formatted with native number words)
  const useStaticIntents = [
    "greeting", "farewell", "pnr_status", "ticket_booking", "ticket_info", "no_input",
    "train_number", "train_status", "train_location", "train_platform",
    "train_arrival", "train_departure", "train_timing", "train_delay",
    "train_search", "next_hour_trains", "platform_trains", "platform_facility", "facility",
    "arrival_time", "departure_time", "timing", "platform_query",
  ];

  let parsedIntent = null;
  try {
    parsedIntent = JSON.parse(intentData);
  } catch (_) {}

  const topic = parsedIntent?.topic || "";

  if (useStaticIntents.includes(topic)) {
    console.log("[Routing] Using static text for known intent:", topic);
    return staticText;
  }

  // For unknown/dynamic queries: route to Sarvam Chat
  console.log("[Routing] Dynamic query → Sarvam Chat | topic:", topic || "unknown");
  const aiResponse = await sarvamChat(userQuery, intentData, language);

  if (aiResponse && aiResponse.trim()) {
    console.log("[Chat] Using AI response");
    return aiResponse.trim();
  }

  // Last resort: static fallback
  console.log("[Chat] AI response empty — using static fallback");
  return staticText;
}

// =============================================
// ROUTES
// =============================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Railway Voice Bot Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// ── Main voice processing endpoint ──────────────────────────────────────────
app.post("/voice", upload.single("audio"), async (req, res) => {
  const uploadedFilePath = req.file?.path;
  const language = req.body?.language || "en-IN";

  console.log("\n--- New Voice Request ---");
  console.log("[Upload] File:", req.file?.filename, "| Size:", req.file?.size, "bytes | Lang:", language);

  try {
    // Step 1: Speech to Text
    console.log("[Step 1] Converting speech to text... Lang:", language);
    const transcript = await speechToText(uploadedFilePath, language);

    if (!transcript || transcript.trim() === "") {
      cleanupFile(uploadedFilePath);
      return res.status(400).json({
        error: "Could not transcribe audio. Please speak clearly and try again.",
      });
    }
    console.log("[Step 1] Transcript:", transcript);

    // Step 2: Detect Intent
    console.log("[Step 2] Detecting intent...");
    const { intent, response: staticText, intentData } = detectIntent(transcript, language);
    console.log("[Step 2] Intent:", intent);

    // Step 3: Build response text (static for known intents, AI for dynamic)
    console.log("[Step 3] Building response text...");
    const responseText = await buildResponseText(transcript, intentData, staticText, language);
    console.log("[Step 3] Final response:", responseText);

    // Step 4: Text to Speech — pass the correct language for proper TTS
    console.log("[Step 4] Generating audio... Lang:", language);
    const audioBuffer = await textToSpeech(responseText, language);

    cleanupFile(uploadedFilePath);

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": audioBuffer.length,
      "X-Transcript": encodeURIComponent(transcript),
      "X-Intent": intent,
      "X-Response-Text": encodeURIComponent(responseText),
    });

    console.log("[Step 5] Sending audio response:", audioBuffer.length, "bytes");
    return res.send(audioBuffer);

  } catch (error) {
    cleanupFile(uploadedFilePath);
    console.error("[Error]", error.message);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred. Please try again.",
    });
  }
});

// ── Text-only endpoint ───────────────────────────────────────────────────────
app.post("/text", async (req, res) => {
  const { text, language = "en-IN" } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  console.log("\n--- New Text Request ---");
  console.log("[Text] Query:", text, "| Lang:", language);

  try {
    const { intent, response: staticText, intentData } = detectIntent(text, language);
    console.log("[Text] Intent:", intent);

    const responseText = await buildResponseText(text, intentData, staticText, language);
    console.log("[Text] Final response:", responseText);

    // TTS with correct language
    const audioBuffer = await textToSpeech(responseText, language);

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": audioBuffer.length,
      "X-Intent": intent,
      "X-Response-Text": encodeURIComponent(responseText),
    });

    return res.send(audioBuffer);
  } catch (error) {
    console.error("[Text Error]", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// =============================================
// ERROR HANDLING
// =============================================

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Audio file too large. Maximum size is 10MB." });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// =============================================
// START SERVER
// =============================================

app.listen(PORT, () => {
  console.log(`\n🚂 Railway Voice Bot Backend`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎤 Voice endpoint: POST http://localhost:${PORT}/voice`);
  console.log(`⌨️  Text endpoint:  POST http://localhost:${PORT}/text`);
  console.log(`\n⚠️  Make sure SARVAM_API_KEY is set in .env\n`);
});
