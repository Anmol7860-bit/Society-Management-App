// ============================================================
// HomeScreen - Post-Login Dashboard Placeholder
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { GradientButton } from '../components/ui/GradientButton';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';

export function HomeScreen() {
  const { user, logout, isLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }),
    ]).start();
  }, []);

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'resident':
        return 'home';
      case 'guard':
        return 'shield-checkmark';
      case 'admin':
        return 'settings';
      default:
        return 'person';
    }
  };

  const getRoleBadgeColor = (): [string, string] => {
    switch (user?.role) {
      case 'resident':
        return [COLORS.accent.blue, COLORS.accent.cyan];
      case 'guard':
        return [COLORS.accent.purple, COLORS.accent.blue];
      case 'admin':
        return ['#F59E0B', '#EF4444'];
      default:
        return [COLORS.accent.purple, COLORS.accent.blue];
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy[950]} />
      <LinearGradient
        colors={[COLORS.navy[950], COLORS.navy[900], COLORS.navy[800]]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Welcome Card */}
        <View style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={getRoleBadgeColor()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          </View>

          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>

          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <LinearGradient
              colors={getRoleBadgeColor()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.roleBadgeGradient}
            >
              <Ionicons name={getRoleIcon() as any} size={14} color="#FFFFFF" />
              <Text style={styles.roleBadgeText}>
                {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
              </Text>
            </LinearGradient>
          </View>

          {/* User Details */}
          <View style={styles.detailsContainer}>
            {user?.flatNumber && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.text.muted} />
                <Text style={styles.detailText}>
                  {user.flatNumber}{user.building ? `, ${user.building}` : ''}
                </Text>
              </View>
            )}
            {user?.gateAssignment && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.text.muted} />
                <Text style={styles.detailText}>{user.gateAssignment}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color={COLORS.text.muted} />
              <Text style={styles.detailText}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Session Info */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.status.success} />
            <Text style={styles.sessionText}>Session Active</Text>
          </View>
          <Text style={styles.sessionSubtext}>
            Your session is secured with JWT authentication
          </Text>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <GradientButton
            title="Sign Out"
            onPress={logout}
            loading={isLoading}
            variant="outline"
            icon={<Ionicons name="log-out-outline" size={20} color={COLORS.primary[400]} />}
          />
        </View>

        <Text style={styles.footerText}>
          Dashboard modules coming soon…
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.navy[950],
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: COLORS.accent.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  greeting: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    color: COLORS.text.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  roleBadge: {
    marginBottom: 20,
  },
  roleBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    width: '100%',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  detailText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Session
  sessionCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sessionText: {
    color: COLORS.status.success,
    fontSize: 15,
    fontWeight: '700',
  },
  sessionSubtext: {
    color: COLORS.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 26,
  },

  // Logout
  logoutSection: {
    marginBottom: 24,
  },

  // Footer
  footerText: {
    textAlign: 'center',
    color: COLORS.text.muted,
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
