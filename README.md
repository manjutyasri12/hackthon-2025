# VisualCogn

VisualCogn is a front-end accessibility tool for visually impaired and cognitive users. It runs entirely in the browser and demonstrates:

- File upload (text, images, PDFs)
- OCR for images and scanned PDFs (Tesseract.js)
- Image identification (ml5 / MobileNet)
- Full-document text-to-speech with Play/Pause/Stop controls
- Adjustable speech speed (0.5x–2x) and keyboard shortcuts
- Text extraction with automatic normalization (removes artifacts, line-break formatting)
- Extractive summarization with document stats (word count, estimated reading time)
- MP3/audio export (via online TTS converters or device text-to-speech)
- Speech-to-text recognition and Braille Unicode conversion
- Professional, responsive UI with large buttons and symbols for cognitive accessibility

Files
- `index.html` — accessible UI with Play/Pause/Stop, summary table
- `styles.css` — professional grid layout and styling
- `script.js` — OCR, PDF extraction, chunked TTS, text normalization, summarization, keyboard shortcuts, Braille conversion

Features
1. **Upload & Extract** (`U`, `E`): Upload text files, images, or PDFs. Automatically extracts and normalizes text.
2. **Text-to-Speech** (`S`, `P`, `T`): Play full extracted text with Play/Pause/Stop controls and adjustable speed.
3. **Summary Table**: View extractive summary (top sentences) + word count, sentence count, reading time estimate.
4. **Download** (`D`): Download extracted text or copy to clipboard for online TTS converters (Google Translate, Natural Reader, etc.).
5. **Image Identify** (`I`): Describe uploaded images using ML classification.
6. **Braille** (`R`): Record speech and convert recognized text to Unicode Braille.
7. **Shortcuts**: Press `H` for help; use keyboard shortcuts for hands-free operation.

Usage
1. Open `index.html` in Chrome or Edge (best browser support for speech APIs).
2. Site announces itself on load.
3. **Upload file**: Press `U` to select a text/image/PDF file.
4. **Extract text**: Press `E`. OCR progress is announced for scanned PDFs.
5. **Read aloud**: Press `S` to Play. Press `P` to Pause/Resume. Press `T` to Stop. Use `+`/`-` to adjust speed.
6. **View summary**: Summary table shows key sentences and document statistics.
7. **Download audio**: Press `D` to download text or copy to online TTS service (Google Translate, Natural Reader, Voiceovers.ai).
8. **Other features**: `I` = identify image, `R` = speech-to-braille, `H` = help/shortcuts.

Notes & Limitations
- **Browser APIs**: SpeechSynthesis (TTS) and SpeechRecognition (speech-to-text) have varying support. Chrome/Edge recommended.
- **OCR**: Tesseract.js runs in-browser; large PDFs may be slow. Consider reducing page scale or using server-side processing for high volume.
- **Text Extraction**: Scanned PDFs are automatically detected and OCRed per-page. Text PDFs extract instantly.
- **Summarization**: Uses extractive (term-frequency based) summarization. For abstractive summaries, integrate an external API.
- **Audio Export**: Client-side MP3 encoding is complex in browsers. Tool provides text export and clipboard copy for online TTS services.
- **Accessibility**: Full keyboard navigation, ARIA labels, live regions, talkback announcements. Works with screen readers (NVDA, JAWS, VoiceOver).

Supported File Types
- **Text**: `.txt`, `.md`, plaintext
- **Images**: `.jpg`, `.png`, `.gif`, `.webp` (OCR via Tesseract)
- **PDFs**: `.pdf` (text extraction + scanned-page OCR)

Online TTS Services (for MP3 export)
- [Google Translate](https://translate.google.com) — Paste text, select language & voice, download MP3
- [Natural Reader](https://www.naturalreader.com) — Free online TTS with voice options
- [Voiceovers.ai](https://voiceovers.ai) — AI voices with commercial license options
- [ReadSpeaker](https://www.readspeaker.com) — Professional TTS API

Keyboard Shortcuts
| Key | Action |
|-----|--------|
| U | Upload file |
| E | Extract text |
| S | Play audio |
| P | Pause / Resume |
| T | Stop audio |
| D | Download text / copy to clipboard |
| I | Identify image |
| R | Record speech → Braille |
| H | Show help |
| +/- | Increase / decrease speech speed |
| 1 | Speed 1.0x |
| 2 | Speed 1.5x |
| 3 | Speed 2.0x |

Example Workflow
1. User opens VisualCogn; site announces itself.
2. User presses `U`, selects a scanned PDF.
3. User presses `E` to extract. OCR progress announced; full text displayed.
4. User presses `S` to start reading. Presses `P` to pause, adjusts speed with `+/-`.
5. User presses `D`, chooses to copy text to clipboard.
6. User pastes into Google Translate, selects a voice, and downloads MP3.
7. User saves MP3 for offline use or sharing.

License
This demo is provided as-is for demonstration purposes. Modify and reuse as needed.
