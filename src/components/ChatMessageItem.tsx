import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarkdownText from './MarkdownText';
import { PreviewFile } from './FilePreviewModal';
import { COLORS, ratioValue } from '../constants/theme';
import { ChatMessage } from '../types';
import { exportFile } from '../services/storage';

interface Props {
  message: ChatMessage;
  onPreviewFile: (file: PreviewFile) => void;
}

function formatSize(size?: number): string {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatMessageItem({ message, onPreviewFile }: Props) {
  if (message.role === 'user') {
    const attachments = message.attachments ?? [];
    const images = attachments.filter((item) => item.kind === 'image');
    const files = attachments.filter((item) => item.kind === 'file');

    return (
      <View style={styles.userRow}>
        <View style={styles.userColumn}>
          {images.length > 0 && (
            <View style={styles.userImages}>
              {images.map((image) => (
                <Pressable
                  key={image.id}
                  onPress={() =>
                    onPreviewFile({
                      name: image.name,
                      uri: image.uri,
                      mimeType: image.mimeType,
                    })
                  }
                >
                  <Image source={{ uri: image.uri }} style={styles.userImage} />
                </Pressable>
              ))}
            </View>
          )}
          {files.length > 0 && (
            <View style={styles.userFiles}>
              {files.map((file) => (
                <Pressable
                  key={file.id}
                  style={styles.userFileChip}
                  onPress={() =>
                    onPreviewFile({
                      name: file.name,
                      uri: file.uri,
                      mimeType: file.mimeType,
                      textUri: file.textUri,
                    })
                  }
                >
                  <Ionicons name="document-text-outline" size={15} color={COLORS.inkSoft} />
                  <Text style={styles.userFileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {message.text ? (
            <View style={styles.userBubble}>
              <Text style={styles.userText} selectable>
                {message.text}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (message.status === 'loading') {
    return (
      <View style={styles.assistantRow}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={styles.loadingText}>
            {message.stage === 'drawing' ? '正在绘制…' : '正在思考…'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      {message.status === 'error' ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
          <Text style={styles.errorText}>{message.error || '请求失败，请重试'}</Text>
        </View>
      ) : (
        <>
          {message.text ? (
            <View style={styles.assistantCard}>
              <MarkdownText>{message.text}</MarkdownText>
            </View>
          ) : null}

          {message.imageUri ? (
            <Pressable
              onPress={() =>
                onPreviewFile({
                  name: 'pixmia-image.jpg',
                  uri: message.imageUri as string,
                  mimeType: 'image/jpeg',
                })
              }
            >
              <Image
                source={{ uri: message.imageUri }}
                style={[
                  styles.generatedImage,
                  { aspectRatio: ratioValue(message.imageRatio ?? '1:1') },
                ]}
                resizeMode="cover"
              />
            </Pressable>
          ) : null}

          {message.files && message.files.length > 0 && (
            <View style={styles.fileList}>
              {message.files.map((file) => (
                <View key={file.id} style={styles.fileCard}>
                  <View style={styles.fileIcon}>
                    <Ionicons name="document-text-outline" size={20} color={COLORS.brand} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileMeta}>{formatSize(file.size)}</Text>
                  </View>
                  <Pressable
                    style={styles.fileAction}
                    onPress={() =>
                      onPreviewFile({
                        name: file.name,
                        uri: file.uri,
                        mimeType: file.mimeType,
                      })
                    }
                    hitSlop={6}
                    accessibilityLabel="预览文件"
                  >
                    <Ionicons name="eye-outline" size={18} color={COLORS.inkSoft} />
                  </Pressable>
                  <Pressable
                    style={styles.fileAction}
                    onPress={async () => {
                      try {
                        await exportFile(file.uri, file.name);
                      } catch (error: any) {
                        Alert.alert('导出失败', error?.message || '请稍后重试');
                      }
                    }}
                    hitSlop={6}
                    accessibilityLabel="下载文件"
                  >
                    <Ionicons name="download-outline" size={18} color={COLORS.inkSoft} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userColumn: {
    maxWidth: '86%',
    alignItems: 'flex-end',
    gap: 7,
  },
  userImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  userImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: COLORS.canvas,
  },
  userFiles: {
    alignItems: 'flex-end',
    gap: 6,
  },
  userFileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 260,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  userFileName: {
    flexShrink: 1,
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  userBubble: {
    backgroundColor: '#ECECE6',
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.ink,
  },
  assistantRow: {
    marginBottom: 18,
    gap: 8,
  },
  assistantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  loadingCard: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.sub,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8A423C',
  },
  generatedImage: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: COLORS.canvas,
  },
  fileList: {
    gap: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  fileMeta: {
    fontSize: 10,
    color: COLORS.faint,
    marginTop: 2,
  },
  fileAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
