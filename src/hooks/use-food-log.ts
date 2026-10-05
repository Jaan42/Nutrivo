import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

import { auth } from '@/config/firebase';
import { subscribeFoodLog } from '@/services/food-logs';
import type { FoodLogRecord } from '@/types/food-log';

type FoodLogState = {
  authLoading: boolean;
  foodLogLoading: boolean;
  user: User | null;
  foodLog: FoodLogRecord | null;
  authError: string | null;
  foodLogError: string | null;
};

const INITIAL_STATE: FoodLogState = {
  authLoading: true,
  foodLogLoading: false,
  user: null,
  foodLog: null,
  authError: null,
  foodLogError: null,
};

export function useFoodLog(foodLogId: string | null): FoodLogState {
  const [state, setState] = useState<FoodLogState>(INITIAL_STATE);

  useEffect(() => {
    let unsubscribeFoodLog: Unsubscribe | null = null;

    const clearFoodLogListener = () => {
      unsubscribeFoodLog?.();
      unsubscribeFoodLog = null;
    };

    if (!foodLogId) {
      return undefined;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        clearFoodLogListener();

        if (!user) {
          setState({ ...INITIAL_STATE, authLoading: false });
          return;
        }

        setState({
          ...INITIAL_STATE,
          authLoading: false,
          foodLogLoading: true,
          user,
        });

        unsubscribeFoodLog = subscribeFoodLog(
          user.uid,
          foodLogId,
          (foodLog) => {
            setState((current) => ({
              ...current,
              foodLog,
              foodLogLoading: false,
              foodLogError: null,
            }));
          },
          () => {
            setState((current) => ({
              ...current,
              foodLog: null,
              foodLogLoading: false,
              foodLogError: "We couldn't load this food entry.",
            }));
          },
        );
      },
      () => {
        clearFoodLogListener();
        setState({
          ...INITIAL_STATE,
          authLoading: false,
          authError: "We couldn't confirm your session.",
        });
      },
    );

    return () => {
      unsubscribeAuth();
      clearFoodLogListener();
    };
  }, [foodLogId]);

  return foodLogId
    ? state
    : {
        ...INITIAL_STATE,
        authLoading: false,
        foodLogError: 'No food entry was selected.',
      };
}
