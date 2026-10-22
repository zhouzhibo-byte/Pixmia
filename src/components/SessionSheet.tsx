import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, formatTime } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { ChatSession } from '../types';
import ConfirmModal from './ConfirmModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SessionSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
  } = useApp();

  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleDelete = (session: ChatSession) => {
    setSessionToDelete(session);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.root}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>会话</Text>
              <Pressable
                style={styles.newButton}
                onPress={() => {
                  createSession();
                  onClose();
                }}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.newButtonText}>新对话</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {sorted.map((session) => {
                const active = session.id === activeSessionId;
                return (
                  <View key={session.id} style={[styles.row, active && styles.rowActive]}>
                    <Pressable
                      style={styles.rowMain}
                      onPress={() => {
                        setActiveSession(session.id);
                        onClose();
                      }}
                    >
                      <View style={styles.rowTitleLine}>
                        <Text
                          style={[styles.rowTitle, active && styles.rowTitleActive]}
                          numberOfLines={1}
                        >
                          {session.title || '新对话'}
                        </Text>
                        {active && <View style={styles.activeDot} />}
                      </View>
                      <Text style={styles.rowMeta}>
                        {formatTime(session.updatedAt)} · {session.messages.length} 条
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(session)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={17} color={COLORS.sub} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={sessionToDelete !== null}
        title="删除会话？"
        message={`“${sessionToDelete?.title || '新对话'}”中的对话记录会从本机删除。`}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) deleteSession(sessionToDelete.id);
          setSessionToDelete(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 20, 0.35)',
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.page,
    paddingTop: 10,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D9D9D4',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.ink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  list: {
    paddingBottom: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 10,
  },
  rowActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandSoft,
  },
  rowMain: {
    flex: 1,
    paddingVertical: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  rowTitleActive: {
    color: COLORS.brandDeep,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.brand,
  },
  rowMeta: {
    fontSize: 10,
    color: COLORS.sub,
    marginTop: 3,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
