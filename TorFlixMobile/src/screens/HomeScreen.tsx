import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { MovieCard } from '../components/MovieCard';
import { Carousel } from '../components/Carousel';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOVIE_CATS = [
  { name: 'Action', id: '28' }, { name: 'Comédie', id: '35' },
  { name: 'Horreur', id: '27' }, { name: 'Sci-Fi', id: '878' },
  { name: 'Animé', id: '16' }, { name: 'Thriller', id: '53' },
  { name: 'Manga', id: '16manga' },
];
const TV_CATS = [
  { name: 'Action', id: '10759' }, { name: 'Drame', id: '18' },
  { name: 'Sci-Fi', id: '10765' }, { name: 'Animé', id: '16' },
  { name: 'Crime', id: '80' }, { name: 'Manga', id: '16manga' },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'movies' | 'tv'>('movies');
  const [trending, setTrending] = useState<any[]>([]);
  const [sections, setSections] = useState<{ name: string; items: any[] }[]>([]);
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      // Trending
      const t = await api.getTrending(tab);
      setTrending((t.results || t).slice(0, 10));

      // Catégories en parallèle (top 3)
      const cats = tab === 'movies' ? MOVIE_CATS : TV_CATS;
      const top3 = cats.slice(0, 4);
      const results = await Promise.all(
        top3.map(c => api.getByGenre(tab, c.id).then(r => ({ name: c.name, items: (r.results || []).slice(0, 10) })).catch(() => ({ name: c.name, items: [] })))
      );
      setSections(results);

      // En cours
      loadInProgress();
    } catch (e) {}
    setLoading(false);
  };

  const loadInProgress = async () => {
    const keys = await AsyncStorage.getAllKeys();
    const posKeys = keys.filter(k => k.startsWith('pos_'));
    const progress: any[] = [];
    for (const key of posKeys) {
      const pos = await AsyncStorage.getItem(key);
      if (pos && parseInt(pos) > 30000) {
        const id = key.replace('pos_', '');
        try {
          const detail = await api.getDetail(tab, id);
          detail._resumePos = parseInt(pos);
          detail._resumeId = id;
          progress.push(detail);
        } catch {}
      }
    }
    setInProgress(progress);
  };

  const goToDetail = (item: any) => {
    navigation.navigate('Detail', { item, type: tab });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>TOR<Text style={styles.logoRed}>FLIX</Text></Text>
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setTab('movies')}>
            <Text style={[styles.tab, tab === 'movies' && styles.tabActive]}>Films</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('tv')}>
            <Text style={[styles.tab, tab === 'tv' && styles.tabActive]}>Séries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#E50914" size="large" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E50914" />}
        >
          {/* Carousel */}
          <Carousel items={trending.slice(0, 5)} onPress={goToDetail} />

          {/* En cours */}
          {inProgress.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>▶ Continuer à regarder</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {inProgress.map(item => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    onPress={() => goToDetail(item)}
                    progress={item._resumePos / 7200000}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tendances */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Tendances</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {trending.map(item => (
                <MovieCard key={item.id} item={item} onPress={() => goToDetail(item)} />
              ))}
            </ScrollView>
          </View>

          {/* Sections catégories */}
          {sections.map(section => (
            <View key={section.name} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>● {section.name}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Category', { name: section.name, type: tab, genreId: (tab === 'movies' ? MOVIE_CATS : TV_CATS).find(c => c.name === section.name)?.id })}>
                  <Text style={styles.seeAll}>Voir tout ›</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {section.items.map(item => (
                  <MovieCard key={item.id} item={item} onPress={() => goToDetail(item)} />
                ))}
              </ScrollView>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  logo: { color: '#fff', fontSize: 24, fontWeight: '900', flex: 1 },
  logoRed: { color: '#E50914' },
  tabs: { flexDirection: 'row', gap: 4 },
  tab: { color: '#888', fontSize: 15, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 6 },
  tabActive: { color: '#E50914', borderBottomWidth: 2, borderBottomColor: '#E50914' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  seeAll: { color: '#E50914', fontSize: 13 },
  row: { paddingBottom: 4 },
});
