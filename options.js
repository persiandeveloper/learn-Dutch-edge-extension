// Save options to chrome.storage
function saveOptions() {
  const chatUrl = document.getElementById('chatUrl').value;

  chrome.storage.sync.set(
    { chatUrl: chatUrl },
    () => {
      // Update status to let user know options were saved.
      console.log('Settings saved');
    }
  );
}

// Load options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(
    { chatUrl: '', featureEnabled: false },
    (items) => {
      document.getElementById('chatUrl').value = items.chatUrl;
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
