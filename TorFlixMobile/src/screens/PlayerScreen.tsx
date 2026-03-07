import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Dimensions
} from 'react-native';
import Video, { OnProgressData, OnLoadData } from 'react-native-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStream } from '../hooks/useStream';

const { width, height } = Dimensions.get('window');

export function PlayerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { magnet, downloadUrl, title, contentId, startPosition = 0 } = route.params;

  const { status, progress, peers, speed, streamUrl, startStream, stopStream } = useStream();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startStream(magnet, downloadUrl);
    return () => {
      stopStream();
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (status === 'ready') {
      saveTimer.current = setInterval(() => {
        if (currentTime > 30) {
          AsyncStorage.setItem(`pos_${contentId}`, String(Math.floor(currentTime * 1000)));
        }
      }, 10000);
    }
  }, [status]);

  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {status === 'loading' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#E50914" size="large" />
          <Text style={styles.loadingTitle}>{title}</Text>
          <Text style={styles.loadingStatus}>
            {peers > 0
              ? `${(progress * 100).toFixed(1)}% • ${peers} pairs • ${(speed / 1048576).toFixed(1)} MB/s`
              : 'Connexion aux pairs...'}
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.error}>❌ Erreur de stream</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'ready' && (
        <TouchableOpacity style={styles.videoContainer} onPress={showControls} activeOpacity={1}>
          <Video
            source={{
              uri: streamUrl,
              headers: { Authorization: `Bearer ${require('@react-native-async-storage/async-storage').default.getItem('jwt')}` }
            }}
            style={styles.video}
            resizeMode="contain"
            paused={paused}
            onProgress={(e: OnProgressData) => setCurrentTime(e.currentTime)}
            onLoad={(e: OnLoadData) => {
              setDuration(e.duration);
              if (startPosition > 0) {}
            }}
            onEnd={() => {
              AsyncStorage.setItem(`pos_${contentId}`, '0');
              navigation.goBack();
            }}
            controls={false}
          />

          {/* Contrôles overlay */}
          {controlsVisible && (
            <View style={styles.controls}>
              <View style={styles.controlsTop}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.backText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
              </View>

              <View style={styles.controlsCenter}>
                <TouchableOpacity onPress={() => setCurrentTime(t => Math.max(0, t - 10))}>
                  <Text style={styles.seekBtn}>⏪ 10s</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.playPauseBtn} onPress={() => setPaused(p => !p)}>
                  <Text style={styles.playPauseText}>{paused ? '▶' : '⏸'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCurrentTime(t => t + 10)}>
                  <Text style={styles.seekBtn}>10s ⏩</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.controlsBottom}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressFill, { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }]} />
                </View>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1 },
  video: { width, height },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 32 },
  loadingStatus: { color: '#aaa', fontSize: 14 },
  error: { color: '#E50914', fontSize: 18 },
  backBtn: { color: '#E50914', fontSize: 16, marginTop: 16 },
  controls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', padding: 24 },
  controlsTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backText: { color: '#fff', fontSize: 32 },
  titleText: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  controlsCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
  seekBtn: { color: '#fff', fontSize: 16 },
  playPauseBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center' },
  playPauseText: { color: '#fff', fontSize: 28 },
  controlsBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { color: '#fff', fontSize: 12, width: 45 },
  progressContainer: { flex: 1, height: 4, backgroundColor: '#555', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#E50914', borderRadius: 2 },
});
