# Rail Vaani — What Changed

## Drop-in replacement files

Copy the contents of this zip into your project. No new dependencies needed.

```
backend/
  server.js     ← routing fix: dynamic queries → Sarvam Chat
  sarvam.js     ← STT language fix + TTS preprocessing fix
  intent.js     ← Bhopal Express alias, Next-hour intent, Telugu dest matching, time-to-words

frontend/src/
  VoiceBot.jsx  ← new centered layout, no history, quick queries updated, dark/light toggle
  index.css     ← full dark/light CSS variable system
```

## Bug fixes

| # | Bug | Fix |
|---|-----|-----|
| 1 | Telugu quick queries not working | Fixed Telugu destination regex (Unicode range); added `న్యూ ఢిల్లీ`/`ఢిల్లీ` aliases; added `రైళ్లు` to isTrainSearch pattern |
| 2 | "help me" / dynamic queries not reaching Sarvam Chat | `unknown` topic is NOT in `useStaticIntents` → routes to `sarvamChat()` with full station knowledge |
| 3 | Hindi/Telugu STT not processing | `hi-IN`/`te-IN` now uses REST API directly (streaming WebSocket was failing silently for non-English) |
| 4 | Timings spoken in English even for Hindi/Telugu | All time strings now go through `timeToWords(time, lang)` — English gets "8 52 AM", Hindi gets "आठ बजकर बावन मिनट", Telugu gets "ఎనిమిది గంటల యాభై రెండు నిమిషాలకు" |
| 5 | TTS mispronouncing Hindi/Telugu | `enable_preprocessing: true` for ALL languages (was English-only) |
| 6 | "Bhopal Express" quick query not matching | Added `"bhopal express"`, `"bhopal"`, Hindi+Telugu variants to TRAIN_NAME_ALIASES |

## New features

- **Dark / Light mode toggle** — sun/moon button in header, defaults to dark, toggles instantly via `data-theme` on `<html>`
- **Centered voice assistant** — mic orb in the middle, transcript bubble above, response bubble below, no chat history
- **Always-visible text input** — no keyboard toggle needed
- **5 new quick queries per language** — trains to New Delhi today, Mumbai Rajdhani number, Bhopal Express arrival, all trains next 1 hour, Howrah Rajdhani platform
- **"Next 1 hour trains" intent** — lists all trains in dataset across EN/HI/TE
