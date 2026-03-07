import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, TMDB_IMG, TMDB_BACKDROP } from '../services/api';

const { width } = Dimensions.get('window');

export function DetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { item, type } = route.params;

  const [detail, setDetail] = useState<any>(item);
  const [cast, setCast] = useState<any[]>([]);
  const [bestTorrent, setBestTorrent] = useState<any>(null);
  const [searching, setSearching] = useState(true);
  const [searchStatus, setSearchStatus] = useState('🔍 Recherche de la meilleure source...');
  const [resumePos, setResumePos] = useState(0);

  useEffect(() => {
    loadDetail();
    searchTorrent();
    checkResume();
  }, []);

  const loadDetail = async () => {
    try {
      const d = await api.getDetail(type, String(item.id));
      setDetail(d);
      const c = await api.getCredits(type, String(item.id));
      setCast((c.cast || []).slice(0, 5));
    } catch {}
  };

  const checkResume = async () => {
    const pos = await AsyncStorage.getItem(`pos_${item.id}`);
    if (pos && parseInt(pos) > 30000) setResumePos(parseInt(pos));
  };

  const searchTorrent = async () => {
    setSearching(true);
    try {
      const title = item.title || item.name || '';
      const category = type === 'tv' ? 'TV' : 'Movies';
      const results = await api.searchTorrents(title, category);
      const list: any[] = Array.isArray(results) ? results : results.results || [];
      list.sort((a, b) => b.seeders - a.seeders);

      const quals = ['1080', '720'];
      const langs = ['VFF', 'VFI', 'VF', 'MULTI', 'TRUEFRENCH', 'FRENCH', 'VOSTFR'];
      let best = null;

      outer: for (const q of quals) {
        for (const l of langs) {
          for (const t of list) {
            const tt = (t.title || '').toUpperCase();
            if (tt.includes(q) && tt.includes(l)) { best = t; break outer; }
          }
        }
      }
      if (!best) best = list.find(t => /1080|720/.test(t.title || '')) || list[0];

      if (best) {
        setBestTorrent(best);
        setSearchStatus(`✅ ${best.quality || ''} • ${best.seeders || 0} seeders`);
      } else {
        setSearchStatus('❌ Aucune source trouvée');
      }
    } catch (e: any) {
      setSearchStatus(`❌ ${e.message}`);
    }
    setSearching(false);
  };

  const play = (startPos = 0) => {
    if (type === 'tv') {
      navigation.navigate('Season', { id: String(item.id), title: item.title || item.name });
      return;
    }
    if (!bestTorrent) return;
    navigation.navigate('Player', {
      magnet: bestTorrent.magnet || '',
      downloadUrl: bestTorrent.downloadUrl || '',
      title: item.title || item.name,
      contentId: String(item.id),
      startPosition: startPos,
    });
  };

  const title = detail.title || detail.name || '';
  const year = (detail.release_date || detail.first_air_date || '').slice(0, 4);
  const rating = detail.vote_average?.toFixed(1);
  const runtime = detail.runtime || detail.episode_run_time?.[0] || 0;
  const genres = (detail.genres || []).slice(0, 3).map((g: any) => g.name).join(' • ');
  const resumeMins = Math.floor(resumePos / 60000);
  const resumeSecs = Math.floor((resumePos % 60000) / 1000);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Backdrop */}
      <View style={styles.backdropContainer}>
        {detail.backdrop_path ? (
          <Image source={{ uri: TMDB_BACKDROP + detail.backdrop_path }} style={styles.backdrop} />
        ) : null}
        <LinearGradient colors={['transparent', '#0a0a0a']} style={styles.backdropGradient} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          {/* Poster */}
          {detail.poster_path && (
            <Image source={{ uri: TMDB_IMG + detail.poster_path }} style={styles.poster} />
          )}
          <View style={styles.info}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.metaRow}>
              {year ? <Text style={styles.meta}>{year}</Text> : null}
              {runtime > 0 ? <Text style={styles.meta}>{runtime} min</Text> : null}
              {rating ? <Text style={styles.rating}>★ {rating}</Text> : null}
            </View>
            {genres ? <Text style={styles.genres}>{genres}</Text> : null}
            <Text style={styles.overview} numberOfLines={4}>{detail.overview}</Text>
            {cast.length > 0 && (
              <Text style={styles.cast}>🎭 {cast.map((c: any) => c.name).join(', ')}</Text>
            )}
          </View>
        </View>

        {/* Statut source */}
        <Text style={styles.sourceStatus}>{searchStatus}</Text>

        {/* Boutons */}
        {!searching && bestTorrent && (
          <>
            <TouchableOpacity style={styles.playBtn} onPress={() => play(0)}>
              <Text style={styles.playText}>▶  {type === 'tv' ? 'Choisir un épisode' : 'Lecture'}</Text>
            </TouchableOpacity>
            {resumePos > 30000 && type !== 'tv' && (
              <TouchableOpacity style={styles.resumeBtn} onPress={() => play(resumePos)}>
                <Text style={styles.resumeText}>
                  ⏎  Reprendre à {resumeMins}:{String(resumeSecs).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  backdropContainer: { height: 220, position: 'relative' },
  backdrop: { width: '100%', height: 220, position: 'absolute' },
  backdropGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  backBtn: { position: 'absolute', top: 48, left: 16, padding: 8 },
  backText: { color: '#E50914', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  poster: { width: 100, height: 150, borderRadius: 8 },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  meta: { color: '#888', fontSize: 13 },
  rating: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  genres: { color: '#E50914', fontSize: 12, marginBottom: 8 },
  overview: { color: '#aaa', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  cast: { color: '#666', fontSize: 12 },
  sourceStatus: { color: '#aaa', fontSize: 14, marginVertical: 16, textAlign: 'center' },
  playBtn: { backgroundColor: '#E50914', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 10 },
  playText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resumeBtn: { backgroundColor: '#333', borderRadius: 8, padding: 14, alignItems: 'center' },
  resumeText: { color: '#fff', fontSize: 15 },
});
