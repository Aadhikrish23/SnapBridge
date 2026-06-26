import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ServiceProvider } from '../services/ServiceProvider';
import { useConfig } from '../hooks/useConfig';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { CapturedImage } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { config, updateConfig } = useConfig();

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState<'on' | 'off'>('off');
  const [connectionState, setConnectionState] = useState<'Connected' | 'Discovering' | 'Offline'>('Offline');
  const [pendingImage, setPendingImage] = useState<CapturedImage | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const isPaired = config.pairedDesktopName !== null;

  // 1. Refresh pending upload state on focus
  useEffect(() => {
    if (isFocused) {
      setPendingImage(ServiceProvider.storage.getPendingUpload());
    }
  }, [isFocused]);

  // 2. Zeroconf Discovery & Periodic Connection verification
  useEffect(() => {
    if (!isPaired) {
      setConnectionState('Offline');
      return;
    }

    const discovery = ServiceProvider.discovery;
    let isActive = true;

    // Set to Discovering initially
    setConnectionState('Discovering');

    // Run quick ping validation if host is already saved
    const runPingCheck = async (host: string, port: number) => {
      try {
        const pingUrl = `http://${host}:${port}/ping`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(pingUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok && isActive) {
          setConnectionState('Connected');
          return true;
        }
      } catch {}
      if (isActive) {
        setConnectionState('Discovering');
      }
      return false;
    };

    if (config.desktopHost) {
      runPingCheck(config.desktopHost, config.desktopPort);
    }

    discovery.onDiscovered((service) => {
      if (service.uuid === config.pairedDesktopId && isActive) {
        if (service.host !== config.desktopHost || service.port !== config.desktopPort) {
          updateConfig({
            desktopHost: service.host,
            desktopPort: service.port,
          });
        }
        runPingCheck(service.host, service.port);
      }
    });

    discovery.startScan();

    // Ping check every 5 seconds to detect server going offline
    const timer = setInterval(() => {
      if (config.desktopHost) {
        runPingCheck(config.desktopHost, config.desktopPort);
      }
    }, 5000);

    return () => {
      isActive = false;
      discovery.stopScan();
      clearInterval(timer);
    };
  }, [isPaired, config.pairedDesktopId, config.desktopHost, config.desktopPort, updateConfig]);

  const handleCapture = useCallback(async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: flashMode,
        enableShutterSound: true,
      });

      const uri = `file://${photo.path}`;
      
      // Determine file size via blob query
      let fileSize = 0;
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        fileSize = blob.size;
      } catch {}

      const rawImage: CapturedImage = {
        uri,
        width: photo.width,
        height: photo.height,
        mimeType: 'image/jpeg',
        fileSize,
        fileName: photo.path.split('/').pop() || `capture_${Date.now()}.jpg`,
      };

      // Compress BEFORE preview so preview matches final upload
      const compressedImage = await ServiceProvider.image.compressImage(
        rawImage,
        config.qualityPreset
      );

      navigation.navigate('Preview', { image: compressedImage });
    } catch (error) {
      Alert.alert('Capture Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, flashMode, config.qualityPreset, navigation]);

  const handleGallery = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const image = await ServiceProvider.image.pickFromGallery();
      if (image) {
        // Compress BEFORE preview
        const compressedImage = await ServiceProvider.image.compressImage(
          image,
          config.qualityPreset
        );
        navigation.navigate('Preview', { image: compressedImage });
      }
    } catch (error) {
      Alert.alert('Gallery Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, config.qualityPreset, navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleBadgePress = useCallback(() => {
    if (isPaired) {
      navigation.navigate('Settings');
    } else {
      navigation.navigate('QrScanner');
    }
  }, [isPaired, navigation]);

  const handleRetryUpload = useCallback(async () => {
    if (!pendingImage || isRetrying) return;
    setIsRetrying(true);

    try {
      const result = await ServiceProvider.upload.uploadImage(pendingImage);
      if (result.success) {
        Alert.alert('Success', 'Queued image uploaded successfully!');
        setPendingImage(null);
      } else {
        Alert.alert('Retry Failed', result.message);
      }
    } catch (err: any) {
      Alert.alert('Retry Error', err.message || 'An unexpected network error occurred.');
    } finally {
      setIsRetrying(false);
    }
  }, [pendingImage, isRetrying]);

  const toggleFlash = useCallback(() => {
    setFlashMode((prev) => (prev === 'on' ? 'off' : 'on'));
  }, []);

  // --- Render Permission Screen ---
  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>🛡️</Text>
        <Text style={styles.permissionText}>
          SnapBridge requires camera access to snap drawings and documents.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={requestPermission}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getConnectionColor = () => {
    if (connectionState === 'Connected') return Colors.success;
    if (connectionState === 'Discovering') return Colors.warning;
    return Colors.error;
  };

  const getStatusLabel = () => {
    if (!isPaired) return 'Tap to Pair Device';
    return `${config.pairedDesktopName} (${connectionState})`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SnapBridge</Text>
        <TouchableOpacity
          style={styles.connectionBadge}
          onPress={handleBadgePress}
          activeOpacity={0.7}>
          <View style={[styles.statusDot, { backgroundColor: getConnectionColor() }]} />
          <Text style={styles.connectionText}>{getStatusLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Failed Upload Retry Banner */}
      {pendingImage && (
        <View style={styles.retryBanner}>
          <Text style={styles.retryBannerText}>⚠️ 1 Pending Upload Failed</Text>
          <TouchableOpacity
            style={styles.retryBannerButton}
            onPress={handleRetryUpload}
            disabled={isRetrying}
            activeOpacity={0.7}>
            {isRetrying ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.retryBannerButtonText}>Retry Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Camera Preview Area */}
      <View style={styles.previewArea}>
        {device && isFocused ? (
          <View style={StyleSheet.absoluteFill}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isFocused}
              photo={true}
              torch={flashMode}
            />
            {/* Flash toggle overlay */}
            <TouchableOpacity
              style={styles.flashButton}
              onPress={toggleFlash}
              activeOpacity={0.7}>
              <Text style={styles.flashText}>{flashMode === 'on' ? '⚡ On' : '⚡ Off'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.previewIcon}>📷</Text>
            <Text style={styles.previewText}>Loading Camera...</Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={styles.sideButton}
          onPress={handleGallery}
          activeOpacity={0.7}
          disabled={isCapturing}>
          <Text style={styles.sideButtonIcon}>🖼️</Text>
          <Text style={styles.sideButtonLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          activeOpacity={0.7}
          disabled={isCapturing || !device}>
          {isCapturing ? (
            <ActivityIndicator size="large" color={Colors.white} />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.sideButton}
          onPress={handleSettings}
          activeOpacity={0.7}>
          <Text style={styles.sideButtonIcon}>⚙️</Text>
          <Text style={styles.sideButtonLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  retryButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: FontSize.md,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  connectionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  retryBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.error + '25',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryBannerText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  retryBannerButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  retryBannerButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  previewArea: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholder: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  previewIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  previewText: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  flashButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  flashText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  sideButtonIcon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  sideButtonLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
  },
});
