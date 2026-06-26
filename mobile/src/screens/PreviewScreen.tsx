import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useConfig } from '../hooks/useConfig';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import { ServiceProvider } from '../services/ServiceProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PreviewScreen({ route, navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { config } = useConfig();
  const { image } = route.params;
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const isPaired = config.pairedDesktopName !== null;

  const handleUpload = useCallback(async () => {
    if (!isPaired) {
      Alert.alert('Not Paired', 'Please pair with your desktop application first.');
      return;
    }

    setIsUploading(true);
    setProgressPercent(0);

    try {
      const result = await ServiceProvider.upload.uploadImage(image, (progress) => {
        setProgressPercent(progress.percent);
      });

      if (result.success) {
        if (config.autoReturn) {
          setShowSuccessOverlay(true);
          setTimeout(() => {
            setShowSuccessOverlay(false);
            navigation.navigate('Camera');
          }, 1200);
        } else {
          Alert.alert('Success', 'Image transferred successfully!', [
            { text: 'OK', onPress: () => navigation.navigate('Camera') }
          ]);
        }
      } else {
        Alert.alert('Upload Failed', result.message);
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  }, [image, isPaired, config.autoReturn, navigation]);

  const handleRetake = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const aspectRatio = image.width > 0 && image.height > 0
    ? image.width / image.height
    : 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Connection Status Bar */}
      <View style={styles.statusBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleRetake}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.statusTitle}>Preview</Text>
        <View style={styles.connectionIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isPaired ? Colors.success : Colors.textMuted },
            ]}
          />
          <Text style={styles.connectionLabel}>
            {isPaired ? 'Connected' : 'Not Paired'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image.uri }}
            style={[styles.imagePreview, { aspectRatio }]}
            resizeMode="contain"
          />
        </View>

        {/* Image Metadata */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataTitle}>Image Details</Text>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Dimensions</Text>
            <Text style={styles.metadataValue}>
              {image.width} × {image.height}
            </Text>
          </View>
          <View style={styles.metadataDivider} />
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>File Size</Text>
            <Text style={styles.metadataValue}>
              {formatFileSize(image.fileSize)}
            </Text>
          </View>
          <View style={styles.metadataDivider} />
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Type</Text>
            <Text style={styles.metadataValue}>{image.mimeType}</Text>
          </View>
          <View style={styles.metadataDivider} />
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Filename</Text>
            <Text style={styles.metadataValue} numberOfLines={1}>
              {image.fileName}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={handleRetake}
          activeOpacity={0.7}
          disabled={isUploading}>
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && { opacity: 0.8 }]}
          onPress={handleUpload}
          activeOpacity={0.7}
          disabled={isUploading}>
          {isUploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: Spacing.sm }} />
              <Text style={styles.uploadButtonText}>
                {progressPercent > 0 ? `Uploading (${progressPercent}%)` : 'Uploading...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>Upload</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Animation Overlay */}
      {showSuccessOverlay && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.overlayBg} />
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>Uploaded Successfully!</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: FontSize.xxl,
    color: Colors.text,
    marginTop: -2,
  },
  statusTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: Spacing.xs + 2,
  },
  connectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  imageContainer: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  imagePreview: {
    width: '100%',
  },
  metadataCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  metadataTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  metadataLabel: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  metadataDivider: {
    height: 1,
    backgroundColor: Colors.surfaceLight,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  retakeButton: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  uploadButton: {
    flex: 2,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  uploadButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  successContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSize.xl,
    color: Colors.white,
    fontWeight: '700',
  },
});
