import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  DEFAULT_ALBUM_ID,
  DEFAULT_ALBUM_NAME,
  DEFAULT_IMAGE_ENDPOINT,
  DEFAULT_PROMPT_ENDPOINT,
  DEFAULT_PROMPT_MODEL,
  IMAGE_MODEL,
  extensionOf,
  mimeForExtension,
} from '../constants/models';
import {
  Album,
  AppSettings,
  Artwork,
  ChatSession,
  GeneratedImagePayload,
} from '../types';
import { makeId } from '../utils/id';

const SETTINGS_KEY = 'pixmia:settings:v3';
const ARTWORKS_KEY = 'pixmia:artworks:v2';
const ALBUMS_KEY = 'pixmia:albums:v1';
const SESSIONS_KEY = 'pixmia:sessions:v1';
const ACTIVE_SESSION_KEY = 'pixmia:active-session:v1';

const ROOT_DIR = `${FileSystem.documentDirectory ?? ''}pixmia/`;
const FILES_DIR = `${ROOT_DIR}files/`;
const ATTACHMENTS_DIR = `${ROOT_DIR}attachments/`;

const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_MINIMAX_API_KEY ?? '';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultRatio: '1:1',
  minimax: {
    apiKey: DEFAULT_API_KEY,
    promptModel: DEFAULT_PROMPT_MODEL,
    imageModel: IMAGE_MODEL,
    promptEndpoint: DEFAULT_PROMPT_ENDPOINT,
    imageEndpoint: DEFAULT_IMAGE_ENDPOINT,
  },
};

export const DEFAULT_ALBUM: Album = {
  id: DEFAULT_ALBUM_ID,
  name: DEFAULT_ALBUM_NAME,
  createdAt: 0,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      minimax: { ...DEFAULT_SETTINGS.minimax, ...(parsed?.minimax ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadArtworks(): Promise<Artwork[]> {
  try {
    const raw = await AsyncStorage.getItem(ARTWORKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      id: item.id,
      prompt: item.prompt ?? '',
      originalPrompt: item.originalPrompt ?? item.prompt ?? '',
      model: item.model ?? 'MiniMax-M3.1-Flash',
      imageModel: item.imageModel ?? 'image-01',
      albumId: item.albumId ?? DEFAULT_ALBUM_ID,
      ratio: item.ratio ?? '1:1',
      fileUri: item.fileUri,
      createdAt: item.createdAt ?? Date.now(),
    }));
  } catch {
    return [];
  }
}

export async function saveArtworks(artworks: Artwork[]): Promise<void> {
  await AsyncStorage.setItem(ARTWORKS_KEY, JSON.stringify(artworks));
}

export async function loadAlbums(): Promise<Album[]> {
  try {
    const raw = await AsyncStorage.getItem(ALBUMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list: Album[] = Array.isArray(parsed) ? parsed : [];
    if (!list.some((album) => album.id === DEFAULT_ALBUM_ID)) {
      return [DEFAULT_ALBUM, ...list];
    }
    return list;
  } catch {
    return [DEFAULT_ALBUM];
  }
}

export async function saveAlbums(albums: Album[]): Promise<void> {
  await AsyncStorage.setItem(ALBUMS_KEY, JSON.stringify(albums));
}

export async function loadSessions(): Promise<ChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: ChatSession[]): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function loadActiveSessionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveSessionId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, id);
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export function getStoragePath(): string {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return '当前为 Web 预览，无本机路径';
  }
  return ROOT_DIR;
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\r\n]/g, '_').trim();
  return cleaned || 'file';
}

async function urlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const Reader = (globalThis as any).FileReader;
    if (!Reader) {
      reject(new Error('当前环境无法转换图片'));
      return;
    }
    const reader = new Reader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

function textToDataUri(text: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

export async function persistImage(
  image: GeneratedImagePayload,
  id: string
): Promise<string> {
  if (Platform.OS === 'web') {
    if (image.base64) {
      return `data:${image.mimeType};base64,${image.base64}`;
    }
    if (image.url) {
      return await urlToDataUri(image.url);
    }
    throw new Error('图片数据为空');
  }

  await ensureDir(ROOT_DIR);
  const target = `${ROOT_DIR}${id}.jpg`;

  if (image.base64) {
    await FileSystem.writeAsStringAsync(target, image.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return target;
  }

  if (!image.url) {
    throw new Error('图片地址为空');
  }

  const downloaded = await FileSystem.downloadAsync(image.url, target);
  if (downloaded.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('图片下载失败，请重试');
  }
  return downloaded.uri;
}

export async function copyAttachment(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  await ensureDir(ATTACHMENTS_DIR);
  const target = `${ATTACHMENTS_DIR}${makeId()}-${sanitizeFileName(name)}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

export async function saveExtractedText(id: string, text: string): Promise<string> {
  if (Platform.OS === 'web') return textToDataUri(text);
  await ensureDir(FILES_DIR);
  const target = `${FILES_DIR}${id}.txt`;
  await FileSystem.writeAsStringAsync(target, text, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return target;
}

export async function readTextUri(uri: string): Promise<string> {
  if (Platform.OS === 'web' && uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    return decodeURIComponent(uri.slice(comma + 1));
  }
  return await FileSystem.readAsStringAsync(uri);
}

export async function saveGeneratedFile(
  name: string,
  content: string
): Promise<{ uri: string; size: number; mimeType: string }> {
  const safeName = sanitizeFileName(name);
  const extension = extensionOf(safeName);
  const mimeType = mimeForExtension(extension);

  if (Platform.OS === 'web') {
    return {
      uri: textToDataUri(content),
      size: content.length,
      mimeType,
    };
  }

  await ensureDir(FILES_DIR);
  const target = `${FILES_DIR}${makeId()}-${safeName}`;
  await FileSystem.writeAsStringAsync(target, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const info = await FileSystem.getInfoAsync(target);
  return {
    uri: target,
    size: info.exists ? info.size ?? content.length : content.length,
    mimeType,
  };
}

export async function deleteLocalFile(uri: string): Promise<void> {
  if (!uri.startsWith('file://')) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

export async function clearAllFiles(): Promise<void> {
  if (Platform.OS === 'web') return;
  await FileSystem.deleteAsync(ROOT_DIR, { idempotent: true }).catch(() => undefined);
}

export async function saveToAlbum(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const documentRef = (globalThis as any).document;
    if (!documentRef) throw new Error('当前环境不支持保存');
    const link = documentRef.createElement('a');
    link.href = uri;
    link.download = `pixmia-${Date.now()}.jpg`;
    documentRef.body.appendChild(link);
    link.click();
    documentRef.body.removeChild(link);
    return;
  }

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('没有相册权限，请到系统设置中允许后重试');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
}

export async function exportFile(uri: string, name: string): Promise<void> {
  if (Platform.OS === 'web') {
    const documentRef = (globalThis as any).document;
    if (!documentRef) throw new Error('当前环境不支持下载');
    const link = documentRef.createElement('a');
    link.href = uri;
    link.download = name;
    documentRef.body.appendChild(link);
    link.click();
    documentRef.body.removeChild(link);
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('当前设备不支持导出文件');
  }
  await Sharing.shareAsync(uri, {
    mimeType: mimeForExtension(extensionOf(name)),
    dialogTitle: `导出 ${name}`,
  });
}
