import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { PasswordInput } from '@/components/password-input';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { signInAndCheckProfile } from '@/services/auth';
import { validateLogin, type LoginValidationErrors } from '@/utils/auth-validation';
import { getFriendlyAuthError } from '@/utils/firebase-errors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;

    const nextErrors = validateLogin(email, password);
    setErrors(nextErrors);
    setRequestError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const profileCompleted = await signInAndCheckProfile(email, password);
      router.replace(profileCompleted ? '/home' : '/profile-setup');
    } catch (error) {
      setRequestError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <View style={styles.brand}>
        <BrandMark size={72} />
        <Text style={styles.name}>Nutrivo</Text>
        <Text style={styles.motto}>Scan. Track. Understand.</Text>
      </View>

      <View style={styles.form}>
        <FormInput
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
            setRequestError(null);
          }}
          error={errors.email}
          editable={!loading}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
        />
        <PasswordInput
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
            setRequestError(null);
          }}
          error={errors.password}
          editable={!loading}
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={() => void handleLogin()}
        />
        {requestError ? <Text style={styles.requestError} accessibilityLiveRegion="polite">{requestError}</Text> : null}
        <PrimaryButton
          label={loading ? 'Logging In...' : 'Log In'}
          loading={loading}
          onPress={() => void handleLogin()}
          style={styles.submit}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.prompt}>Don&apos;t have an account?</Text>
        <Link href="/register" style={styles.link}>Register</Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.section,
    paddingVertical: Spacing.section,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    color: Colors.primary,
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.display,
  },
  motto: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  form: {
    gap: Spacing.lg,
  },
  requestError: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  submit: {
    marginTop: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  prompt: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  link: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
    paddingVertical: Spacing.md,
  },
});
