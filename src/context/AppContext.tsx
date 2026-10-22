import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  Album,
  AppSettings,
  Artwork,
  ChatMessage,
  ChatSession,
  MiniMaxSettings,
} from '../types';
import { DEFAULT_ALBUM_ID } from '../constants/models';
import {
  DEFAULT_ALBUM,
  DEFAULT_SETTINGS,
  deleteLocalFile,
  loadActiveSessionId,
  loadAlbums,
  loadArtworks,
  loadSessions,
  loadSettings,
  saveActiveSessionId,
  saveAlbums,
  saveArtworks,
  saveSessions,
  saveSettings,
} from '../services/storage';
import { makeId } from '../utils/id';

interface AppContextValue {
  ready: boolean;
  settings: AppSettings;
  artworks: Artwork[];
  albums: Album[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateMiniMax: (patch: Partial<MiniMaxSettings>) => void;
  addArtwork: (artwork: Artwork) => void;
  removeArtwork: (id: string) => Promise<void>;
  removeArtworks: (ids: string[]) => Promise<void>;
  clearArtworks: () => Promise<void>;
  moveArtworks: (ids: string[], albumId: string) => void;
  createAlbum: (name: string) => Album;
  renameAlbum: (id: string, name: string) => void;
  deleteAlbum: (id: string) => void;
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: Partial<ChatMessage>
  ) => void;
  setSessionRatio: (sessionId: string, ratio: AppSettings['defaultRatio']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function createEmptySession(ratio: AppSettings['defaultRatio']): ChatSession {
  const now = Date.now();
  return {
    id: makeId(),
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    ratio,
    messages: [],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [albums, setAlbums] = useState<Album[]>([DEFAULT_ALBUM]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [storedSettings, storedArtworks, storedAlbums, storedSessions, storedActive] =
        await Promise.all([
          loadSettings(),
          loadArtworks(),
          loadAlbums(),
          loadSessions(),
          loadActiveSessionId(),
        ]);
      if (!mounted) return;

      const nextAlbums = storedAlbums.some((album) => album.id === DEFAULT_ALBUM_ID)
        ? storedAlbums
        : [DEFAULT_ALBUM, ...storedAlbums];
      const albumIds = new Set(nextAlbums.map((album) => album.id));
      const nextArtworks = storedArtworks.map((artwork) =>
        albumIds.has(artwork.albumId)
          ? artwork
          : { ...artwork, albumId: DEFAULT_ALBUM_ID }
      );

      let nextSessions = storedSessions.map((session) => ({
        ...session,
        ratio: session.ratio ?? storedSettings.defaultRatio,
        messages: (session.messages ?? []).map((message) =>
          message.status === 'loading'
            ? {
                ...message,
                status: 'error' as const,
                stage: undefined,
                error: '上次请求已中断，请重新发送',
              }
            : message
        ),
      }));
      let nextActive = storedActive;
      if (nextSessions.length === 0) {
        const session = createEmptySession(storedSettings.defaultRatio);
        nextSessions = [session];
        nextActive = session.id;
      } else if (!nextActive || !nextSessions.some((item) => item.id === nextActive)) {
        nextActive = nextSessions[0].id;
      }

      setSettings(storedSettings);
      setArtworks(nextArtworks);
      setAlbums(nextAlbums);
      setSessions(nextSessions);
      setActiveSessionIdState(nextActive);
      setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveSettings(settings).catch(() => undefined);
  }, [settings, ready]);

  useEffect(() => {
    if (!ready) return;
    saveArtworks(artworks).catch(() => undefined);
  }, [artworks, ready]);

  useEffect(() => {
    if (!ready) return;
    saveAlbums(albums).catch(() => undefined);
  }, [albums, ready]);

  useEffect(() => {
    if (!ready) return;
    saveSessions(sessions).catch(() => undefined);
  }, [sessions, ready]);

  useEffect(() => {
    if (!ready || !activeSessionId) return;
    saveActiveSessionId(activeSessionId).catch(() => undefined);
  }, [activeSessionId, ready]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateMiniMax = useCallback((patch: Partial<MiniMaxSettings>) => {
    setSettings((prev) => ({
      ...prev,
      minimax: { ...prev.minimax, ...patch },
    }));
  }, []);

  const addArtwork = useCallback((artwork: Artwork) => {
    setArtworks((prev) => [
      {
        ...artwork,
        albumId: artwork.albumId || DEFAULT_ALBUM_ID,
      },
      ...prev,
    ]);
  }, []);

  const removeArtwork = useCallback(async (id: string) => {
    setArtworks((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        void deleteLocalFile(target.fileUri);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const removeArtworks = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids);
    setArtworks((prev) => {
      prev
        .filter((item) => idSet.has(item.id))
        .forEach((item) => {
          void deleteLocalFile(item.fileUri);
        });
      return prev.filter((item) => !idSet.has(item.id));
    });
  }, []);

  const clearArtworks = useCallback(async () => {
    setArtworks((prev) => {
      prev.forEach((item) => {
        void deleteLocalFile(item.fileUri);
      });
      return [];
    });
  }, []);

  const moveArtworks = useCallback((ids: string[], albumId: string) => {
    const idSet = new Set(ids);
    setArtworks((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, albumId } : item))
    );
  }, []);

  const createAlbum = useCallback(
    (name: string) => {
      const album: Album = {
        id: makeId(),
        name: name.trim() || '新画册',
        createdAt: Date.now(),
      };
      setAlbums((prev) => [...prev, album]);
      return album;
    },
    []
  );

  const renameAlbum = useCallback((id: string, name: string) => {
    if (id === DEFAULT_ALBUM_ID) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setAlbums((prev) =>
      prev.map((album) => (album.id === id ? { ...album, name: trimmed } : album))
    );
  }, []);

  const deleteAlbum = useCallback((id: string) => {
    if (id === DEFAULT_ALBUM_ID) return;
    setAlbums((prev) => prev.filter((album) => album.id !== id));
    setArtworks((prev) =>
      prev.map((item) =>
        item.albumId === id ? { ...item, albumId: DEFAULT_ALBUM_ID } : item
      )
    );
  }, []);

  const createSession = useCallback(() => {
    const session = createEmptySession(settings.defaultRatio);
    setSessions((prev) => [session, ...prev]);
    setActiveSessionIdState(session.id);
    return session.id;
  }, [settings.defaultRatio]);

  const cleanupSessionFiles = useCallback((session: ChatSession) => {
    session.messages.forEach((message) => {
      message.attachments?.forEach((attachment) => {
        if (attachment.uri !== attachment.textUri) {
          void deleteLocalFile(attachment.uri);
        }
        if (attachment.textUri) {
          void deleteLocalFile(attachment.textUri);
        }
      });
      message.files?.forEach((file) => {
        void deleteLocalFile(file.uri);
      });
    });
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      const target = sessions.find((session) => session.id === id);
      if (target) cleanupSessionFiles(target);
      const next = sessions.filter((session) => session.id !== id);
      if (next.length === 0) {
        const session = createEmptySession(settings.defaultRatio);
        setSessions([session]);
        setActiveSessionIdState(session.id);
        return;
      }
      setSessions(next);
      if (activeSessionId === id) {
        setActiveSessionIdState(next[0].id);
      }
    },
    [activeSessionId, cleanupSessionFiles, sessions, settings.defaultRatio]
  );

  const setActiveSession = useCallback((id: string) => {
    setActiveSessionIdState(id);
  }, []);

  const appendMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const isFirstUser = session.messages.length === 0 && message.role === 'user';
        const fallback =
          message.attachments?.find((item) => item.kind === 'file')?.name ||
          (message.attachments?.length ? '图片创作' : '新对话');
        const title = isFirstUser
          ? (message.text.trim() || fallback).replace(/\s+/g, ' ').slice(0, 24)
          : session.title;
        return {
          ...session,
          title,
          messages: [...session.messages, message],
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const patchMessage = useCallback(
    (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          return {
            ...session,
            messages: session.messages.map((message) =>
              message.id === messageId ? { ...message, ...patch } : message
            ),
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  const setSessionRatio = useCallback(
    (sessionId: string, ratio: AppSettings['defaultRatio']) => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, ratio } : session
        )
      );
      setSettings((prev) => ({ ...prev, defaultRatio: ratio }));
    },
    []
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  return (
    <AppContext.Provider
      value={{
        ready,
        settings,
        artworks,
        albums,
        sessions,
        activeSessionId,
        activeSession,
        updateSettings,
        updateMiniMax,
        addArtwork,
        removeArtwork,
        removeArtworks,
        clearArtworks,
        moveArtworks,
        createAlbum,
        renameAlbum,
        deleteAlbum,
        createSession,
        deleteSession,
        setActiveSession,
        appendMessage,
        patchMessage,
        setSessionRatio,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp 必须在 AppProvider 中使用');
  }
  return context;
}
