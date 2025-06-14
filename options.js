// Load saved settings
chrome.storage.sync.get({
  enabled: true,
  privacyFilter: true,
  autoPaste: false,
  aiFeatures: false
}, (items) => {
  document.getElementById('enabled').checked = items.enabled;
  document.getElementById('privacyFilter').checked = items.privacyFilter;
  document.getElementById('autoPaste').checked = items.autoPaste;
  document.getElementById('aiFeatures').checked = items.aiFeatures;
});

// Save settings
document.getElementById('save').addEventListener('click', () => {
  const settings = {
    enabled: document.getElementById('enabled').checked,
    privacyFilter: document.getElementById('privacyFilter').checked,
    autoPaste: document.getElementById('autoPaste').checked,
    aiFeatures: document.getElementById('aiFeatures').checked
  };

  chrome.storage.sync.set(settings, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    status.className = 'status success';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
}); 