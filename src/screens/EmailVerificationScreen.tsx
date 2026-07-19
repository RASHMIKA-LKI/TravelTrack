// src/screens/EmailVerificationScreen.tsx
// Shown after sign-up when the user's email is not yet verified.
// Gated by AppNavigator: isLoggedIn && !isEmailVerified && !isOfflineUser.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/useAuthStore';

const RESEND_COOLDOWN_SECONDS = 60;

export function EmailVerificationScreen() {
  const { user, logout, sendVerificationEmail, refreshEmailVerified, isLoading } = useAuthStore();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notVerifiedMsg, setNotVerifiedMsg] = useState('');

  // Envelope gentle float animation
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 700, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleCheckVerified = async () => {
    setChecking(true);
    setNotVerifiedMsg('');
    try {
      await refreshEmailVerified();
      // If AppNavigator still shows this screen after the call, email is still unverified
      const stillUnverified = !useAuthStore.getState().isEmailVerified;
      if (stillUnverified) {
        setNotVerifiedMsg("Email not verified yet. Please check your inbox and click the link, then try again.");
      }
    } catch {
      setNotVerifiedMsg('Could not check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const sent = await sendVerificationEmail();
      if (sent) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        Alert.alert('Sent!', 'A new verification email has been sent to your inbox.');
      } else {
        Alert.alert('Error', 'Could not resend the email. Please try again later.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const email = (user as any)?.email ?? 'your email address';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Animated envelope icon */}
        <Animated.View style={{ transform: [{ translateY: bounceAnim }], marginBottom: 32 }}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>✉️</Text>
          </View>
        </Animated.View>

        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>We sent a verification link to:</Text>

        <View style={styles.emailChip}>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <Text style={styles.instructions}>
          Open the email and tap the verification link.{'\n'}
          Then come back and press the button below.
        </Text>

        {/* Warning if not verified yet */}
        {notVerifiedMsg !== '' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{notVerifiedMsg}</Text>
          </View>
        )}

        {/* Primary action */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCheckVerified}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>✓  I've Verified My Email</Text>
          )}
        </TouchableOpacity>

        {/* Resend with cooldown */}
        <TouchableOpacity
          style={[styles.secondaryBtn, (cooldown > 0 || resending) && styles.secondaryBtnDisabled]}
          onPress={handleResend}
          disabled={cooldown > 0 || resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.secondaryBtnText, cooldown > 0 && styles.secondaryBtnTextDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign out link */}
        <TouchableOpacity style={styles.signOutLink} onPress={logout} activeOpacity={0.6}>
          <Text style={styles.signOutText}>Use a different account</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(10, 74, 109, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  emailChip: {
    backgroundColor: 'rgba(10, 74, 109, 0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(10, 74, 109, 0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  instructions: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 28,
  },
  secondaryBtnDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtnTextDisabled: {
    color: '#94A3B8',
  },
  signOutLink: {
    paddingVertical: 8,
  },
  signOutText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
