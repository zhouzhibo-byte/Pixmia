import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import AlbumManagerSheet from '../components/AlbumManagerSheet';
import AlbumPickerSheet from '../components/AlbumPickerSheet';
import ConfirmModal from '../components/ConfirmModal';
import { getPromptModelName } from '../constants/models';
import { COLORS, SPACING, formatTime, ratioValue } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { saveToAlbum } from '../services/storage';
import { Artwork } from '../types';
import { RootTabParamList } from '../navigation/BottomTabNavigator';

export default function GalleryScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { artworks, albums, removeArtwork, removeArtworks, moveArtworks } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [activeAlbumId, setActiveAlbumId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [batchConfirmVisible, setBatchConfirmVisible] = useState(false);
  const [artworkToDelete, setArtworkToDelete] = useState<Artwork | null>(null);

  const cardWidth = (width - SPACING.page * 2 - 10) / 2;
  const selected = artworks.find((item) => item.id === selectedId) ?? null;

  const filtered = useMemo(
    () =>
      activeAlbumId === 'all'
        ? artworks
        : artworks.filter((item) => item.albumId === activeAlbumId),
    [activeAlbumId, artworks]
  );

  const currentAlbum = albums.find((album) => album.id === activeAlbumId);

  useEffect(() => {
    if (activeAlbumId !== 'all' && !currentAlbum) {
      setActiveAlbumId('all');
    }
  }, [activeAlbumId, currentAlbum]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startSelecting = (id: string) => {
    setSelecting(true);
    setSelectedIds(new Set([id]));
  };

  const exitSelecting = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (!selectedIds.size) return;
    setBatchConfirmVisible(true);
  };

  const handleSave = async (artwork: Artwork) => {
    try {
      await saveToAlbum(artwork.fileUri);
      Alert.alert('已保存', '图片已写入系统相册。');
    } catch (error: any) {
      Alert.alert('保存失败', error?.message || '请稍后重试');
    }
  };

  const handleDelete = (artwork: Artwork) => {
    setArtworkToDelete(artwork);
  };

  const headerTitle = selecting ? `已选 ${selectedIds.size} 张` : '作品';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {selecting ? (
          <>
            <Pressable onPress={exitSelecting} hitSlop={8}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Text style={styles.title}>{headerTitle}</Text>
            <Pressable
              onPress={() => {
                if (selectedIds.size === filtered.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filtered.map((item) => item.id)));
                }
              }}
              hitSlop={8}
            >
              <Text style={styles.selectText}>
                {selectedIds.size === filtered.length ? '取消全选' : '全选'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>作品</Text>
            <View style={styles.headerRight}>
              <Text style={styles.localText}>仅本地存储</Text>
              {filtered.length > 0 && (
                <Pressable onPress={() => setSelecting(true)} hitSlop={8}>
                  <Text style={styles.selectText}>选择</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.albumBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.albumRow}
        >
          <Pressable
            style={[styles.albumChip, activeAlbumId === 'all' && styles.albumChipActive]}
            onPress={() => {
              setActiveAlbumId('all');
              exitSelecting();
            }}
          >
            <Text
              style={[
                styles.albumChipText,
                activeAlbumId === 'all' && styles.albumChipTextActive,
              ]}
            >
              全部
            </Text>
          </Pressable>
          {albums.map((album) => {
            const active = activeAlbumId === album.id;
            return (
              <Pressable
                key={album.id}
                style={[styles.albumChip, active && styles.albumChipActive]}
                onPress={() => {
                  setActiveAlbumId(album.id);
                  exitSelecting();
                }}
                onLongPress={() => setManagerVisible(true)}
              >
                <Text style={[styles.albumChipText, active && styles.albumChipTextActive]}>
                  {album.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.manageChip} onPress={() => setManagerVisible(true)}>
            <Ionicons name="folder-open-outline" size={14} color={COLORS.sub} />
            <Text style={styles.manageText}>管理</Text>
          </Pressable>
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient colors={[COLORS.brandSoft, '#F3EDFF']} style={styles.emptyIcon}>
              <Ionicons name="image-outline" size={30} color={COLORS.brand} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
              {activeAlbumId === 'all' ? '还没有作品' : '这个画册还没有作品'}
            </Text>
            <Text style={styles.emptyText}>去创作页生成第一张图片。</Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Create')}
            >
              <Ionicons name="sparkles" size={14} color={COLORS.white} />
              <Text style={styles.emptyButtonText}>开始创作</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              style={[styles.card, { width: cardWidth }]}
              onPress={() => {
                if (selecting) toggleSelect(item.id);
                else setSelectedId(item.id);
              }}
              onLongPress={() => {
                if (!selecting) startSelecting(item.id);
              }}
            >
              <Image source={{ uri: item.fileUri }} style={styles.cardImage} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']}
                style={styles.cardShade}
              />
              {selecting ? (
                <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                  {isSelected && <Ionicons name="checkmark" size={13} color={COLORS.white} />}
                </View>
              ) : (
                <View style={styles.cardBadge}>
                  <View style={styles.cardDot} />
                  <Text style={styles.cardBadgeText}>{item.imageModel}</Text>
                </View>
              )}
              <Text style={styles.cardPrompt} numberOfLines={2}>
                {item.originalPrompt || item.prompt}
              </Text>
            </Pressable>
          );
        }}
      />

      {selecting && selectedIds.size > 0 && (
        <View style={styles.selectionBar}>
          <Pressable style={styles.selectionAction} onPress={() => setPickerVisible(true)}>
            <Ionicons name="folder-outline" size={17} color={COLORS.ink} />
            <Text style={styles.selectionActionText}>移动到画册</Text>
          </Pressable>
          <Pressable style={styles.selectionDelete} onPress={handleBatchDelete}>
            <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
          </Pressable>
        </View>
      )}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedId(null)}
        statusBarTranslucent
      >
        <View style={styles.viewer}>
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>作品详情</Text>
              <Pressable
                style={styles.viewerClose}
                onPress={() => setSelectedId(null)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={COLORS.white} />
              </Pressable>
            </View>

            {selected && (
              <>
                <View style={styles.viewerImageWrap}>
                  <Image
                    source={{ uri: selected.fileUri }}
                    style={[styles.viewerImage, { aspectRatio: ratioValue(selected.ratio) }]}
                    resizeMode="contain"
                  />
                </View>

                <View
                  style={[
                    styles.viewerPanel,
                    { paddingBottom: Math.max(insets.bottom, 16) + 8 },
                  ]}
                >
                  <Text style={styles.viewerPrompt}>
                    {selected.originalPrompt || selected.prompt}
                  </Text>
                  <Text style={styles.viewerMeta}>
                    {getPromptModelName(selected.model)} · {selected.imageModel} ·{' '}
                    {selected.ratio}
                  </Text>
                  <Text style={styles.viewerTime}>
                    {formatTime(selected.createdAt)} ·{' '}
                    {albums.find((album) => album.id === selected.albumId)?.name ??
                      'AI创作'}
                  </Text>

                  <View style={styles.viewerActions}>
                    <Pressable
                      style={styles.primaryAction}
                      onPress={() => handleSave(selected)}
                    >
                      <Ionicons name="download-outline" size={17} color={COLORS.ink} />
                      <Text style={styles.primaryActionText}>保存到相册</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteAction}
                      onPress={() => handleDelete(selected)}
                    >
                      <Ionicons name="trash-outline" size={17} color="#FF8A80" />
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <AlbumManagerSheet
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
      />
      <AlbumPickerSheet
        visible={pickerVisible}
        count={selectedIds.size}
        onClose={() => setPickerVisible(false)}
        onPick={(albumId) => {
          moveArtworks(Array.from(selectedIds), albumId);
          exitSelecting();
        }}
      />

      <ConfirmModal
        visible={batchConfirmVisible}
        title="删除选中的图片？"
        message={`${selectedIds.size} 张图片会从本机永久删除。`}
        onCancel={() => setBatchConfirmVisible(false)}
        onConfirm={() => {
          removeArtworks(Array.from(selectedIds));
          setBatchConfirmVisible(false);
          exitSelecting();
        }}
      />

      <ConfirmModal
        visible={artworkToDelete !== null}
        title="删除这张作品？"
        message="图片会从本机永久删除，无法恢复。"
        onCancel={() => setArtworkToDelete(null)}
        onConfirm={() => {
          if (artworkToDelete) {
            setSelectedId(null);
            void removeArtwork(artworkToDelete.id);
          }
          setArtworkToDelete(null);
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.page,
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  localText: {
    fontSize: 10,
    color: COLORS.faint,
  },
  selectText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brand,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  albumBar: {
    paddingBottom: 6,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.page,
    paddingVertical: 4,
  },
  albumChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  albumChipActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  albumChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.sub,
  },
  albumChipTextActive: {
    color: COLORS.white,
  },
  manageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
  },
  manageText: {
    fontSize: 11,
    color: COLORS.sub,
  },
  listContent: {
    paddingHorizontal: SPACING.page,
    paddingTop: 8,
    paddingBottom: 90,
  },
  emptyContent: {
    flex: 1,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  card: {
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.canvas,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 20, 22, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#A9A4FF',
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkCircle: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(20,20,20,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  cardPrompt: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.sub,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 260,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.ink,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 18,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  selectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
    shadowColor: '#1B1B2A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  selectionAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 11,
  },
  selectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  selectionDelete: {
    width: 46,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.page,
    paddingTop: 8,
    paddingBottom: 8,
  },
  viewerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.4,
  },
  viewerClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImageWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewerImage: {
    width: '100%',
    maxHeight: '100%',
  },
  viewerPanel: {
    paddingHorizontal: SPACING.page,
    paddingTop: 18,
  },
  viewerPrompt: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: COLORS.white,
  },
  viewerMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 8,
  },
  viewerTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
  },
  viewerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.lime,
    borderRadius: 999,
    paddingVertical: 13,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  deleteAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
