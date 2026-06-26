import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useConfig } from '../hooks/useConfig';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const PRESET_OPTIONS = ['High', 'Balanced', 'Fast'] as const;

export function SettingsScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { config, updateConfig } = useConfig();

  const isPaired = config.pairedDesktopName !== null;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDeviceNameChange = useCallback(
    (text: string) => {
      updateConfig({ deviceName: text });
    },
    [updateConfig],
  );

  const handleScanQr = useCallback(() => {
    navigation.navigate('QrScanner');
  }, [navigation]);

  const handleUnpair = useCallback(() => {
    Alert.alert(
      'Unpair Device',
      `Are you sure you want to unpair from "${config.pairedDesktopName}"? You will need to scan the QR code again to reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: () => {
            updateConfig({
              pairedDesktopId: null,
              pairedDesktopName: null,
              pairingSecret: null,
              desktopHost: null,
            });
          },
        },
      ],
    );
  }, [config.pairedDesktopName, updateConfig]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        
        {/* Device Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Device Name</Text>
            <TextInput
              style={styles.textInput}
              value={config.deviceName}
              onChangeText={handleDeviceNameChange}
              placeholder="Enter device name"
              placeholderTextColor={Colors.textMuted}
              maxLength={40}
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Compression Preset */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compression Quality Preset</Text>
          <View style={styles.card}>
            <View style={styles.presetSelector}>
              {PRESET_OPTIONS.map((preset) => {
                const isSelected = config.qualityPreset === preset;
                let description = '2048px | Balanced';
                if (preset === 'High') description = '3072px | High';
                if (preset === 'Fast') description = '1024px | Small';

                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetOption,
                      isSelected && styles.presetOptionSelected,
                    ]}
                    onPress={() => updateConfig({ qualityPreset: preset })}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.presetOptionText,
                        isSelected && styles.presetOptionTextSelected,
                      ]}>
                      {preset === 'High' ? 'High Quality' : preset === 'Balanced' ? 'Balanced' : 'Fast'}
                    </Text>
                    <Text
                      style={[
                        styles.presetDescText,
                        isSelected && styles.presetDescTextSelected,
                      ]}>
                      {description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Auto Upload / Auto Return */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workflow Preferences</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Text style={styles.fieldLabel}>Auto Upload</Text>
                <Text style={styles.fieldDescription}>
                  Automatically upload captured images to the paired desktop
                </Text>
              </View>
              <Switch
                value={config.autoUpload}
                onValueChange={(val) => updateConfig({ autoUpload: val })}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primaryLight }}
                thumbColor={config.autoUpload ? Colors.primary : Colors.textMuted}
              />
            </View>
            <View style={styles.cardDivider} />
            <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
              <View style={styles.toggleLabel}>
                <Text style={styles.fieldLabel}>Auto Return</Text>
                <Text style={styles.fieldDescription}>
                  Automatically return to camera screen after a successful upload
                </Text>
              </View>
              <Switch
                value={config.autoReturn}
                onValueChange={(val) => updateConfig({ autoReturn: val })}
                trackColor={{ false: Colors.surfaceLight, true: Colors.primaryLight }}
                thumbColor={config.autoReturn ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Connection Setup & Manual IP overrides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desktop Connection</Text>
          <View style={styles.card}>
            <View style={styles.pairedInfo}>
              <Text style={styles.overrideTitle}>Manual IP Address Override</Text>
              <View style={styles.pairedRow}>
                <Text style={styles.fieldLabel}>Host IP</Text>
                <TextInput
                  style={styles.overrideInput}
                  value={config.desktopHost || ''}
                  onChangeText={(text) => updateConfig({ desktopHost: text || null })}
                  placeholder="e.g. 192.168.1.50"
                  placeholderTextColor={Colors.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.pairedRow}>
                <Text style={styles.fieldLabel}>Port</Text>
                <TextInput
                  style={styles.overrideInput}
                  value={config.desktopPort ? config.desktopPort.toString() : ''}
                  onChangeText={(text) => {
                    const p = parseInt(text, 10);
                    updateConfig({ desktopPort: isNaN(p) ? 0 : p });
                  }}
                  keyboardType="number-pad"
                  placeholder="e.g. 53210"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.cardDivider} />

            {isPaired ? (
              <View style={{ marginTop: Spacing.md }}>
                <View style={styles.pairedStatusRow}>
                  <Text style={styles.fieldLabel}>Paired Desktop</Text>
                  <Text style={styles.pairedValue}>{config.pairedDesktopName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.unpairButton}
                  onPress={handleUnpair}
                  activeOpacity={0.7}>
                  <Text style={styles.unpairButtonText}>Reset Pairing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.notPairedContainer}>
                <Text style={styles.notPairedIcon}>📡</Text>
                <Text style={styles.notPairedText}>Not Paired</Text>
                <Text style={styles.notPairedSubtext}>
                  Scan a QR code from the desktop app to pair
                </Text>
                <TouchableOpacity
                  style={styles.scanQrButton}
                  onPress={handleScanQr}
                  activeOpacity={0.7}>
                  <Text style={styles.scanQrButtonText}>Scan QR Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.aboutTitle}>SnapBridge Mobile</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 (Sprint 5)</Text>
            <Text style={styles.aboutDesc}>
              A secure, zero-configuration local photo bridge powered by React Native and Clean Architecture.
            </Text>
          </View>
        </View>

      </ScrollView>
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
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  fieldDescription: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  textInput: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetSelector: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  presetOption: {
    height: 58,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  presetOptionText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  presetOptionTextSelected: {
    color: Colors.white,
  },
  presetDescText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  presetDescTextSelected: {
    color: Colors.primaryLight,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flex: 1,
    marginRight: Spacing.md,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.surfaceLight,
    marginVertical: Spacing.md,
  },
  pairedInfo: {
    marginBottom: Spacing.xs,
  },
  overrideTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  pairedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  overrideInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'right',
  },
  pairedStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pairedValue: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: '700',
  },
  unpairButton: {
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error + '18',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  unpairButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.error,
  },
  notPairedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  notPairedIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  notPairedText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notPairedSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  scanQrButton: {
    height: 48,
    paddingHorizontal: Spacing.xl,
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
  scanQrButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  aboutTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  aboutVersion: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  aboutDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
