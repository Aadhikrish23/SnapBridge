import { EventEmitter } from 'events';
import { IEventBus, EventCallback } from '../domain/IEventBus';
import { SnapBridgeEvent, EventPayloads } from 'shared';

export class NodeEventBus implements IEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  public publish<K extends keyof EventPayloads>(
    name: K,
    correlationId: string,
    payload: EventPayloads[K]
  ): void {
    const event: SnapBridgeEvent<K> = {
      id: this.generateEventId(),
      name,
      correlationId,
      timestamp: new Date(),
      payload,
    };
    this.emitter.emit(name, event);
  }

  public subscribe<K extends keyof EventPayloads>(
    name: K,
    callback: EventCallback<K>
  ): void {
    this.emitter.on(name, callback);
  }

  public unsubscribe<K extends keyof EventPayloads>(
    name: K,
    callback: EventCallback<K>
  ): void {
    this.emitter.off(name, callback);
  }

  private generateEventId(): string {
    return `evt_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  }
}
