import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api';

export function EpisodePlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { seriesTitle, season, episode, epTitle, sCode } = route.params;
  const [status, setStatus] = useState('🔍 Recherche de la source...');

  useEffect(() => { searchAndPlay(); }, []);

  const searchAndPlay = async () => {
    try {
      const query = `${seriesTitle} ${sCode}`;
      setStatus(`🔍 Recherche: ${query}`);
      const results = await api.searchTorrents(query, 'TV');
      const list: any[] = Array.isArray(results) ? results : results.results || [];
      list.sort((a, b) => b.seeders - a.seeders);

      const quals = ['1080', '720'];
      const langs = ['VFF', 'VFI', 'VF', 'MULTI', 'TRUEFRENCH', 'FRENCH', 'VOSTFR'];
      let best: any = null;

      outer: for (const q of quals) {
        for (const l of langs) {
          for (const t of list) {
            if ((t.title||'').toUpperCase().includes(q) && (t.title||'').toUpperCase().includes(l)) {
              best = t; break outer;
            }
          }
        }
      }
      if (!best) best = list.find(t => /1080|720/.test(t.title||'')) || list[0];

      if (!best) { setStatus('❌ Aucune source trouvée'); return; }

      setStatus(`✅ ${best.quality||''} • ${best.seeders||0} seeders`);
      await new Promise(r => setTimeout(r, 800));

      navigation.replace('Player', {
        magnet: best.magnet || '',
        downloadUrl: best.downloadUrl || '',
        title: `${seriesTitle} ${sCode} — ${epTitle}`,
        contentId: `${seriesTitle}_${season}_${episode}`,
        startPosition: 0,
      });
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#E50914" size="large" />
      <Text style={styles.title}>{seriesTitle}</Text>
      <Text style={styles.ep}>{sCode} — {epTitle}</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 32 },
  ep: { color: '#E50914', fontSize: 15 },
  status: { color: '#888', fontSize: 14, textAlign: 'center' },
});
