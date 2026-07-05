import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import type { RootStackParamList } from '../navigation/types';
import type { CapturedImage } from '../types';
import { getServerIp } from '../config';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [busy, setBusy] = useState(false);

  const goToPreview = useCallback(
    (image: CapturedImage) => {
      navigation.navigate('Preview', { image });
    },
    [navigation],
  );

  const handleCapture = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      goToPreview({
        uri,
        width: photo.width,
        height: photo.height,
        mimeType: 'image/jpeg',
        fileName: photo.path.split('/').pop() || `photo_${Date.now()}.jpg`,
      });
    } catch {
      Alert.alert('Capture Failed', 'Could not take photo. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, goToPreview]);

  const handleGallery = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 1 });
      if (result.didCancel) return;
      if (result.errorMessage) {
        Alert.alert('Gallery Failed', result.errorMessage);
        return;
      }
      const asset = result.assets?.[0];
      if (asset?.uri) {
        goToPreview({
          uri: asset.uri,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          mimeType: asset.type || 'image/jpeg',
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        });
      }
    } catch {
      Alert.alert('Gallery Failed', 'Could not pick image. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, goToPreview]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          SnapBridge needs camera access to take photos.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <View style={styles.titleSpacer} />
        <Text style={styles.title}>SnapBridge</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings', { currentIp: getServerIp() })}>
          <Text style={styles.settingsText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewArea}>
        {device && isFocused ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isFocused}
            photo
          />
        ) : (
          <Text style={styles.loadingText}>Loading camera...</Text>
        )}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity style={styles.sideButton} onPress={handleGallery} disabled={busy}>
          <Text style={styles.sideButtonText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={handleCapture} disabled={busy || !device}>
          {busy ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        <View style={styles.sideButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  titleSpacer: {
    width: 40,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  previewArea: {
    flex: 1,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  sideButton: {
    width: 72,
    alignItems: 'center',
  },
  sideButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: FontSize.md,
  },
});
