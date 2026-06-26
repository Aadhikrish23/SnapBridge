import { SnapBridgeEvent, EventPayloads } from 'shared';

export type EventCallback<K extends keyof EventPayloads> = (event: SnapBridgeEvent<K>) => void | Promise<void>;

export interface IEventBus {
  /**
   * Publishes an event with a specific payload and correlation ID for tracing.
   */
  publish<K extends keyof EventPayloads>(
    name: K,
    correlationId: string,
    payload: EventPayloads[K]
  ): void;

  /**
   * Subscribes a listener to a specific event.
   */
  subscribe<K extends keyof EventPayloads>(
    name: K,
    callback: EventCallback<K>
  ): void;

  /**
   * Unsubscribes a listener from a specific event.
   */
  unsubscribe<K extends keyof EventPayloads>(
    name: K,
    callback: EventCallback<K>
  ): void;
}
