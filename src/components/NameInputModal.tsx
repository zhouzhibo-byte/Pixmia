import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export default function NameInputModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  onClose,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [initialValue, visible]);

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onSubmit(name);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder || '输入名称'}
            placeholderTextColor={COLORS.faint}
            autoFocus
            maxLength={24}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !value.trim() && styles.confirmDisabled]}
              onPress={submit}
              disabled={!value.trim()}
            >
              <Text style={styles.confirmText}>确定</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 20, 0.4)',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  cancelText: {
    fontSize: 13,
    color: COLORS.sub,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: COLORS.ink,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  confirmDisabled: {
    backgroundColor: '#C9C9C4',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
