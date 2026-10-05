import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type {
  FoodLogSource,
  ManualFoodLogInput,
  PendingFoodEntry,
} from '@/types/food-log';
import type {
  ExtractedNutritionLabel,
  NutritionLabelImage,
  NutritionLabelReviewMode,
  ReviewedNutritionLabel,
} from '@/types/nutrition-label';
import { calculateConsumedNutrition } from '@/utils/serving-calculations';

export const EMPTY_EXTRACTED_NUTRITION_LABEL: ExtractedNutritionLabel = {
  foodName: null,
  servingSize: null,
  calories: null,
  protein: null,
  carbohydrates: null,
  fat: null,
  sugar: null,
  sodium: null,
  fiber: null,
};

type NutritionLabelScanContextValue = {
  image: NutritionLabelImage | null;
  extractedNutrition: ExtractedNutritionLabel | null;
  reviewedNutrition: ReviewedNutritionLabel | null;
  reviewMode: NutritionLabelReviewMode | null;
  pendingFoodEntry: PendingFoodEntry | null;
  selectImage: (image: NutritionLabelImage) => void;
  setExtractionResult: (nutrition: ExtractedNutritionLabel) => void;
  beginManualReview: () => void;
  setReviewedNutrition: (nutrition: ReviewedNutritionLabel) => void;
  stageFoodEntry: (input: ManualFoodLogInput, source: FoodLogSource) => void;
  clearPendingFoodEntry: () => void;
  clearImage: () => void;
  reset: () => void;
};

const NutritionLabelScanContext = createContext<NutritionLabelScanContextValue | null>(null);

export function NutritionLabelScanProvider({ children }: PropsWithChildren) {
  const [image, setImage] = useState<NutritionLabelImage | null>(null);
  const [extractedNutrition, setExtractedNutrition] =
    useState<ExtractedNutritionLabel | null>(null);
  const [reviewedNutrition, setReviewedNutritionState] =
    useState<ReviewedNutritionLabel | null>(null);
  const [reviewMode, setReviewMode] = useState<NutritionLabelReviewMode | null>(null);
  const [pendingFoodEntry, setPendingFoodEntry] = useState<PendingFoodEntry | null>(null);

  const selectImage = useCallback((nextImage: NutritionLabelImage) => {
    setImage(nextImage);
    setExtractedNutrition(null);
    setReviewedNutritionState(null);
    setReviewMode(null);
    setPendingFoodEntry(null);
  }, []);

  const setExtractionResult = useCallback((nutrition: ExtractedNutritionLabel) => {
    setExtractedNutrition(nutrition);
    setReviewedNutritionState(null);
    setReviewMode('extracted');
    setPendingFoodEntry(null);
  }, []);

  const beginManualReview = useCallback(() => {
    setExtractedNutrition(EMPTY_EXTRACTED_NUTRITION_LABEL);
    setReviewedNutritionState(null);
    setReviewMode('manual-fallback');
    setPendingFoodEntry(null);
  }, []);

  const setReviewedNutrition = useCallback((nutrition: ReviewedNutritionLabel) => {
    setReviewedNutritionState(nutrition);
    setPendingFoodEntry(null);
  }, []);

  const stageFoodEntry = useCallback(
    (input: ManualFoodLogInput, source: FoodLogSource) => {
      const consumedNutrition = calculateConsumedNutrition(
        input.nutritionPerServing,
        input.servingsConsumed,
      );
      setPendingFoodEntry({ ...input, source, consumedNutrition });
    },
    [],
  );

  const clearPendingFoodEntry = useCallback(() => {
    setPendingFoodEntry(null);
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setExtractedNutrition(null);
    setReviewedNutritionState(null);
    setReviewMode(null);
    setPendingFoodEntry(null);
  }, []);

  const reset = useCallback(() => {
    setImage(null);
    setExtractedNutrition(null);
    setReviewedNutritionState(null);
    setReviewMode(null);
    setPendingFoodEntry(null);
  }, []);

  const value = useMemo(
    () => ({
      image,
      extractedNutrition,
      reviewedNutrition,
      reviewMode,
      pendingFoodEntry,
      selectImage,
      setExtractionResult,
      beginManualReview,
      setReviewedNutrition,
      stageFoodEntry,
      clearPendingFoodEntry,
      clearImage,
      reset,
    }),
    [
      beginManualReview,
      clearImage,
      clearPendingFoodEntry,
      extractedNutrition,
      image,
      pendingFoodEntry,
      reset,
      reviewMode,
      reviewedNutrition,
      selectImage,
      setExtractionResult,
      setReviewedNutrition,
      stageFoodEntry,
    ],
  );

  return (
    <NutritionLabelScanContext.Provider value={value}>
      {children}
    </NutritionLabelScanContext.Provider>
  );
}

export function useNutritionLabelScan(): NutritionLabelScanContextValue {
  const value = useContext(NutritionLabelScanContext);
  if (!value) {
    throw new Error('useNutritionLabelScan must be used inside NutritionLabelScanProvider.');
  }
  return value;
}
