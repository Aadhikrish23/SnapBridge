import * as os from 'os';
import * as path from 'path';

export const PORT = 53210;

export function getSaveFolder(): string {
  return path.join(os.homedir(), 'Pictures', 'SnapBridge');
}

export function getLocalIp(): string {
  const nets = os.networkInterfaces();
  const candidates: string[] = [];

  for (const [name, addresses] of Object.entries(nets)) {
    const lower = name.toLowerCase();
    if (
      lower.includes('virtual') ||
      lower.includes('vpn') ||
      lower.includes('radmin') ||
      lower.includes('bluetooth')
    ) {
      continue;
    }

    for (const net of addresses ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  const privateIp = candidates.find(
    (ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'),
  );
  return privateIp ?? candidates[0] ?? '127.0.0.1';
}
