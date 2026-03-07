import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props { onLogin: () => void; }

export function QrLoginScreen({ onLogin }: Props) {
  const [qrData, setQrData] = useState('');
  const [status, setStatus] = useState('Génération du QR code...');
  const BASE = 'https://torfix.xyz/api';

  useEffect(() => { generateQr(); }, []);

  const generateQr = async () => {
    try {
      const res = await fetch(`${BASE}/auth/tv/qr`, { method: 'POST' });
      const data = await res.json();
      setQrData(data.qrUrl || data.code || '');
      setStatus('Scannez le QR code avec votre téléphone');
      pollToken(data.sessionId || data.code);
    } catch {
      setStatus('Erreur de connexion au serveur');
    }
  };

  const pollToken = async (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/auth/tv/verify?session=${sessionId}`);
        const data = await res.json();
        if (data.token) {
          clearInterval(interval);
          await AsyncStorage.setItem('jwt', data.token);
          onLogin();
        }
      } catch {}
    }, 3000);
    setTimeout(() => clearInterval(interval), 300000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TOR<Text style={styles.red}>FLIX</Text></Text>
      <Text style={styles.status}>{status}</Text>
      {qrData ? (
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrText}>📱</Text>
          <Text style={styles.qrCode}>{qrData.slice(0, 20)}...</Text>
        </View>
      ) : (
        <ActivityIndicator color="#E50914" size="large" />
      )}
      <TouchableOpacity style={styles.retryBtn} onPress={generateQr}>
        <Text style={styles.retryText}>Nouveau QR code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 24, padding: 32 },
  logo: { color: '#fff', fontSize: 48, fontWeight: '900' },
  red: { color: '#E50914' },
  status: { color: '#888', fontSize: 16, textAlign: 'center' },
  qrPlaceholder: { width: 200, height: 200, backgroundColor: '#1a1a1a', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E50914' },
  qrText: { fontSize: 60 },
  qrCode: { color: '#666', fontSize: 11, marginTop: 8 },
  retryBtn: { borderWidth: 1, borderColor: '#E50914', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#E50914', fontSize: 15 },
});
