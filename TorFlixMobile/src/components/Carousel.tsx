import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, Animated
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { TMDB_BACKDROP } from '../services/api';

const { width, height } = Dimensions.get('window');
const CAROUSEL_H = height * 0.35;

interface Props {
  items: any[];
  onPress: (item: any) => void;
}

export function Carousel({ items, onPress }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => {
      const next = (index + 1) % items.length;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [index, items.length]);

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {items.map((item, i) => (
          <TouchableOpacity key={i} style={styles.slide} onPress={() => onPress(item)} activeOpacity={0.9}>
            <Image
              source={{ uri: TMDB_BACKDROP + item.backdrop_path }}
              style={styles.image}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.gradient}
            >
              <Text style={styles.title} numberOfLines={2}>
                {item.title || item.name}
              </Text>
              <Text style={styles.overview} numberOfLines={2}>
                {item.overview}
              </Text>
              <TouchableOpacity style={styles.playBtn} onPress={() => onPress(item)}>
                <Text style={styles.playText}>▶  Regarder</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {items.slice(0, 5).map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: CAROUSEL_H },
  slide: { width, height: CAROUSEL_H },
  image: { width, height: CAROUSEL_H, position: 'absolute' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  overview: { color: '#ccc', fontSize: 13, marginBottom: 14 },
  playBtn: { backgroundColor: '#E50914', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6, alignSelf: 'flex-start' },
  playText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#666' },
  dotActive: { backgroundColor: '#E50914', width: 18 },
});
