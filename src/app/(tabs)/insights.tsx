import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/buttons';
import { NutritionCard } from '@/components/nutrition-card';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenContainer } from '@/components/screen-container';
import { Breakpoints, Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useNutritionTargets } from '@/hooks/use-nutrition-targets';
import { useWeeklyFoodLogs } from '@/hooks/use-weekly-food-logs';
import { calculateProgress } from '@/utils/dashboard-calculations';
import {
  getLocalDateKey,
  getRecentLocalDateKeys,
  millisecondsUntilNextLocalDay,
  parseLocalDateKey,
} from '@/utils/date';
import {
  calculateWeeklyNutritionSummary,
  createWeeklyNutritionInsights,
  type WeeklyNutritionDay,
  type WeeklyNutritionSummary,
} from '@/utils/weekly-insights';

const DAYS_IN_WINDOW = 7;

function formatNumber(value: number, maximumFractionDigits = 1): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(safeValue);
}

function formatCompactCalories(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (safeValue >= 1_000) {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(safeValue / 1_000)}k`;
  }
  return formatNumber(safeValue, 0);
}

function formatWeekday(dateKey: string, style: 'short' | 'long' = 'short'): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) return '—';
  return new Intl.DateTimeFormat(undefined, { weekday: style }).format(date);
}

function formatDateWindow(dateKeys: readonly string[]): string {
  const first = parseLocalDateKey(dateKeys[0] ?? '');
  const last = parseLocalDateKey(dateKeys[dateKeys.length - 1] ?? '');
  if (!first || !last) return 'Most recent seven local days';

  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${formatter.format(first)} – ${formatter.format(last)}`;
}

function useCurrentLocalDateKey(): string {
  const [todayDateKey, setTodayDateKey] = useState(() => getLocalDateKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNextDay = () => {
      timer = setTimeout(() => {
        setTodayDateKey(getLocalDateKey());
        scheduleNextDay();
      }, millisecondsUntilNextLocalDay());
    };

    scheduleNextDay();
    return () => clearTimeout(timer);
  }, []);

  return todayDateKey;
}

function OverviewMetric({
  label,
  value,
  detail,
  wide,
}: {
  label: string;
  value: string;
  detail: string;
  wide: boolean;
}) {
  return (
    <View style={[styles.overviewMetric, wide && styles.overviewMetricWide]}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewDetail}>{detail}</Text>
    </View>
  );
}

function CalorieChart({
  days,
  calorieTarget,
}: {
  days: WeeklyNutritionDay[];
  calorieTarget: number | null;
}) {
  const largestCalories = Math.max(0, ...days.map((day) => day.calories));
  const chartMaximum = Math.max(largestCalories, calorieTarget ?? 0, 1) * 1.1;
  const targetPosition =
    calorieTarget && calorieTarget > 0
      ? Math.min(100, Math.max(0, (calorieTarget / chartMaximum) * 100))
      : null;

  return (
    <View
      accessibilityLabel="Seven-day calorie chart. Untracked dates are shown separately from logged zero values."
      accessible
      style={styles.chart}>
      <View style={styles.chartValueRow}>
        {days.map((day) => (
          <Text key={day.dateKey} numberOfLines={1} style={styles.chartValue}>
            {day.tracked ? formatCompactCalories(day.calories) : '—'}
          </Text>
        ))}
      </View>

      <View style={styles.chartTrackArea}>
        {targetPosition !== null ? (
          <View
            pointerEvents="none"
            style={[styles.targetLine, { bottom: `${targetPosition}%` }]}>
            <Text style={styles.targetLineLabel}>Current target</Text>
          </View>
        ) : null}

        <View style={styles.chartBars}>
          {days.map((day) => {
            const barHeight = day.tracked ? Math.max(0, (day.calories / chartMaximum) * 100) : 0;
            return (
              <View
                accessibilityLabel={`${formatWeekday(day.dateKey, 'long')}: ${
                  day.tracked
                    ? `${formatNumber(day.calories, 0)} logged calories from ${day.entryCount} ${day.entryCount === 1 ? 'entry' : 'entries'}`
                    : 'No entries'
                }`}
                accessible
                key={day.dateKey}
                style={styles.barSlot}>
                <View
                  style={[
                    styles.calorieBar,
                    day.tracked
                      ? { height: `${barHeight}%` }
                      : styles.untrackedBar,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.chartDayRow}>
        {days.map((day) => (
          <View key={day.dateKey} style={styles.chartDay}>
            <Text style={styles.chartDayLabel}>{formatWeekday(day.dateKey)}</Text>
            <View
              style={[
                styles.trackingDot,
                !day.tracked && styles.trackingDotUntracked,
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={styles.legendTracked} />
          <Text style={styles.legendText}>Logged calories</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendUntracked} />
          <Text style={styles.legendText}>No entries</Text>
        </View>
      </View>
    </View>
  );
}

function MacroAverage({
  label,
  average,
  target,
}: {
  label: string;
  average: number;
  target: number | null;
}) {
  const hasTarget = target !== null && Number.isFinite(target) && target > 0;
  const progress = calculateProgress(average, hasTarget ? target : 0);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeading}>
        <Text style={styles.macroLabel}>{label}</Text>
        {hasTarget ? (
          <Text style={styles.macroPercentage}>{progress.percentage}%</Text>
        ) : null}
      </View>
      <Text style={styles.macroValue}>
        <Text style={styles.macroAverage}>{formatNumber(average)} g</Text>
        {hasTarget ? ` / ${formatNumber(target, 0)} g current target` : ' per tracked day'}
      </Text>
      {hasTarget ? (
        <ProgressBar
          accessibilityLabel={`${label} tracked-day average is ${progress.percentage}% of the current target`}
          progress={progress.visualProgress}
        />
      ) : (
        <Text style={styles.targetUnavailable}>Current target unavailable</Text>
      )}
    </View>
  );
}

function ExtremeMetric({
  label,
  day,
  value,
  wide,
}: {
  label: string;
  day?: WeeklyNutritionDay | null;
  value?: string;
  wide: boolean;
}) {
  return (
    <View style={[styles.extremeMetric, wide && styles.extremeMetricWide]}>
      <Text style={styles.extremeLabel}>{label}</Text>
      <Text style={styles.extremeValue}>
        {value ?? (day ? `${formatNumber(day.calories, 0)} kcal` : 'Unavailable')}
      </Text>
      {day ? <Text style={styles.extremeDay}>{formatWeekday(day.dateKey, 'long')}</Text> : null}
    </View>
  );
}

function WeeklyContent({
  summary,
  calorieTarget,
  proteinTarget,
  carbohydrateTarget,
  fatTarget,
  targetError,
  wide,
}: {
  summary: WeeklyNutritionSummary;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbohydrateTarget: number | null;
  fatTarget: number | null;
  targetError: string | null;
  wide: boolean;
}) {
  const observations = createWeeklyNutritionInsights(summary);

  return (
    <>
      <NutritionCard title="Weekly Overview" subtitle="Average across tracked days">
        <View style={[styles.overviewGrid, wide && styles.overviewGridWide]}>
          <OverviewMetric
            detail="days with one or more entries"
            label="Tracked Days"
            value={`${summary.trackedDayCount} / ${summary.days.length}`}
            wide={wide}
          />
          <OverviewMetric
            detail="across the seven-day window"
            label="Food Entries"
            value={formatNumber(summary.totalEntries, 0)}
            wide={wide}
          />
          <OverviewMetric
            detail="average across tracked days"
            label="Average Calories"
            value={`${formatNumber(summary.averages.calories, 0)} kcal`}
            wide={wide}
          />
        </View>
      </NutritionCard>

      <NutritionCard
        title="Calories This Week"
        subtitle="Untracked days are marked as no entries, not zero intake.">
        <View style={styles.targetContext}>
          <View style={styles.targetContextItem}>
            <Text style={styles.targetContextLabel}>Tracked-day average</Text>
            <Text style={styles.targetContextValue}>
              {formatNumber(summary.averages.calories, 0)} kcal
            </Text>
          </View>
          <View style={styles.targetContextItem}>
            <Text style={styles.targetContextLabel}>Current daily target</Text>
            <Text style={styles.targetContextValue}>
              {calorieTarget ? `${formatNumber(calorieTarget, 0)} kcal` : 'Unavailable'}
            </Text>
          </View>
        </View>
        <CalorieChart calorieTarget={calorieTarget} days={summary.days} />

        {summary.trackedDayCount >= 2 ? (
          <View style={[styles.extremesGrid, wide && styles.extremesGridWide]}>
            <ExtremeMetric
              day={summary.highestCalorieDay}
              label="Highest Logged Day"
              wide={wide}
            />
            <ExtremeMetric
              day={summary.lowestCalorieDay}
              label="Lowest Logged Day"
              wide={wide}
            />
            <ExtremeMetric
              label="Logged-Day Range"
              value={
                summary.calorieRange === null
                  ? 'Unavailable'
                  : `${formatNumber(summary.calorieRange, 0)} kcal · ${summary.variationBand} variation`
              }
              wide={wide}
            />
          </View>
        ) : null}
      </NutritionCard>

      <NutritionCard
        title="Average Macronutrients"
        subtitle="Tracked-day averages compared with your current targets.">
        <View style={styles.macroList}>
          <MacroAverage
            average={summary.averages.protein}
            label="Protein"
            target={proteinTarget}
          />
          <MacroAverage
            average={summary.averages.carbohydrates}
            label="Carbohydrates"
            target={carbohydrateTarget}
          />
          <MacroAverage average={summary.averages.fat} label="Fat" target={fatTarget} />
        </View>
        {targetError ? (
          <Text accessibilityLiveRegion="polite" style={styles.targetError}>
            Weekly averages are available, but current profile targets could not be loaded.
          </Text>
        ) : null}
      </NutritionCard>

      <NutritionCard title="What Stands Out" subtitle="Descriptive patterns from tracked days only.">
        <View style={styles.observationList}>
          {observations.map((observation, index) => (
            <View key={observation} style={styles.observationRow}>
              <View style={styles.observationBadge}>
                <Text style={styles.observationBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.observationText}>{observation}</Text>
            </View>
          ))}
        </View>
      </NutritionCard>
    </>
  );
}

export default function InsightsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= Breakpoints.desktop;
  const todayDateKey = useCurrentLocalDateKey();
  const dateKeys = useMemo(
    () => getRecentLocalDateKeys(DAYS_IN_WINDOW, todayDateKey),
    [todayDateKey],
  );
  const weeklyLogs = useWeeklyFoodLogs(dateKeys[0], dateKeys[dateKeys.length - 1]);
  const targetState = useNutritionTargets();
  const summary = useMemo(
    () => calculateWeeklyNutritionSummary(weeklyLogs.foodLogs, dateKeys),
    [dateKeys, weeklyLogs.foodLogs],
  );
  const loading =
    weeklyLogs.authLoading ||
    (weeklyLogs.user !== null && weeklyLogs.foodLogsLoading) ||
    targetState.authStatus === 'loading' ||
    (targetState.authStatus === 'authenticated' && targetState.loading);

  if (loading) {
    return (
      <ScreenContainer width="dashboard" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading seven-day insights</Text>
        <Text style={styles.stateMessage}>Reviewing your recent food logs...</Text>
      </ScreenContainer>
    );
  }

  if (!weeklyLogs.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>
          {weeklyLogs.authError ? 'Session unavailable' : 'Log in to view Insights'}
        </Text>
        <Text style={styles.stateMessage}>
          {weeklyLogs.authError ?? 'Weekly nutrition patterns are tied to your account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  if (weeklyLogs.foodLogsError) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>Insights unavailable</Text>
        <Text style={styles.stateMessage}>{weeklyLogs.foodLogsError}</Text>
        <PrimaryButton label="Try Again" onPress={weeklyLogs.reload} />
      </ScreenContainer>
    );
  }

  const targets = targetState.targets;

  return (
    <ScreenContainer width="dashboard" contentStyle={styles.content}>
      <AppHeader title="Insights" subtitle={`Last 7 Days · ${formatDateWindow(dateKeys)}`} />

      {summary.trackedDayCount === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeText}>7</Text>
          </View>
          <Text style={styles.emptyTitle}>No nutrition history yet</Text>
          <Text style={styles.emptyText}>
            Log meals to start seeing seven-day averages and tracking patterns. Days without logs
            are treated as untracked, not as zero intake.
          </Text>
          <PrimaryButton label="Add Food" onPress={() => router.push('/add-food')} />
        </View>
      ) : (
        <WeeklyContent
          calorieTarget={targets?.calorieTarget ?? null}
          carbohydrateTarget={targets?.carbohydrateTarget ?? null}
          fatTarget={targets?.fatTarget ?? null}
          proteinTarget={targets?.proteinTarget ?? null}
          summary={summary}
          targetError={targetState.error}
          wide={wide}
        />
      )}
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
    maxWidth: 420,
    textAlign: 'center',
  },
  overviewGrid: {
    gap: Spacing.sm,
  },
  overviewGridWide: {
    flexDirection: 'row',
  },
  overviewMetric: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    minWidth: 0,
    padding: Spacing.lg,
    width: '100%',
  },
  overviewMetricWide: {
    flex: 1,
    width: 'auto',
  },
  overviewLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  overviewValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.metric,
    marginTop: Spacing.xs,
  },
  overviewDetail: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.xs,
  },
  targetContext: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.input,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    padding: Spacing.md,
  },
  targetContextItem: {
    flexGrow: 1,
    minWidth: 130,
  },
  targetContextLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  targetContextValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
    marginTop: Spacing.xs,
  },
  chart: {
    width: '100%',
  },
  chartValueRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chartValue: {
    color: Colors.textMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
    minWidth: 0,
    textAlign: 'center',
  },
  chartTrackArea: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    height: 156,
    position: 'relative',
  },
  chartBars: {
    bottom: 0,
    flexDirection: 'row',
    gap: Spacing.xs,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  barSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  calorieBar: {
    backgroundColor: Colors.accentStrong,
    borderRadius: Radii.input,
    minHeight: 5,
    width: '64%',
  },
  untrackedBar: {
    backgroundColor: Colors.border,
    height: 4,
    minHeight: 4,
  },
  targetLine: {
    borderTopColor: Colors.primary,
    borderTopWidth: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  targetLineLabel: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.surface,
    color: Colors.primary,
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
    lineHeight: 14,
    marginTop: -16,
    paddingLeft: Spacing.xs,
  },
  chartDayRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  chartDay: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  chartDayLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
    textAlign: 'center',
  },
  trackingDot: {
    backgroundColor: Colors.accentStrong,
    borderRadius: Radii.pill,
    height: 5,
    marginTop: Spacing.xs,
    width: 5,
  },
  trackingDotUntracked: {
    backgroundColor: Colors.border,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  legendTracked: {
    backgroundColor: Colors.accentStrong,
    borderRadius: Radii.pill,
    height: 8,
    width: 20,
  },
  legendUntracked: {
    backgroundColor: Colors.border,
    borderRadius: Radii.pill,
    height: 4,
    width: 20,
  },
  legendText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  extremesGrid: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  extremesGridWide: {
    flexDirection: 'row',
  },
  extremeMetric: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    minWidth: 0,
    padding: Spacing.md,
    width: '100%',
  },
  extremeMetricWide: {
    flex: 1,
    width: 'auto',
  },
  extremeLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  extremeValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
    marginTop: Spacing.xs,
  },
  extremeDay: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.xs,
  },
  macroList: {
    gap: Spacing.xl,
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
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
  macroPercentage: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
  },
  macroValue: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  macroAverage: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  targetUnavailable: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  targetError: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.lg,
  },
  observationList: {
    gap: Spacing.md,
  },
  observationRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  observationBadge: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  observationBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.caption,
  },
  observationText: {
    color: Colors.text,
    flex: 1,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.feature,
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  emptyBadge: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.title,
  },
  emptyTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    maxWidth: 480,
    textAlign: 'center',
  },
});
