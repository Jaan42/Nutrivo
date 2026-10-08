import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BackButton } from '@/components/back-button';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { NutritionCard } from '@/components/nutrition-card';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenContainer } from '@/components/screen-container';
import { Breakpoints, Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useNutritionLabelScan } from '@/context/nutrition-label-scan';
import { useNutritionTargets } from '@/hooks/use-nutrition-targets';
import { FoodLogNotSignedInError, saveFoodLog } from '@/services/food-logs';
import type { ConsumedNutrition, PendingFoodEntry } from '@/types/food-log';
import {
  createNutritionInsights,
  createTargetContributions,
} from '@/utils/nutrition-insights';
import { calculateConsumedNutrition } from '@/utils/serving-calculations';

type NutritionMetric = {
  label: string;
  value: number | null;
  unit: 'kcal' | 'g' | 'mg';
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function metricValue(metric: NutritionMetric): string {
  return metric.value === null ? 'Unavailable' : `${formatNumber(metric.value)} ${metric.unit}`;
}

function inputFromPending(entry: PendingFoodEntry) {
  return {
    foodName: entry.foodName,
    servingSize: entry.servingSize,
    mealType: entry.mealType,
    servingsConsumed: entry.servingsConsumed,
    nutritionPerServing: entry.nutritionPerServing,
  };
}

export default function NutritionInsightScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= Breakpoints.tablet;
  const { pendingFoodEntry, reset } = useNutritionLabelScan();
  const targetState = useNutritionTargets();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const calculation = useMemo(() => {
    if (!pendingFoodEntry) return { nutrition: null, error: null };

    try {
      return {
        nutrition: calculateConsumedNutrition(
          pendingFoodEntry.nutritionPerServing,
          pendingFoodEntry.servingsConsumed,
        ),
        error: null,
      };
    } catch {
      return {
        nutrition: null,
        error: 'This serving could not be calculated. Go back and review the nutrition values.',
      };
    }
  }, [pendingFoodEntry]);

  const insights = useMemo(
    () => (calculation.nutrition ? createNutritionInsights(calculation.nutrition) : []),
    [calculation.nutrition],
  );

  const targetContributions = useMemo(
    () =>
      calculation.nutrition && targetState.targets
        ? createTargetContributions(calculation.nutrition, targetState.targets)
        : [],
    [calculation.nutrition, targetState.targets],
  );

  function leaveFlow() {
    reset();
    router.replace('/add-food');
  }

  async function addToMeal() {
    if (!pendingFoodEntry || !calculation.nutrition || savingRef.current) return;

    setSaveError(null);
    setNeedsLogin(false);
    savingRef.current = true;
    setSaving(true);

    try {
      await saveFoodLog(inputFromPending(pendingFoodEntry), pendingFoodEntry.source);
      reset();
      router.replace('/home');
    } catch (error) {
      if (error instanceof FoodLogNotSignedInError) {
        setNeedsLogin(true);
        setSaveError('Please log in before adding this food to your meal.');
      } else {
        setSaveError("We couldn't save this food. Check your connection and try again.");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!pendingFoodEntry) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton accessibilityLabel="Back" onPress={() => router.back()} />
        <NutritionCard
          title="No food entry to review"
          subtitle="Choose a food entry method and enter nutrition details before viewing an insight.">
          <View style={styles.actions}>
            <PrimaryButton label="Add Food" onPress={leaveFlow} />
          </View>
        </NutritionCard>
      </ScreenContainer>
    );
  }

  if (!calculation.nutrition) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton accessibilityLabel="Back to food details" onPress={() => router.back()} />
        <NutritionCard title="Nutrition calculation unavailable" subtitle={calculation.error ?? undefined}>
          <View style={styles.actions}>
            <PrimaryButton label="Review Food Details" onPress={() => router.back()} />
            <SecondaryButton label="Cancel" onPress={leaveFlow} />
          </View>
        </NutritionCard>
      </ScreenContainer>
    );
  }

  const nutrition: ConsumedNutrition = calculation.nutrition;
  const metrics: NutritionMetric[] = [
    { label: 'Calories', value: nutrition.calories, unit: 'kcal' },
    { label: 'Protein', value: nutrition.protein, unit: 'g' },
    { label: 'Carbohydrates', value: nutrition.carbohydrates, unit: 'g' },
    { label: 'Fat', value: nutrition.fat, unit: 'g' },
    { label: 'Sugar', value: nutrition.sugar, unit: 'g' },
    { label: 'Sodium', value: nutrition.sodium, unit: 'mg' },
    { label: 'Fiber', value: nutrition.fiber, unit: 'g' },
  ];
  const servingsLabel = `${formatNumber(pendingFoodEntry.servingsConsumed)} ${
    pendingFoodEntry.servingsConsumed === 1 ? 'serving' : 'servings'
  }`;

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton accessibilityLabel="Back to food details" onPress={() => router.back()} />
      <AppHeader
        title="Nutrition Insight"
        subtitle="A clear summary of this food entry before it is added to your meal."
      />

      <View style={styles.formShell}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryCopy}>
              <Text style={styles.foodName}>{pendingFoodEntry.foodName}</Text>
              <Text style={styles.mealMetadata}>
                {pendingFoodEntry.mealType} {'\u2022'} {servingsLabel}
              </Text>
            </View>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>
                {pendingFoodEntry.source === 'nutrition-label' ? 'Label scan' : 'Manual'}
              </Text>
            </View>
          </View>

          <View style={styles.calorieGroup}>
            <Text style={styles.calorieValue}>{formatNumber(nutrition.calories)}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>

          <Text style={styles.servingSize}>Serving size: {pendingFoodEntry.servingSize}</Text>
        </View>

        <NutritionCard
          title="What stands out"
          subtitle="A few useful observations from this food entry.">
          <View style={[styles.insightList, wide && styles.insightListWide]}>
            {insights.map((insight) => (
              <View
                key={insight.nutrient}
                style={[styles.insightRow, wide && styles.insightRowWide]}>
                <View style={styles.insightDot} />
                <View style={styles.insightCopy}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightText}>{insight.message}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.observationNote}>
            These observations use general presentation ranges and are for informational purposes
            only.
          </Text>
        </NutritionCard>

        <NutritionCard
          title="Daily target context"
          subtitle="How this entry compares with the targets saved in your profile.">
          {targetState.loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.supportText}>Loading daily targets...</Text>
            </View>
          ) : targetContributions.length > 0 ? (
            <View style={[styles.targetList, wide && styles.targetListWide]}>
              {targetContributions.map((item) => (
                <View
                  key={item.nutrient}
                  style={[styles.targetItem, wide && styles.targetItemWide]}>
                  <View style={styles.targetHeader}>
                    <Text style={styles.targetLabel}>{item.label}</Text>
                    <Text style={styles.targetPercent}>{formatNumber(item.percentage)}%</Text>
                  </View>
                  <Text style={styles.targetValues}>
                    {formatNumber(item.consumed)} / {formatNumber(item.target)} {item.unit}
                  </Text>
                  <ProgressBar
                    accessibilityLabel={`${item.label}: ${formatNumber(item.percentage)} percent of daily target`}
                    progress={item.visualProgress}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.supportText}>
              {targetState.authStatus === 'unauthenticated'
                ? 'Log in to compare this entry with your daily targets.'
                : targetState.error ??
                  'Daily target comparison is unavailable until profile targets are complete.'}
            </Text>
          )}
        </NutritionCard>

        <NutritionCard
          title="Nutrition breakdown"
          subtitle="Exact totals for the servings in this entry.">
          <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
            {metrics.map((metric) => (
              <View key={metric.label} style={[styles.metric, wide && styles.metricWide]}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text
                  style={[
                    styles.metricValue,
                    metric.value === null && styles.metricUnavailable,
                  ]}>
                  {metricValue(metric)}
                </Text>
              </View>
            ))}
          </View>
        </NutritionCard>

        {saveError ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Text style={styles.errorText}>{saveError}</Text>
            {needsLogin ? (
              <SecondaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
            ) : null}
          </View>
        ) : null}

        <View style={[styles.actions, wide && styles.actionsWide]}>
          <SecondaryButton
            disabled={saving}
            label="Cancel"
            onPress={leaveFlow}
            style={wide ? styles.actionButton : undefined}
          />
          <PrimaryButton
            label={saving ? 'Adding to Meal...' : `Add to ${pendingFoodEntry.mealType}`}
            loading={saving}
            onPress={() => void addToMeal()}
            style={wide ? styles.actionButton : undefined}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.section,
  },
  emptyContent: {
    gap: Spacing.xl,
  },
  formShell: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 680,
    width: '100%',
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.feature,
    borderWidth: 1,
    gap: Spacing.lg,
    padding: Spacing.xxl,
  },
  summaryTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 0,
  },
  foodName: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.title,
  },
  mealMetadata: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  sourceBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
    flexShrink: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  sourceBadgeText: {
    color: Colors.primary,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  calorieGroup: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  calorieValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.display,
  },
  calorieUnit: {
    color: Colors.primary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.xs,
  },
  servingSize: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  metricGrid: {
    gap: Spacing.sm,
  },
  metricGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metric: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    gap: Spacing.xs,
    minWidth: 0,
    padding: Spacing.md,
    width: '100%',
  },
  metricWide: {
    flexBasis: '47%',
    flexGrow: 1,
    width: 'auto',
  },
  metricLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  metricValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  metricUnavailable: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.lineHeights.body,
  },
  insightList: {
    gap: Spacing.sm,
  },
  insightListWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  insightRow: {
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    width: '100%',
  },
  insightRowWide: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    width: 'auto',
  },
  insightDot: {
    backgroundColor: Colors.accentStrong,
    borderRadius: Radii.pill,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  insightCopy: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 0,
  },
  insightTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.body,
  },
  insightText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  observationNote: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
    marginTop: Spacing.md,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  supportText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  targetList: {
    gap: Spacing.sm,
  },
  targetListWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  targetItem: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    gap: Spacing.sm,
    padding: Spacing.md,
    width: '100%',
  },
  targetItemWide: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    width: 'auto',
  },
  targetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  targetLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
  },
  targetPercent: {
    color: Colors.primary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.bold,
    lineHeight: Typography.lineHeights.small,
  },
  targetValues: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.lineHeights.caption,
  },
  errorCard: {
    backgroundColor: Colors.errorSurface,
    borderColor: Colors.errorBorder,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
  },
  actionsWide: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
});
