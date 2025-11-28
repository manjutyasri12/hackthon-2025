// VisualCogn - Summary Page
(() => {
  // Load data from sessionStorage
  let extractedText = sessionStorage.getItem('extractedText') || '';
  let summaryArray = JSON.parse(sessionStorage.getItem('summaryArray') || '[]');

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

  // Display summary on load
  window.addEventListener('load', () => {
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

    // Build a generalized short paragraph summary for readers who want a simple explanation
    const generalEl = document.getElementById('general-summary');
    let generalizedSummary = '';
    if (summaryArray && summaryArray.length > 0) {
      // Use the top 3 key sentences to form a short paragraph
      const top = summaryArray.slice(0, 3).join(' ');
      generalizedSummary = top;
    } else if (extractedText && extractedText.trim()) {
      // Fallback: take the first 2-3 sentences from the document
      const sents = extractedText.match(/[^\.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [];
      generalizedSummary = sents.slice(0, 3).join(' ').trim();
    } else {
      generalizedSummary = 'No summary available.';
    }
    if (generalEl) generalEl.textContent = generalizedSummary;
    // Create a one-sentence gist (first short sentence) for quick understanding
    const gistEl = document.getElementById('general-gist');
    let gist = '';
    const gistSentences = generalizedSummary.match(/[^.\!\?]+[\.\!\?]+|[^\.\!\?]+$/g) || [];
    if (gistSentences.length > 0) {
      gist = gistSentences[0].trim();
      // If first sentence is long, try to shorten to first clause up to 120 chars
      if (gist.length > 120) {
        const clause = gist.split(/,|;|:\s/)[0];
        if (clause && clause.length < gist.length) gist = clause.trim();
      }
    } else {
      gist = generalizedSummary.split('.').slice(0,1).join('.').trim();
    }
    if (!gist) gist = 'No gist available.';
    if (gistEl) gistEl.textContent = gist;

    // Generate a simple, more conversational simplified summary by replacing common complex words and shortening sentences
    const simpleEl = document.getElementById('simple-summary');
    const replacements = {
      'approximately': 'about',
      'identified': 'found',
      'document': 'file',
      'summary': 'short summary',
      'utilize': 'use',
      'approximately': 'about',
      'demonstrates': 'shows'
    };
    const simplifyText = (txt) => {
      if (!txt) return '';
      let out = txt;
      // replace words
      Object.keys(replacements).forEach(k => {
        const re = new RegExp('\\b'+k+'\\b','gi');
        out = out.replace(re, replacements[k]);
      });
      // break long sentences into shorter ones (naive)
      out = out.split(/\.\s+/).map(s => s.trim()).slice(0,3).map(s => {
        if (s.length > 140) return s.match(/.{1,120}(?:\s|$)/g).join('. ');
        return s;
      }).join('. ');
      if (!/[\.\!\?]$/.test(out)) out = out + '.';
      return out;
    };
    const simplified = simplifyText(generalizedSummary);
    if (simpleEl) simpleEl.textContent = simplified || 'No simplified explanation available.';

    // Announce summary page with statistics
    setTimeout(() => {
      const summaryStats = `Welcome to the summary page. Your document contains ${words} words, ${sentences} sentences, and will take about ${readingTime} minutes to read. We have found ${summaryArray.length} key points in your file. A short general summary and a simplified explanation are available on this page. Press G to hear the general summary, V to hear the simplified explanation, or press H to hear all available shortcuts.`;
      announce(summaryStats);
    }, 300);
  });

  // Show all available shortcuts on summary page
  const showSummaryPageShortcuts = () => {
    const shortcuts = `Here are the shortcuts available on the summary page. Press the back arrow button to return to the reading page where you can continue listening to your document. Press H again to hear these shortcuts again.`;
    announce(shortcuts);
  };

  // Back button
  const btnBackSummary = document.getElementById('btn-back-summary');
  btnBackSummary?.addEventListener('click', () => {
    announce('Returned to reading page. Press S to play, P to pause, T to stop, M for summary again, or D to download as MP3.');
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    if (k === 'h') {
      e.preventDefault();
      showSummaryPageShortcuts();
    } else if (k === 'g') {
      e.preventDefault();
      const gen = document.getElementById('general-summary')?.textContent || '';
      if (gen) announce(gen);
    } else if (k === 'v') {
      e.preventDefault();
      const sim = document.getElementById('simple-summary')?.textContent || '';
      if (sim) announce(sim);
    }
  });

  // Read General Summary button
  const btnReadGeneral = document.getElementById('btn-read-general');
  btnReadGeneral?.addEventListener('click', () => {
    const gen = document.getElementById('general-summary')?.textContent || '';
    if (gen) announce(gen);
  });

  // Read Gist button
  const btnReadGist = document.getElementById('btn-read-gist');
  btnReadGist?.addEventListener('click', () => {
    const gist = document.getElementById('general-gist')?.textContent || '';
    if (gist) announce(gist);
  });

  // Read Simplified Explanation button
  const btnReadSimple = document.getElementById('btn-read-simple');
  btnReadSimple?.addEventListener('click', () => {
    const sim = document.getElementById('simple-summary')?.textContent || '';
    if (sim) announce(sim);
  });

})();
