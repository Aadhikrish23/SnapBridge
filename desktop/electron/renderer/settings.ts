const { ipcRenderer } = require('electron');

const uploadFolderInput = document.getElementById('uploadFolder') as HTMLInputElement;
const portInput = document.getElementById('port') as HTMLInputElement;
const autoOpenFolderCheckbox = document.getElementById('autoOpenFolder') as HTMLInputElement;
const autoCopyClipboardCheckbox = document.getElementById('autoCopyClipboard') as HTMLInputElement;
const notificationsEnabledCheckbox = document.getElementById('notificationsEnabled') as HTMLInputElement;
const startWithWindowsCheckbox = document.getElementById('startWithWindows') as HTMLInputElement;

const btnBrowse = document.getElementById('btnBrowse') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const btnCancel = document.getElementById('btnCancel') as HTMLButtonElement;
const btnSave = document.getElementById('btnSave') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;

window.addEventListener('DOMContentLoaded', async () => {
  const config = await ipcRenderer.invoke('get-settings');
  
  uploadFolderInput.value = config.uploadFolder;
  portInput.value = config.port.toString();
  autoOpenFolderCheckbox.checked = config.autoOpenFolder;
  autoCopyClipboardCheckbox.checked = config.autoCopyClipboard;
  notificationsEnabledCheckbox.checked = config.notificationsEnabled;
  startWithWindowsCheckbox.checked = config.startWithWindows;
});

btnBrowse.addEventListener('click', async () => {
  const selectedPath = await ipcRenderer.invoke('select-folder');
  if (selectedPath) {
    uploadFolderInput.value = selectedPath;
  }
});

btnReset.addEventListener('click', async () => {
  const confirmReset = confirm('Are you sure you want to reset device pairing? This will unpair all currently connected devices.');
  if (confirmReset) {
    const result = await ipcRenderer.invoke('reset-pairing');
    if (result.success) {
      showToast('Pairing records reset successfully.');
    } else {
      alert(`Error resetting: ${result.error}`);
    }
  }
});

btnCancel.addEventListener('click', () => {
  window.close();
});

btnSave.addEventListener('click', async () => {
  const updatedConfig = {
    uploadFolder: uploadFolderInput.value,
    port: parseInt(portInput.value, 10),
    autoOpenFolder: autoOpenFolderCheckbox.checked,
    autoCopyClipboard: autoCopyClipboardCheckbox.checked,
    notificationsEnabled: notificationsEnabledCheckbox.checked,
    startWithWindows: startWithWindowsCheckbox.checked
  };

  if (isNaN(updatedConfig.port) || updatedConfig.port < 1024 || updatedConfig.port > 65535) {
    alert('Please enter a valid port number between 1024 and 65535.');
    return;
  }

  const result = await ipcRenderer.invoke('save-settings', updatedConfig);
  if (result.success) {
    showToast('Settings saved successfully!');
    setTimeout(() => {
      window.close();
    }, 1000);
  } else {
    alert(`Failed to save: ${result.error}`);
  }
});

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

export {};
