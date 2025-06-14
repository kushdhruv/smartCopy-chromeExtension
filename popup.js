// Initialize variables
let isEnabled = true;
let privacyFilter = true;
let autoPaste = false;
let aiFeatures = false;

// Load settings
chrome.storage.sync.get({
  enabled: true,
  privacyFilter: true,
  autoPaste: false,
  aiFeatures: false
}, (items) => {
  isEnabled = items.enabled;
  privacyFilter = items.privacyFilter;
  autoPaste = items.autoPaste;
  aiFeatures = items.aiFeatures;
  updateUI();
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) isEnabled = changes.enabled.newValue;
  if (changes.privacyFilter) privacyFilter = changes.privacyFilter.newValue;
  if (changes.autoPaste) autoPaste = changes.autoPaste.newValue;
  if (changes.aiFeatures) aiFeatures = changes.aiFeatures.newValue;
  updateUI();
});

// Update UI based on settings
function updateUI() {
  document.getElementById('enableToggle').checked = isEnabled;
  document.getElementById('privacyToggle').checked = privacyFilter;
  document.getElementById('autoPasteToggle').checked = autoPaste;
  document.getElementById('aiToggle').checked = aiFeatures;
  
  // Update toggle states
  document.getElementById('privacyToggle').disabled = !isEnabled;
  document.getElementById('autoPasteToggle').disabled = !isEnabled;
  document.getElementById('aiToggle').disabled = !isEnabled;
}

// Handle toggle switches
document.getElementById('enableToggle').addEventListener('change', (e) => {
  isEnabled = e.target.checked;
  chrome.storage.sync.set({ enabled: isEnabled });
});

document.getElementById('privacyToggle').addEventListener('change', (e) => {
  privacyFilter = e.target.checked;
  chrome.storage.sync.set({ privacyFilter });
});

document.getElementById('autoPasteToggle').addEventListener('change', (e) => {
  autoPaste = e.target.checked;
  chrome.storage.sync.set({ autoPaste });
});

document.getElementById('aiToggle').addEventListener('change', (e) => {
  aiFeatures = e.target.checked;
  chrome.storage.sync.set({ aiFeatures });
});

// Load and display history
function loadHistory() {
  chrome.storage.sync.get(['history'], (items) => {
    const history = items.history || [];
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    history.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      li.title = new Date(item.timestamp).toLocaleString();
      li.addEventListener('click', () => {
        navigator.clipboard.writeText(item.text);
        showCopyFeedback(li);
      });
      historyList.appendChild(li);
    });
  });
}

// Show copy feedback
function showCopyFeedback(element) {
  const originalText = element.textContent;
  element.textContent = '✓ Copied!';
  element.style.color = '#4CAF50';
  
  setTimeout(() => {
    element.textContent = originalText;
    element.style.color = '';
  }, 1500);
}

// Clear history
document.getElementById('clearHistory').addEventListener('click', () => {
  chrome.storage.sync.set({ history: [] }, () => {
    loadHistory();
  });
});

// Listen for history updates
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'historyUpdate') {
      loadHistory();
    }
    return true;
  });
} catch (error) {}

// Initial history load
loadHistory();

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements with null checks
  const elements = {
    mainToggle: document.getElementById('enableToggle'),
    privacyFilter: document.getElementById('privacyToggle'),
    autoPaste: document.getElementById('autoPasteToggle'),
    aiToggle: document.getElementById('aiToggle'),
    aiSettings: document.getElementById('aiSettings'),
    summarizeToggle: document.getElementById('summarizeToggle'),
    translateToggle: document.getElementById('translateToggle'),
    sentimentToggle: document.getElementById('sentimentToggle'),
    languageSelect: document.getElementById('languageSelect'),
    clearHistoryBtn: document.getElementById('clearHistory'),
    settingsBtn: document.getElementById('settings'),
    historyList: document.getElementById('historyList')
  };

  // Check if all required elements exist
  const missingElements = Object.entries(elements)
    .filter(([key, element]) => !element)
    .map(([key]) => key);

  if (missingElements.length > 0) {
    console.error('Smart Copy Pro: Missing elements:', missingElements);
    return;
  }

  // Load saved settings
  chrome.storage.sync.get({
    enabled: true,
    privacyFilter: true,
    autoPaste: false,
    aiFeatures: false,
    aiSettings: {
      summarize: true,
      translate: true,
      sentiment: true
    },
    language: 'es',
    history: []
  }, (items) => {
    try {
      // Set initial states
      elements.mainToggle.checked = items.enabled;
      elements.privacyFilter.checked = items.privacyFilter;
      elements.autoPaste.checked = items.autoPaste;
      elements.aiToggle.checked = items.aiFeatures;
      elements.summarizeToggle.checked = items.aiSettings.summarize;
      elements.translateToggle.checked = items.aiSettings.translate;
      elements.sentimentToggle.checked = items.aiSettings.sentiment;
      elements.languageSelect.value = items.language;
      
      // Show/hide AI settings based on AI toggle
      elements.aiSettings.style.display = items.aiFeatures ? 'block' : 'none';
      
      // Update history list
      updateHistoryList(items.history);
    } catch (error) {
      console.error('Smart Copy Pro: Error setting initial states:', error);
    }
  });

  // Save settings when toggled
  elements.mainToggle.addEventListener('change', () => {
    try {
      chrome.storage.sync.set({ enabled: elements.mainToggle.checked });
      elements.privacyFilter.disabled = !elements.mainToggle.checked;
    } catch (error) {
      console.error('Smart Copy Pro: Error saving main toggle state:', error);
    }
  });

  elements.privacyFilter.addEventListener('change', () => {
    try {
      chrome.storage.sync.set({ privacyFilter: elements.privacyFilter.checked });
    } catch (error) {
      console.error('Smart Copy Pro: Error saving privacy filter state:', error);
    }
  });

  elements.autoPaste.addEventListener('change', () => {
    try {
      chrome.storage.sync.set({ autoPaste: elements.autoPaste.checked });
    } catch (error) {
      console.error('Smart Copy Pro: Error saving auto paste state:', error);
    }
  });

  elements.aiToggle.addEventListener('change', () => {
    try {
      chrome.storage.sync.set({ aiFeatures: elements.aiToggle.checked });
      elements.aiSettings.style.display = elements.aiToggle.checked ? 'block' : 'none';
    } catch (error) {
      console.error('Smart Copy Pro: Error saving AI features state:', error);
    }
  });

  // Save AI settings
  elements.summarizeToggle.addEventListener('change', () => {
    try {
      chrome.storage.sync.get(['aiSettings'], (items) => {
        const settings = items.aiSettings || {};
        settings.summarize = elements.summarizeToggle.checked;
        chrome.storage.sync.set({ aiSettings: settings });
      });
    } catch (error) {
      console.error('Smart Copy Pro: Error saving summarize setting:', error);
    }
  });

  elements.translateToggle.addEventListener('change', () => {
    try {
      chrome.storage.sync.get(['aiSettings'], (items) => {
        const settings = items.aiSettings || {};
        settings.translate = elements.translateToggle.checked;
        chrome.storage.sync.set({ aiSettings: settings });
      });
    } catch (error) {
      console.error('Smart Copy Pro: Error saving translate setting:', error);
    }
  });

  elements.sentimentToggle.addEventListener('change', () => {
    try {
      chrome.storage.sync.get(['aiSettings'], (items) => {
        const settings = items.aiSettings || {};
        settings.sentiment = elements.sentimentToggle.checked;
        chrome.storage.sync.set({ aiSettings: settings });
      });
    } catch (error) {
      console.error('Smart Copy Pro: Error saving sentiment setting:', error);
    }
  });

  // Save language selection
  elements.languageSelect.addEventListener('change', () => {
    try {
      chrome.storage.sync.set({ language: elements.languageSelect.value });
    } catch (error) {
      console.error('Smart Copy Pro: Error saving language setting:', error);
    }
  });

  // Clear history
  elements.clearHistoryBtn.addEventListener('click', () => {
    try {
      chrome.storage.sync.set({ history: [] }, () => {
        updateHistoryList([]);
      });
    } catch (error) {
      console.error('Smart Copy Pro: Error clearing history:', error);
    }
  });

  // Settings button
  elements.settingsBtn.addEventListener('click', () => {
    try {
      chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error('Smart Copy Pro: Error opening options page:', error);
    }
  });

  // Update history list
  function updateHistoryList(history) {
    try {
      elements.historyList.innerHTML = '';
      history.slice(0, 10).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        // Add source icon if available
        let displayText = item.text;
        if (item.source) {
          const icon = getSourceIcon(item.source);
          displayText = `${icon} ${item.text}`;
        }
        
        div.innerHTML = displayText;
        div.title = item.text;
        
        // Add timestamp
        const timestamp = new Date(item.timestamp);
        const timeStr = timestamp.toLocaleTimeString();
        const dateStr = timestamp.toLocaleDateString();
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'history-time';
        timeDiv.textContent = `${dateStr} ${timeStr}`;
        div.appendChild(timeDiv);
        
        div.addEventListener('click', () => {
          try {
            navigator.clipboard.writeText(item.text);
            showCopyFeedback(div);
          } catch (error) {
            console.error('Smart Copy Pro: Error copying text:', error);
          }
        });
        
        elements.historyList.appendChild(div);
      });
    } catch (error) {
      console.error('Smart Copy Pro: Error updating history list:', error);
    }
  }

  // Get source icon for AI features
  function getSourceIcon(source) {
    const icons = {
      'Summarize': '📝',
      'Translate': '🌐',
      'Analyze Sentiment': '😊'
    };
    return icons[source] || '';
  }

  // Show copy feedback
  function showCopyFeedback(element) {
    try {
      const originalText = element.textContent;
      element.textContent = '✓ Copied!';
      element.style.backgroundColor = '#e6f4ea';
      
      setTimeout(() => {
        element.textContent = originalText;
        element.style.backgroundColor = '';
      }, 1000);
    } catch (error) {
      console.error('Smart Copy Pro: Error showing copy feedback:', error);
    }
  }

  // Listen for history updates
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'historyUpdate') {
        chrome.storage.sync.get(['history'], (items) => {
          updateHistoryList(items.history);
        });
      }
      // Always return true for async sendResponse
      return true;
    });
  } catch (error) {
    console.error('Smart Copy Pro: Error setting up message listener:', error);
  }
}); 