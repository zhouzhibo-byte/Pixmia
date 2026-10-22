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
import { COLORS, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { DEFAULT_ALBUM_ID } from '../constants/models';
import { Album } from '../types';
import NameInputModal from './NameInputModal';
import ConfirmModal from './ConfirmModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type NameMode = { type: 'create' } | { type: 'rename'; album: Album } | null;

export default function AlbumManagerSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { albums, artworks, createAlbum, renameAlbum, deleteAlbum } = useApp();
  const [nameMode, setNameMode] = useState<NameMode>(null);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);

  const countOf = (albumId: string) =>
    artworks.filter((artwork) => artwork.albumId === albumId).length;

  const deleteMessage = albumToDelete
    ? countOf(albumToDelete.id) > 0
      ? `“${albumToDelete.name}”中的 ${countOf(albumToDelete.id)} 张图片会移动到“AI创作”。`
      : `确定删除画册“${albumToDelete.name}”？`
    : '';

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
              <Text style={styles.title}>画册</Text>
              <Pressable
                style={styles.newButton}
                onPress={() => setNameMode({ type: 'create' })}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.newButtonText}>新建</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {albums.map((album) => {
                const isDefault = album.id === DEFAULT_ALBUM_ID;
                return (
                  <View key={album.id} style={styles.row}>
                    <View style={styles.folderIcon}>
                      <Ionicons
                        name={isDefault ? 'sparkles-outline' : 'folder-outline'}
                        size={18}
                        color={COLORS.brand}
                      />
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {album.name}
                      </Text>
                      <Text style={styles.rowMeta}>{countOf(album.id)} 张</Text>
                    </View>
                    {!isDefault && (
                      <>
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => setNameMode({ type: 'rename', album })}
                          hitSlop={6}
                        >
                          <Ionicons name="pencil-outline" size={17} color={COLORS.sub} />
                        </Pressable>
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => setAlbumToDelete(album)}
                          hitSlop={6}
                        >
                          <Ionicons name="trash-outline" size={17} color={COLORS.sub} />
                        </Pressable>
                      </>
                    )}
                    {isDefault && <Text style={styles.defaultTag}>默认</Text>}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NameInputModal
        visible={nameMode !== null}
        title={nameMode?.type === 'rename' ? '重命名画册' : '新建画册'}
        placeholder="画册名称"
        initialValue={nameMode?.type === 'rename' ? nameMode.album.name : ''}
        onClose={() => setNameMode(null)}
        onSubmit={(name) => {
          if (nameMode?.type === 'rename') {
            renameAlbum(nameMode.album.id, name);
          } else {
            createAlbum(name);
          }
        }}
      />

      <ConfirmModal
        visible={albumToDelete !== null}
        title="删除画册？"
        message={deleteMessage}
        onCancel={() => setAlbumToDelete(null)}
        onConfirm={() => {
          if (albumToDelete) deleteAlbum(albumToDelete.id);
          setAlbumToDelete(null);
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
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  rowMeta: {
    fontSize: 10,
    color: COLORS.sub,
    marginTop: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultTag: {
    fontSize: 10,
    color: COLORS.brand,
    fontWeight: '700',
    marginRight: 8,
  },
});
