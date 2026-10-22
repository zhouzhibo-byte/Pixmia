import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import BrandMark from '../components/BrandMark';
import ChatMessageItem from '../components/ChatMessageItem';
import FilePreviewModal, { PreviewFile } from '../components/FilePreviewModal';
import SessionSheet from '../components/SessionSheet';
import { usePdfTextExtractor } from '../components/PdfTextExtractor';
import {
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_ALBUM_ID,
  INSPIRATIONS,
  MAX_FILES_PER_MESSAGE,
  MAX_FILE_SIZE,
  MAX_REFERENCE_IMAGES,
  extensionOf,
  mimeForExtension,
} from '../constants/models';
import { COLORS, RATIOS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  ChatFileText,
  generateImage,
  sendChatMessage,
} from '../services/imageApi';
import { extractGeneratedFiles } from '../services/assistantFiles';
import { extractTextFromFile } from '../services/fileParser';
import {
  copyAttachment,
  persistImage,
  readTextUri,
  saveExtractedText,
  saveGeneratedFile,
} from '../services/storage';
import {
  ChatAttachment,
  ChatSession,
  PendingAttachment,
  ReferenceImage,
} from '../types';
import { makeId } from '../utils/id';

const MAX_HISTORY_MESSAGES = 16;
const MAX_HISTORY_CHARS = 60_000;

async function imageToReference(uri: string): Promise<ReferenceImage | null> {
  try {
    if (Platform.OS === 'web') {
      if (uri.startsWith('data:')) {
        const comma = uri.indexOf(',');
        return { uri, base64: uri.slice(comma + 1), mimeType: 'image/jpeg' };
      }
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new (globalThis as any).FileReader();
        reader.onloadend = () => {
          const result = String(reader.result);
          resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(blob);
      });
      return { uri, base64, mimeType: 'image/jpeg' };
    }
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { uri, base64, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}

async function buildHistory(
  session: ChatSession
): Promise<{ role: 'user' | 'assistant'; text: string }[]> {
  const sent = session.messages.filter((message) => message.status === 'sent');
  const recent = sent.slice(-MAX_HISTORY_MESSAGES);
  const result: { role: 'user' | 'assistant'; text: string }[] = [];
  let total = 0;

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const message = recent[index];
    let text = '';

    if (message.role === 'user') {
      text = message.text;
      for (const attachment of message.attachments ?? []) {
        if (attachment.kind === 'file') {
          let content = '';
          if (attachment.textUri) {
            try {
              content = (await readTextUri(attachment.textUri)).slice(0, 6000);
            } catch {
              content = '';
            }
          }
          text += `\n【文件：${attachment.name}】\n${content || '（未能提取内容）'}`;
        } else {
          text += '\n[图片附件]';
        }
      }
    } else if (message.imageUri) {
      text = `[已生成图片：${message.imagePrompt ?? ''}]`;
    } else {
      text = message.text;
      if (message.files?.length) {
        text += `\n[输出文件：${message.files.map((file) => file.name).join('、')}]`;
      }
    }

    if (!text.trim()) continue;
    if (total + text.length > MAX_HISTORY_CHARS) break;
    total += text.length;
    result.unshift({ role: message.role, text });
  }

  return result;
}

export default function CreateScreen() {
  const {
    ready,
    settings,
    activeSession,
    activeSessionId,
    createSession,
    appendMessage,
    patchMessage,
    addArtwork,
    setSessionRatio,
  } = useApp();

  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [sessionSheetVisible, setSessionSheetVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [pickingFile, setPickingFile] = useState(false);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { extractPdf, pdfElement } = usePdfTextExtractor();

  const ratio = activeSession?.ratio ?? settings.defaultRatio;
  const messages = activeSession?.messages ?? [];
  const busy = Boolean(busySessionId);
  const canSend = Boolean(input.trim() || pending.length) && !busy && Boolean(activeSession);

  useEffect(() => {
    setInput('');
    setPending([]);
  }, [activeSessionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 90);
    return () => clearTimeout(timer);
  }, [activeSessionId, messages.length, activeSession?.updatedAt]);

  const handlePickImages = useCallback(async () => {
    if (pickingImage || !activeSession) return;
    const imageCount = pending.filter((item) => item.kind === 'image').length;
    const remaining = MAX_REFERENCE_IMAGES - imageCount;
    if (remaining <= 0) {
      Alert.alert('图片已满', `每条消息最多 ${MAX_REFERENCE_IMAGES} 张图片。`);
      return;
    }

    setPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.9,
        exif: false,
      });
      if (result.canceled) return;

      const items: PendingAttachment[] = [];
      for (const asset of result.assets) {
        let localUri = asset.uri;
        let base64 = '';
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            asset.uri,
            asset.width && asset.width > 1024 ? [{ resize: { width: 1024 } }] : [],
            {
              compress: 0.72,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );
          localUri = compressed.uri;
          base64 = compressed.base64 ?? '';
        } catch {
          base64 = '';
        }
        if (!base64) continue;
        items.push({
          id: makeId(),
          kind: 'image',
          name: asset.fileName || `image-${Date.now()}.jpg`,
          uri: localUri,
          mimeType: 'image/jpeg',
          size: asset.fileSize,
          base64,
        });
      }
      if (items.length) setPending((prev) => [...prev, ...items]);
    } finally {
      setPickingImage(false);
    }
  }, [activeSession, pending, pickingImage]);

  const handlePickFiles = useCallback(async () => {
    if (pickingFile || !activeSession) return;
    const fileCount = pending.filter((item) => item.kind === 'file').length;
    const remaining = MAX_FILES_PER_MESSAGE - fileCount;
    if (remaining <= 0) {
      Alert.alert('文件已满', `每条消息最多 ${MAX_FILES_PER_MESSAGE} 个文件。`);
      return;
    }

    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const items: PendingAttachment[] = [];
      let legacyWarning = false;
      for (const asset of result.assets.slice(0, remaining)) {
        const name = asset.name || 'file';
        const extension = extensionOf(name);
        if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
          Alert.alert('不支持的文件', `${name} 的格式暂不支持。`);
          continue;
        }
        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert('文件过大', `${name} 超过 15MB，无法添加。`);
          continue;
        }

        let content = '';
        if (extension === 'pdf') {
          if (asset.size && asset.size > 8 * 1024 * 1024) {
            Alert.alert('文件过大', `${name} 超过 8MB，无法读取 PDF 内容。`);
            continue;
          }
          try {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            content = await extractPdf(base64);
          } catch {
            content = '';
          }
        } else {
          content = await extractTextFromFile(asset.uri, name);
        }

        if (extension === 'doc' || extension === 'ppt') {
          legacyWarning = true;
        }

        items.push({
          id: makeId(),
          kind: 'file',
          name,
          uri: asset.uri,
          mimeType: asset.mimeType || mimeForExtension(extension),
          size: asset.size,
          extension,
          extractedText: content,
        });
      }
      if (items.length) setPending((prev) => [...prev, ...items]);
      if (legacyWarning) {
        Alert.alert(
          '格式提示',
          '旧版 .doc / .ppt 文件内容可能无法被模型读取，建议另存为 .docx / .pptx。'
        );
      }
    } finally {
      setPickingFile(false);
    }
  }, [activeSession, extractPdf, pending, pickingFile]);

  const removePending = useCallback((id: string) => {
    setPending((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSend = useCallback(async () => {
    if (!activeSession || !canSend) return;

    const sessionId = activeSession.id;
    const sessionSnapshot = activeSession;
    const text = input.trim();
    const pendingSnapshot = [...pending];
    const sessionRatio = sessionSnapshot.ratio;
    const userMessageId = makeId();
    const assistantMessageId = makeId();

    setInput('');
    setPending([]);
    setBusySessionId(sessionId);

    appendMessage(sessionId, {
      id: userMessageId,
      role: 'user',
      text,
      createdAt: Date.now(),
      status: 'sent',
      attachments: pendingSnapshot.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        uri: item.uri,
        mimeType: item.mimeType,
        size: item.size,
        extension: item.extension,
      })),
    });
    appendMessage(sessionId, {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      createdAt: Date.now(),
      status: 'loading',
      stage: 'thinking',
    });

    try {
      const attachments: ChatAttachment[] = [];
      const images: ReferenceImage[] = [];
      const files: ChatFileText[] = [];

      for (const item of pendingSnapshot) {
        const localUri = await copyAttachment(item.uri, item.name);
        let textUri: string | undefined;
        if (item.kind === 'file') {
          textUri = await saveExtractedText(item.id, item.extractedText ?? '');
          files.push({ name: item.name, text: item.extractedText ?? '' });
        } else {
          let base64 = item.base64 ?? '';
          if (!base64 && Platform.OS !== 'web') {
            try {
              base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch {
              base64 = '';
            }
          }
          if (base64) {
            images.push({ uri: localUri, base64, mimeType: item.mimeType });
          }
        }
        attachments.push({
          id: item.id,
          kind: item.kind,
          name: item.name,
          uri: localUri,
          mimeType: item.mimeType,
          size: item.size,
          textUri,
          extension: item.extension,
        });
      }

      patchMessage(sessionId, userMessageId, { attachments });

      let previousReference: ReferenceImage | null = null;
      const previousImage = [...sessionSnapshot.messages]
        .reverse()
        .find((message) => message.role === 'assistant' && message.imageUri);
      if (previousImage?.imageUri) {
        previousReference = await imageToReference(previousImage.imageUri);
      }
      const contextImages = [...images];
      if (contextImages.length === 0 && previousReference) {
        contextImages.push(previousReference);
      }

      const history = await buildHistory(sessionSnapshot);
      const intent = await sendChatMessage({
        settings: settings.minimax,
        history,
        userText: text,
        images: contextImages,
        files,
        ratio: sessionRatio,
      });

      if (intent.kind === 'chat') {
        const parsed = extractGeneratedFiles(intent.text);
        const generatedFiles = [];
        for (const file of parsed.files) {
          const saved = await saveGeneratedFile(file.name, file.content);
          generatedFiles.push({
            id: makeId(),
            name: file.name,
            uri: saved.uri,
            mimeType: saved.mimeType,
            size: saved.size,
            isText: true,
          });
        }
        patchMessage(sessionId, assistantMessageId, {
          status: 'sent',
          stage: undefined,
          text: parsed.text,
          files: generatedFiles,
        });
      } else {
        patchMessage(sessionId, assistantMessageId, { stage: 'drawing' });
        const imageRatio = intent.ratio ?? sessionRatio;
        const reference =
          images[0] ?? (intent.usePrevious ? previousReference ?? undefined : undefined);
        const result = await generateImage(
          intent.prompt,
          imageRatio,
          reference,
          { settings: settings.minimax }
        );
        const fileUri = await persistImage(result.image, assistantMessageId);
        addArtwork({
          id: assistantMessageId,
          prompt: intent.prompt,
          originalPrompt: text,
          model: settings.minimax.promptModel,
          imageModel: settings.minimax.imageModel,
          albumId: DEFAULT_ALBUM_ID,
          ratio: imageRatio,
          fileUri,
          createdAt: Date.now(),
        });
        patchMessage(sessionId, assistantMessageId, {
          status: 'sent',
          stage: undefined,
          text: '',
          imageUri: fileUri,
          imagePrompt: intent.prompt,
          imageRatio,
        });
      }
    } catch (error: any) {
      patchMessage(sessionId, assistantMessageId, {
        status: 'error',
        stage: undefined,
        error: error?.message || '请求失败，请重试',
      });
    } finally {
      setBusySessionId(null);
    }
  }, [activeSession, addArtwork, appendMessage, canSend, input, patchMessage, pending, settings.minimax]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => setSessionSheetVisible(true)}
            hitSlop={6}
            accessibilityLabel="会话列表"
          >
            <Ionicons name="chatbubbles-outline" size={20} color={COLORS.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeSession?.title || '新对话'}
          </Text>
          <Pressable
            style={styles.headerButton}
            onPress={() => {
              createSession();
              setInput('');
              setPending([]);
            }}
            hitSlop={6}
            accessibilityLabel="新对话"
          >
            <Ionicons name="add" size={22} color={COLORS.ink} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            messages.length === 0 && styles.emptyScroll,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <BrandMark size={54} />
              <View style={styles.suggestionWrap}>
                {INSPIRATIONS.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.suggestionChip}
                    onPress={() => setInput(item)}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onPreviewFile={setPreviewFile}
              />
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ratioRow}
            style={styles.ratioScroll}
          >
            <Text style={styles.ratioLabel}>比例</Text>
            {RATIOS.map((item) => {
              const active = ratio === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.ratioChip, active && styles.ratioChipActive]}
                  onPress={() => {
                    if (activeSession) setSessionRatio(activeSession.id, item.key);
                  }}
                >
                  <View
                    style={[
                      styles.ratioShape,
                      {
                        width: item.width >= item.height ? 14 : 14 * (item.width / item.height),
                        height: item.height >= item.width ? 14 : 14 * (item.height / item.width),
                      },
                      active && styles.ratioShapeActive,
                    ]}
                  />
                  <Text style={[styles.ratioText, active && styles.ratioTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.inputCard}>
            {pending.length > 0 && (
              <View style={styles.attachmentArea}>
                {pending.map((item) =>
                  item.kind === 'image' ? (
                    <View key={item.id} style={styles.imageAttachment}>
                      <Image source={{ uri: item.uri }} style={styles.imageAttachmentThumb} />
                      <Pressable
                        style={styles.removeBadge}
                        onPress={() => removePending(item.id)}
                        hitSlop={6}
                      >
                        <Ionicons name="close" size={12} color={COLORS.white} />
                      </Pressable>
                    </View>
                  ) : (
                    <View key={item.id} style={styles.fileAttachment}>
                      <Ionicons name="document-text-outline" size={15} color={COLORS.inkSoft} />
                      <Text style={styles.fileAttachmentName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Pressable onPress={() => removePending(item.id)} hitSlop={6}>
                        <Ionicons name="close" size={14} color={COLORS.sub} />
                      </Pressable>
                    </View>
                  )
                )}
              </View>
            )}

            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="输入消息…"
              placeholderTextColor={COLORS.faint}
              multiline
              maxLength={4000}
              scrollEnabled
            />

            <View style={styles.toolbar}>
              <Pressable
                style={styles.toolButton}
                onPress={handlePickImages}
                disabled={pickingImage}
                hitSlop={4}
                accessibilityLabel="添加图片"
              >
                {pickingImage ? (
                  <ActivityIndicator size="small" color={COLORS.sub} />
                ) : (
                  <Ionicons name="image-outline" size={21} color={COLORS.inkSoft} />
                )}
              </Pressable>
              <Pressable
                style={styles.toolButton}
                onPress={handlePickFiles}
                disabled={pickingFile}
                hitSlop={4}
                accessibilityLabel="添加文件"
              >
                {pickingFile ? (
                  <ActivityIndicator size="small" color={COLORS.sub} />
                ) : (
                  <Ionicons name="document-outline" size={20} color={COLORS.inkSoft} />
                )}
              </Pressable>

              <View style={styles.flex} />

              <Pressable
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!canSend}
                accessibilityLabel="发送"
              >
                <Ionicons
                  name={busy ? 'ellipsis-horizontal' : 'arrow-up'}
                  size={20}
                  color={COLORS.white}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {pdfElement}

      <SessionSheet
        visible={sessionSheetVisible}
        onClose={() => setSessionSheetVisible(false)}
      />

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
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
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  scrollContent: {
    paddingHorizontal: SPACING.page,
    paddingTop: 16,
    paddingBottom: 12,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
  },
  suggestionChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
    maxWidth: 260,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
  },
  ratioScroll: {
    flexGrow: 0,
    marginBottom: 6,
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingRight: 12,
  },
  ratioLabel: {
    fontSize: 11,
    color: COLORS.sub,
    marginRight: 2,
  },
  ratioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  ratioChipActive: {
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  ratioShape: {
    borderWidth: 1.2,
    borderColor: COLORS.faint,
    borderRadius: 2,
  },
  ratioShapeActive: {
    borderColor: COLORS.brand,
  },
  ratioText: {
    fontSize: 11,
    color: COLORS.sub,
  },
  ratioTextActive: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
    shadowColor: '#1B1B2A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  attachmentArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  imageAttachment: {
    width: 56,
    height: 56,
  },
  imageAttachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.canvas,
  },
  removeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(20,20,20,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: 210,
  },
  fileAttachmentName: {
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.inkSoft,
  },
  input: {
    minHeight: 42,
    maxHeight: 110,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.ink,
    paddingTop: 0,
    paddingBottom: 6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolButton: {
    width: 36,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C9C9C4',
  },
});
