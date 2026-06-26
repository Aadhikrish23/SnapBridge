import { PipelineContext } from '../types';

export interface EventPayloads {
  'UploadCompleted': {
    context: PipelineContext;
    timestamp: Date;
  };
  'DevicePaired': {
    deviceId: string;
    deviceName: string;
    pairedAt: Date;
  };
  'DeviceUnpaired': {
    deviceId: string;
    unpairedAt: Date;
  };
  'SettingsChanged': {
    key: string;
    value: any;
    timestamp: Date;
  };
}

export interface SnapBridgeEvent<K extends keyof EventPayloads> {
  id: string;
  name: K;
  correlationId: string;
  timestamp: Date;
  payload: EventPayloads[K];
}
