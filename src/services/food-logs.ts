import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import type { FoodLogSource, ManualFoodLogInput } from '@/types/food-log';
import { getLocalDateKey } from '@/utils/date';
import { calculateConsumedNutrition } from '@/utils/serving-calculations';

export class FoodLogNotSignedInError extends Error {
  constructor() {
    super('Please log in before adding food.');
    this.name = 'FoodLogNotSignedInError';
  }
}

export class FoodLogSaveError extends Error {
  constructor() {
    super("We couldn't save this food. Please try again.");
    this.name = 'FoodLogSaveError';
  }
}

async function saveFoodLog(
  input: ManualFoodLogInput,
  source: FoodLogSource,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new FoodLogNotSignedInError();

  const consumedNutrition = calculateConsumedNutrition(
    input.nutritionPerServing,
    input.servingsConsumed,
  );

  try {
    const foodLog = await addDoc(collection(db, 'users', user.uid, 'foodLogs'), {
      foodName: input.foodName,
      mealType: input.mealType,
      dateKey: getLocalDateKey(),
      source,
      servingSize: input.servingSize,
      servingsConsumed: input.servingsConsumed,
      ...input.nutritionPerServing,
      ...consumedNutrition,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return foodLog.id;
  } catch {
    throw new FoodLogSaveError();
  }
}

export function saveManualFoodLog(input: ManualFoodLogInput): Promise<string> {
  return saveFoodLog(input, 'manual');
}

export function saveNutritionLabelFoodLog(
  input: ManualFoodLogInput,
): Promise<string> {
  return saveFoodLog(input, 'nutrition-label');
}
