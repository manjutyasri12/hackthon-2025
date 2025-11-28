// VisualCogn - Read Page (TTS & Document)
(() => {
  // Load data from sessionStorage
  let extractedText = sessionStorage.getItem('extractedText') || '';
  let currentFileName = sessionStorage.getItem('currentFileName') || 'document';
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

  // Display extracted text on load
  window.addEventListener('load', () => {
    const readText = document.getElementById('read-text');
    const readFileInfo = document.getElementById('read-file-info');

    if (readText) readText.value = extractedText;
    if (readFileInfo) {
      const wordCount = extractedText.split(/\s+/).length;
      readFileInfo.textContent = `📄 ${currentFileName} - ${wordCount} words`;
    }
  });

  // TTS Setup
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

  const startTTS = (text) => {
    if (!text || text.trim() === '') {
      announce('No text available to read.');
      return;
    }
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
      
      const finishMessage = `Finished reading the document. You can now: Press M to view a summary of the document, Press D to download the document as an MP3 audio file, Press S to read again from the beginning, or Press the back arrow button to return to the upload page.`;
      announce(finishMessage);
      
      return;
    }

    const chunk = ttsQueue[ttsIndex];
    const u = new SpeechSynthesisUtterance(chunk);
    
    const currentSpeed = readSpeed ? parseFloat(readSpeed.value) : 1;
    u.rate = Math.max(0.5, Math.min(2, currentSpeed || 1));
    u.pitch = 1;
    u.volume = 1;
    
    u.onend = () => {
      ttsIndex++;
      setTimeout(() => { if (!ttsPaused && ttsPlaying) playNextChunk(); }, 50);
    };
    u.onerror = (err) => {
      if (err.error && err.error !== 'network' && err.error !== 'no-speech') {
        console.error('Speech error:', err);
        ttsPlaying = false;
        enableTTSControls(false);
        announce('Reading stopped due to error.');
      }
    };
    
    try {
      speechSynthesis.speak(u);
    } catch (err) {
      console.error('Speech synthesis error:', err);
      announce('Text to speech not available.');
      ttsPlaying = false;
      enableTTSControls(false);
    }
  };

  const stopTTS = () => {
    speechSynthesis.cancel();
    ttsPlaying = false;
    ttsPaused = false;
    ttsQueue = [];
    ttsIndex = 0;
    enableTTSControls(false);
    
    const stopMessage = `Reading stopped. You can: Press S to play again, Press M to view the document summary, Press D to download as MP3, or Press the back arrow to go back.`;
    announce(stopMessage);
  };

  const enableTTSControls = (enabled) => {
    if (btnPause) btnPause.disabled = !enabled;
    if (btnStop) btnStop.disabled = !enabled;
  };

  btnPlay?.addEventListener('click', () => {
    if (!extractedText || extractedText.trim() === '') {
      announce('No text to read. Please upload and extract a document first.');
      return;
    }
    if (ttsPaused) {
      speechSynthesis.resume();
      ttsPaused = false;
      const resumeMessage = `Resumed reading your document. Press P to pause, T to stop, or use plus and minus keys to adjust reading speed.`;
      announce(resumeMessage);
    } else {
      startTTS(extractedText);
      setTimeout(() => {
        const playMessage = `Now reading your document aloud. Use these keyboard shortcuts: P to pause, T to stop, plus and minus to adjust speed, D to download as MP3, or M to view a summary.`;
        announce(playMessage);
      }, 600);
    }
  });

  btnPause?.addEventListener('click', () => {
    if (ttsPlaying) {
      speechSynthesis.pause();
      ttsPaused = true;
      
      const pauseMessage = `Reading paused. You can: Press S to resume reading, Press T to stop reading, Press D to download MP3, Press M to view summary, or press plus and minus keys to adjust reading speed.`;
      announce(pauseMessage);
    }
  });

  btnStop?.addEventListener('click', () => {
    stopTTS();
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

          announce('MP3 file downloaded successfully. The audio file is named visualcogn_audio.mp3. You can now press M to view the document summary, S to read the document again, or use the back arrow to return to the upload page.');
        } catch (err) {
          console.error('MP3 error:', err);
          announce('MP3 generation failed');
        }
      };

      mediaRecorder.start();
      speechSynthesis.speak(u);
      u.onend = () => mediaRecorder.stop();

    } catch (err) {
      console.error('Audio error:', err);
      announce('Download failed. Please try again.');
    }
  });

  // Summary button - navigate to summary page
  btnViewSummary?.addEventListener('click', () => {
    // Generate summary
    summaryArray = summarizeText(extractedText, 5);
    sessionStorage.setItem('summaryArray', JSON.stringify(summaryArray));
    window.location.href = 'summary.html';
  });

  // Summarization function
  const summarizeText = (text, maxSentences = 5) => {
    const lower = text.replace(/\s+/g, ' ').trim();
    const sents = lower.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [lower];
    const words = lower.match(/\b[\w']+\b/g) || [];
    const stop = new Set(['the','and','to','of','a','in','is','it','that','for','on','with','as','are','this','be','by','an','or','from','at','was','which']);
    const freq = {};

    for (const w of words) {
      if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
    }

    const scores = sents.map((s, i) => ({
      sent: s,
      idx: i,
      score: s.split(/\b[\w']+\b/gi).reduce((a, w) => a + (freq[w.toLowerCase()] || 0), 0)
    }));

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.idx - b.idx)
      .map(x => x.sent);
  };

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA') return;

    const k = e.key.toLowerCase();

    if (['s', 'p', 't', 'd', 'm'].includes(k)) {
      e.preventDefault();
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
    if (k === 'm') {
      btnViewSummary?.click();
    }
    if (k === '+' || k === '=') {
      readSpeedIncrease?.click();
    }
    if (k === '-') {
      readSpeedDecrease?.click();
    }
  });
})();
