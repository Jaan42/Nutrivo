import { useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { NutritionCard } from '@/components/nutrition-card';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useNutritionLabelScan } from '@/context/nutrition-label-scan';
import { useUserProfile } from '@/hooks/use-user-profile';
import { signOutAccount } from '@/services/auth';

const WIDE_BREAKPOINT = 720;

type InfoItem = {
  label: string;
  value: string;
};

function formatNumber(value: number | null, maximumFractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return 'Unavailable';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function formatWithUnit(
  value: number | null,
  unit: string,
  maximumFractionDigits = 1,
): string {
  const formatted = formatNumber(value, maximumFractionDigits);
  return formatted === 'Unavailable' ? formatted : `${formatted} ${unit}`;
}

function InfoGrid({ items, wide }: { items: InfoItem[]; wide: boolean }) {
  return (
    <View style={[styles.infoGrid, wide && styles.infoGridWide]}>
      {items.map((item) => (
        <View key={item.label} style={[styles.infoItem, wide && styles.infoItemWide]}>
          <Text style={styles.infoLabel}>{item.label}</Text>
          <Text style={styles.infoValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function SettingsDisclosure({
  title,
  expanded,
  onPress,
  children,
}: {
  title: string;
  expanded: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.settingCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.settingTrigger, pressed && styles.settingPressed]}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingToggle}>{expanded ? '\u2212' : '+'}</Text>
      </Pressable>
      {expanded ? <View style={styles.settingContent}>{children}</View> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const profileState = useUserProfile();
  const { reset: resetNutritionLabelState } = useNutritionLabelScan();
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const signingOutRef = useRef(false);
  const loading =
    profileState.authLoading ||
    (profileState.user !== null && profileState.profileLoading);

  async function confirmSignOut() {
    if (signingOutRef.current) return;

    signingOutRef.current = true;
    setSigningOut(true);
    setSignOutError(null);

    try {
      await signOutAccount();
      resetNutritionLabelState();
      setConfirmationVisible(false);
      router.replace('/login');
    } catch {
      setConfirmationVisible(false);
      setSignOutError("We couldn't sign you out. Check your connection and try again.");
    } finally {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer width="page" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading your profile</Text>
      </ScreenContainer>
    );
  }

  if (!profileState.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Log in to view your profile</Text>
        <Text style={styles.stateMessage}>
          {profileState.authError ?? 'Your profile is tied to your Nutrivo account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  if (profileState.profileError) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Profile unavailable</Text>
        <Text style={styles.stateMessage}>{profileState.profileError}</Text>
        <PrimaryButton label="Try Again" onPress={profileState.reload} />
      </ScreenContainer>
    );
  }

  const profile = profileState.profile;
  if (!profile) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Finish setting up your profile</Text>
        <Text style={styles.stateMessage}>
          Add your personal details to calculate your daily nutrition targets.
        </Text>
        <PrimaryButton
          label="Go to Profile Setup"
          onPress={() => router.replace('/profile-setup')}
        />
      </ScreenContainer>
    );
  }

  const personalItems: InfoItem[] = [
    { label: 'Age', value: formatWithUnit(profile.age, 'years', 0) },
    { label: 'Sex', value: profile.sex ?? 'Unavailable' },
    { label: 'Height', value: formatWithUnit(profile.heightCm, 'cm') },
    { label: 'Weight', value: formatWithUnit(profile.weightKg, 'kg') },
    { label: 'Activity Level', value: profile.activityLevel ?? 'Unavailable' },
    { label: 'Goal', value: profile.goal ?? 'Unavailable' },
  ];
  const nutritionItems: InfoItem[] = [
    { label: 'BMI', value: formatNumber(profile.bmi) },
    { label: 'Estimated BMR', value: formatWithUnit(profile.bmr, 'kcal/day') },
    {
      label: 'Maintenance Calories (TDEE)',
      value: formatWithUnit(profile.tdee, 'kcal/day', 0),
    },
    {
      label: 'Daily Calorie Target',
      value: formatWithUnit(profile.calorieTarget, 'kcal', 0),
    },
    { label: 'Protein Target', value: formatWithUnit(profile.proteinTarget, 'g', 0) },
    {
      label: 'Carbohydrate Target',
      value: formatWithUnit(profile.carbohydrateTarget, 'g', 0),
    },
    { label: 'Fat Target', value: formatWithUnit(profile.fatTarget, 'g', 0) },
  ];

  return (
    <ScreenContainer width="dashboard" contentStyle={styles.content}>
      <AppHeader
        title="Profile"
        subtitle="Your account, nutrition estimates, and settings."
      />

      <View style={[styles.profileColumns, wide && styles.profileColumnsWide]}>
        <View style={styles.profileColumn}>
          <NutritionCard title="Account">
            <View style={styles.accountHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile.name || profile.email || 'N').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{profile.name || 'Name unavailable'}</Text>
                <Text style={styles.accountEmail}>{profile.email || 'Email unavailable'}</Text>
              </View>
            </View>
          </NutritionCard>

          <NutritionCard title="Personal Profile">
            <InfoGrid items={personalItems} wide={wide} />
          </NutritionCard>

          <PrimaryButton label="Edit Profile" onPress={() => router.push('/edit-profile')} />
        </View>

        <View style={styles.profileColumn}>
          <NutritionCard
            title="Nutrition Summary"
            subtitle="Estimates based on your current profile.">
            <InfoGrid items={nutritionItems} wide={wide} />
          </NutritionCard>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <SettingsDisclosure
          expanded={aboutExpanded}
          onPress={() => setAboutExpanded((current) => !current)}
          title="About Nutrivo">
          <Text style={styles.aboutName}>Nutrivo</Text>
          <Text style={styles.aboutMotto}>“Scan. Track. Understand.”</Text>
          <Text style={styles.settingBody}>
            Nutrivo helps you record food intake, review Nutrition Facts labels, track daily
            calories and macronutrients, and understand general nutrition patterns.
          </Text>
        </SettingsDisclosure>

        <SettingsDisclosure
          expanded={disclaimerExpanded}
          onPress={() => setDisclaimerExpanded((current) => !current)}
          title="Nutrition Disclaimer">
          <Text style={styles.settingBody}>
            Nutrivo provides general nutrition tracking and informational estimates. It is not a
            substitute for professional medical or dietary advice.
          </Text>
        </SettingsDisclosure>

        {signOutError ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Text style={styles.errorText}>{signOutError}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
          disabled={signingOut}
          onPress={() => {
            setSignOutError(null);
            setConfirmationVisible(true);
          }}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
            signingOut && styles.disabled,
          ]}>
          {signingOut ? <ActivityIndicator color={Colors.error} size="small" /> : null}
          <Text style={styles.signOutText}>{signingOut ? 'Signing Out...' : 'Sign Out'}</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => !signingOut && setConfirmationVisible(false)}
        transparent
        visible={confirmationVisible}>
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign out of Nutrivo?</Text>
            <Text style={styles.modalMessage}>
              You will need to log in again to view your profile and food history.
            </Text>
            <View style={styles.modalActions}>
              <SecondaryButton
                disabled={signingOut}
                label="Cancel"
                onPress={() => setConfirmationVisible(false)}
                style={styles.modalAction}
              />
              <Pressable
                accessibilityLabel="Confirm sign out"
                accessibilityRole="button"
                disabled={signingOut}
                onPress={() => void confirmSignOut()}
                style={({ pressed }) => [
                  styles.confirmSignOutButton,
                  pressed && styles.confirmSignOutPressed,
                  signingOut && styles.disabled,
                  styles.modalAction,
                ]}>
                {signingOut ? <ActivityIndicator color={Colors.onPrimary} size="small" /> : null}
                <Text style={styles.confirmSignOutText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  centeredState: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  stateTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
    textAlign: 'center',
  },
  stateMessage: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    maxWidth: 380,
    textAlign: 'center',
  },
  profileColumns: {
    gap: Spacing.lg,
  },
  profileColumnsWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  profileColumn: {
    flex: 1,
    gap: Spacing.lg,
    minWidth: 0,
    width: '100%',
  },
  accountHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  accountEmail: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    marginTop: Spacing.xs,
  },
  infoGrid: {
    gap: Spacing.sm,
  },
  infoGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    gap: Spacing.xs,
    minWidth: 0,
    padding: Spacing.md,
    width: '100%',
  },
  infoItemWide: {
    flexBasis: '47%',
    flexGrow: 1,
    width: 'auto',
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  infoValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  settingsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
  },
  settingCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingTrigger: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  settingPressed: {
    backgroundColor: Colors.accent,
  },
  settingTitle: {
    color: Colors.text,
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
  settingToggle: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
    marginLeft: Spacing.md,
  },
  settingContent: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    gap: Spacing.xs,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  aboutName: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  aboutMotto: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.lineHeights.small,
  },
  settingBody: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    marginTop: Spacing.xs,
  },
  errorCard: {
    backgroundColor: '#FCEAEA',
    borderColor: '#F2C7C7',
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.error,
    borderRadius: Radii.button,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
  },
  signOutButtonPressed: {
    backgroundColor: '#FCEAEA',
  },
  signOutText: {
    color: Colors.error,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
  disabled: {
    opacity: 0.55,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 23, 19, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.feature,
    gap: Spacing.lg,
    maxWidth: 440,
    padding: Spacing.xxl,
    width: '100%',
  },
  modalTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
  },
  modalMessage: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalAction: {
    flex: 1,
  },
  confirmSignOutButton: {
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    borderRadius: Radii.button,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
  },
  confirmSignOutPressed: {
    opacity: 0.82,
  },
  confirmSignOutText: {
    color: Colors.onPrimary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
});
