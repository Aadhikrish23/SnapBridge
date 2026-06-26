declare module 'react-native-zeroconf' {
  import { EventEmitter } from 'events';

  export interface Service {
    name: string;
    host: string;
    port: number;
    addresses: string[];
    txt?: Record<string, string>;
  }

  export default class Zeroconf extends EventEmitter {
    constructor();
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
    on(event: 'start' | 'stop' | 'resolved' | 'error', callback: (data: any) => void): this;
  }
}
