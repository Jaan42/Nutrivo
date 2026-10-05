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

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/buttons';
import { ScreenContainer } from '@/components/screen-container';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useFoodHistory } from '@/hooks/use-food-history';
import { MEAL_TYPES, type FoodLogRecord } from '@/types/food-log';
import { calculateDailyNutritionTotals } from '@/utils/dashboard-calculations';
import {
  formatLocalDateKey,
  getLocalDateKey,
  getNextLocalDateKey,
  getPreviousLocalDateKey,
  isTodayLocalDateKey,
  millisecondsUntilNextLocalDay,
} from '@/utils/date';

const WIDE_BREAKPOINT = 760;

function formatNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(safeValue);
}

function displayFoodName(foodLog: FoodLogRecord): string {
  return foodLog.foodName || 'Unnamed food';
}

function servingsDescription(foodLog: FoodLogRecord): string {
  const servings = formatNumber(foodLog.servingsConsumed);
  const servingWord = foodLog.servingsConsumed === 1 ? 'serving' : 'servings';
  return foodLog.servingSize
    ? `${servings} ${servingWord} · ${foodLog.servingSize}`
    : `${servings} ${servingWord}`;
}

function FoodRow({ foodLog }: { foodLog: FoodLogRecord }) {
  return (
    <Pressable
      accessibilityHint="Opens food details"
      accessibilityLabel={`${displayFoodName(foodLog)}, ${formatNumber(foodLog.calories)} calories`}
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/food-details/[id]', params: { id: foodLog.id } })
      }
      style={({ pressed }) => [styles.foodRow, pressed && styles.foodRowPressed]}>
      <View style={styles.foodCopy}>
        <Text style={styles.foodName}>{displayFoodName(foodLog)}</Text>
        <Text style={styles.foodServing}>{servingsDescription(foodLog)}</Text>
        <Text style={styles.foodMacros}>
          P {formatNumber(foodLog.protein)} g · C {formatNumber(foodLog.carbohydrates)} g · F{' '}
          {formatNumber(foodLog.fat)} g
        </Text>
      </View>
      <View style={styles.foodCalories}>
        <Text style={styles.foodCaloriesValue}>{formatNumber(foodLog.calories)}</Text>
        <Text style={styles.foodCaloriesLabel}>kcal</Text>
      </View>
      <Text style={styles.foodChevron}>{'\u203A'}</Text>
    </Pressable>
  );
}

function MealSection({ title, foodLogs }: { title: string; foodLogs: FoodLogRecord[] }) {
  const calorieTotal = foodLogs.reduce(
    (total, foodLog) => total + (Number.isFinite(foodLog.calories) ? foodLog.calories : 0),
    0,
  );

  return (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealTitle}>{title}</Text>
        <Text style={styles.mealTotal}>{formatNumber(calorieTotal)} kcal</Text>
      </View>
      <View style={styles.foodList}>
        {foodLogs.map((foodLog) => (
          <FoodRow foodLog={foodLog} key={foodLog.id} />
        ))}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const [todayDateKey, setTodayDateKey] = useState(() => getLocalDateKey());
  const [selectedDateKey, setSelectedDateKey] = useState(() => getLocalDateKey());
  const history = useFoodHistory(selectedDateKey);
  const selectedIsToday = isTodayLocalDateKey(selectedDateKey);
  const totals = useMemo(
    () => calculateDailyNutritionTotals(history.foodLogs),
    [history.foodLogs],
  );
  const mealGroups = useMemo(
    () =>
      MEAL_TYPES.map((mealType) => ({
        mealType,
        foodLogs: history.foodLogs.filter((foodLog) => foodLog.mealType === mealType),
      })).filter((group) => group.foodLogs.length > 0),
    [history.foodLogs],
  );
  const unassignedFoodLogs = useMemo(
    () => history.foodLogs.filter((foodLog) => foodLog.mealType === null),
    [history.foodLogs],
  );
  const loading = history.authLoading || (history.user !== null && history.foodLogsLoading);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNextDay = () => {
      timer = setTimeout(() => {
        const nextToday = getLocalDateKey();
        setTodayDateKey((previousToday) => {
          setSelectedDateKey((selected) =>
            selected === previousToday ? nextToday : selected,
          );
          return nextToday;
        });
        scheduleNextDay();
      }, millisecondsUntilNextLocalDay());
    };

    scheduleNextDay();
    return () => clearTimeout(timer);
  }, []);

  function showPreviousDay() {
    setSelectedDateKey((current) => getPreviousLocalDateKey(current));
  }

  function showNextDay() {
    setSelectedDateKey((current) => {
      const nextDateKey = getNextLocalDateKey(current);
      return nextDateKey > todayDateKey ? todayDateKey : nextDateKey;
    });
  }

  if (loading) {
    return (
      <ScreenContainer width="dashboard" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading food history</Text>
        <Text style={styles.stateMessage}>Preparing the entries for this day...</Text>
      </ScreenContainer>
    );
  }

  if (!history.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>
          {history.authError ? 'Session unavailable' : 'Log in to view food history'}
        </Text>
        <Text style={styles.stateMessage}>
          {history.authError ?? 'Your saved food entries are tied to your account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  const summaryMetrics = [
    { label: 'Calories', value: totals.calories, unit: 'kcal' },
    { label: 'Protein', value: totals.protein, unit: 'g' },
    { label: 'Carbohydrates', value: totals.carbohydrates, unit: 'g' },
    { label: 'Fat', value: totals.fat, unit: 'g' },
  ];

  return (
    <ScreenContainer width="dashboard" contentStyle={styles.content}>
      <AppHeader
        title="History"
        subtitle={selectedIsToday ? 'Today' : 'Food entries for the selected day'}
      />

      <View style={styles.dateCard}>
        <Text style={styles.selectedDate}>{formatLocalDateKey(selectedDateKey)}</Text>
        <View style={styles.dateActions}>
          <Pressable
            accessibilityLabel="Previous day"
            accessibilityRole="button"
            onPress={showPreviousDay}
            style={({ pressed }) => [styles.dateButton, pressed && styles.dateButtonPressed]}>
            <Text style={styles.dateButtonText}>{'\u2039'} Previous</Text>
          </Pressable>
          {!selectedIsToday ? (
            <Pressable
              accessibilityLabel="Return to today"
              accessibilityRole="button"
              onPress={() => setSelectedDateKey(todayDateKey)}
              style={({ pressed }) => [styles.todayButton, pressed && styles.todayButtonPressed]}>
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Next day"
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedIsToday }}
            disabled={selectedIsToday}
            onPress={showNextDay}
            style={({ pressed }) => [
              styles.dateButton,
              selectedIsToday && styles.dateButtonDisabled,
              pressed && !selectedIsToday && styles.dateButtonPressed,
            ]}>
            <Text style={[styles.dateButtonText, selectedIsToday && styles.dateButtonTextDisabled]}>
              Next {'\u203A'}
            </Text>
          </Pressable>
        </View>
      </View>

      {history.foodLogsError ? (
        <View accessibilityLiveRegion="polite" style={styles.errorCard}>
          <Text style={styles.errorText}>{history.foodLogsError}</Text>
        </View>
      ) : null}

      <View style={[styles.summaryGrid, wide && styles.summaryGridWide]}>
        {summaryMetrics.map((metric) => (
          <View key={metric.label} style={[styles.summaryMetric, wide && styles.summaryMetricWide]}>
            <Text style={styles.summaryLabel}>{metric.label}</Text>
            <Text style={styles.summaryValue}>{formatNumber(metric.value)}</Text>
            <Text style={styles.summaryUnit}>{metric.unit}</Text>
          </View>
        ))}
      </View>

      {selectedIsToday ? (
        <PrimaryButton label="Add Food" onPress={() => router.push('/add-food')} />
      ) : null}

      {!history.foodLogsError && history.foodLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No food logged for this day.</Text>
          <Text style={styles.emptyText}>
            {selectedIsToday
              ? 'Add a food to start today’s history.'
              : 'Use the date controls to review another day.'}
          </Text>
        </View>
      ) : null}

      {mealGroups.map(({ mealType, foodLogs }) => (
        <MealSection foodLogs={foodLogs} key={mealType} title={mealType} />
      ))}
      {unassignedFoodLogs.length > 0 ? (
        <MealSection foodLogs={unassignedFoodLogs} title="Other" />
      ) : null}
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
  dateCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  selectedDate: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
    textAlign: 'center',
  },
  dateActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderRadius: Radii.button,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: Spacing.sm,
  },
  dateButtonPressed: {
    backgroundColor: Colors.background,
  },
  dateButtonDisabled: {
    borderColor: Colors.border,
    opacity: 0.55,
  },
  dateButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  dateButtonTextDisabled: {
    color: Colors.textMuted,
  },
  todayButton: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.button,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  todayButtonPressed: {
    backgroundColor: Colors.accentStrong,
  },
  todayButtonText: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
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
  summaryGrid: {
    gap: Spacing.sm,
  },
  summaryGridWide: {
    flexDirection: 'row',
  },
  summaryMetric: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.lg,
    width: '100%',
  },
  summaryMetricWide: {
    flex: 1,
    minWidth: 0,
    width: 'auto',
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  summaryValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.metric,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.metric,
    marginTop: Spacing.xs,
  },
  summaryUnit: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radii.feature,
    gap: Spacing.xs,
    padding: Spacing.xxl,
  },
  emptyTitle: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  mealSection: {
    gap: Spacing.md,
  },
  mealHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  mealTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.section,
  },
  mealTotal: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
  },
  foodList: {
    gap: Spacing.sm,
  },
  foodRow: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    minHeight: 88,
    padding: Spacing.lg,
  },
  foodRowPressed: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accentStrong,
  },
  foodCopy: {
    flex: 1,
    minWidth: 0,
  },
  foodName: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  foodServing: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.xs,
  },
  foodMacros: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.xs,
  },
  foodCalories: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  foodCaloriesValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  foodCaloriesLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  foodChevron: {
    color: Colors.primary,
    flexShrink: 0,
    fontSize: Typography.sizes.title,
    lineHeight: Typography.lineHeights.title,
  },
});
