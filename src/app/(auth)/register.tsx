import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/buttons';
import { FormInput } from '@/components/form-input';
import { PasswordInput } from '@/components/password-input';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { registerAccount } from '@/services/auth';
import { validateRegistration, type RegistrationValidationErrors } from '@/utils/auth-validation';
import { getFriendlyAuthError } from '@/utils/firebase-errors';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegistrationValidationErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (loading) return;

    const nextErrors = validateRegistration(firstName, lastName, email, password, confirmPassword);
    setErrors(nextErrors);
    setRequestError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await registerAccount(fullName, email, password);
      router.replace('/profile-setup');
    } catch (error) {
      setRequestError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer width="form" contentStyle={styles.content}>
      <BackButton
        accessibilityLabel="Back to onboarding"
        onPress={() => router.replace('/onboarding')}
      />

      <View style={styles.heading}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your nutrition journey</Text>
      </View>

      <View style={styles.form}>
        <FormInput
          label="First Name"
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            setErrors((current) => ({ ...current, firstName: undefined }));
            setRequestError(null);
          }}
          error={errors.firstName}
          editable={!loading}
          autoComplete="given-name"
          autoCapitalize="words"
          placeholder="Your first name"
        />
        <FormInput
          label="Last Name"
          value={lastName}
          onChangeText={(value) => {
            setLastName(value);
            setErrors((current) => ({ ...current, lastName: undefined }));
            setRequestError(null);
          }}
          error={errors.lastName}
          editable={!loading}
          autoComplete="family-name"
          autoCapitalize="words"
          placeholder="Your last name"
        />
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
          autoComplete="new-password"
        />
        <PasswordInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
            setRequestError(null);
          }}
          error={errors.confirmPassword}
          editable={!loading}
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={() => void handleRegister()}
        />
        {requestError ? <Text style={styles.requestError} accessibilityLiveRegion="polite">{requestError}</Text> : null}
        <PrimaryButton
          label={loading ? 'Creating Account...' : 'Sign Up'}
          loading={loading}
          onPress={() => void handleRegister()}
          style={styles.submit}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.prompt}>Already have an account?</Text>
        <Link href="/login" style={styles.link}>Log In</Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  heading: {
    gap: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.title,
  },
  subtitle: {
    color: Colors.textMuted,
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
