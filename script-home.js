// VisualCogn - Home Page (Upload & Extract)
(() => {
  // Global state with localStorage persistence
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

  // Normalize text from OCR
  const normalizeText = (txt) => {
    return txt.replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s+([a-z])/g, '$1 $2')
      .trim();
  };

  // Get element helpers
  const fileInput = document.getElementById('file-input');
  const btnUpload = document.getElementById('btn-upload');
  const btnExtract = document.getElementById('btn-extract');
  const btnIdentify = document.getElementById('btn-identify');
  const btnRecord = document.getElementById('btn-record');
  const btnHelp = document.getElementById('btn-help');
  const initialInstruction = document.getElementById('initial-instruction');

  // Initial greeting
  window.addEventListener('load', () => {
    setTimeout(() => {
      initialInstruction.textContent = 'Press U to upload a file, or choose from the tools below.';
      initialInstruction.setAttribute('aria-live', 'polite');
    }, 500);
  });

  // File upload handler
  fileInput?.addEventListener('change', (e) => {
    currentFile = e.target.files?.[0];
    if (currentFile) {
      initialInstruction.textContent = `File selected: ${currentFile.name}. Press E to extract text.`;
      announce(`File uploaded: ${currentFile.name}. Press E to extract text.`);
      btnExtract.disabled = false;
    }
  });

  // Text extraction handler
  btnExtract?.addEventListener('click', async () => {
    if (!currentFile) {
      announce('Please upload a file first.');
      return;
    }

    btnExtract.disabled = true;
    initialInstruction.textContent = 'Extracting text. Please wait...';
    announce('Extracting text from document. This may take a moment.');

    try {
      const txt = await currentFile.text();
      
      // Check if it's a PDF
      if (currentFile.type === 'application/pdf' || currentFile.name.endsWith('.pdf')) {
        initialInstruction.textContent = 'Processing PDF. Extracting text...';
        const pdf = await pdfjsLib.getDocument(new Uint8Array(await currentFile.arrayBuffer())).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + ' ';
          
          // If no text extracted, try OCR
          if (!pageText.trim()) {
            initialInstruction.textContent = `Processing PDF page ${i}. Running OCR...`;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 2 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            const imageData = canvas.toDataURL('image/png');
            const { data } = await Tesseract.recognize(imageData);
            fullText += data.text + ' ';
          }
        }
        extractedText = normalizeText(fullText);
      } else if (currentFile.type.startsWith('image/')) {
        // Handle image files
        initialInstruction.textContent = 'Processing image. Running OCR...';
        announce('Processing image with OCR. This may take longer.');
        const { data } = await Tesseract.recognize(await currentFile.arrayBuffer());
        extractedText = normalizeText(data.text || '');
      } else {
        // Plain text file
        extractedText = normalizeText(txt);
      }

      // Save to localStorage for next page
      sessionStorage.setItem('extractedText', extractedText);
      sessionStorage.setItem('currentFileName', currentFile.name);

      initialInstruction.textContent = 'Text extracted successfully. Redirecting to read page...';
      announce('Text extraction complete. Opening read page.');
      
      // Redirect to read page
      setTimeout(() => {
        window.location.href = 'read.html';
      }, 1000);

    } catch (err) {
      console.error('Extraction error:', err);
      announce('Extraction failed. Please try again.');
      btnExtract.disabled = false;
      initialInstruction.textContent = 'Extraction failed. Please try a different file.';
    }
  });

  // Image identification
  let classifier = null;
  ml5.imageClassifier('MobileNet').then(c => { classifier = c; });

  btnIdentify?.addEventListener('click', async () => {
    if (!currentFile || !currentFile.type.startsWith('image/')) {
      announce('Please upload an image first.');
      return;
    }
    announce('Identifying image. Please wait.');
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

  btnRecord?.addEventListener('click', async () => {
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

  // Help button
  btnHelp?.addEventListener('click', () => {
    const helpText = `VisualCogn Keyboard Shortcuts:
U - Upload a file
E - Extract text from file
I - Identify image
R - Speech to Braille
H - Show this help
On read page:
S - Play audio
P - Pause
T - Stop
D - Download as MP3
M - View summary
Plus and minus - Adjust speed
Back arrow - Go back`;
    announce(helpText);
    alert(helpText);
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    // Prevent default behavior for shortcuts
    if (['u', 'e', 'i', 'r', 'h'].includes(k)) {
      e.preventDefault();
    }

    if (k === 'u') {
      fileInput?.click();
    }
    if (k === 'e') {
      btnExtract?.click();
    }
    if (k === 'i') {
      btnIdentify?.click();
    }
    if (k === 'r') {
      btnRecord?.click();
    }
    if (k === 'h') {
      btnHelp?.click();
    }
  });
})();
