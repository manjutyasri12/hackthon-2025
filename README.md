# VisualCogn

VisualCogn is a small front-end demo that provides accessibility features for visually impaired and cognitive users. It runs entirely in the browser and demonstrates:

- File upload (text and images)
- OCR for images (Tesseract.js)
- Image identification (ml5 / MobileNet)
- Text-to-speech (Web Speech API) with adjustable speed and keyboard shortcuts
- Downloadable audio (MP3 via `lamejs` when available, otherwise WAV via `meSpeak`)
- Speech-to-text (browser SpeechRecognition) and a simple Braille Unicode conversion
- A simple cognitive-friendly summary (first few sentences)

Files
- `index.html` — main UI
- `styles.css` — minimal styles
- `script.js` — main logic (OCR, TTS, braille, shortcuts)

Usage
1. Open `index.html` in a modern Chrome/Edge browser (best support).
2. The site will announce its name on load.
3. Use the `Upload File` button (or press `U`) to select a text or image file.
4. Press `E` or click `Extract Text` to run OCR/extract text.
5. Press `S` or click `Read Aloud` to hear the text. Use `+`/`-` or the numeric controls to change speed.
6. Press `D` or click `Download Audio` to download an MP3 (if the browser allows `lamejs`) or WAV as fallback.
7. Press `I` to identify images, `R` to record speech and convert to Braille, `H` for help.

Limitations
- MP3 encoding uses `lamejs` in-browser; performance depends on the device and browser.
- Speech recognition (for Braille) requires browser support (Chrome/Edge recommended).
- PDF text extraction is supported in-browser using `pdf.js`; upload a PDF and press `E` to extract text. If pages are scanned images, VisualCogn will render pages to a canvas and run OCR (Tesseract) to extract text.
- This is a demo; consider server-side processing for heavy workloads or production use.

License
This demo is provided as-is for demonstration purposes. Modify and reuse as you need.
# hackthon-2025