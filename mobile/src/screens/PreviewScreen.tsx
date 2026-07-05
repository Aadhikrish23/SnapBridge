import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { uploadImage } from '../upload';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

export function PreviewScreen({ route, navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { image } = route.params;
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const aspectRatio =
    image.width > 0 && image.height > 0 ? image.width / image.height : 1;

  const handleSend = useCallback(async () => {
    setUploading(true);
    const result = await uploadImage(image);
    setUploading(false);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.navigate('Camera');
      }, 1500);
    } else {
      Alert.alert('Upload Failed', result.error);
    }
  }, [image, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={uploading}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.imageWrap}>
        <Image
          source={{ uri: image.uri }}
          style={[styles.image, { aspectRatio }]}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => navigation.goBack()}
          disabled={uploading}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendButton, uploading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {showSuccess && (
        <View style={styles.overlay}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Upload Successful</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  imageWrap: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: undefined,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
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
  cancelText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  sendButton: {
    flex: 2,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    color: Colors.success,
    marginBottom: Spacing.md,
  },
  successText: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
});
