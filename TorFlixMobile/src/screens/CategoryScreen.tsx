import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api';
import { MovieCard } from '../components/MovieCard';

export function CategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { name, type, genreId } = route.params;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getByGenre(type, genreId)
      .then(r => setItems(r.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>● {name}</Text>
      </View>
      {loading ? <ActivityIndicator color="#E50914" style={{ flex: 1 }} /> : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <MovieCard item={item} onPress={() => navigation.navigate('Detail', { item, type })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, gap: 12 },
  back: { color: '#E50914', fontSize: 16, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  grid: { padding: 12, gap: 8 },
});
