// VisualCogn - client-side accessibility helpers
(() => {
  const announce = (text, priority = 'polite') => {
    // ARIA live region
    const live = document.getElementById('file-info');
    live.textContent = text;
    // Speech (Talkback)
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      const speed = parseFloat(document.getElementById('speed').value) || 1;
      u.rate = speed;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
  };

  // Announce site name on load
  window.addEventListener('load', () => {
    const announceText = 'Welcome to VisualCogn, accessible tools for visually and cognitively impaired users.';
    // slight delay for voices to load
    setTimeout(() => announce(announceText), 400);
  });

  // Elements
  const fileInput = document.getElementById('file-input');
  const btnExtract = document.getElementById('btn-extract');
  const btnSpeak = document.getElementById('btn-speak');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const btnDownload = document.getElementById('btn-download');
  const btnIdentify = document.getElementById('btn-identify');
  const btnRecord = document.getElementById('btn-record');
  const btnHelp = document.getElementById('btn-help');
  const extractedText = document.getElementById('extracted-text');
  const imagePreview = document.getElementById('image-preview');
  const brailleOutput = document.getElementById('braille-output');
  const summaryOutput = document.getElementById('summary-output');
  const progressEl = document.getElementById('progress');

  let lastFile = null;
  let lastText = '';
  // TTS state
  let ttsQueue = [];
  let ttsIndex = 0;
  let ttsPlaying = false;
  let ttsPaused = false;

  // Normalize extracted text for readability (remove line-break artifacts, hyphenation)
  function normalizeText(raw) {
    if (!raw) return '';
    let t = String(raw);
    // remove Windows CR
    t = t.replace(/\r/g, '\n');
    // fix hyphenation at line breaks: "exam-\nple" -> "example"
    t = t.replace(/-\n/g, '');
    // collapse multiple blank lines to a paragraph separator marker
    t = t.replace(/\n\s*\n+/g, '__PAR__');
    // replace remaining single newlines with spaces (line wraps)
    t = t.replace(/\n+/g, ' ');
    // restore paragraph separators
    t = t.replace(/__PAR__/g, '\n\n');
    // collapse multiple spaces
    t = t.replace(/ {2,}/g, ' ');
    // trim
    return t.trim();
  }

  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    lastFile = f;
    brailleOutput.textContent = '';
    summaryOutput.textContent = '';
    imagePreview.innerHTML = '';

    if (!f) return;
    announce(`File ${f.name} selected. Press E to extract text.`);
    // clear previous progress and extracted text
    if (progressEl) { progressEl.textContent = ''; progressEl.classList.add('sr-only'); }
    if (extractedText) extractedText.value = '';

    // show preview for images
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.alt = f.name;
      img.src = url;
      imagePreview.appendChild(img);
    }

    // immediate read for text files
    if (f.type === 'text/plain' || f.name.endsWith('.txt')) {
      const txt = await f.text();
      const normalized = normalizeText(txt);
      extractedText.value = normalized;
      lastText = normalized;
      // enable read option when a text file is loaded
      if (typeof btnSpeak !== 'undefined' && btnSpeak) btnSpeak.disabled = false;
    }
  });

  // Simple extraction: text files or OCR for images
  btnExtract.addEventListener('click', async () => {
    if (!lastFile) { announce('No file selected. Use Upload or press U.'); return; }
    announce('Extracting text now. This may take a few seconds.');

    if (lastFile.type.startsWith('image/')) {
      try {
        const { data } = await Tesseract.recognize(lastFile, 'eng');
        const normalized = normalizeText(data.text || '');
        extractedText.value = normalized;
        lastText = normalized;
        announce('Text extracted from image.');
        if (typeof btnSpeak !== 'undefined' && btnSpeak) btnSpeak.disabled = false;
        makeSummary(lastText);
      } catch (err) {
        console.error(err);
        announce('OCR failed.');
      }
    } else if (lastFile.type === 'application/pdf' || (lastFile.name && lastFile.name.toLowerCase().endsWith('.pdf'))) {
      try {
        announce('Extracting text from PDF. This may take a moment.');
        const arrayBuffer = await lastFile.arrayBuffer();
        // pdfjsLib is provided by pdf.js include
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let p = 1; p <= pdf.numPages; p++) {
          // eslint-disable-next-line no-await-in-loop
          const page = await pdf.getPage(p);
          // try to extract text content first
          // eslint-disable-next-line no-await-in-loop
          const content = await page.getTextContent();
          const strings = content.items.map(i => i.str);
          let pageText = strings.join(' ').trim();

          // If the page has little or no selectable text, render and OCR it
          if (!pageText || pageText.length < 50) {
            updateProgress(`Page ${p} of ${pdf.numPages}: scanned page detected — running OCR.`);
            try {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              canvas.width = Math.floor(viewport.width);
              canvas.height = Math.floor(viewport.height);
              const ctx = canvas.getContext('2d');
              // eslint-disable-next-line no-await-in-loop
              await page.render({ canvasContext: ctx, viewport }).promise;

              // show a small preview for the first page
              if (p === 1) {
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                img.alt = `PDF page ${p}`;
                imagePreview.appendChild(img);
              }

              // run Tesseract on the rendered canvas
              // eslint-disable-next-line no-await-in-loop
              const { data } = await Tesseract.recognize(canvas, 'eng');
              const ocrText = data && data.text ? data.text : '';
              pageText = (pageText + ' ' + ocrText).trim();
            } catch (err) {
              console.error('Scanned page OCR failed', err);
            }
          }

          fullText += pageText + '\n';
          // announce page completion
          updateProgress(`Completed page ${p} of ${pdf.numPages}.`);
        }
        const normalized = normalizeText(fullText);
        extractedText.value = normalized;
        lastText = normalized;
        announce('Text extracted from PDF. Read option is now available.');
        if (typeof btnSpeak !== 'undefined' && btnSpeak) btnSpeak.disabled = false;
        makeSummary(lastText);
        if (progressEl) { progressEl.textContent = 'Extraction complete.'; progressEl.classList.add('sr-only'); }
        extractedText.focus && extractedText.focus();
      } catch (err) {
        console.error(err);
        announce('PDF extraction failed.');
        if (progressEl) { progressEl.textContent = 'Extraction failed.'; }
      }
    } else {
      const txt = await lastFile.text();
      const normalized = normalizeText(txt);
      extractedText.value = normalized;
      lastText = normalized;
      announce('Text extracted from file. Read option is now available.');
      if (typeof btnSpeak !== 'undefined' && btnSpeak) btnSpeak.disabled = false;
      makeSummary(lastText);
    }
  });

  // Read aloud
  btnSpeak.addEventListener('click', () => {
    const text = extractedText.value || lastText;
    if (!text) { announce('No text available. Please extract text first.'); return; }
    
    // If paused, resume instead of restarting
    if (ttsPaused && ttsPlaying) {
      btnPause.click();
      return;
    }
    
    startTTS(text);
  });

  // Pause control
  btnPause && btnPause.addEventListener('click', () => {
    if (!ttsPlaying) return;
    if (!ttsPaused) {
      // Pause: stop speech synthesis and set flag
      speechSynthesis.pause();
      ttsPaused = true;
      announce('Paused reading.');
      btnPause.classList.add('active');
      btnSpeak.textContent = 'Resume';
      btnSpeak.querySelector('.label').textContent = 'Resume (S)';
    } else {
      // Resume: continue playing from where we left off
      speechSynthesis.resume();
      ttsPaused = false;
      announce('Resumed reading.');
      btnPause.classList.remove('active');
      btnSpeak.textContent = 'Play';
      btnSpeak.querySelector('.label').textContent = 'Play (S)';
    }
  });

  // Stop control
  btnStop && btnStop.addEventListener('click', () => {
    stopTTS();
  });

  function enableTTSControls(enabled) {
    if (btnSpeak) btnSpeak.disabled = !enabled;
    if (btnPause) btnPause.disabled = !enabled;
    if (btnStop) btnStop.disabled = !enabled;
  }

  function splitToChunks(text, maxLen = 1400) {
    // split into sentences then assemble into chunks under maxLen
    const sents = text.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [text];
    const chunks = [];
    let cur = '';
    for (const s of sents) {
      if ((cur + ' ' + s).trim().length > maxLen) {
        if (cur.trim()) chunks.push(cur.trim());
        cur = s;
      } else {
        cur = (cur + ' ' + s).trim();
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks;
  }

  function startTTS(text) {
    if (!('speechSynthesis' in window)) { announce('Speech not supported in this browser.'); return; }
    // stop any existing TTS
    stopTTS();
    ttsQueue = splitToChunks(text);
    ttsIndex = 0;
    ttsPlaying = true;
    ttsPaused = false;
    enableTTSControls(true);
    announce('Starting reading.');
    playNextChunk();
  }

  function playNextChunk() {
    if (!ttsPlaying) return;
    if (ttsIndex >= ttsQueue.length) {
      // finished
      ttsPlaying = false;
      enableTTSControls(false);
      announce('Finished reading.');
      return;
    }
    const chunk = ttsQueue[ttsIndex];
    const u = new SpeechSynthesisUtterance(chunk);
    u.rate = parseFloat(document.getElementById('speed').value) || 1;
    u.onend = () => {
      ttsIndex += 1;
      // small delay to allow pause/resume
      setTimeout(() => { if (!ttsPaused) playNextChunk(); }, 50);
    };
    u.onerror = (e) => { console.error('TTS error', e); ttsPlaying = false; enableTTSControls(false); };
    speechSynthesis.speak(u);
  }

  function stopTTS() {
    speechSynthesis.cancel();
    ttsPlaying = false;
    ttsPaused = false;
    ttsQueue = [];
    ttsIndex = 0;
    enableTTSControls(false);
    announce('Stopped reading.');
    if (btnPause) btnPause.classList.remove('active');
  }

  // Speed controls
  document.getElementById('speed-decrease').addEventListener('click', () => changeSpeed(-0.5));
  document.getElementById('speed-increase').addEventListener('click', () => changeSpeed(0.5));
  function changeSpeed(delta){
    const inp = document.getElementById('speed');
    let v = parseFloat(inp.value) || 1;
    v = Math.min(2, Math.max(0.5, v + delta));
    inp.value = v.toFixed(1);
    announce(`Speech speed set to ${v}x.`);
  }

  // Download audio: convert text to MP3 using Web Speech API + lamejs
  btnDownload.addEventListener('click', async () => {
    const text = extractedText.value || lastText;
    if (!text) { announce('No text to convert to audio.'); return; }
    
    announce('Generating MP3 from text. This may take a moment.');
    
    try {
      // Step 1: Record audio from Web Speech API using MediaRecorder
      const utterances = splitToChunks(text);
      const audioChunks = [];
      
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const mediaStreamAudioDestinationNode = audioContext.createMediaStreamAudioDestination();
      
      // Redirect speech synthesis to media stream
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = parseFloat(document.getElementById('speed').value) || 1;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(mediaStreamAudioDestinationNode.stream);
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          
          // Convert WAV to MP3 using lamejs
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Get raw PCM data
          const rawData = audioBuffer.getChannelData(0);
          const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
          
          const mp3Data = [];
          const samples = 1152; // lamejs samples per frame
          
          for (let i = 0; i < rawData.length; i += samples) {
            const sampleChunk = rawData.slice(i, i + samples);
            const encoded = mp3Encoder.encodeBuffer(sampleChunk);
            if (encoded.length > 0) {
              mp3Data.push(encoded);
            }
          }
          
          const finalBuffer = mp3Encoder.flush();
          if (finalBuffer.length > 0) {
            mp3Data.push(finalBuffer);
          }
          
          const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
          const mp3Url = URL.createObjectURL(mp3Blob);
          
          const link = document.createElement('a');
          link.href = mp3Url;
          link.download = 'visualcogn_audio.mp3';
          link.click();
          
          URL.revokeObjectURL(mp3Url);
          announce('MP3 file downloaded successfully.');
        } catch (err) {
          console.error('MP3 encoding error:', err);
          announce('MP3 encoding failed. Downloading as text instead.');
          downloadAsText(text);
        }
      };
      
      mediaRecorder.start();
      
      // Speak the text
      speechSynthesis.speak(utterance);
      
      // Stop recording when speech ends
      utterance.onend = () => {
        mediaRecorder.stop();
      };
      
    } catch (err) {
      console.error('Audio generation error:', err);
      announce('Audio generation failed. Trying fallback method.');
      downloadAsText(text);
    }
  });

  // Fallback: download as text file
  function downloadAsText(text) {
    const txtBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(txtBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visualcogn_text.txt';
    a.click();
    URL.revokeObjectURL(url);
    announce('Text file downloaded. Please use an online TTS service to convert to MP3.');
  }

  // Helpers for audio encoding (no longer needed - removed for simplicity)


  // Image identification using ml5 MobileNet
  let classifier = null;
  ml5.imageClassifier('MobileNet').then(c => { classifier = c; });

  // Progress helper (visible to screen readers)
  function updateProgress(msg) {
    if (progressEl) {
      progressEl.textContent = msg;
      progressEl.classList.remove('sr-only');
    }
    try { announce(msg); } catch (e) { /* ignore */ }
  }

  btnIdentify.addEventListener('click', async () => {
    if (!lastFile || !lastFile.type.startsWith('image/')) { announce('Please upload an image first.'); return; }
    announce('Identifying image.');
    const img = imagePreview.querySelector('img');
    if (!img) { announce('No image to identify.'); return; }
    if (!classifier) { announce('Image model is loading — try again soon.'); return; }
    const results = await classifier.classify(img);
    const top = results && results[0] ? results[0].label : 'unknown';
    announce(`I think this is ${top}.`);
  });

  // Speech -> Braille (simple speech recognition to text, then map to Braille Unicode)
  btnRecord.addEventListener('click', async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      announce('Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    announce('Recording. Please speak now.');
    rec.start();
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      announce(`You said: ${text}`);
      const braille = toBraille(text);
      brailleOutput.textContent = 'Braille: ' + braille;
    };
    rec.onerror = (e) => { console.error(e); announce('Recording error'); };
  });

  // Help / Shortcuts
  btnHelp.addEventListener('click', () => showHelp());

  function showHelp() {
    const help = `Shortcuts: U upload, E extract text, S read aloud, D download audio (WAV), I identify image, R record speech to braille, H help. Use plus or minus to change speech speed.`;
    announce(help);
    alert(help);
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k === 'u') { document.getElementById('btn-upload').focus(); fileInput.click(); }
    if (k === 'e') btnExtract.click();
    if (k === 's') {
      if (btnSpeak && btnSpeak.disabled) {
        announce('No extracted text to read. Press E to extract text first.');
      } else {
        btnSpeak.click();
      }
    }
    if (k === 'd') btnDownload.click();
    if (k === 'i') btnIdentify.click();
    if (k === 'r') btnRecord.click();
    if (k === 'p') {
      // pause / resume
      if (btnPause && !btnPause.disabled) btnPause.click();
    }
    if (k === 't') {
      if (btnStop && !btnStop.disabled) btnStop.click();
    }
    if (k === 'h') btnHelp.click();
    if (k === '+') changeSpeed(0.5);
    if (k === '-') changeSpeed(-0.5);
    // numeric speed keys: 1 -> 1.0, 2 -> 1.5, 3 -> 2.0
    if (k === '1') { document.getElementById('speed').value = '1'; announce('Speed 1x'); }
    if (k === '2') { document.getElementById('speed').value = '1.5'; announce('Speed 1.5x'); }
    if (k === '3') { document.getElementById('speed').value = '2'; announce('Speed 2x'); }
  });

  // Braille mapping (basic a-z mapping to Unicode braille patterns)
  const brailleMap = {
    a:'⠁',b:'⠃',c:'⠉',d:'⠙',e:'⠑',f:'⠋',g:'⠛',h:'⠓',i:'⠊',j:'⠚',
    k:'⠅',l:'⠇',m:'⠍',n:'⠝',o:'⠕',p:'⠏',q:'⠟',r:'⠗',s:'⠎',t:'⠞',
    u:'⠥',v:'⠧',w:'⠺',x:'⠭',y:'⠽',z:'⠵', ' ':' '
  };
  function toBraille(txt){
    return txt.toLowerCase().split('').map(ch => brailleMap[ch] || ch).join('');
  }

  // Simple cognitive summary: pick the first 2-3 sentences
  // Improved extractive summarizer and summary table
  function makeSummary(text){
    if (!text) return;
    const summary = summarizeText(text, 5);
    summaryOutput.textContent = summary.join(' ');
    renderSummaryTable(text, summary);
  }

  function summarizeText(text, maxSentences = 5){
    // Basic extractive summarization using term frequency scoring
    const lower = text.replace(/\s+/g, ' ').trim();
    const sents = lower.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [lower];
    const words = lower.toLowerCase().match(/\b[\w']+\b/g) || [];
    const stop = new Set(['the','and','to','of','a','in','is','it','that','for','on','with','as','are','this','be','by','an','or','from','at','was','which']);
    const freq = {};
    for (const w of words) {
      if (stop.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }

    const scores = sents.map(s => {
      const ws = s.toLowerCase().match(/\b[\w']+\b/g) || [];
      let score = 0;
      for (const w of ws) if (freq[w]) score += freq[w];
      return { s: s.trim(), score };
    });

    scores.sort((a,b) => b.score - a.score);
    const top = scores.slice(0, Math.min(maxSentences, scores.length)).sort((a,b) => lower.indexOf(a.s) - lower.indexOf(b.s));
    return top.map(t => capitalize(t.s));
  }

  function capitalize(str){ return str.charAt(0).toUpperCase() + str.slice(1); }

  function renderSummaryTable(originalText, summaryArray){
    const table = document.getElementById('summary-table');
    if (!table) return;
    const words = originalText.match(/\b[\w']+\b/g) || [];
    const wordCount = words.length;
    const sentences = originalText.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [];
    const readingMinutes = Math.max(1, Math.round((wordCount / 180) * 10) / 10);

    table.innerHTML = `
      <h3>Summary (extractive)</h3>
      <div><strong>Words:</strong> ${wordCount} &nbsp; <strong>Sentences:</strong> ${sentences.length} &nbsp; <strong>Estimated reading (min):</strong> ${readingMinutes}</div>
      <ol>
        ${summaryArray.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ol>
    `;
  }

  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

})();
