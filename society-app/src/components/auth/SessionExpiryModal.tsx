// ============================================================
// SessionExpiryModal - Session timeout notification
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../ui/GradientButton';
import { COLORS } from '../../constants';

interface SessionExpiryModalProps {
  visible: boolean;
  onReLogin: () => void;
  onLogout: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SessionExpiryModal({
  visible,
  onReLogin,
  onLogout,
}: SessionExpiryModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Entry animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the icon
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Glow Effect Behind Icon */}
          <View style={styles.iconGlow}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']}
                style={styles.iconGlowGradient}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="time-outline" size={36} color={COLORS.status.warning} />
                </View>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Content */}
          <Text style={styles.title}>Session Expired</Text>
          <Text style={styles.subtitle}>
            Your session has timed out for security reasons. Please sign in again to continue.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <GradientButton
              title="Sign In Again"
              onPress={onReLogin}
              icon={<Ionicons name="log-in-outline" size={20} color="#FFFFFF" />}
            />
            <View style={styles.actionSpacer} />
            <GradientButton
              title="Logout"
              onPress={onLogout}
              variant="outline"
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 13, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: COLORS.navy[800],
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  iconGlow: {
    marginBottom: 20,
  },
  iconGlowGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 24,
  },
  actions: {
    width: '100%',
  },
  actionSpacer: {
    height: 12,
  },
});
