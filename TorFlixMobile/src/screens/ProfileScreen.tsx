import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';

export function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [quality, setQuality] = useState('1080');
  const [language, setLanguage] = useState('fr');

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {});
    AsyncStorage.getItem('pref_quality').then(v => v && setQuality(v));
    AsyncStorage.getItem('pref_language').then(v => v && setLanguage(v));
  }, []);

  const logout = async () => {
    await AsyncStorage.multiRemove(['jwt']);
    Alert.alert('Déconnecté');
  };

  const setQualityPref = async (q: string) => {
    setQuality(q);
    await AsyncStorage.setItem('pref_quality', q);
  };

  const setLangPref = async (l: string) => {
    setLanguage(l);
    await AsyncStorage.setItem('pref_language', l);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.header}>👤 Profil</Text>

      {profile && (
        <View style={styles.profileCard}>
          <Text style={styles.avatar}>👤</Text>
          <View>
            <Text style={styles.username}>{profile.username || profile.name}</Text>
            <Text style={styles.email}>{profile.email}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>🎬 QUALITÉ</Text>
      {['2160', '1080', '720', '480'].map(q => (
        <TouchableOpacity key={q} style={[styles.option, quality === q && styles.optionActive]} onPress={() => setQualityPref(q)}>
          <Text style={styles.optionText}>{q === '2160' ? '4K' : q + 'p'}</Text>
          {quality === q && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>🌍 LANGUE</Text>
      {[['fr', 'Français'], ['en', 'Anglais'], ['multi', 'Multi']].map(([k, v]) => (
        <TouchableOpacity key={k} style={[styles.option, language === k && styles.optionActive]} onPress={() => setLangPref(k)}>
          <Text style={styles.optionText}>{v}</Text>
          {language === k && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 60 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 24 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1a1a1a', margin: 16, padding: 20, borderRadius: 12 },
  avatar: { fontSize: 40 },
  username: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  email: { color: '#888', fontSize: 14 },
  sectionTitle: { color: '#E50914', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 16, marginTop: 24, marginBottom: 8, letterSpacing: 1 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#1a1a1a', marginHorizontal: 16, marginBottom: 4, borderRadius: 8 },
  optionActive: { backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#E50914' },
  optionText: { color: '#fff', fontSize: 16 },
  check: { color: '#E50914', fontSize: 18, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#E50914', margin: 16, marginTop: 32, padding: 16, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
