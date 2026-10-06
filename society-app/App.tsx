// ============================================================
// App.tsx - Society Management Platform Entry Point
// ============================================================

import './global.css';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SessionExpiryModal } from './src/components/auth/SessionExpiryModal';
import { COLORS } from './src/constants';

// ── Splash / Loading Screen ────────────────────────────────────

function SplashScreen() {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.splashContainer}>
      <LinearGradient
        colors={[COLORS.navy[950], COLORS.navy[900], COLORS.navy[800]]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.splashContent}>
        <LinearGradient
          colors={[COLORS.accent.purple, COLORS.accent.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.splashIcon}
        >
          <Ionicons name="shield-checkmark" size={44} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.splashBrand}>GateKeep</Text>
        <Animated.View style={{ opacity: pulseAnim }}>
          <ActivityIndicator size="small" color={COLORS.primary[400]} style={{ marginTop: 24 }} />
        </Animated.View>
      </View>
    </View>
  );
}

// ── App Content (With Auth State) ──────────────────────────────

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const [showSessionExpiry, setShowSessionExpiry] = useState(false);

  // Show splash while loading auth state
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={styles.flex1}>
      <RootNavigator />

      {/* Session Expiry Modal */}
      <SessionExpiryModal
        visible={showSessionExpiry}
        onReLogin={() => setShowSessionExpiry(false)}
        onLogout={() => setShowSessionExpiry(false)}
      />
    </View>
  );
}

// ── Root App ───────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  splashIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 20,
  },
  splashBrand: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text.primary,
    letterSpacing: 1.5,
  },
});
