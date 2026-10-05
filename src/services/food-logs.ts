import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import {
  MEAL_TYPES,
  type FoodLogRecord,
  type FoodLogSource,
  type ManualFoodLogInput,
  type MealType,
  type OptionalNutritionValue,
} from '@/types/food-log';
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

export class FoodLogReadError extends Error {
  constructor() {
    super("We couldn't load this food entry.");
    this.name = 'FoodLogReadError';
  }
}

export class FoodLogUpdateError extends Error {
  constructor() {
    super("We couldn't update this food entry.");
    this.name = 'FoodLogUpdateError';
  }
}

export class FoodLogDeleteError extends Error {
  constructor() {
    super("We couldn't delete this food entry.");
    this.name = 'FoodLogDeleteError';
  }
}

function safeNonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function optionalNonNegativeNumber(value: unknown): OptionalNutritionValue {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMealType(value: unknown): MealType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return MEAL_TYPES.find((mealType) => mealType.toLowerCase() === normalized) ?? null;
}

function normalizeSource(value: unknown): FoodLogSource | null {
  return value === 'manual' || value === 'nutrition-label' ? value : null;
}

/** Converts one Firestore document into values that cannot leak NaN or negative totals into UI. */
export function normalizeFoodLog(id: string, data: DocumentData): FoodLogRecord {
  return {
    id,
    foodName: safeText(data.foodName),
    servingSize: safeText(data.servingSize),
    mealType: normalizeMealType(data.mealType ?? data.meal),
    servingsConsumed: safeNonNegativeNumber(data.servingsConsumed),
    source: normalizeSource(data.source),
    dateKey: safeText(data.dateKey),
    caloriesPerServing: safeNonNegativeNumber(data.caloriesPerServing),
    proteinPerServing: safeNonNegativeNumber(data.proteinPerServing),
    carbohydratesPerServing: safeNonNegativeNumber(data.carbohydratesPerServing),
    fatPerServing: safeNonNegativeNumber(data.fatPerServing),
    sugarPerServing: optionalNonNegativeNumber(data.sugarPerServing),
    sodiumPerServing: optionalNonNegativeNumber(data.sodiumPerServing),
    fiberPerServing: optionalNonNegativeNumber(data.fiberPerServing),
    calories: safeNonNegativeNumber(data.calories),
    protein: safeNonNegativeNumber(data.protein),
    carbohydrates: safeNonNegativeNumber(data.carbohydrates),
    fat: safeNonNegativeNumber(data.fat),
    sugar: optionalNonNegativeNumber(data.sugar),
    sodium: optionalNonNegativeNumber(data.sodium),
    fiber: optionalNonNegativeNumber(data.fiber),
  };
}

export function subscribeFoodLogsForDate(
  uid: string,
  dateKey: string,
  onData: (foodLogs: FoodLogRecord[]) => void,
  onError: () => void,
): Unsubscribe {
  const logsForDate = query(
    collection(db, 'users', uid, 'foodLogs'),
    where('dateKey', '==', dateKey),
  );

  return onSnapshot(
    logsForDate,
    (snapshot) => {
      const foodLogs = snapshot.docs
        .map((snapshotDocument) =>
          normalizeFoodLog(snapshotDocument.id, snapshotDocument.data()),
        )
        .sort((left, right) => left.foodName.localeCompare(right.foodName));
      onData(foodLogs);
    },
    onError,
  );
}

export function subscribeFoodLog(
  uid: string,
  foodLogId: string,
  onData: (foodLog: FoodLogRecord | null) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'foodLogs', foodLogId),
    (snapshot) => {
      onData(snapshot.exists() ? normalizeFoodLog(snapshot.id, snapshot.data()) : null);
    },
    onError,
  );
}

export async function getFoodLog(foodLogId: string): Promise<FoodLogRecord | null> {
  const user = auth.currentUser;
  if (!user) throw new FoodLogNotSignedInError();

  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid, 'foodLogs', foodLogId));
    return snapshot.exists() ? normalizeFoodLog(snapshot.id, snapshot.data()) : null;
  } catch {
    throw new FoodLogReadError();
  }
}

export async function saveFoodLog(
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

export async function updateFoodLog(
  foodLogId: string,
  input: ManualFoodLogInput,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new FoodLogNotSignedInError();

  try {
    const consumedNutrition = calculateConsumedNutrition(
      input.nutritionPerServing,
      input.servingsConsumed,
    );

    await updateDoc(doc(db, 'users', user.uid, 'foodLogs', foodLogId), {
      foodName: input.foodName,
      mealType: input.mealType,
      servingSize: input.servingSize,
      servingsConsumed: input.servingsConsumed,
      ...input.nutritionPerServing,
      ...consumedNutrition,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new FoodLogUpdateError();
  }
}

export async function deleteFoodLog(foodLogId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new FoodLogNotSignedInError();

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'foodLogs', foodLogId));
  } catch {
    throw new FoodLogDeleteError();
  }
}
