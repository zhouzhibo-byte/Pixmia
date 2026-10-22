import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BrandMark from '../components/BrandMark';
import ConfirmModal from '../components/ConfirmModal';
import {
  DEFAULT_IMAGE_ENDPOINT,
  DEFAULT_PROMPT_ENDPOINT,
  IMAGE_MODELS,
  PROMPT_MODELS,
} from '../constants/models';
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getStoragePath } from '../services/storage';

export default function SettingsScreen() {
  const { settings, updateMiniMax, artworks, clearArtworks } = useApp();
  const [keyVisible, setKeyVisible] = useState(false);
  const [clearVisible, setClearVisible] = useState(false);
  const config = settings.minimax;
  const configured = Boolean(config.apiKey.trim());

  const handleClear = () => {
    setClearVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>设置</Text>
            <BrandMark size={34} />
          </View>

          <Text style={styles.sectionLabel}>主对话模型配置</Text>
          <View style={styles.card}>
            <View style={styles.chipWrap}>
              {PROMPT_MODELS.map((model) => {
                const active = config.promptModel === model.id;
                return (
                  <Pressable
                    key={model.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateMiniMax({ promptModel: model.id })}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {model.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>接口地址</Text>
              <Pressable onPress={() => updateMiniMax({ promptEndpoint: DEFAULT_PROMPT_ENDPOINT })}>
                <Text style={styles.resetLink}>恢复默认</Text>
              </Pressable>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.endpointInput]}
                value={config.promptEndpoint}
                onChangeText={(text) => updateMiniMax({ promptEndpoint: text })}
                placeholder={DEFAULT_PROMPT_ENDPOINT}
                placeholderTextColor={COLORS.faint}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>图片生成模型配置</Text>
          <View style={styles.card}>
            <View style={styles.chipWrap}>
              {IMAGE_MODELS.map((model) => {
                const active = config.imageModel === model.id;
                return (
                  <Pressable
                    key={model.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateMiniMax({ imageModel: model.id })}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {model.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>接口地址</Text>
              <Pressable onPress={() => updateMiniMax({ imageEndpoint: DEFAULT_IMAGE_ENDPOINT })}>
                <Text style={styles.resetLink}>恢复默认</Text>
              </Pressable>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.endpointInput]}
                value={config.imageEndpoint}
                onChangeText={(text) => updateMiniMax({ imageEndpoint: text })}
                placeholder={DEFAULT_IMAGE_ENDPOINT}
                placeholderTextColor={COLORS.faint}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>API Key 配置</Text>
          <View style={styles.card}>
            <View style={styles.keyHeader}>
              <Text style={styles.fieldLabel}>MiniMax API Key</Text>
              <View
                style={[
                  styles.statusPill,
                  configured ? styles.statusPillOk : styles.statusPillWarn,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    configured ? styles.statusTextOk : styles.statusTextWarn,
                  ]}
                >
                  {configured ? '已配置' : '待配置'}
                </Text>
              </View>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={config.apiKey}
                onChangeText={(text) => updateMiniMax({ apiKey: text })}
                placeholder="粘贴 MiniMax API Key"
                placeholderTextColor={COLORS.faint}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!keyVisible}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setKeyVisible((prev) => !prev)}
                hitSlop={6}
              >
                <Ionicons
                  name={keyVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.sub}
                />
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionLabel}>存储与隐私</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>本地作品</Text>
              <Text style={styles.infoValue}>{artworks.length} 张</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.pathBlock}>
              <Text style={styles.infoLabel}>存储位置</Text>
              <Text style={styles.pathText} selectable>
                {getStoragePath()}
              </Text>
            </View>

            <Pressable style={styles.clearButton} onPress={handleClear}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={styles.clearButtonText}>清空本地作品</Text>
            </Pressable>
          </View>

          <View style={styles.about}>
            <Text style={styles.aboutTitle}>Pixmia 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={clearVisible}
        title="清空所有作品？"
        message="本机保存的全部图片会被永久删除，无法恢复。"
        onCancel={() => setClearVisible(false)}
        onConfirm={() => {
          clearArtworks().catch(() => undefined);
          setClearVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: SPACING.page,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sub,
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 10,
    paddingLeft: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  chipActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  resetLink: {
    fontSize: 10,
    color: COLORS.brand,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
    paddingVertical: 11,
  },
  endpointInput: {
    fontSize: 11,
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillOk: {
    backgroundColor: '#EAF7EE',
  },
  statusPillWarn: {
    backgroundColor: COLORS.canvas,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextOk: {
    color: '#2E9E5B',
  },
  statusTextWarn: {
    color: COLORS.sub,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.line,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.inkSoft,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.sub,
  },
  pathBlock: {
    paddingVertical: 10,
    gap: 6,
  },
  pathText: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.sub,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F6C9C5',
    paddingVertical: 11,
    marginTop: 14,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  about: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  aboutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sub,
  },
});
