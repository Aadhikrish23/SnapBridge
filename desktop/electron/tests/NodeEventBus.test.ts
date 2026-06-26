import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { NodeEventBus } from '../main/core/NodeEventBus';

describe('NodeEventBus', () => {
  test('should publish and subscribe to events', async () => {
    const eventBus = new NodeEventBus();
    const correlationId = 'test-corr-id';
    
    let receivedPayload: any = null;
    let receivedCorrelationId = '';

    eventBus.subscribe('DevicePaired', (event) => {
      receivedPayload = event.payload;
      receivedCorrelationId = event.correlationId;
    });

    eventBus.publish('DevicePaired', correlationId, {
      deviceId: 'dev-123',
      deviceName: 'Test Phone',
      pairedAt: new Date()
    });

    // Wait a brief tick for callback execution
    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(receivedPayload !== null, 'Should receive event payload');
    assert.strictEqual(receivedPayload.deviceId, 'dev-123', 'Device ID should match');
    assert.strictEqual(receivedPayload.deviceName, 'Test Phone', 'Device Name should match');
    assert.strictEqual(receivedCorrelationId, correlationId, 'Correlation ID should match');
  });

  test('should support unsubscribing from events', async () => {
    const eventBus = new NodeEventBus();
    let callCount = 0;
    
    const callback = () => {
      callCount++;
    };

    eventBus.subscribe('SettingsChanged', callback);
    eventBus.publish('SettingsChanged', 'c1', { key: 'port', value: 8080, timestamp: new Date() });
    
    eventBus.unsubscribe('SettingsChanged', callback);
    eventBus.publish('SettingsChanged', 'c2', { key: 'port', value: 9090, timestamp: new Date() });

    await new Promise((resolve) => setImmediate(resolve));

    assert.strictEqual(callCount, 1, 'Callback should only be called once');
  });
});
