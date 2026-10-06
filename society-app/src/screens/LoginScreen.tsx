// ============================================================
// LoginScreen - Premium Society Management Login
// ============================================================
// Supports two login modes:
//   1. Email + Password (original)
//   2. Phone + OTP (new)
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GlassInput } from '../components/ui/GlassInput';
import { GradientButton } from '../components/ui/GradientButton';
import { RoleSelector } from '../components/auth/RoleSelector';
import OtpInput from '../components/auth/OtpInput';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { UserRole, ValidationError } from '../types/auth';
import { validateLoginForm, getFieldError } from '../utils/validation';
import { COLORS } from '../constants';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Home: undefined;
};

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

type LoginMode = 'email' | 'phone';
type OtpStep = 'phone' | 'otp';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function LoginScreen({ navigation }: LoginScreenProps) {
  // ── State ─────────────────────────────────────────────────
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole>('resident');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const { login, firebaseLogin, isLoading, error, clearError } = useAuth();

  // Setup recaptcha
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
    }
  }, []);

  // ── Animations ──────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const errorFadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const formSwitchAnim = useRef(new Animated.Value(1)).current;

  // Particle positions for background effect
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  // ── Entry Animation ─────────────────────────────────────────
  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 12,
          stiffness: 180,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
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
      ]),
    ]).start();

    const createParticleLoop = (anim: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      );

    createParticleLoop(particle1, 6000).start();
    createParticleLoop(particle2, 8000).start();
    createParticleLoop(particle3, 5000).start();
  }, []);

  // ── Error animation ─────────────────────────────────────────
  useEffect(() => {
    if (error) {
      Animated.timing(errorFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      errorFadeAnim.setValue(0);
    }
  }, [error]);

  // ── OTP Resend Countdown Timer ──────────────────────────────
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // ── Tab Switch Animation ────────────────────────────────────
  const switchTab = (mode: LoginMode) => {
    if (mode === loginMode) return;
    clearError();
    setValidationErrors([]);

    Animated.timing(tabIndicatorAnim, {
      toValue: mode === 'email' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();

    // Fade out → switch → fade in
    Animated.timing(formSwitchAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setLoginMode(mode);
      setOtpStep('phone');
      setOtp('');
      Animated.timing(formSwitchAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Shake Animation ─────────────────────────────────────────
  const triggerShake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Email/Password Login Handler ───────────────────────────
  const handleLogin = async () => {
    clearError();
    const errors = validateLoginForm(email, password);
    setValidationErrors(errors);

    if (errors.length > 0) {
      triggerShake();
      return;
    }

    try {
      await login({ email: email.trim(), password, role: selectedRole });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setLoginAttempts((prev) => prev + 1);
      triggerShake();

      if (loginAttempts >= 4) {
        Alert.alert(
          'Too Many Attempts',
          'You have exceeded the maximum number of login attempts. Please try again later or reset your password.',
          [
            { text: 'Reset Password', onPress: () => navigation.navigate('ForgotPassword') },
            { text: 'OK', style: 'cancel' },
          ],
        );
      }
    }
  };

  // ── Send OTP Handler ───────────────────────────────────────
  const handleSendOtp = async () => {
    clearError();

    // Validate phone
    if (!phone || !/^\d{10}$/.test(phone)) {
      setValidationErrors([{ field: 'phone', message: 'Please enter a valid 10-digit phone number' }]);
      triggerShake();
      return;
    }

    setValidationErrors([]);
    setOtpSending(true);

    try {
      if (Platform.OS === 'web') {
        const appVerifier = (window as any).recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, `+91${phone}`, appVerifier);
        setConfirmationResult(result);
      } else {
        // For native, we would use expo-firebase-recaptcha, but for now fallback to the mock flow or alert
        Alert.alert("Notice", "Firebase phone auth is currently optimized for Web in this setup.");
        // Uncomment to use old logic on native: await authService.sendOtp(phone);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOtpStep('otp');
      setOtpCountdown(30); // 30 second resend cooldown
    } catch (err: any) {
      triggerShake();
      // Show error via the context error banner
      setValidationErrors([{ field: 'phone', message: err?.message || 'Failed to send OTP' }]);
    } finally {
      setOtpSending(false);
    }
  };

  // ── Verify OTP Handler ─────────────────────────────────────
  const handleVerifyOtp = async () => {
    clearError();

    if (otp.length !== 6) {
      setValidationErrors([{ field: 'otp', message: 'Please enter the complete 6-digit OTP' }]);
      triggerShake();
      return;
    }

    setValidationErrors([]);

    try {
      if (Platform.OS === 'web' && confirmationResult) {
        const userCredential = await confirmationResult.confirm(otp);
        const idToken = await userCredential.user.getIdToken();
        await firebaseLogin(idToken, selectedRole);
      } else {
        // Fallback for non-web or missing confirmation result
        throw new Error('OTP confirmation object is missing');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      triggerShake();
      setValidationErrors([{ field: 'otp', message: err?.message || 'Invalid OTP' }]);
      setOtp(''); // Clear OTP on failure so user can retry
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setOtp('');
    await handleSendOtp();
  };

  // ── Clear validation on input change ────────────────────────
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (validationErrors.some((e) => e.field === 'email')) {
      setValidationErrors((prev) => prev.filter((e) => e.field !== 'email'));
    }
    if (error) clearError();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (validationErrors.some((e) => e.field === 'password')) {
      setValidationErrors((prev) => prev.filter((e) => e.field !== 'password'));
    }
    if (error) clearError();
  };

  const handlePhoneChange = (text: string) => {
    // Allow only digits
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (validationErrors.some((e) => e.field === 'phone')) {
      setValidationErrors((prev) => prev.filter((e) => e.field !== 'phone'));
    }
    if (error) clearError();
  };

  // ── Computed Values ─────────────────────────────────────────
  const logoRotateInterpolation = logoRotate.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-5deg', '0deg'],
  });

  const particle1Translate = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const particle2Translate = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -15],
  });

  const particle3Translate = particle3.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 25],
  });

  const tabIndicatorLeft = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy[950]} />
      {Platform.OS === 'web' && <div id="recaptcha-container"></div>}

      {/* ── Background Gradient ──────────────────────────────── */}
      <LinearGradient
        colors={[COLORS.navy[950], COLORS.navy[900], COLORS.navy[800]]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Floating Particles ───────────────────────────────── */}
      <Animated.View
        style={[
          styles.particle,
          styles.particle1,
          { transform: [{ translateY: particle1Translate }, { translateX: particle2Translate }] },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          styles.particle2,
          { transform: [{ translateY: particle2Translate }, { translateX: particle1Translate }] },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          styles.particle3,
          { transform: [{ translateY: particle3Translate }] },
        ]}
      />

      {/* ── Decorative Geometric Lines ───────────────────────── */}
      <View style={styles.geoLine1} />
      <View style={styles.geoLine2} />

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
          {/* ── Logo Section ───────────────────────────────────── */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                transform: [
                  { scale: logoScale },
                  { rotate: logoRotateInterpolation },
                ],
              },
            ]}
          >
            <View style={styles.logoGlow}>
              <LinearGradient
                colors={[
                  'rgba(139, 92, 246, 0.25)',
                  'rgba(59, 130, 246, 0.15)',
                  'transparent',
                ]}
                style={styles.logoGlowGradient}
              >
                <View style={styles.logoIconContainer}>
                  <LinearGradient
                    colors={[COLORS.accent.purple, COLORS.accent.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoIconGradient}
                  >
                    <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.brandName}>GateKeep</Text>
            <View style={styles.brandUnderline}>
              <LinearGradient
                colors={[COLORS.accent.purple, COLORS.accent.blue, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.underlineGradient}
              />
            </View>
          </Animated.View>

          {/* ── Welcome Text ───────────────────────────────────── */}
          <Animated.View
            style={[
              styles.welcomeSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to manage your community effortlessly
            </Text>
          </Animated.View>

          {/* ── Login Mode Tab Switcher ─────────────────────────── */}
          <Animated.View
            style={[
              styles.tabContainer,
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.tabBar}>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  { left: tabIndicatorLeft },
                ]}
              >
                <LinearGradient
                  colors={[COLORS.accent.purple, COLORS.accent.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tabIndicatorGradient}
                />
              </Animated.View>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchTab('email')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={loginMode === 'email' ? '#FFFFFF' : COLORS.text.muted}
                />
                <Text
                  style={[
                    styles.tabText,
                    loginMode === 'email' && styles.tabTextActive,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => switchTab('phone')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={16}
                  color={loginMode === 'phone' ? '#FFFFFF' : COLORS.text.muted}
                />
                <Text
                  style={[
                    styles.tabText,
                    loginMode === 'phone' && styles.tabTextActive,
                  ]}
                >
                  Phone OTP
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Form Section ───────────────────────────────────── */}
          <Animated.View
            style={[
              styles.formSection,
              {
                opacity: Animated.multiply(fadeAnim, formSwitchAnim),
                transform: [
                  { translateY: slideAnim },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            {/* Error Banner */}
            {error && (
              <Animated.View style={[styles.errorBanner, { opacity: errorFadeAnim }]}>
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.12)', 'rgba(239, 68, 68, 0.06)']}
                  style={styles.errorBannerGradient}
                >
                  <Ionicons name="alert-circle" size={20} color={COLORS.status.error} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                  <TouchableOpacity onPress={clearError} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Role Selector — shared between both modes */}
            <RoleSelector
              selectedRole={selectedRole}
              onSelectRole={(role) => {
                setSelectedRole(role);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />

            {/* ── Email + Password Mode ──────────────────────────── */}
            {loginMode === 'email' && (
              <>
                <GlassInput
                  label="Email Address"
                  icon="mail-outline"
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={handleEmailChange}
                  error={getFieldError(validationErrors, 'email')}
                  returnKeyType="next"
                />

                <GlassInput
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  isPassword
                  value={password}
                  onChangeText={handlePasswordChange}
                  error={getFieldError(validationErrors, 'password')}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                <View style={styles.buttonContainer}>
                  <GradientButton
                    title="Sign In"
                    onPress={handleLogin}
                    loading={isLoading}
                    icon={
                      !isLoading ? (
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      ) : undefined
                    }
                  />
                </View>

                <TouchableOpacity
                  style={styles.forgotButton}
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Phone + OTP Mode ───────────────────────────────── */}
            {loginMode === 'phone' && (
              <>
                {otpStep === 'phone' && (
                  <>
                    {/* Phone Number Input */}
                    <View style={styles.phoneInputWrapper}>
                      <View style={styles.countryCode}>
                        <Text style={styles.countryFlag}>🇮🇳</Text>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <View style={styles.phoneInputContainer}>
                        <GlassInput
                          label="Phone Number"
                          icon="call-outline"
                          placeholder="Enter 10-digit number"
                          keyboardType="phone-pad"
                          value={phone}
                          onChangeText={handlePhoneChange}
                          error={getFieldError(validationErrors, 'phone')}
                          returnKeyType="done"
                          onSubmitEditing={handleSendOtp}
                        />
                      </View>
                    </View>

                    <View style={styles.buttonContainer}>
                      <GradientButton
                        title="Send OTP"
                        onPress={handleSendOtp}
                        loading={otpSending}
                        icon={
                          !otpSending ? (
                            <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
                          ) : undefined
                        }
                      />
                    </View>
                  </>
                )}

                {otpStep === 'otp' && (
                  <>
                    {/* Phone display + change */}
                    <View style={styles.otpPhoneRow}>
                      <View style={styles.otpPhoneInfo}>
                        <Ionicons name="phone-portrait" size={18} color={COLORS.primary[400]} />
                        <Text style={styles.otpPhoneText}>
                          OTP sent to +91 {phone}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setOtpStep('phone');
                          setOtp('');
                          clearError();
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.otpChangeText}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    {/* OTP Instruction */}
                    <Text style={styles.otpInstruction}>
                      Enter the 6-digit code
                    </Text>

                    {/* Dev Mode Hint */}
                    <View style={styles.devHintBanner}>
                      <Ionicons name="information-circle" size={16} color={COLORS.accent.cyan} />
                      <Text style={styles.devHintText}>
                        Dev mode: Check the backend terminal for the OTP
                      </Text>
                    </View>

                    {/* OTP Input Boxes */}
                    <OtpInput
                      value={otp}
                      onChange={(val) => {
                        setOtp(val);
                        if (validationErrors.some((e) => e.field === 'otp')) {
                          setValidationErrors([]);
                        }
                        if (error) clearError();
                      }}
                      disabled={isLoading}
                      error={!!getFieldError(validationErrors, 'otp')}
                    />

                    {/* OTP Error */}
                    {getFieldError(validationErrors, 'otp') && (
                      <Text style={styles.otpErrorText}>
                        {getFieldError(validationErrors, 'otp')}
                      </Text>
                    )}

                    {/* Verify Button */}
                    <View style={styles.buttonContainer}>
                      <GradientButton
                        title="Verify & Login"
                        onPress={handleVerifyOtp}
                        loading={isLoading}
                        icon={
                          !isLoading ? (
                            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                          ) : undefined
                        }
                      />
                    </View>

                    {/* Resend Row */}
                    <View style={styles.resendRow}>
                      <Text style={styles.resendLabel}>Didn't receive the code?</Text>
                      {otpCountdown > 0 ? (
                        <Text style={styles.resendTimer}>
                          Resend in {otpCountdown}s
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                          <Text style={styles.resendButton}>Resend OTP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </Animated.View>

          {/* ── Demo Credentials ───────────────────────────────── */}
          <Animated.View
            style={[
              styles.demoSection,
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.demoHeader}>
              <View style={styles.demoDivider} />
              <Text style={styles.demoLabel}>Demo Credentials</Text>
              <View style={styles.demoDivider} />
            </View>
            <View style={styles.demoCards}>
              {[
                { role: 'Resident', email: 'resident@gatekeep.dev', pass: 'Resident@123', phone: '9876543210' },
                { role: 'Guard', email: 'guard@gatekeep.dev', pass: 'Guard@123', phone: '9876543211' },
                { role: 'Admin', email: 'admin@gatekeep.dev', pass: 'Admin@123', phone: '9876543212' },
              ].map((demo) => (
                <TouchableOpacity
                  key={demo.role}
                  style={styles.demoCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (loginMode === 'email') {
                      setEmail(demo.email);
                      setPassword(demo.pass);
                    } else {
                      setPhone(demo.phone);
                      setOtpStep('phone');
                      setOtp('');
                    }
                    setSelectedRole(demo.role.toLowerCase() as UserRole);
                    setValidationErrors([]);
                    clearError();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.demoCardRole}>{demo.role}</Text>
                  <Text style={styles.demoCardEmail}>
                    {loginMode === 'email' ? demo.email : demo.phone}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ── Footer ──────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Society Management Platform v1.0
            </Text>
            <Text style={styles.footerSubtext}>
              Secure • Reliable • Modern
            </Text>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },

  // Particles
  particle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.08,
  },
  particle1: {
    width: 200,
    height: 200,
    top: -40,
    right: -60,
    backgroundColor: COLORS.accent.purple,
  },
  particle2: {
    width: 160,
    height: 160,
    bottom: 100,
    left: -50,
    backgroundColor: COLORS.accent.blue,
  },
  particle3: {
    width: 120,
    height: 120,
    top: SCREEN_HEIGHT * 0.4,
    right: -30,
    backgroundColor: COLORS.accent.cyan,
  },

  // Geometric lines
  geoLine1: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    transform: [{ rotate: '-15deg' }],
  },
  geoLine2: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.75,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    transform: [{ rotate: '10deg' }],
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoGlow: {
    marginBottom: 12,
  },
  logoGlowGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconContainer: {
    shadowColor: COLORS.accent.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text.primary,
    letterSpacing: 1.5,
  },
  brandUnderline: {
    marginTop: 6,
  },
  underlineGradient: {
    width: 80,
    height: 3,
    borderRadius: 2,
  },

  // Welcome
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.secondary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── Tab Switcher ──────────────────────────────────────────
  tabContainer: {
    marginBottom: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 11,
    overflow: 'hidden',
  },
  tabIndicatorGradient: {
    flex: 1,
    borderRadius: 11,
    opacity: 0.9,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.muted,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#FFFFFF',
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
    marginBottom: 16,
  },

  // Forgot Password
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotText: {
    color: COLORS.text.accent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Phone / OTP Styles ────────────────────────────────────
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.glass.light,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 26, // Align with input that has a label above it
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCodeText: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flex: 1,
  },

  // OTP Step
  otpPhoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  otpPhoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otpPhoneText: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  otpChangeText: {
    color: COLORS.primary[400],
    fontSize: 13,
    fontWeight: '700',
  },
  otpInstruction: {
    color: COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  devHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'center',
  },
  devHintText: {
    color: COLORS.accent.cyan,
    fontSize: 12,
    fontWeight: '500',
  },
  otpErrorText: {
    color: COLORS.status.error,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  resendLabel: {
    color: COLORS.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  resendTimer: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  resendButton: {
    color: COLORS.primary[400],
    fontSize: 13,
    fontWeight: '700',
  },

  // Demo Section
  demoSection: {
    marginBottom: 32,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  demoDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  demoLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoCards: {
    gap: 8,
  },
  demoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  demoCardRole: {
    color: COLORS.primary[400],
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
  },
  demoCardEmail: {
    color: COLORS.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    color: COLORS.text.muted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footerSubtext: {
    color: 'rgba(100, 116, 139, 0.6)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
