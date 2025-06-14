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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'historyUpdate') {
    try {
      chrome.runtime.sendMessage({ type: 'historyUpdate' }).catch(() => {});
    } catch (error) {}
  }
  return true;
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    privacyFilter: true,
    autoPaste: false,
    aiFeatures: false,
    history: []
  });
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