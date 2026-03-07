import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './src/navigation/AppNavigator';
import { QrLoginScreen } from './src/screens/QrLoginScreen';

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('jwt').then(token => {
      setAuthenticated(!!token);
      setChecking(false);
    });
  }, []);

  if (checking) return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#E50914" size="large" />
    </View>
  );

  if (!authenticated) return <QrLoginScreen onLogin={() => setAuthenticated(true)} />;
  return <AppNavigator />;
}
