import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { ServiceProvider } from '../services/ServiceProvider';
import CameraScreen from 'react-native-camera-kit';

type Props = NativeStackScreenProps<RootStackParamList, 'QrScanner'>;

const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'SnapBridge needs camera access to scan the pairing QR code.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

export function QrScannerScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('Align the QR code inside the frame');

  useEffect(() => {
    async function checkPermission() {
      const allowed = await requestCameraPermission();
      setHasPermission(allowed);
    }
    checkPermission();
  }, []);

  useEffect(() => {
    return () => {
      // Clean up scanning on unmount
      ServiceProvider.discovery.stopScan();
    };
  }, []);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleReadCode = useCallback(async (event: any) => {
    if (isProcessing) return;

    const code = event.nativeEvent?.codeStringValue;
    if (!code) return;

    setIsProcessing(true);
    setStatusText('Decoding pairing QR code...');

    try {
      const payload = JSON.parse(code);
      if (!payload.uuid || !payload.secret || !payload.port || payload.service !== 'snapbridge') {
        throw new Error('Invalid QR code format. Please ensure you are scanning the SnapBridge pairing code.');
      }

      setStatusText('Discovering desktop host on local network...');

      const discovery = ServiceProvider.discovery;

      // Setup discovery timeout
      const timeoutId = setTimeout(() => {
        discovery.stopScan();
        Alert.alert(
          'Discovery Timeout',
          'Could not find the desktop host on the local network. Please ensure both devices are connected to the same Wi-Fi network and try again.',
          [{ text: 'OK', onPress: () => setIsProcessing(false) }]
        );
        setStatusText('Align the QR code inside the frame');
      }, 15000);

      discovery.onDiscovered(async (service) => {
        if (service.uuid === payload.uuid) {
          clearTimeout(timeoutId);
          discovery.stopScan();

          setStatusText(`Pairing with ${service.name}...`);

          try {
            const pairResult = await ServiceProvider.upload.pairDevice(
              service.host,
              payload.port,
              payload.secret
            );

            if (pairResult.success) {
              Alert.alert('Success', `Successfully paired with ${pairResult.deviceName || 'Desktop Host'}!`, [
                { text: 'OK', onPress: () => navigation.navigate('Camera') }
              ]);
            } else {
              Alert.alert('Pairing Failed', pairResult.message, [
                { text: 'OK', onPress: () => setIsProcessing(false) }
              ]);
              setStatusText('Align the QR code inside the frame');
            }
          } catch (err: any) {
            Alert.alert('Pairing Error', err.message || 'Connection failed.', [
              { text: 'OK', onPress: () => setIsProcessing(false) }
            ]);
            setStatusText('Align the QR code inside the frame');
          }
        }
      });

      discovery.startScan();

    } catch (error: any) {
      Alert.alert('Invalid QR Code', error.message || 'Could not read pairing configuration.', [
        { text: 'OK', onPress: () => setIsProcessing(false) }
      ]);
      setStatusText('Align the QR code inside the frame');
    }
  }, [isProcessing, navigation]);

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.permissionText}>Checking camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.permissionText}>Camera permission is required to scan the pairing QR code.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            const allowed = await requestCameraPermission();
            setHasPermission(allowed);
          }}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraScreen
        style={StyleSheet.absoluteFill}
        scanBarcode={!isProcessing}
        onReadCode={handleReadCode}
        showFrame={true}
        laserColor={Colors.accent}
        frameColor={Colors.primary}
        hideControls={true}
      />

      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}>
          <Text style={styles.cancelText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Floating Status Indicator at bottom */}
      <View style={[styles.floatingBottomBar, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.statusCard}>
          {isProcessing && <ActivityIndicator size="small" color={Colors.accent} style={{ marginRight: Spacing.sm }} />}
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
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
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  cancelButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  floatingBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
