// ============================================================
// OTP Input Component — 6-digit code entry with auto-focus
// ============================================================

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { COLORS } from '../../constants';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  error = false,
}: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Animated values for each box
  const scaleAnims = useRef(
    Array.from({ length }, () => new Animated.Value(1)),
  ).current;

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [autoFocus]);

  // Pulse animation on focus
  const animateFocus = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 1.08,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleChange = (text: string, index: number) => {
    // Handle paste (multi-character input)
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, length);
      onChange(digits);
      const nextIndex = Math.min(digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single character input
    const digit = text.replace(/\D/g, '');
    const newValue = value.split('');
    newValue[index] = digit;
    const joined = newValue.join('').slice(0, length);
    onChange(joined);

    // Auto-advance to next field
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current box is empty, go back to previous
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    animateFocus(index);
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }, (_, index) => {
        const isFilled = !!value[index];
        const isFocused = focusedIndex === index;
        const hasError = error && value.length === length;

        return (
          <Animated.View
            key={index}
            style={[
              styles.boxWrapper,
              { transform: [{ scale: scaleAnims[index] }] },
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.box,
                isFocused && styles.boxFocused,
                isFilled && styles.boxFilled,
                hasError && styles.boxError,
                disabled && styles.boxDisabled,
              ]}
              value={value[index] || ''}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => handleFocus(index)}
              onBlur={() => setFocusedIndex(-1)}
              keyboardType="number-pad"
              maxLength={Platform.OS === 'web' ? 6 : 1}
              editable={!disabled}
              selectTextOnFocus
              caretHidden={Platform.OS !== 'web'}
              accessibilityLabel={`OTP digit ${index + 1}`}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 16,
  },
  boxWrapper: {},
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    backgroundColor: COLORS.glass.light,
    color: COLORS.text.primary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web'
      ? { outlineStyle: 'none' as any }
      : {}),
  },
  boxFocused: {
    borderColor: COLORS.primary[400],
    backgroundColor: COLORS.glass.medium,
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px rgba(129, 140, 248, 0.25)`,
      },
      default: {},
    }),
  },
  boxFilled: {
    borderColor: COLORS.primary[500],
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  boxError: {
    borderColor: COLORS.status.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  boxDisabled: {
    opacity: 0.5,
  },
});
