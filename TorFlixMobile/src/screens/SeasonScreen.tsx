import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api';

export function SeasonScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id, title } = route.params;

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    loadEpisodes(selectedSeason);
  }, [selectedSeason]);

  const loadSeasons = async () => {
    try {
      const detail = await api.getDetail('tv', id);
      const s = (detail.seasons || []).filter((s: any) => s.season_number > 0);
      setSeasons(s);
    } catch {}
  };

  const loadEpisodes = async (season: number) => {
    setLoading(true);
    try {
      const data = await api.getSeasonDetail(id, season);
      setEpisodes(data.episodes || []);
    } catch {}
    setLoading(false);
  };

  const playEpisode = (ep: any) => {
    const sCode = `S${String(selectedSeason).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`;
    navigation.navigate('EpisodePlayer', {
      seriesTitle: title,
      season: selectedSeason,
      episode: ep.episode_number,
      epTitle: ep.name,
      sCode,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {/* Sélecteur saisons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonsBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {seasons.map(s => (
          <TouchableOpacity
            key={s.season_number}
            style={[styles.seasonBtn, s.season_number === selectedSeason && styles.seasonBtnActive]}
            onPress={() => setSelectedSeason(s.season_number)}
          >
            <Text style={[styles.seasonText, s.season_number === selectedSeason && styles.seasonTextActive]}>
              Saison {s.season_number}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#E50914" style={{ flex: 1 }} />
      ) : (
        <ScrollView style={styles.episodesList} contentContainerStyle={{ paddingBottom: 100 }}>
          {episodes.map(ep => (
            <TouchableOpacity key={ep.id} style={styles.episode} onPress={() => playEpisode(ep)} activeOpacity={0.7}>
              {ep.still_path ? (
                <Image source={{ uri: `https://image.tmdb.org/t/p/w300${ep.still_path}` }} style={styles.still} />
              ) : (
                <View style={[styles.still, styles.noStill]}>
                  <Text style={{ fontSize: 24 }}>🎬</Text>
                </View>
              )}
              <View style={styles.epInfo}>
                <Text style={styles.epCode}>
                  S{String(selectedSeason).padStart(2,'0')}E{String(ep.episode_number).padStart(2,'0')}
                </Text>
                <Text style={styles.epTitle} numberOfLines={1}>{ep.name}</Text>
                <Text style={styles.epOverview} numberOfLines={2}>{ep.overview}</Text>
                {ep.vote_average > 0 && (
                  <Text style={styles.epRating}>★ {ep.vote_average.toFixed(1)}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, gap: 12 },
  back: { color: '#E50914', fontSize: 16, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  seasonsBar: { maxHeight: 56, marginBottom: 8 },
  seasonBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1a1a1a' },
  seasonBtnActive: { backgroundColor: '#E50914' },
  seasonText: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  seasonTextActive: { color: '#fff' },
  episodesList: { flex: 1 },
  episode: { flexDirection: 'row', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  still: { width: 120, height: 70, borderRadius: 8, backgroundColor: '#1a1a1a' },
  noStill: { justifyContent: 'center', alignItems: 'center' },
  epInfo: { flex: 1 },
  epCode: { color: '#E50914', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  epTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  epOverview: { color: '#888', fontSize: 12, lineHeight: 17 },
  epRating: { color: '#FFD700', fontSize: 12, marginTop: 4 },
});
