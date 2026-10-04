import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { MEAL_TYPES, type DashboardFoodLog, type MealType } from '@/types/food-log';

export type DashboardProfile = {
  name: string;
  calorieTarget: number;
  proteinTarget: number;
  carbohydrateTarget: number;
  fatTarget: number;
  isComplete: boolean;
};

type HomeDashboardState = {
  authLoading: boolean;
  profileLoading: boolean;
  foodLogsLoading: boolean;
  user: User | null;
  profile: DashboardProfile | null;
  foodLogs: DashboardFoodLog[];
  authError: string | null;
  profileError: string | null;
  foodLogsError: string | null;
};

const INITIAL_STATE: HomeDashboardState = {
  authLoading: true,
  profileLoading: false,
  foodLogsLoading: false,
  user: null,
  profile: null,
  foodLogs: [],
  authError: null,
  profileError: null,
  foodLogsError: null,
};

function safeNonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readNutritionValue(data: DocumentData, field: string, aliases: string[] = []): number {
  const nestedNutrition =
    data.nutrition && typeof data.nutrition === 'object'
      ? (data.nutrition as Record<string, unknown>)
      : null;

  for (const key of [field, ...aliases]) {
    const directValue = safeNonNegativeNumber(data[key]);
    if (directValue > 0 || data[key] === 0) return directValue;

    const nestedValue = safeNonNegativeNumber(nestedNutrition?.[key]);
    if (nestedValue > 0 || nestedNutrition?.[key] === 0) return nestedValue;
  }

  return 0;
}

function normalizeMealType(value: unknown): MealType | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return MEAL_TYPES.find((mealType) => mealType.toLowerCase() === normalized) ?? null;
}

function mapFoodLog(id: string, data: DocumentData): DashboardFoodLog {
  return {
    id,
    mealType: normalizeMealType(data.mealType ?? data.meal),
    calories: readNutritionValue(data, 'calories'),
    protein: readNutritionValue(data, 'protein'),
    carbohydrates: readNutritionValue(data, 'carbohydrates', ['carbs', 'carbohydrate']),
    fat: readNutritionValue(data, 'fat'),
  };
}

function mapProfile(data: DocumentData): DashboardProfile {
  const calorieTarget = safeNonNegativeNumber(data.calorieTarget);
  const proteinTarget = safeNonNegativeNumber(data.proteinTarget);
  const carbohydrateTarget = safeNonNegativeNumber(data.carbohydrateTarget);
  const fatTarget = safeNonNegativeNumber(data.fatTarget);

  return {
    name: typeof data.name === 'string' ? data.name.trim() : '',
    calorieTarget,
    proteinTarget,
    carbohydrateTarget,
    fatTarget,
    isComplete:
      data.profileCompleted === true &&
      calorieTarget > 0 &&
      proteinTarget > 0 &&
      carbohydrateTarget > 0 &&
      fatTarget > 0,
  };
}

export function useHomeDashboard(dateKey: string): HomeDashboardState {
  const [state, setState] = useState<HomeDashboardState>(INITIAL_STATE);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | null = null;
    let unsubscribeFoodLogs: Unsubscribe | null = null;

    const clearFirestoreListeners = () => {
      unsubscribeProfile?.();
      unsubscribeFoodLogs?.();
      unsubscribeProfile = null;
      unsubscribeFoodLogs = null;
    };

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        clearFirestoreListeners();

        if (!user) {
          setState({
            ...INITIAL_STATE,
            authLoading: false,
          });
          return;
        }

        setState({
          ...INITIAL_STATE,
          authLoading: false,
          profileLoading: true,
          foodLogsLoading: true,
          user,
        });

        unsubscribeProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snapshot) => {
            setState((current) => ({
              ...current,
              profileLoading: false,
              profile: snapshot.exists() ? mapProfile(snapshot.data()) : null,
              profileError: null,
            }));
          },
          () => {
            setState((current) => ({
              ...current,
              profileLoading: false,
              profile: null,
              profileError: "We couldn't load your nutrition targets.",
            }));
          },
        );

        const todayFoodLogs = query(
          collection(db, 'users', user.uid, 'foodLogs'),
          where('dateKey', '==', dateKey),
        );

        unsubscribeFoodLogs = onSnapshot(
          todayFoodLogs,
          (snapshot) => {
            setState((current) => ({
              ...current,
              foodLogsLoading: false,
              foodLogs: snapshot.docs.map((foodLog) => mapFoodLog(foodLog.id, foodLog.data())),
              foodLogsError: null,
            }));
          },
          () => {
            setState((current) => ({
              ...current,
              foodLogsLoading: false,
              foodLogs: [],
              foodLogsError: "We couldn't load today's food logs.",
            }));
          },
        );
      },
      () => {
        clearFirestoreListeners();
        setState({
          ...INITIAL_STATE,
          authLoading: false,
          authError: "We couldn't confirm your session.",
        });
      },
    );

    return () => {
      unsubscribeAuth();
      clearFirestoreListeners();
    };
  }, [dateKey]);

  return state;
}
