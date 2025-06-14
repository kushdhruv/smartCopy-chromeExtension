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
  // Initialize UI elements
  const mainToggle = document.getElementById('mainToggle');
  const privacyFilter = document.getElementById('privacyFilter');
  const autoPaste = document.getElementById('autoPaste');
  const aiFeatures = document.getElementById('aiFeatures');
  const clearHistoryBtn = document.getElementById('clearHistory');
  const settingsBtn = document.getElementById('settings');
  const historyList = document.getElementById('historyList');
  let port = null;

  // Establish connection with background script
  function connectToBackground() {
    try {
      port = chrome.runtime.connect({ name: 'popup' });
      
      port.onDisconnect.addListener(() => {
        // console.log('Smart Copy Pro: Popup disconnected from background');
        port = null;
        // Try to reconnect after a delay
        setTimeout(connectToBackground, 1000);
      });

      // Listen for messages from background
      port.onMessage.addListener((message) => {
        if (message.type === 'historyUpdate') {
          loadHistory();
        }
      });
    } catch (error) {
      // console.log('Smart Copy Pro: Failed to connect to background', error);
      // Try to reconnect after a delay
      setTimeout(connectToBackground, 1000);
    }
  }

  // Initial connection
  connectToBackground();

  // Load saved settings
  chrome.storage.sync.get({
    enabled: true,
    privacyFilter: true,
    autoPaste: false,
    aiFeatures: false,
    history: []
  }, (items) => {
    mainToggle.checked = items.enabled;
    privacyFilter.checked = items.privacyFilter;
    autoPaste.checked = items.autoPaste;
    aiFeatures.checked = items.aiFeatures;
    updateHistoryList(items.history);
  });

  // Save settings when toggled
  mainToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: mainToggle.checked });
  });

  privacyFilter.addEventListener('change', () => {
    chrome.storage.sync.set({ privacyFilter: privacyFilter.checked });
  });

  autoPaste.addEventListener('change', () => {
    chrome.storage.sync.set({ autoPaste: autoPaste.checked });
  });

  aiFeatures.addEventListener('change', () => {
    chrome.storage.sync.set({ aiFeatures: aiFeatures.checked });
  });

  // Clear history
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.sync.set({ history: [] }, () => {
      updateHistoryList([]);
    });
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Update history list
  function updateHistoryList(history) {
    historyList.innerHTML = '';
    history.slice(0, 10).forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.textContent = item.text;
      div.title = item.text;
      div.addEventListener('click', () => {
        navigator.clipboard.writeText(item.text);
      });
      historyList.appendChild(div);
    });
  }

  // Load history
  function loadHistory() {
    chrome.storage.sync.get(['history'], (items) => {
      updateHistoryList(items.history || []);
    });
  }

  // Listen for history updates
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'historyUpdate') {
        loadHistory();
      }
      // Always return true for async sendResponse
      return true;
    });
  } catch (error) {
    // console.log('Smart Copy Pro: Error setting up message listener');
    // Try to reconnect
    connectToBackground();
  }
}); 