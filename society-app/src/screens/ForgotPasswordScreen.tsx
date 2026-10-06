// ============================================================
// ForgotPasswordScreen - Password Reset Request
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GlassInput } from '../components/ui/GlassInput';
import { GradientButton } from '../components/ui/GradientButton';
import { useAuth } from '../context/AuthContext';
import { ValidationError } from '../types/auth';
import { validateForgotPasswordForm, getFieldError } from '../utils/validation';
import { COLORS } from '../constants';

type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Home: undefined;
};

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  // ── State ─────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const { forgotPassword, isLoading, error, clearError } = useAuth();

  // ── Animations ──────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Entry Animation ─────────────────────────────────────────
  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(iconScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 150,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 120,
        }),
      ]),
    ]).start();

    // Floating animation for the icon
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconFloat, {
          toValue: 8,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    floating.start();

    return () => floating.stop();
  }, []);

  // ── Success Animation ───────────────────────────────────────
  const showSuccess = () => {
    setIsSuccess(true);
    Animated.spring(successScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 10,
      stiffness: 200,
    }).start();
  };

  // ── Shake Animation ─────────────────────────────────────────
  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── Submit Handler ──────────────────────────────────────────
  const handleSubmit = async () => {
    clearError();

    const errors = validateForgotPasswordForm(email);
    setValidationErrors(errors);

    if (errors.length > 0) {
      triggerShake();
      return;
    }

    try {
      await forgotPassword(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess();
    } catch (err) {
      triggerShake();
    }
  };

  // ── Input Change ────────────────────────────────────────────
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (validationErrors.some((e) => e.field === 'email')) {
      setValidationErrors([]);
    }
    if (error) clearError();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy[950]} />

      {/* Background */}
      <LinearGradient
        colors={[COLORS.navy[950], COLORS.navy[900], COLORS.navy[800]]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background Particles */}
      <View style={[styles.particle, styles.particle1]} />
      <View style={[styles.particle, styles.particle2]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
            </View>
          </TouchableOpacity>

          {isSuccess ? (
            /* ── Success State ──────────────────────────────────── */
            <Animated.View
              style={[
                styles.successContainer,
                { transform: [{ scale: successScale }] },
              ]}
            >
              {/* Success Icon */}
              <View style={styles.successIconGlow}>
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)', 'transparent']}
                  style={styles.successGlowGradient}
                >
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark-circle" size={48} color={COLORS.status.success} />
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successSubtitle}>
                We've sent a password reset link to{'\n'}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <Text style={styles.successNote}>
                Didn't receive the email? Check your spam folder or try again with a different email address.
              </Text>

              <View style={styles.successActions}>
                <GradientButton
                  title="Back to Sign In"
                  onPress={() => navigation.navigate('Login')}
                  icon={<Ionicons name="arrow-back" size={20} color="#FFFFFF" />}
                />
                <View style={styles.spacer} />
                <GradientButton
                  title="Resend Email"
                  onPress={() => {
                    setIsSuccess(false);
                    successScale.setValue(0);
                  }}
                  variant="outline"
                />
              </View>
            </Animated.View>
          ) : (
            /* ── Form State ─────────────────────────────────────── */
            <>
              {/* Icon */}
              <Animated.View
                style={[
                  styles.iconSection,
                  {
                    transform: [
                      { scale: iconScale },
                      { translateY: iconFloat },
                    ],
                  },
                ]}
              >
                <View style={styles.iconGlow}>
                  <LinearGradient
                    colors={[
                      'rgba(139, 92, 246, 0.2)',
                      'rgba(59, 130, 246, 0.1)',
                      'transparent',
                    ]}
                    style={styles.iconGlowGradient}
                  >
                    <View style={styles.iconContainer}>
                      <LinearGradient
                        colors={[COLORS.accent.purple, COLORS.accent.blue]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                      >
                        <Ionicons name="key-outline" size={36} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              {/* Title */}
              <Animated.View
                style={[
                  styles.titleSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
              </Animated.View>

              {/* Form */}
              <Animated.View
                style={[
                  styles.formSection,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { translateX: shakeAnim },
                    ],
                  },
                ]}
              >
                {/* Error Banner */}
                {error && (
                  <View style={styles.errorBanner}>
                    <LinearGradient
                      colors={['rgba(239, 68, 68, 0.12)', 'rgba(239, 68, 68, 0.06)']}
                      style={styles.errorBannerGradient}
                    >
                      <Ionicons name="alert-circle" size={20} color={COLORS.status.error} />
                      <Text style={styles.errorBannerText}>{error}</Text>
                    </LinearGradient>
                  </View>
                )}

                <GlassInput
                  label="Email Address"
                  icon="mail-outline"
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={handleEmailChange}
                  error={getFieldError(validationErrors, 'email')}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <View style={styles.buttonContainer}>
                  <GradientButton
                    title="Send Reset Link"
                    onPress={handleSubmit}
                    loading={isLoading}
                    icon={
                      !isLoading ? (
                        <Ionicons name="send" size={18} color="#FFFFFF" />
                      ) : undefined
                    }
                  />
                </View>

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backToLogin}
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color={COLORS.text.accent} />
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.navy[950],
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },

  // Particles
  particle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.06,
  },
  particle1: {
    width: 180,
    height: 180,
    top: 60,
    right: -50,
    backgroundColor: COLORS.accent.purple,
  },
  particle2: {
    width: 140,
    height: 140,
    bottom: 120,
    left: -40,
    backgroundColor: COLORS.accent.blue,
  },

  // Back Button
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon
  iconSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconGlow: {
    alignItems: 'center',
  },
  iconGlowGradient: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    shadowColor: COLORS.accent.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Title
  titleSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
    paddingHorizontal: 16,
  },

  // Form
  formSection: {
    marginBottom: 32,
  },

  // Error Banner
  errorBanner: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  errorBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.status.error,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Button
  buttonContainer: {
    marginTop: 8,
    marginBottom: 20,
  },

  // Back to Login
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backToLoginText: {
    color: COLORS.text.accent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Success State
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconGlow: {
    marginBottom: 24,
  },
  successGlowGradient: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  successEmail: {
    color: COLORS.primary[400],
    fontWeight: '700',
  },
  successNote: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 36,
    paddingHorizontal: 16,
    letterSpacing: 0.2,
  },
  successActions: {
    width: '100%',
  },
  spacer: {
    height: 12,
  },
});
