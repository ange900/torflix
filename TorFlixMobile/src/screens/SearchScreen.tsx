import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, TMDB_IMG } from '../services/api';

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    if (!q.trim() || q.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.search(q);
      const items = (res.results || []).filter((r: any) => r.media_type !== 'person');
      setResults(items);
    } catch {}
    setLoading(false);
  };

  const onChangeText = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(text), 500);
  };

  const goToDetail = (item: any) => {
    Keyboard.dismiss();
    const type = item.media_type === 'tv' ? 'tv' : 'movies';
    navigation.navigate('Detail', { item, type });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔍 Recherche</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Films, séries, acteurs..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={onChangeText}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => search(query)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />}

      {!loading && searched && results.length === 0 && (
        <Text style={styles.noResults}>Aucun résultat pour "{query}"</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => goToDetail(item)} activeOpacity={0.7}>
            {item.poster_path ? (
              <Image source={{ uri: TMDB_IMG + item.poster_path }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.noPoster]}>
                <Text style={{ fontSize: 28 }}>🎬</Text>
              </View>
            )}
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>{item.title || item.name}</Text>
              <View style={styles.resultMeta}>
                <Text style={styles.badge}>{item.media_type === 'tv' ? 'Série' : 'Film'}</Text>
                {item.vote_average > 0 && (
                  <Text style={styles.rating}>★ {item.vote_average.toFixed(1)}</Text>
                )}
                <Text style={styles.year}>
                  {(item.release_date || item.first_air_date || '').slice(0, 4)}
                </Text>
              </View>
              <Text style={styles.overview} numberOfLines={2}>{item.overview}</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 60 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 },
  clearBtn: { color: '#666', fontSize: 18, padding: 4 },
  noResults: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  resultItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  poster: { width: 70, height: 105, borderRadius: 8, backgroundColor: '#1a1a1a' },
  noPoster: { justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1, justifyContent: 'center' },
  resultTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  resultMeta: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 },
  badge: { backgroundColor: '#E50914', color: '#fff', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  rating: { color: '#FFD700', fontSize: 13 },
  year: { color: '#666', fontSize: 13 },
  overview: { color: '#888', fontSize: 12, lineHeight: 18 },
  separator: { height: 1, backgroundColor: '#1a1a1a' },
});
