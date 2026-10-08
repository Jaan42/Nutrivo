import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { BackButton } from '@/components/back-button';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { NutritionCard } from '@/components/nutrition-card';
import { ScreenContainer } from '@/components/screen-container';
import { Breakpoints, Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useFoodLog } from '@/hooks/use-food-log';
import { deleteFoodLog, FoodLogNotSignedInError } from '@/services/food-logs';
import type { OptionalNutritionValue } from '@/types/food-log';
import { formatLocalDateKey } from '@/utils/date';

type NutrientDisplay = {
  label: string;
  value: OptionalNutritionValue;
  unit: 'kcal' | 'g' | 'mg';
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function formatNutrient({ value, unit }: NutrientDisplay): string {
  return value === null ? 'Unavailable' : `${formatNumber(value)} ${unit}`;
}

function sourceLabel(source: 'manual' | 'nutrition-label' | null): string {
  if (source === 'manual') return 'Manual Entry';
  if (source === 'nutrition-label') return 'Nutrition Label';
  return 'Unknown';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function NutrientGrid({ nutrients, wide }: { nutrients: NutrientDisplay[]; wide: boolean }) {
  return (
    <View style={[styles.nutrientGrid, wide && styles.nutrientGridWide]}>
      {nutrients.map((nutrient) => (
        <View
          key={nutrient.label}
          style={[styles.nutrientItem, wide && styles.nutrientItemWide]}>
          <Text style={styles.nutrientLabel}>{nutrient.label}</Text>
          <Text
            style={[
              styles.nutrientValue,
              nutrient.value === null && styles.nutrientUnavailable,
            ]}>
            {formatNutrient(nutrient)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function FoodDetailsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= Breakpoints.tablet;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const foodLogId = Array.isArray(params.id) ? params.id[0] : params.id ?? null;
  const foodLogState = useFoodLog(foodLogId);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const loading =
    foodLogState.authLoading ||
    (foodLogState.user !== null && foodLogState.foodLogLoading);

  function goToHistory() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/history');
    }
  }

  async function confirmDelete() {
    if (!foodLogId || deletingRef.current) return;

    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteFoodLog(foodLogId);
      setDeleteConfirmationVisible(false);
      goToHistory();
    } catch (error) {
      setDeleteConfirmationVisible(false);
      setDeleteError(
        error instanceof FoodLogNotSignedInError
          ? 'Please log in again before deleting this food.'
          : "We couldn't delete this food. Check your connection and try again.",
      );
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer width="page" contentStyle={styles.centeredState}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.stateTitle}>Loading food details</Text>
      </ScreenContainer>
    );
  }

  if (!foodLogState.user) {
    return (
      <ScreenContainer width="form" contentStyle={styles.centeredState}>
        <Text style={styles.stateTitle}>
          {foodLogState.authError ? 'Session unavailable' : 'Log in to view this food'}
        </Text>
        <Text style={styles.stateMessage}>
          {foodLogState.authError ?? 'Food details are tied to your Nutrivo account.'}
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  const foodLog = foodLogState.foodLog;
  if (!foodLog) {
    return (
      <ScreenContainer width="form" contentStyle={styles.emptyContent}>
        <BackButton accessibilityLabel="Back to History" onPress={goToHistory} />
        <NutritionCard
          title={foodLogState.foodLogError ? 'Food details unavailable' : 'Food entry not found'}
          subtitle={
            foodLogState.foodLogError ??
            'This food may have been deleted or the link is no longer available.'
          }>
          <PrimaryButton label="Return to History" onPress={goToHistory} />
        </NutritionCard>
      </ScreenContainer>
    );
  }

  const foodName = foodLog.foodName || 'Unnamed food';
  const meal = foodLog.mealType ?? 'Uncategorized';
  const perServing: NutrientDisplay[] = [
    { label: 'Calories', value: foodLog.caloriesPerServing, unit: 'kcal' },
    { label: 'Protein', value: foodLog.proteinPerServing, unit: 'g' },
    { label: 'Carbohydrates', value: foodLog.carbohydratesPerServing, unit: 'g' },
    { label: 'Fat', value: foodLog.fatPerServing, unit: 'g' },
    { label: 'Sugar', value: foodLog.sugarPerServing, unit: 'g' },
    { label: 'Sodium', value: foodLog.sodiumPerServing, unit: 'mg' },
    { label: 'Fiber', value: foodLog.fiberPerServing, unit: 'g' },
  ];
  const consumed: NutrientDisplay[] = [
    { label: 'Calories', value: foodLog.calories, unit: 'kcal' },
    { label: 'Protein', value: foodLog.protein, unit: 'g' },
    { label: 'Carbohydrates', value: foodLog.carbohydrates, unit: 'g' },
    { label: 'Fat', value: foodLog.fat, unit: 'g' },
    { label: 'Sugar', value: foodLog.sugar, unit: 'g' },
    { label: 'Sodium', value: foodLog.sodium, unit: 'mg' },
    { label: 'Fiber', value: foodLog.fiber, unit: 'g' },
  ];
  const servingsLabel = `${formatNumber(foodLog.servingsConsumed)} ${
    foodLog.servingsConsumed === 1 ? 'serving' : 'servings'
  }`;

  return (
    <ScreenContainer width="page" contentStyle={styles.content}>
      <BackButton accessibilityLabel="Back to History" onPress={goToHistory} />
      <AppHeader title={foodName} subtitle={`${meal} · ${formatLocalDateKey(foodLog.dateKey)}`} />

      <View style={styles.detailsShell}>
        <NutritionCard title="Entry details">
          <View style={styles.detailList}>
            <DetailRow label="Source" value={sourceLabel(foodLog.source)} />
            <DetailRow label="Meal" value={meal} />
            <DetailRow label="Date" value={formatLocalDateKey(foodLog.dateKey)} />
            <DetailRow label="Serving size" value={foodLog.servingSize || 'Unavailable'} />
            <DetailRow label="Servings consumed" value={servingsLabel} />
          </View>
        </NutritionCard>

        <NutritionCard title="Per serving" subtitle={foodLog.servingSize || undefined}>
          <NutrientGrid nutrients={perServing} wide={wide} />
        </NutritionCard>

        <NutritionCard title="Consumed" subtitle={`Totals for ${servingsLabel}`}>
          <NutrientGrid nutrients={consumed} wide={wide} />
        </NutritionCard>

        {deleteError ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Text style={styles.errorText}>{deleteError}</Text>
          </View>
        ) : null}

        <View style={[styles.actions, wide && styles.actionsWide]}>
          <PrimaryButton
            label="Edit Food"
            onPress={() =>
              router.push({ pathname: '/food-details/[id]/edit', params: { id: foodLog.id } })
            }
            style={wide ? styles.actionButton : undefined}
          />
          <Pressable
            accessibilityLabel="Delete food"
            accessibilityRole="button"
            disabled={deleting}
            onPress={() => {
              setDeleteError(null);
              setDeleteConfirmationVisible(true);
            }}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
              deleting && styles.actionDisabled,
              wide && styles.actionButton,
            ]}>
            {deleting ? <ActivityIndicator color={Colors.error} size="small" /> : null}
            <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteConfirmationVisible(false)}
        transparent
        visible={deleteConfirmationVisible}>
        <View style={styles.modalOverlay}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete “{foodName}”?</Text>
            <Text style={styles.modalMessage}>
              This food entry will be permanently removed from your history.
            </Text>
            <View style={styles.modalActions}>
              <SecondaryButton
                disabled={deleting}
                label="Cancel"
                onPress={() => setDeleteConfirmationVisible(false)}
                style={styles.modalAction}
              />
              <Pressable
                accessibilityLabel="Confirm delete food"
                accessibilityRole="button"
                disabled={deleting}
                onPress={() => void confirmDelete()}
                style={({ pressed }) => [
                  styles.confirmDeleteButton,
                  pressed && styles.confirmDeleteButtonPressed,
                  deleting && styles.actionDisabled,
                  styles.modalAction,
                ]}>
                {deleting ? <ActivityIndicator color={Colors.onPrimary} size="small" /> : null}
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
    paddingBottom: Spacing.section,
  },
  centeredState: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  emptyContent: {
    gap: Spacing.xl,
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
    textAlign: 'center',
  },
  detailsShell: {
    alignSelf: 'center',
    gap: Spacing.lg,
    maxWidth: 680,
    width: '100%',
  },
  detailList: {
    gap: Spacing.md,
  },
  detailRow: {
    alignItems: 'flex-start',
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  detailLabel: {
    color: Colors.textMuted,
    flexShrink: 0,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
  },
  detailValue: {
    color: Colors.text,
    flex: 1,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.small,
    textAlign: 'right',
  },
  nutrientGrid: {
    gap: Spacing.sm,
  },
  nutrientGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nutrientItem: {
    backgroundColor: Colors.background,
    borderRadius: Radii.input,
    gap: Spacing.xs,
    padding: Spacing.md,
    width: '100%',
  },
  nutrientItemWide: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    width: 'auto',
  },
  nutrientLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.caption,
  },
  nutrientValue: {
    color: Colors.primary,
    fontSize: Typography.sizes.section,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.section,
  },
  nutrientUnavailable: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.lineHeights.body,
  },
  errorCard: {
    backgroundColor: Colors.errorSurface,
    borderColor: Colors.errorBorder,
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.small,
    lineHeight: Typography.lineHeights.small,
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
  deleteButton: {
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
  deleteButtonPressed: {
    backgroundColor: Colors.errorSurface,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
  actionDisabled: {
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
  confirmDeleteButton: {
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
  confirmDeleteButtonPressed: {
    opacity: 0.82,
  },
  confirmDeleteText: {
    color: Colors.onPrimary,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    lineHeight: Typography.lineHeights.body,
  },
});
