import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TEXT_FILE_EXTENSIONS, extensionOf } from '../constants/models';
import { COLORS, SPACING } from '../constants/theme';
import { exportFile, readTextUri } from '../services/storage';

export interface PreviewFile {
  name: string;
  uri: string;
  mimeType: string;
  textUri?: string;
}

interface Props {
  file: PreviewFile | null;
  onClose: () => void;
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

export default function FilePreviewModal({ file, onClose }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extension = file ? extensionOf(file.name) : '';
  const isImage = Boolean(
    file && (file.mimeType.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension))
  );
  const canReadText = Boolean(
    file &&
      (file.textUri ||
        TEXT_FILE_EXTENSIONS.includes(extension) ||
        file.mimeType.startsWith('text/'))
  );

  useEffect(() => {
    if (!file) {
      setText(null);
      setError('');
      return;
    }
    if (isImage || !canReadText) {
      setText(null);
      setError('');
      return;
    }

    let mounted = true;
    setLoading(true);
    setError('');
    readTextUri(file.textUri || file.uri)
      .then((content) => {
        if (mounted) setText(content);
      })
      .catch(() => {
        if (mounted) setError('读取文件失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [canReadText, file, isImage]);

  const handleExport = async () => {
    if (!file) return;
    try {
      await exportFile(file.uri, file.name);
    } catch (exportError: any) {
      Alert.alert('导出失败', exportError?.message || '请稍后重试');
    }
  };

  return (
    <Modal
      visible={Boolean(file)}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={COLORS.ink} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {file?.name ?? ''}
          </Text>
          <Pressable style={styles.closeButton} onPress={handleExport} hitSlop={8}>
            <Ionicons name="download-outline" size={20} color={COLORS.ink} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {isImage && file ? (
            <Image source={{ uri: file.uri }} style={styles.image} resizeMode="contain" />
          ) : loading ? (
            <ActivityIndicator color={COLORS.brand} />
          ) : text !== null ? (
            <ScrollView
              style={styles.textScroll}
              contentContainerStyle={styles.textContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.text} selectable>
                {text}
              </Text>
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={40} color={COLORS.faint} />
              <Text style={styles.emptyText}>
                {error || '该格式不支持内嵌预览，请导出后查看'}
              </Text>
              <Pressable style={styles.exportButton} onPress={handleExport}>
                <Ionicons name="download-outline" size={16} color={COLORS.white} />
                <Text style={styles.exportText}>导出文件</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.page,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  textScroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
  },
  textContent: {
    padding: 14,
  },
  text: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.inkSoft,
    fontFamily: 'monospace',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.sub,
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.ink,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  exportText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
