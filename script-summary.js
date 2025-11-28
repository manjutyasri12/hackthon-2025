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

    // Announce summary page with statistics
    setTimeout(() => {
      const summaryStats = `Welcome to the summary page. Your document contains ${words} words, ${sentences} sentences, and will take approximately ${readingTime} minutes to read. We have identified ${summaryArray.length} key points in your document. A short general summary is available on this page. Press G to hear the general summary, or press H to hear all available shortcuts.`;
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
    }
    if (k === 'g') {
      e.preventDefault();
      const gen = document.getElementById('general-summary')?.textContent || '';
      if (gen) announce(gen);
    }
  });
})();
