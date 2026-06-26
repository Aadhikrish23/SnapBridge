const { ipcRenderer } = require('electron');

const qrLoader = document.getElementById('qrLoader') as HTMLDivElement;
const qrHolder = document.getElementById('qrHolder') as HTMLDivElement;
const qrImage = document.getElementById('qrImage') as HTMLImageElement;
const btnClose = document.getElementById('btnClose') as HTMLButtonElement;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await ipcRenderer.invoke('get-qr-data');
    if (data && data.qrDataUrl) {
      qrImage.src = data.qrDataUrl;
      qrLoader.style.display = 'none';
      qrHolder.style.display = 'flex';
    } else {
      qrLoader.textContent = 'Failed to generate pairing QR code.';
    }
  } catch (err) {
    qrLoader.textContent = 'Error generating pairing QR code.';
    console.error('QR display error:', err);
  }
});

btnClose.addEventListener('click', () => {
  window.close();
});

export {};
