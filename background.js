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
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) isEnabled = changes.enabled.newValue;
  if (changes.privacyFilter) privacyFilter = changes.privacyFilter.newValue;
  if (changes.autoPaste) autoPaste = changes.autoPaste.newValue;
  if (changes.aiFeatures) aiFeatures = changes.aiFeatures.newValue;
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-extension':
      isEnabled = !isEnabled;
      chrome.storage.sync.set({ enabled: isEnabled });
      break;
    case 'toggle-privacy':
      privacyFilter = !privacyFilter;
      chrome.storage.sync.set({ privacyFilter });
      break;
    case 'toggle-auto-paste':
      autoPaste = !autoPaste;
      chrome.storage.sync.set({ autoPaste });
      break;
    case 'toggle-ai':
      aiFeatures = !aiFeatures;
      chrome.storage.sync.set({ aiFeatures });
      break;
  }
});

// Check if URL is allowed
function isUrlAllowed(url) {
  if (!url) {
    console.log('Smart Copy Pro: URL is undefined or null');
    return true; // Allow undefined URLs for internal extension pages
  }

  try {
    // Check if URL is valid
    new URL(url);
    return true; // Allow all URLs for now
  } catch (error) {
    console.error('Smart Copy Pro: Error checking URL:', error);
    return false;
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) {
    console.error('Smart Copy Pro: Invalid message');
    return false;
  }

  try {
    // Handle different message types
    switch (message.type) {
      case 'getState':
        sendResponse({ isEnabled });
        break;
      case 'toggleState':
        isEnabled = !isEnabled;
        chrome.storage.sync.set({ enabled: isEnabled });
        sendResponse({ isEnabled });
        break;
      case 'historyUpdate':
        // Broadcast history update to all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            try {
              chrome.tabs.sendMessage(tab.id, { type: 'historyUpdate' })
                .catch(() => {
                  // Ignore errors for tabs that can't receive messages
                });
            } catch (error) {
              // Ignore errors for invalid tabs
            }
          });
        });
        sendResponse({ success: true });
        break;
      default:
        console.log('Smart Copy Pro: Unknown message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Smart Copy Pro: Error handling message:', error);
    sendResponse({ error: error.message });
  }
  return true; // Keep the message channel open for async responses
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      enabled: true,
      privacyFilter: true,
      autoPaste: false,
      aiFeatures: false,
      aiSettings: {
        summarize: true,
        translate: true,
        sentiment: true
      },
      language: 'es'
    });
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    try {
      chrome.tabs.sendMessage(tabId, { type: 'tabUpdated' })
        .catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
    } catch (error) {
      // Ignore errors for invalid tabs
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith('http')) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggleExtension' })
      .catch(() => {
        // If message fails, try to inject content script
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          // Try sending message again after script injection
          chrome.tabs.sendMessage(tab.id, { type: 'toggleExtension' })
            .catch(() => {
              // Ignore if message still fails
            });
        }).catch(() => {
          // Ignore if script injection fails
        });
      });
  }
});

// Keep track of connected ports
let connectedPorts = new Set();

// Handle connection from content scripts and popup
chrome.runtime.onConnect.addListener((port) => {
  // console.log('Smart Copy Pro: New connection established');
  connectedPorts.add(port);

  port.onDisconnect.addListener(() => {
    // console.log('Smart Copy Pro: Connection closed');
    connectedPorts.delete(port);
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'historyUpdate') {
    // Notify all connected ports about history update
    connectedPorts.forEach(port => {
      try {
        port.postMessage({ type: 'historyUpdate' });
      } catch (error) {
        // console.log('Smart Copy Pro: Error sending message to port', error);
        connectedPorts.delete(port);
      }
    });

    // Also try direct message for popup
    try {
      chrome.runtime.sendMessage({ type: 'historyUpdate' }).catch(() => {
        // console.log('Smart Copy Pro: Popup not open');
      });
    } catch (error) {
      // console.log('Smart Copy Pro: Error sending message to popup');
    }
  }
  // Always return true for async sendResponse
  return true;
});

// Handle keyboard shortcuts
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-extension') {
      chrome.storage.sync.get(['enabled'], (items) => {
        chrome.storage.sync.set({ enabled: !items.enabled });
      });
    }
  });
}

// Handle copy text
async function handleCopyText(text, tabId) {
  try {
    // Add to history
    const items = await chrome.storage.sync.get(['history']);
    const history = items.history || [];
    history.unshift({
      text,
      timestamp: Date.now()
    });
    
    // Keep only last 50 items
    if (history.length > 50) {
      history.pop();
    }
    
    await chrome.storage.sync.set({ history });
    
    // Notify content script
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'copySuccess' });
    } catch (error) {
      console.log('Smart Copy Pro: Could not notify content script');
    }
  } catch (error) {
    console.error('Smart Copy Pro: Error handling copy text:', error);
  }
}

// Handle history update
async function handleHistoryUpdate() {
  try {
    // Broadcast history update to all tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'historyUpdate' });
      } catch (error) {
        // Ignore errors for tabs that can't receive messages
      }
    }
  } catch (error) {
    console.error('Smart Copy Pro: Error handling history update:', error);
  }
} 