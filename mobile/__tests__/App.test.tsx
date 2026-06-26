/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const initialMetrics = {
    frame: { x: 0, y: 0, width: 375, height: 812 },
    insets: { top: 44, left: 0, right: 0, bottom: 34 },
  };
  const SafeAreaInsetsContext = React.createContext(initialMetrics.insets);
  const SafeAreaContext = React.createContext(initialMetrics.insets);
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaConsumer: ({ children }: any) => children(initialMetrics.insets),
    SafeAreaContext,
    SafeAreaInsetsContext,
    useSafeAreaInsets: () => ({ top: 20, bottom: 20, left: 0, right: 0 }),
    useSafeAreaFrame: () => initialMetrics.frame,
    initialWindowMetrics: initialMetrics,
  };
});

jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    enableScreens: jest.fn(),
    ScreenContainer: View,
    ScreenStack: View,
    Screen: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    SearchBar: View,
    ScreenStackItem: View,
    compatibilityFlags: {},
  };
});

jest.mock('react-native-vision-camera', () => {
  return {
    Camera: () => null,
    useCameraDevice: jest.fn(),
    useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
  };
});

jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    scan: jest.fn(),
    stop: jest.fn(),
  }));
});

jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clearAll: jest.fn(),
    })),
  };
});

jest.mock('@bam.tech/react-native-image-resizer', () => {
  return {
    createResizedImage: jest.fn(),
  };
});

jest.mock('react-native-image-picker', () => {
  return {
    launchCamera: jest.fn(),
    launchImageLibrary: jest.fn(),
  };
});

jest.mock('react-native-camera-kit', () => {
  return {
    CameraScreen: () => null,
    default: () => null,
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
