import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type {
  ExtractedNutritionLabel,
  NutritionLabelImage,
  NutritionLabelReviewMode,
  ReviewedNutritionLabel,
} from '@/types/nutrition-label';

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
  selectImage: (image: NutritionLabelImage) => void;
  setExtractionResult: (nutrition: ExtractedNutritionLabel) => void;
  beginManualReview: () => void;
  setReviewedNutrition: (nutrition: ReviewedNutritionLabel) => void;
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

  const selectImage = useCallback((nextImage: NutritionLabelImage) => {
    setImage(nextImage);
    setExtractedNutrition(null);
    setReviewedNutritionState(null);
    setReviewMode(null);
  }, []);

  const setExtractionResult = useCallback((nutrition: ExtractedNutritionLabel) => {
    setExtractedNutrition(nutrition);
    setReviewedNutritionState(null);
    setReviewMode('extracted');
  }, []);

  const beginManualReview = useCallback(() => {
    setExtractedNutrition(EMPTY_EXTRACTED_NUTRITION_LABEL);
    setReviewedNutritionState(null);
    setReviewMode('manual-fallback');
  }, []);

  const setReviewedNutrition = useCallback((nutrition: ReviewedNutritionLabel) => {
    setReviewedNutritionState(nutrition);
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setExtractedNutrition(null);
    setReviewedNutritionState(null);
    setReviewMode(null);
  }, []);

  const reset = useCallback(() => {
    setImage(null);
    setExtractedNutrition(null);
    setReviewedNutritionState(null);
    setReviewMode(null);
  }, []);

  const value = useMemo(
    () => ({
      image,
      extractedNutrition,
      reviewedNutrition,
      reviewMode,
      selectImage,
      setExtractionResult,
      beginManualReview,
      setReviewedNutrition,
      clearImage,
      reset,
    }),
    [
      beginManualReview,
      clearImage,
      extractedNutrition,
      image,
      reset,
      reviewMode,
      reviewedNutrition,
      selectImage,
      setExtractionResult,
      setReviewedNutrition,
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
