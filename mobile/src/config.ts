import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'snapbridge.serverIp';
const DEFAULT_SERVER_IP = '192.168.1.4';
export const SERVER_PORT = 53210;

let serverIp = DEFAULT_SERVER_IP;

export function getServerIp(): string {
  return serverIp;
}

export function getUploadUrl(): string {
  return `http://${serverIp}:${SERVER_PORT}/upload`;
}

export function getPingUrl(): string {
  return `http://${serverIp}:${SERVER_PORT}/ping`;
}

export async function loadServerConfig(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    serverIp = stored;
  }
  return serverIp;
}

export async function setServerIp(ip: string): Promise<void> {
  const trimmed = ip.trim();
  serverIp = trimmed;
  await AsyncStorage.setItem(STORAGE_KEY, trimmed);
}

export async function testServerConnection(ip: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`http://${ip.trim()}:${SERVER_PORT}/ping`, {
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { status?: string };
    return data.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
