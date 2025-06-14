// Constants for sensitive data patterns
const SENSITIVE_PATTERNS = {
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  password: /password|passwd|pwd/i,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/
};

// Initialize variables
let lastSelectedText = '';
let isEnabled = true;
let privacyFilter = true;
let autoPaste = false;
let aiFeatures = false;
let port = null;
let isExtensionValid = true;

// console.log('Smart Copy Pro: Content script loaded');

// Check if extension context is valid
function checkExtensionContext() {
  try {
    chrome.runtime.getURL('');
    return true;
  } catch (e) {
    return false;
  }
}

// Establish connection with background script
function connectToBackground() {
  if (!checkExtensionContext()) {
    isExtensionValid = false;
    // console.log('Smart Copy Pro: Extension context invalid');
    return;
  }

  try {
    port = chrome.runtime.connect({ name: 'content-script' });
    isExtensionValid = true;
    
    port.onDisconnect.addListener(() => {
      // console.log('Smart Copy Pro: Disconnected from background');
      port = null;
      isExtensionValid = false;
      // Try to reconnect after a delay
      setTimeout(connectToBackground, 1000);
    });
  } catch (error) {
    // console.log('Smart Copy Pro: Failed to connect to background', error);
    isExtensionValid = false;
    // Try to reconnect after a delay
    setTimeout(connectToBackground, 1000);
  }
}

// Initial connection
connectToBackground();

// Periodically check extension context
setInterval(() => {
  if (!isExtensionValid && checkExtensionContext()) {
    // console.log('Smart Copy Pro: Extension context restored');
    connectToBackground();
  }
}, 2000);

// Load settings
function loadSettings() {
  if (!checkExtensionContext()) return;
  
  chrome.storage.sync.get({
    enabled: true,
    privacyFilter: true,
    autoPaste: false,
    aiFeatures: false
  }, (items) => {
    // console.log('Smart Copy Pro: Settings loaded', items);
    isEnabled = items.enabled;
    privacyFilter = items.privacyFilter;
    autoPaste = items.autoPaste;
    aiFeatures = items.aiFeatures;
  });
}

loadSettings();

// Listen for settings changes
if (checkExtensionContext()) {
  chrome.storage.onChanged.addListener((changes) => {
    // console.log('Smart Copy Pro: Settings changed', changes);
    if (changes.enabled) isEnabled = changes.enabled.newValue;
    if (changes.privacyFilter) privacyFilter = changes.privacyFilter.newValue;
    if (changes.autoPaste) autoPaste = changes.autoPaste.newValue;
    if (changes.aiFeatures) aiFeatures = changes.aiFeatures.newValue;
  });
}

// Handle text selection
document.addEventListener('mouseup', async (e) => {
  if (!isEnabled || !isExtensionValid) {
    // console.log('Smart Copy Pro: Extension is disabled or invalid');
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // console.log('Smart Copy Pro: Text selected', selectedText);

  if (!selectedText || selectedText === lastSelectedText) {
    // console.log('Smart Copy Pro: No new text selected or same text');
    return;
  }
  lastSelectedText = selectedText;

  // Check if text is human-readable
  if (!isHumanReadable(selectedText)) {
    // console.log('Smart Copy Pro: Text is not human-readable');
    return;
  }

  // Check privacy filter
  if (privacyFilter && containsSensitiveData(selectedText)) {
    // console.log('Smart Copy Pro: Text contains sensitive data');
    return;
  }

  // Copy text to clipboard
  try {
    await navigator.clipboard.writeText(selectedText);
    // console.log('Smart Copy Pro: Text copied to clipboard');
    
    // Add to history
    addToHistory(selectedText);

    // Show feedback
    showCopyFeedback(e);

    // Handle auto-paste if enabled
    if (autoPaste) {
      handleAutoPaste(selectedText);
    }

    // Handle AI features if enabled
    if (aiFeatures) {
      handleAIFeatures(selectedText);
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    // If the error is due to extension context being invalidated, try to reconnect
    if (err.message.includes('Extension context invalidated')) {
      isExtensionValid = false;
      connectToBackground();
    }
  }
});

// Check if text is human-readable
function isHumanReadable(text) {
  // Ignore code blocks
  if (text.includes('{') || text.includes('}') || text.includes(';')) {
    // console.log('Smart Copy Pro: Text contains code blocks');
    return false;
  }
  
  // Ignore very short text
  if (text.length < 2) {
    // console.log('Smart Copy Pro: Text is too short');
    return false;
  }
  
  // Ignore text that's all numbers or special characters
  if (/^[\d\s\W]+$/.test(text)) {
    // console.log('Smart Copy Pro: Text contains only numbers/special characters');
    return false;
  }
  
  return true;
}

// Check for sensitive data
function containsSensitiveData(text) {
  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    if (pattern.test(text)) {
      // console.log('Smart Copy Pro: Found sensitive data of type:', type);
      return true;
    }
  }
  return false;
}

// Add text to history
function addToHistory(text) {
  if (!checkExtensionContext()) return;

  chrome.storage.sync.get(['history'], (items) => {
    const history = items.history || [];
    history.unshift({
      text,
      timestamp: Date.now()
    });
    
    // Keep only last 50 items
    if (history.length > 50) history.pop();
    
    chrome.storage.sync.set({ history }, () => {
      // console.log('Smart Copy Pro: Added to history');
      try {
        // Try to send message through port first
        if (port) {
          port.postMessage({ type: 'historyUpdate' });
        } else {
          // Fallback to direct message
          chrome.runtime.sendMessage({ type: 'historyUpdate' }).catch(() => {
            // console.log('Smart Copy Pro: Background script not ready');
            // Try to reconnect
            connectToBackground();
          });
        }
      } catch (error) {
        // console.log('Smart Copy Pro: Error sending message to background');
        // Try to reconnect
        connectToBackground();
      }
    });
  });
}

// Show copy feedback
function showCopyFeedback(event) {
  const feedback = document.createElement('div');
  feedback.textContent = '✓ Copied!';
  feedback.style.cssText = `
    position: fixed;
    top: ${event.pageY - 30}px;
    left: ${event.pageX}px;
    background: #4CAF50;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
    animation: fadeOut 1.5s forwards;
  `;

  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 1500);
}

// Handle auto-paste
function handleAutoPaste(text) {
  // console.log('Smart Copy Pro: Auto-paste would paste:', text);
}

// Handle AI features
async function handleAIFeatures(text) {
  // console.log('Smart Copy Pro: AI features would process:', text);
}

// Add styles for feedback animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }
`;
document.head.appendChild(style); 