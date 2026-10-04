import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/buttons';
import { CircularProgress } from '@/components/circular-progress';
import { NutritionCard } from '@/components/nutrition-card';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { MEAL_TYPES, type MealType } from '@/types/food-log';
import {
  calculateDailyNutritionTotals,
  calculateProgress,
} from '@/utils/dashboard-calculations';
import {
  formatLocalDashboardDate,
  getLocalDateKey,
  millisecondsUntilNextLocalDay,
} from '@/utils/date';

const WIDE_DASHBOARD_BREAKPOINT = 800;

function useLocalToday() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNextDay = () => {
      const now = new Date();
      timer = setTimeout(() => {
        setToday(new Date());
        scheduleNextDay();
      }, millisecondsUntilNextLocalDay(now));
    };

    scheduleNextDay();
    return () => clearTimeout(timer);
  }, []);

  return today;
}

function getFirstName(profileName: string, fallbackName: string | null, email: string | null) {
  const bestName = profileName || fallbackName?.trim() || email?.split('@')[0] || 'there';
  return bestName.split(/\s+/)[0];
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatNutritionValue(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return (Number.isInteger(safeValue) ? safeValue : Math.round(safeValue * 10) / 10).toLocaleString(
    'en-US',
  );
}

type MacroProgressProps = {
  label: string;
  consumed: number;
  target: number;
};

function MacroProgress({ label, consumed, target }: MacroProgressProps) {
  const progress = calculateProgress(consumed, target);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeading}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroPercentage}>{progress.percentage}%</Text>
      </View>
      <Text style={styles.macroValue}>
        <Text style={styles.macroConsumed}>{formatNutritionValue(consumed)}</Text>
        {' / '}
        {formatNutritionValue(target)} g
      </Text>
      <ProgressBar
        accessibilityLabel={`${label}: ${progress.percentage}% of daily target`}
        progress={progress.visualProgress}
      />
    </View>
  );
}

type MealSummaryCardProps = {
  mealType: MealType;
  count: number;
  calories: number;
  wide: boolean;
};

function MealSummaryCard({ mealType, count, calories, wide }: MealSummaryCardProps) {
  return (
    <View style={[styles.mealCard, wide && styles.mealCardWide]}>
      <View style={styles.mealTopRow}>
        <View style={styles.mealBadge}>
          <Text style={styles.mealBadgeText}>{mealType.slice(0, 1)}</Text>
        </View>
        <Text style={styles.mealTitle}>{mealType}</Text>
      </View>
      <View style={styles.mealMetrics}>
        <View>
          <Text style={styles.mealMetricValue}>{count}</Text>
          <Text style={styles.mealMetricLabel}>{count === 1 ? 'food entry' : 'food entries'}</Text>
        </View>
        <View style={styles.mealCalories}>
          <Text style={styles.mealMetricValue}>{formatNutritionValue(calories)}</Text>
          <Text style={styles.mealMetricLabel}>kcal</Text>
        </View>
      </View>
    </View>
  );
}

function MessageCard({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.messageCard, error && styles.errorCard]}>
      <Text style={[styles.messageText, error && styles.errorText]}>{message}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_DASHBOARD_BREAKPOINT;
  const today = useLocalToday();
  const dateKey = getLocalDateKey(today);
  const dashboard = useHomeDashboard(dateKey);
  const totals = useMemo(
    () => calculateDailyNutritionTotals(dashboard.foodLogs),
    [dashboard.foodLogs],
  );
  const profile = dashboard.profile;
  const calorieTarget = profile?.calorieTarget ?? 0;
  const calorieProgress = calculateProgress(totals.calories, calorieTarget);
  const firstName = getFirstName(
    profile?.name ?? '',
    dashboard.user?.displayName ?? null,
    dashboard.user?.email ?? null,
  );
  const loading =
    dashboard.authLoading ||
    (dashboard.user !== null && (dashboard.profileLoading || dashboard.foodLogsLoading));

  if (loading) {
    return (
      <ScreenContainer width="dashboard" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Preparing your dashboard</Text>
        <Text style={styles.stateMessage}>Loading today&apos;s nutrition progress...</Text>
      </ScreenContainer>
    );
  }

  if (!dashboard.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <View style={styles.stateBadge}>
          <Text style={styles.stateBadgeText}>N</Text>
        </View>
        <Text style={styles.stateTitle}>
          {dashboard.authError ? 'Session unavailable' : 'Log in to view your dashboard'}
        </Text>
        <Text style={styles.stateMessage}>
          {dashboard.authError ?? 'Your daily nutrition targets and food logs are tied to your account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer width="dashboard" contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>
            {getGreeting(today)}, {firstName}!
          </Text>
          <Text style={styles.date}>{formatLocalDashboardDate(today)}</Text>
        </View>
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}>
          <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>

      {dashboard.profileError ? <MessageCard error message={dashboard.profileError} /> : null}
      {dashboard.foodLogsError ? <MessageCard error message={dashboard.foodLogsError} /> : null}
      {!dashboard.profileError && (!profile || !profile.isComplete) ? (
        <View style={styles.profileNotice}>
          <View style={styles.profileNoticeCopy}>
            <Text style={styles.profileNoticeTitle}>Complete your nutrition profile</Text>
            <Text style={styles.profileNoticeText}>
              Add your details to calculate and display your daily targets.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile-setup')}
            style={({ pressed }) => [styles.noticeAction, pressed && styles.noticeActionPressed]}>
            <Text style={styles.noticeActionText}>Set up</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.primaryGrid, wide && styles.primaryGridWide]}>
        <NutritionCard
          title="Daily intake"
          subtitle="Calories consumed today"
          style={[styles.primaryCard, wide && styles.calorieCardWide]}>
          <View style={[styles.calorieContent, wide && styles.calorieContentWide]}>
            <View style={styles.calorieCopy}>
              <Text style={styles.calorieValue}>{formatNutritionValue(totals.calories)}</Text>
              <Text style={styles.calorieTarget}>
                of {formatNutritionValue(calorieTarget)} kcal
              </Text>
              <Text style={styles.calorieRemaining}>
                {calorieTarget > totals.calories
                  ? `${formatNutritionValue(calorieTarget - totals.calories)} kcal remaining`
                  : totals.calories > calorieTarget && calorieTarget > 0
                    ? `${formatNutritionValue(totals.calories - calorieTarget)} kcal over target`
                    : calorieTarget > 0
                      ? 'Daily target reached'
                      : 'Target not set'}
              </Text>
            </View>
            <CircularProgress
              accessibilityLabel={`${calorieProgress.percentage}% of daily calorie target`}
              progress={calorieProgress.visualProgress}
              size={wide ? 136 : 124}>
              <Text style={styles.ringPercentage}>{calorieProgress.percentage}%</Text>
              <Text style={styles.ringLabel}>of target</Text>
            </CircularProgress>
          </View>
        </NutritionCard>

        <NutritionCard
          title="Macronutrients"
          subtitle="Your progress toward today's targets"
          style={[styles.primaryCard, wide && styles.macrosCardWide]}>
          <View style={styles.macros}>
            <MacroProgress
              consumed={totals.carbohydrates}
              label="Carbohydrates"
              target={profile?.carbohydrateTarget ?? 0}
            />
            <MacroProgress
              consumed={totals.fat}
              label="Fat"
              target={profile?.fatTarget ?? 0}
            />
            <MacroProgress
              consumed={totals.protein}
              label="Protein"
              target={profile?.proteinTarget ?? 0}
            />
          </View>
        </NutritionCard>
      </View>

      {!dashboard.foodLogsError && dashboard.foodLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>+</Text>
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No meals logged yet</Text>
            <Text style={styles.emptyText}>
              Your meals and nutrition totals will appear here as you add food today.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Today&apos;s meals</Text>
        <Text style={styles.sectionMeta}>{dashboard.foodLogs.length} total entries</Text>
      </View>
      <View style={[styles.mealGrid, wide && styles.mealGridWide]}>
        {MEAL_TYPES.map((mealType) => (
          <MealSummaryCard
            calories={totals.meals[mealType].calories}
            count={totals.meals[mealType].count}
            key={mealType}
            mealType={mealType}
            wide={wide}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  centeredState: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  stateBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    width: 64,
  },
  stateBadgeText: {
    color: Colors.onPrimary,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.heavy,
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
    marginBottom: Spacing.sm,
    maxWidth: 380,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.title,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    marginTop: Spacing.xs,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
    borderRadius: Radii.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarPressed: {
    opacity: 0.75,
  },
  avatarText: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
  },
  messageCard: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    padding: Spacing.lg,
  },
  errorCard: {
    backgroundColor: '#FCEAEA',
    borderColor: '#F2C7C7',
    borderWidth: 1,
  },
  messageText: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  errorText: {
    color: Colors.error,
  },
  profileNotice: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.card,
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  profileNoticeCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileNoticeTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  profileNoticeText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    marginTop: Spacing.xs,
  },
  noticeAction: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  noticeActionPressed: {
    backgroundColor: Colors.primaryPressed,
  },
  noticeActionText: {
    color: Colors.onPrimary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
  },
  primaryGrid: {
    gap: Spacing.lg,
  },
  primaryGridWide: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  primaryCard: {
    minWidth: 0,
  },
  calorieCardWide: {
    flex: 0.9,
  },
  macrosCardWide: {
    flex: 1.1,
  },
  calorieContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'space-between',
  },
  calorieContentWide: {
    flex: 1,
  },
  calorieCopy: {
    flex: 1,
    minWidth: 0,
  },
  calorieValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.metric,
  },
  calorieTarget: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
  calorieRemaining: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.sm,
  },
  ringPercentage: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  ringLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  macros: {
    gap: Spacing.lg,
  },
  macroRow: {
    gap: Spacing.sm,
  },
  macroHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
  },
  macroPercentage: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
  },
  macroValue: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  macroConsumed: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.feature,
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emptyIconText: {
    color: Colors.primary,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.lineHeights.title,
  },
  emptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    marginTop: Spacing.xs,
  },
  sectionHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
  },
  sectionMeta: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  mealGrid: {
    gap: Spacing.md,
  },
  mealGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mealCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.lg,
    minWidth: 0,
    padding: Spacing.lg,
  },
  mealCardWide: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  mealTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  mealBadge: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mealBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
  },
  mealTitle: {
    color: Colors.text,
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  mealMetrics: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealCalories: {
    alignItems: 'flex-end',
  },
  mealMetricValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  mealMetricLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
});
