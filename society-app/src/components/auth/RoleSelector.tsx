// ============================================================
// RoleSelector - Animated role selection pills
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserRole } from '../../types/auth';
import { ROLE_OPTIONS, COLORS } from '../../constants';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

function RolePill({
  option,
  isSelected,
  onPress,
}: {
  option: (typeof ROLE_OPTIONS)[0];
  isSelected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.02 : 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.timing(opacityAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.pillTouchable}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
        {isSelected ? (
          <LinearGradient
            colors={[COLORS.accent.purple, COLORS.accent.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillGradient}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.pillTextActive}>{option.label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.pillInactive}>
            <Ionicons
              name={`${option.icon}-outline` as any}
              size={20}
              color={COLORS.text.muted}
            />
            <Text style={styles.pillTextInactive}>{option.label}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function RoleSelector({ selectedRole, onSelectRole }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Sign in as</Text>
      <View style={styles.pillRow}>
        {ROLE_OPTIONS.map((option) => (
          <RolePill
            key={option.value}
            option={option}
            isSelected={selectedRole === option.value}
            onPress={() => onSelectRole(option.value)}
          />
        ))}
      </View>
      <Text style={styles.roleDescription}>
        {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillTouchable: {
    flex: 1,
  },
  pillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: COLORS.accent.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pillTextInactive: {
    color: COLORS.text.muted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  roleDescription: {
    textAlign: 'center',
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: 0.2,
  },
});
