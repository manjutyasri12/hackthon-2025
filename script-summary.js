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

    // Announce summary page with statistics
    setTimeout(() => {
      const summaryStats = `Summary page loaded. Document contains ${words} words, ${sentences} sentences, with an estimated reading time of ${readingTime} minutes. ${summaryArray.length} key points identified. Press H to hear available shortcuts, or use the back arrow to return to the reading page.`;
      announce(summaryStats);
    }, 300);
  });

  // Show all available shortcuts on summary page
  const showSummaryPageShortcuts = () => {
    const shortcuts = `Summary Page Shortcuts: Back arrow to return to reading page, or H for help.`;
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
  });
})();
