// VisualCogn - Multi-page Accessible Document Reader
(() => {
  // Global state
  let currentFile = null;
  let extractedText = '';
  let summaryArray = [];

  // Announce function with better talkback support
  const announce = (text, priority = 'polite') => {
    try {
      // Update live region for screen readers
      const live = document.getElementById('file-info');
      if (live) {
        live.setAttribute('role', 'status');
        live.setAttribute('aria-live', priority);
        live.setAttribute('aria-atomic', 'true');
        live.textContent = text;
      }

      // Text-to-speech announcement
      if ('speechSynthesis' in window) {
        // Cancel any previous speech
        window.speechSynthesis.cancel();
        
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1; // Default rate for announcements
        u.pitch = 1;
        u.volume = 1;
        
        // Use setTimeout to ensure speech happens
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(u);
          } catch (e) {
            console.error('Speech synthesis error:', e);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Announce error:', err);
    }
  };

  // Page navigation
  const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) {
      page.classList.add('active');
      announce(`Now on ${pageId.replace('-page', '').toUpperCase()} page`);
    }
  };

  // Text normalization
  const normalizeText = (raw) => {
    if (!raw) return '';
    let t = String(raw);
    t = t.replace(/\r/g, '\n');
    t = t.replace(/-\n/g, '');
    t = t.replace(/\n\s*\n+/g, '__PAR__');
    t = t.replace(/\n+/g, ' ');
    t = t.replace(/__PAR__/g, '\n\n');
    t = t.replace(/ {2,}/g, ' ');
    return t.trim();
  };

  // ==================== HOME PAGE ====================

  const fileInput = document.getElementById('file-input');
  const btnUpload = document.getElementById('btn-upload');
  const btnExtract = document.getElementById('btn-extract');
  const btnIdentify = document.getElementById('btn-identify');
  const btnRecord = document.getElementById('btn-record');
  const btnHelp = document.getElementById('btn-help');
  const initialInstruction = document.getElementById('initial-instruction');

  // Initial greeting
  window.addEventListener('load', () => {
    // Wait for voices to load and page to fully render
    setTimeout(() => {
      const greeting = 'Welcome to VisualCogn. Press the letter U on your keyboard to upload a file, or click the Upload button.';
      announce(greeting);
      
      if (initialInstruction) {
        initialInstruction.innerHTML = `
          <strong>🎯 Getting Started:</strong><br>
          Press <strong>U</strong> on your keyboard to upload a file<br>
          Or click the Upload button below<br><br>
          📁 Supported formats: Text files, PDFs, and Images
        `;
      }
    }, 600);
  });

  // Upload handler
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;

    currentFile = f;
    announce(`File ${f.name} selected. Press E to extract text.`);

    if (initialInstruction) {
      initialInstruction.innerHTML = `
        <strong>✅ File Uploaded!</strong><br>
        File name: <strong>${f.name}</strong><br><br>
        Press <strong>E</strong> to extract text
      `;
      initialInstruction.style.backgroundColor = '#e8f5e9';
      initialInstruction.style.borderLeftColor = '#00a36e';
    }

    if (btnExtract) {
      btnExtract.disabled = false;
    }
  });

  // Extract handler
  btnExtract.addEventListener('click', async () => {
    if (!currentFile) {
      announce('No file selected.');
      return;
    }

    announce('Extracting text. Please wait.');
    btnExtract.disabled = true;

    try {
      if (currentFile.type.startsWith('image/')) {
        const { data } = await Tesseract.recognize(currentFile, 'eng');
        extractedText = normalizeText(data.text || '');
      } else if (currentFile.type === 'application/pdf' || currentFile.name.endsWith('.pdf')) {
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const strings = content.items.map(i => i.str);
          let pageText = strings.join(' ').trim();

          if (!pageText || pageText.length < 50) {
            try {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              canvas.width = Math.floor(viewport.width);
              canvas.height = Math.floor(viewport.height);
              const ctx = canvas.getContext('2d');
              await page.render({ canvasContext: ctx, viewport }).promise;

              const { data } = await Tesseract.recognize(canvas, 'eng');
              const ocrText = data && data.text ? data.text : '';
              pageText = (pageText + ' ' + ocrText).trim();
            } catch (err) {
              console.error('OCR failed:', err);
            }
          }

          fullText += pageText + '\n';
        }
        extractedText = normalizeText(fullText);
      } else {
        const txt = await currentFile.text();
        extractedText = normalizeText(txt);
      }

      // Generate summary
      summaryArray = summarizeText(extractedText, 5);

      // Go to read page
      announce('Text extracted successfully. Going to read page.');
      showReadPage();

    } catch (err) {
      console.error('Extraction error:', err);
      announce('Extraction failed. Please try again.');
      btnExtract.disabled = false;
    }
  });

  // Image identification
  let classifier = null;
  ml5.imageClassifier('MobileNet').then(c => { classifier = c; });

  btnIdentify.addEventListener('click', async () => {
    if (!currentFile || !currentFile.type.startsWith('image/')) {
      announce('Please upload an image first.');
      return;
    }
    announce('Identifying image. Please wait.');
    // Create temporary image
    const url = URL.createObjectURL(currentFile);
    const img = document.createElement('img');
    img.src = url;
    img.onload = async () => {
      if (!classifier) {
        announce('Model is loading. Try again soon.');
        return;
      }
      const results = await classifier.classify(img);
      const top = results?.[0]?.label || 'unknown';
      announce(`I think this is a ${top}.`);
      URL.revokeObjectURL(url);
    };
  });

  // Speech to Braille
  const brailleMap = {
    a:'⠁',b:'⠃',c:'⠉',d:'⠙',e:'⠑',f:'⠋',g:'⠛',h:'⠓',i:'⠊',j:'⠚',
    k:'⠅',l:'⠇',m:'⠍',n:'⠝',o:'⠕',p:'⠏',q:'⠟',r:'⠗',s:'⠎',t:'⠞',
    u:'⠥',v:'⠧',w:'⠺',x:'⠭',y:'⠽',z:'⠵',' ':' '
  };

  const toBraille = (txt) => {
    return txt.toLowerCase().split('').map(ch => brailleMap[ch] || ch).join('');
  };

  btnRecord.addEventListener('click', async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      announce('Speech recognition not supported.');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    announce('Recording. Please speak now.');
    rec.start();

    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      announce(`You said: ${text}`);
      const braille = toBraille(text);
      alert(`Braille: ${braille}`);
    };

    rec.onerror = (e) => {
      console.error(e);
      announce('Recording error');
    };
  });

  // Help
  btnHelp.addEventListener('click', () => {
    const helpText = `VisualCogn Help:
1. Upload a file (text, PDF, image)
2. Extract text
3. Read aloud or view summary
4. Shortcuts: U=Upload, E=Extract, S=Play, P=Pause, T=Stop, D=Download, M=Summary`;
    announce(helpText);
    alert(helpText);
  });

  // ==================== READ PAGE ====================

  const showReadPage = () => {
    const readText = document.getElementById('read-text');
    const readFileInfo = document.getElementById('read-file-info');

    if (readText) readText.value = extractedText;
    if (readFileInfo) {
      readFileInfo.textContent = `📄 ${currentFile.name} - ${extractedText.split(/\s+/).length} words`;
    }

    showPage('read-page');
  };

  const btnBackRead = document.getElementById('btn-back-read');
  btnBackRead?.addEventListener('click', () => {
    stopTTS();
    showPage('home-page');
  });

  // TTS Controls
  let ttsQueue = [];
  let ttsIndex = 0;
  let ttsPlaying = false;
  let ttsPaused = false;

  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const btnDownloadMP3 = document.getElementById('btn-download-mp3');
  const btnViewSummary = document.getElementById('btn-view-summary');
  const readSpeed = document.getElementById('read-speed');
  const readSpeedDecrease = document.getElementById('read-speed-decrease');
  const readSpeedIncrease = document.getElementById('read-speed-increase');
  const readSpeedDisplay = document.getElementById('read-speed-display');

  const splitToChunks = (text, maxLen = 1400) => {
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
  };

  const startTTS = (text) => {
    if (!('speechSynthesis' in window)) {
      announce('Speech not supported.');
      return;
    }
    stopTTS();
    ttsQueue = splitToChunks(text);
    ttsIndex = 0;
    ttsPlaying = true;
    ttsPaused = false;
    enableTTSControls(true);
    announce('Starting to read.');
    playNextChunk();
  };

  const playNextChunk = () => {
    if (!ttsPlaying) return;
    if (ttsIndex >= ttsQueue.length) {
      ttsPlaying = false;
      enableTTSControls(false);
      announce('Finished reading document.');
      return;
    }

    const chunk = ttsQueue[ttsIndex];
    const u = new SpeechSynthesisUtterance(chunk);
    
    // Get current speed from read page or default to 1
    const currentSpeed = readSpeed ? parseFloat(readSpeed.value) : 1;
    u.rate = currentSpeed || 1;
    u.pitch = 1;
    u.volume = 1;
    
    u.onend = () => {
      ttsIndex++;
      setTimeout(() => { if (!ttsPaused && ttsPlaying) playNextChunk(); }, 50);
    };
    u.onerror = (err) => {
      console.error('Speech error:', err);
      ttsPlaying = false;
      enableTTSControls(false);
      announce('Reading stopped due to error.');
    };
    
    try {
      speechSynthesis.speak(u);
    } catch (err) {
      console.error('Speech synthesis error:', err);
      announce('Text to speech not available.');
    }
  };

  const stopTTS = () => {
    speechSynthesis.cancel();
    ttsPlaying = false;
    ttsPaused = false;
    ttsQueue = [];
    ttsIndex = 0;
    enableTTSControls(false);
  };

  const enableTTSControls = (enabled) => {
    if (btnPause) btnPause.disabled = !enabled;
    if (btnStop) btnStop.disabled = !enabled;
  };

  btnPlay?.addEventListener('click', () => {
    if (ttsPaused) {
      speechSynthesis.resume();
      ttsPaused = false;
      announce('Resumed');
      btnPause.textContent = 'Pause';
    } else {
      startTTS(extractedText);
    }
  });

  btnPause?.addEventListener('click', () => {
    if (ttsPlaying) {
      speechSynthesis.pause();
      ttsPaused = true;
      announce('Paused');
    }
  });

  btnStop?.addEventListener('click', () => {
    stopTTS();
    announce('Stopped');
  });

  // Speed controls
  readSpeedDecrease?.addEventListener('click', () => {
    const v = Math.max(0.5, parseFloat(readSpeed?.value || 1) - 0.5);
    if (readSpeed) readSpeed.value = v;
    if (readSpeedDisplay) readSpeedDisplay.textContent = v.toFixed(1) + 'x';
    announce(`Speed ${v}x`);
  });

  readSpeedIncrease?.addEventListener('click', () => {
    const v = Math.min(2, parseFloat(readSpeed?.value || 1) + 0.5);
    if (readSpeed) readSpeed.value = v;
    if (readSpeedDisplay) readSpeedDisplay.textContent = v.toFixed(1) + 'x';
    announce(`Speed ${v}x`);
  });

  readSpeed?.addEventListener('change', () => {
    const v = parseFloat(readSpeed.value) || 1;
    if (readSpeedDisplay) readSpeedDisplay.textContent = v.toFixed(1) + 'x';
  });

  // Download MP3
  btnDownloadMP3?.addEventListener('click', async () => {
    announce('Generating MP3. Please wait.');
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const u = new SpeechSynthesisUtterance(extractedText);
      u.rate = parseFloat(readSpeed?.value) || 1;

      const mediaStreamAudioDestinationNode = audioContext.createMediaStreamAudioDestination();
      const mediaRecorder = new MediaRecorder(mediaStreamAudioDestinationNode.stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);

          const rawData = decodedAudio.getChannelData(0);
          const mp3Encoder = new lamejs.Mp3Encoder(1, decodedAudio.sampleRate, 128);
          const mp3Data = [];

          for (let i = 0; i < rawData.length; i += 1152) {
            const sampleChunk = rawData.slice(i, i + 1152);
            const encoded = mp3Encoder.encodeBuffer(sampleChunk);
            if (encoded.length > 0) mp3Data.push(encoded);
          }

          const finalBuffer = mp3Encoder.flush();
          if (finalBuffer.length > 0) mp3Data.push(finalBuffer);

          const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
          const url = URL.createObjectURL(mp3Blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'visualcogn_audio.mp3';
          link.click();
          URL.revokeObjectURL(url);

          announce('MP3 downloaded successfully');
        } catch (err) {
          console.error('MP3 error:', err);
          announce('MP3 generation failed');
          downloadAsText(extractedText);
        }
      };

      mediaRecorder.start();
      speechSynthesis.speak(u);
      u.onend = () => mediaRecorder.stop();

    } catch (err) {
      console.error('Audio error:', err);
      downloadAsText(extractedText);
    }
  });

  const downloadAsText = (text) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'visualcogn_text.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Summary button
  btnViewSummary?.addEventListener('click', () => {
    showSummaryPage();
  });

  // ==================== SUMMARY PAGE ====================

  const showSummaryPage = () => {
    const words = extractedText.split(/\s+/).length;
    const sentences = extractedText.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g)?.length || 0;
    const readingTime = Math.max(1, Math.round((words / 180) * 10) / 10);

    document.getElementById('stat-words').textContent = words;
    document.getElementById('stat-sentences').textContent = sentences;
    document.getElementById('stat-reading-time').textContent = `${readingTime} min`;
    document.getElementById('stat-key-points').textContent = summaryArray.length;
    document.getElementById('summary-full-text').value = extractedText;

    const summaryList = document.getElementById('summary-list');
    if (summaryList) {
      summaryList.innerHTML = summaryArray.map((s, i) => `
        <div class="summary-item">
          <span class="summary-item-number">${i + 1}</span>
          <span class="summary-item-text">${s}</span>
        </div>
      `).join('');
    }

    showPage('summary-page');
    announce(`Summary page showing ${summaryArray.length} key points`);
  };

  const btnBackSummary = document.getElementById('btn-back-summary');
  btnBackSummary?.addEventListener('click', () => {
    showPage('read-page');
  });

  // ==================== SUMMARIZATION ====================

  const summarizeText = (text, maxSentences = 5) => {
    const lower = text.replace(/\s+/g, ' ').trim();
    const sents = lower.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [lower];
    const words = lower.match(/\b[\w']+\b/g) || [];
    const stop = new Set(['the','and','to','of','a','in','is','it','that','for','on','with','as','are','this','be','by','an','or','from','at','was','which']);
    const freq = {};

    for (const w of words) {
      if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
    }

    const scores = sents.map(s => {
      const ws = s.match(/\b[\w']+\b/g) || [];
      let score = 0;
      for (const w of ws) if (freq[w]) score += freq[w];
      return { s: s.trim(), score };
    });

    scores.sort((a,b) => b.score - a.score);
    const top = scores.slice(0, Math.min(maxSentences, scores.length))
      .sort((a,b) => lower.indexOf(a.s) - lower.indexOf(b.s));
    return top.map(t => capitalize(t.s));
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // ==================== KEYBOARD SHORTCUTS ====================

  window.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in textarea
    if (e.target.tagName === 'TEXTAREA' && e.target.id !== 'read-text' && e.target.id !== 'summary-full-text') {
      return;
    }

    const k = e.key.toLowerCase();

    // Prevent default behavior for shortcuts
    if (['u', 'e', 's', 'p', 't', 'd', 'i', 'r', 'm', 'h'].includes(k)) {
      e.preventDefault();
    }

    if (k === 'u') {
      fileInput?.click();
    }
    if (k === 'e') {
      btnExtract?.click();
    }
    if (k === 's') {
      btnPlay?.click();
    }
    if (k === 'p') {
      btnPause?.click();
    }
    if (k === 't') {
      btnStop?.click();
    }
    if (k === 'd') {
      btnDownloadMP3?.click();
    }
    if (k === 'i') {
      btnIdentify?.click();
    }
    if (k === 'r') {
      btnRecord?.click();
    }
    if (k === 'm') {
      btnViewSummary?.click();
    }
    if (k === 'h') {
      btnHelp?.click();
    }
    if (k === '+' || k === '=') {
      readSpeedIncrease?.click();
    }
    if (k === '-') {
      readSpeedDecrease?.click();
    }
  });
})();
