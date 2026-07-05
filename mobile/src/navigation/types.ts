import type { CapturedImage } from '../types';

export type RootStackParamList = {
  Camera: undefined;
  Preview: { image: CapturedImage };
  Settings: { currentIp: string };
};
