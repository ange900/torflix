import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, View, Dimensions } from 'react-native';
import { TMDB_IMG } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_W = width / 3.5;
const CARD_H = CARD_W * 1.5;

interface Props {
  item: any;
  onPress: () => void;
  progress?: number;
}

export function MovieCard({ item, onPress, progress }: Props) {
  const title = item.title || item.name || '';
  const poster = item.poster_path;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {poster ? (
        <Image
          source={{ uri: TMDB_IMG + poster }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.noPoster]}>
          <Text style={styles.noPosterText}>🎬</Text>
        </View>
      )}
      {progress !== undefined && progress > 0 && (
        <View style={styles.progressBg}>
          <View style={[styles.progressBar, { width: `${Math.min(100, progress * 100)}%` }]} />
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_W, marginRight: 8 },
  poster: { width: CARD_W, height: CARD_H, borderRadius: 8, backgroundColor: '#1a1a1a' },
  noPoster: { justifyContent: 'center', alignItems: 'center' },
  noPosterText: { fontSize: 32 },
  title: { color: '#ccc', fontSize: 11, marginTop: 4, paddingHorizontal: 2 },
  progressBg: { height: 3, backgroundColor: '#333', borderRadius: 2, marginTop: 2 },
  progressBar: { height: 3, backgroundColor: '#E50914', borderRadius: 2 },
});
