import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { SERVER_PORT, setServerIp, testServerConnection } from '../config';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ route, navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [ip, setIp] = useState(route.params.currentIp);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTest = useCallback(async () => {
    if (!ip.trim()) {
      Alert.alert('Invalid IP', 'Enter your PC\'s Wi-Fi IP address.');
      return;
    }
    setTesting(true);
    const ok = await testServerConnection(ip);
    setTesting(false);
    Alert.alert(
      ok ? 'Connected' : 'Not reachable',
      ok
        ? `SnapBridge desktop is running at ${ip}:${SERVER_PORT}.`
        : `Could not reach ${ip}:${SERVER_PORT}. Make sure the desktop app is running and both devices are on the same Wi-Fi.`,
    );
  }, [ip]);

  const handleSave = useCallback(async () => {
    if (!ip.trim()) {
      Alert.alert('Invalid IP', 'Enter your PC\'s Wi-Fi IP address.');
      return;
    }
    setSaving(true);
    const ok = await testServerConnection(ip);
    if (!ok) {
      setSaving(false);
      Alert.alert(
        'Not reachable',
        'Could not connect to the desktop. Save anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save anyway',
            onPress: async () => {
              await setServerIp(ip);
              setSaving(false);
              navigation.goBack();
            },
          },
        ],
      );
      return;
    }
    await setServerIp(ip);
    setSaving(false);
    navigation.goBack();
  }, [ip, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Desktop Server</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>PC IP address</Text>
        <Text style={styles.hint}>
          Phone and PC must be on the same Wi-Fi. Find the IP in the SnapBridge tray icon on your PC.
        </Text>
        <TextInput
          style={styles.input}
          value={ip}
          onChangeText={setIp}
          placeholder="192.168.1.4"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="decimal-pad"
        />
        <Text style={styles.portHint}>Port: {SERVER_PORT}</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleTest}
          disabled={testing || saving}>
          {testing ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.secondaryButtonText}>Test connection</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={testing || saving}>
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  content: {
    padding: Spacing.lg,
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.text,
    fontSize: FontSize.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  portHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  secondaryButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  primaryButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
