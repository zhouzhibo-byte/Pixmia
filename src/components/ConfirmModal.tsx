import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = '删除',
  cancelText = '取消',
  destructive = true,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, destructive && styles.destructiveButton]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.confirmText,
                  destructive && styles.destructiveText,
                ]}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
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
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.sub,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
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
  destructiveButton: {
    backgroundColor: COLORS.dangerSoft,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  destructiveText: {
    color: COLORS.danger,
  },
});
