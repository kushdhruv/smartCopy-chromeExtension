import config from './config.js';

// Constants for sensitive data patterns
const SENSITIVE_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g
};

// API Keys - These should be stored securely in your backend
const API_KEYS = {
  HUGGINGFACE_API_KEY: 'YOUR_HUGGINGFACE_API_KEY', // Get from https://huggingface.co/settings/tokens
  GOOGLE_TRANSLATE_API_KEY: 'YOUR_GOOGLE_TRANSLATE_API_KEY' // Get from Google Cloud Console
};

// Debug logging
console.log('Smart Copy Pro: Content script loaded');

// Create result display panel
function createResultPanel() {
  const panel = document.createElement('div');
  panel.className = 'smart-copy-result-panel';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-height: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 16px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
    overflow-y: auto;
  `;
  document.body.appendChild(panel);
  return panel;
}

// Show result in panel
function showResult(result, type) {
  let panel = document.querySelector('.smart-copy-result-panel');
  if (!panel) {
    panel = createResultPanel();
  }

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; font-size: 16px; color: #202124;">${type} Result</h3>
      <button id="closeResult" style="
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #5f6368;
        font-size: 20px;
      ">×</button>
    </div>
    <div style="
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.5;
      color: #202124;
    ">${result}</div>
    <button id="copyResult" style="
      background: #1a73e8;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
    ">Copy to Clipboard</button>
  `;

  // Add event listeners
  const closeButton = panel.querySelector('#closeResult');
  const copyButton = panel.querySelector('#copyResult');

  closeButton.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result);
      showNotification('Copied to clipboard!', 'success');
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  });

  panel.style.display = 'block';
}

// AI Features configuration
const AI_FEATURES = {
  summarize: {
    name: 'Summarize',
    icon: '📝',
    process: async (text) => {
      try {
        console.log('Smart Copy Pro: Attempting to summarize text');
        // Call Hugging Face API for summarization
        const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: text,
            parameters: {
              max_length: 130,
              min_length: 30,
              do_sample: false
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get summary from API');
        }

        const result = await response.json();
        console.log('Smart Copy Pro: Summary generated successfully');
        showResult(result[0].summary_text, 'Summary');
        return result[0].summary_text;
      } catch (error) {
        console.error('Smart Copy Pro: Summarization error:', error);
        throw new Error('Failed to summarize text. Please try again later.');
      }
    }
  },
  translate: {
    name: 'Translate',
    icon: '🌐',
    process: async (text, targetLang) => {
      try {
        console.log('Smart Copy Pro: Attempting to translate text');
        // Use Google Translate API (free tier)
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang || 'es'}&dt=t&q=${encodeURIComponent(text)}`);
        
        if (!response.ok) {
          throw new Error('Failed to translate text');
        }

        const result = await response.json();
        const translatedText = result[0].map(x => x[0]).join('');
        console.log('Smart Copy Pro: Translation completed successfully');
        showResult(translatedText, 'Translation');
        return translatedText;
      } catch (error) {
        console.error('Smart Copy Pro: Translation error:', error);
        throw new Error('Failed to translate text. Please try again later.');
      }
    }
  },
  sentiment: {
    name: 'Analyze Sentiment',
    icon: '😊',
    process: async (text) => {
      try {
        console.log('Smart Copy Pro: Attempting to analyze sentiment');
        // Call Hugging Face API for sentiment analysis
        const response = await fetch('https://api-inference.huggingface.co/models/finiteautomata/bertweet-base-sentiment-analysis', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: text
          })
        });

        if (!response.ok) {
          throw new Error('Failed to analyze sentiment');
        }

        const result = await response.json();
        const sentiment = result[0][0];
        const sentimentText = `Sentiment: ${sentiment.label}\nConfidence: ${(sentiment.score * 100).toFixed(1)}%`;
        console.log('Smart Copy Pro: Sentiment analysis completed successfully');
        showResult(sentimentText, 'Sentiment Analysis');
        return sentimentText;
      } catch (error) {
        console.error('Smart Copy Pro: Sentiment analysis error:', error);
        throw new Error('Failed to analyze sentiment. Please try again later.');
      }
    }
  }
};

// Initialize variables
let lastSelectedText = '';
let isEnabled = true;
let privacyFilter = true;
let autoPaste = false;
let aiFeatures = false;
let port = null;
let isExtensionValid = true;
let selectedText = '';
let aiMenu = null;
let notification = null;
let menuTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// console.log('Smart Copy Pro: Content script loaded');

// Check if extension context is still valid
function checkExtensionContext() {
  try {
    chrome.runtime.getURL('');
    return true;
  } catch (error) {
    isExtensionValid = false;
    return false;
  }
}

// Reconnect to extension
async function reconnectToExtension() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Smart Copy Pro: Max reconnection attempts reached');
    return false;
  }

  try {
    reconnectAttempts++;
    console.log(`Smart Copy Pro: Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Try to get extension state
    const response = await chrome.runtime.sendMessage({ type: 'getState' });
    isEnabled = response.isEnabled;
    isExtensionValid = true;
    reconnectAttempts = 0;
    console.log('Smart Copy Pro: Successfully reconnected');
    return true;
  } catch (error) {
    console.error('Smart Copy Pro: Reconnection failed:', error);
    return false;
  }
}

// Handle extension state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'toggleExtension':
        isEnabled = !isEnabled;
        chrome.storage.sync.set({ enabled: isEnabled });
        sendResponse({ isEnabled });
        break;
      case 'tabUpdated':
        // Reinitialize extension state when tab is updated
        reconnectToExtension();
        sendResponse({ success: true });
        break;
      case 'historyUpdate':
        // Handle history updates
        sendResponse({ success: true });
        break;
    }
  } catch (error) {
    console.error('Smart Copy Pro: Error handling message:', error);
    sendResponse({ error: error.message });
  }
  return true; // Keep the message channel open for async responses
});

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

// Safely remove element from DOM
function safeRemoveElement(element) {
  if (!element) return;
  
  try {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    } else if (document.body.contains(element)) {
      document.body.removeChild(element);
    }
  } catch (error) {
    console.error('Smart Copy Pro: Error removing element:', error);
  }
}

// Clear any existing menus
function clearMenus() {
  if (aiMenu) {
    safeRemoveElement(aiMenu);
    aiMenu = null;
  }
  if (notification) {
    safeRemoveElement(notification);
    notification = null;
  }
  if (menuTimeout) {
    clearTimeout(menuTimeout);
    menuTimeout = null;
  }
}

// Handle text selection
document.addEventListener('mouseup', async (event) => {
  console.log('Smart Copy Pro: Mouse up event detected');
  
  // Check extension state and try to reconnect if needed
  if (!isExtensionValid) {
    const reconnected = await reconnectToExtension();
    if (!reconnected) {
      console.log('Smart Copy Pro: Extension context invalid and reconnection failed');
      return;
    }
  }
  
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text) {
    console.log('Smart Copy Pro: Text selected:', text.substring(0, 50) + '...');
    selectedText = text;
    
    // Get extension settings
    try {
      const items = await chrome.storage.sync.get(['enabled', 'privacyFilter', 'autoPaste', 'aiFeatures']);
      console.log('Smart Copy Pro: Extension settings:', items);
      
      if (!items.enabled) {
        console.log('Smart Copy Pro: Extension disabled');
        return;
      }
      
      // Check for sensitive data
      if (items.privacyFilter) {
        let hasSensitiveData = false;
        Object.values(SENSITIVE_PATTERNS).forEach(pattern => {
          if (pattern.test(text)) {
            hasSensitiveData = true;
          }
        });
        
        if (hasSensitiveData) {
          showNotification('Sensitive data detected. Copying blocked.', 'error');
          return;
        }
      }
      
      // Copy text
      try {
        await navigator.clipboard.writeText(text);
        showNotification('Text copied to clipboard!', 'success');
        
        // Add to history
        const historyItems = await chrome.storage.sync.get(['history']);
        const history = historyItems.history || [];
        history.unshift({
          text: text,
          timestamp: Date.now()
        });
        
        // Keep only last 50 items
        if (history.length > 50) history.pop();
        
        await chrome.storage.sync.set({ history });
        
        try {
          await chrome.runtime.sendMessage({ type: 'historyUpdate' });
        } catch (error) {
          console.log('Smart Copy Pro: Failed to send history update');
        }
        
        // Show AI menu if enabled
        if (items.aiFeatures) {
          console.log('Smart Copy Pro: AI features enabled, creating menu');
          createAIMenu(text);
        } else {
          console.log('Smart Copy Pro: AI features disabled');
        }
        
        // Auto paste if enabled
        if (items.autoPaste) {
          document.execCommand('paste');
        }
      } catch (error) {
        showNotification(`Failed to copy text: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Smart Copy Pro: Error accessing storage:', error);
      showNotification('Failed to access extension settings', 'error');
    }
  } else {
    clearMenus();
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

// Show notification
function showNotification(message, type = 'info') {
  clearMenus();

  notification = document.createElement('div');
  notification.className = 'smart-copy-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    background: ${type === 'error' ? '#d93025' : '#1a73e8'};
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    transition: opacity 0.3s;
  `;
  notification.textContent = message;
  
  if (document.body) {
    document.body.appendChild(notification);
    menuTimeout = setTimeout(() => {
      if (notification && document.body.contains(notification)) {
        notification.style.opacity = '0';
        setTimeout(() => clearMenus(), 300);
      }
    }, 3000);
  }
}

// Create AI features menu
function createAIMenu(text) {
  console.log('Smart Copy Pro: Creating AI menu');
  // Clear any existing menus
  clearMenus();

  aiMenu = document.createElement('div');
  aiMenu.className = 'smart-copy-ai-menu';
  aiMenu.style.cssText = `
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 8px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Get AI settings
  chrome.storage.sync.get(['aiFeatures', 'aiSettings', 'language'], (items) => {
    console.log('Smart Copy Pro: AI settings:', items);
    if (!items.aiFeatures || !aiMenu) {
      console.log('Smart Copy Pro: AI features disabled or menu not created');
      return;
    }

    let hasFeatures = false;
    Object.entries(AI_FEATURES).forEach(([key, feature]) => {
      if (items.aiSettings && items.aiSettings[key]) {
        hasFeatures = true;
        const button = document.createElement('button');
        button.className = 'smart-copy-ai-button';
        button.style.cssText = `
          display: block;
          width: 100%;
          padding: 8px 12px;
          margin: 4px 0;
          border: none;
          border-radius: 4px;
          background: #f8f9fa;
          color: #202124;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          transition: background-color 0.2s;
        `;
        button.innerHTML = `${feature.icon} ${feature.name}`;
        
        button.addEventListener('mouseover', () => {
          button.style.backgroundColor = '#e8eaed';
        });
        
        button.addEventListener('mouseout', () => {
          button.style.backgroundColor = '#f8f9fa';
        });

        button.addEventListener('click', async () => {
          try {
            const result = await feature.process(text, items.language);
            await handleAIFeatureResult(result, feature.name);
          } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
          }
          clearMenus();
        });

        aiMenu.appendChild(button);
      }
    });

    if (hasFeatures && aiMenu && document.body) {
      console.log('Smart Copy Pro: Adding AI menu to document');
      document.body.appendChild(aiMenu);
      positionMenu(aiMenu);
    } else {
      console.log('Smart Copy Pro: No features enabled or menu not ready');
    }
  });
}

// Position the AI menu near the selected text
function positionMenu(menu) {
  if (!menu || !document.body.contains(menu)) {
    console.log('Smart Copy Pro: Menu not found in document');
    return;
  }

  try {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      console.log('Smart Copy Pro: No text selection found');
      clearMenus();
      return;
    }
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const menuRect = menu.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX;
    
    // Ensure menu stays within viewport
    if (top + menuRect.height > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - menuRect.height - 10;
    }
    if (left + menuRect.width > window.innerWidth + window.scrollX) {
      left = window.innerWidth + window.scrollX - menuRect.width - 10;
    }
    
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    console.log('Smart Copy Pro: Menu positioned at', top, left);
  } catch (error) {
    console.error('Smart Copy Pro: Error positioning menu:', error);
    clearMenus();
  }
}

// Handle AI feature results
async function handleAIFeatureResult(result, featureName) {
  try {
    await navigator.clipboard.writeText(result);
    showNotification(`${featureName} completed and copied to clipboard!`, 'success');
    
    // Add to history
    chrome.storage.sync.get(['history'], (items) => {
      const history = items.history || [];
      history.unshift({
        text: result,
        timestamp: Date.now(),
        source: featureName
      });
      
      // Keep only last 50 items
      if (history.length > 50) history.pop();
      
      chrome.storage.sync.set({ history }, () => {
        chrome.runtime.sendMessage({ type: 'historyUpdate' }).catch(() => {
          console.log('Smart Copy Pro: Popup not open');
        });
      });
    });
  } catch (error) {
    showNotification(`Failed to copy result: ${error.message}`, 'error');
  }
}

// Close AI menu when clicking outside
document.addEventListener('mousedown', (event) => {
  if (aiMenu && !aiMenu.contains(event.target)) {
    clearMenus();
  }
});

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