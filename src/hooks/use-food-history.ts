import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

import { auth } from '@/config/firebase';
import { subscribeFoodLogsForDate } from '@/services/food-logs';
import type { FoodLogRecord } from '@/types/food-log';

type FoodHistoryState = {
  authLoading: boolean;
  foodLogsLoading: boolean;
  user: User | null;
  foodLogs: FoodLogRecord[];
  authError: string | null;
  foodLogsError: string | null;
};

const INITIAL_STATE: FoodHistoryState = {
  authLoading: true,
  foodLogsLoading: false,
  user: null,
  foodLogs: [],
  authError: null,
  foodLogsError: null,
};

export function useFoodHistory(dateKey: string): FoodHistoryState {
  const [state, setState] = useState<FoodHistoryState>(INITIAL_STATE);

  useEffect(() => {
    let unsubscribeFoodLogs: Unsubscribe | null = null;

    const clearFoodLogListener = () => {
      unsubscribeFoodLogs?.();
      unsubscribeFoodLogs = null;
    };

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
          foodLogsLoading: true,
          user,
        });

        unsubscribeFoodLogs = subscribeFoodLogsForDate(
          user.uid,
          dateKey,
          (foodLogs) => {
            setState((current) => ({
              ...current,
              foodLogs,
              foodLogsLoading: false,
              foodLogsError: null,
            }));
          },
          () => {
            setState((current) => ({
              ...current,
              foodLogs: [],
              foodLogsLoading: false,
              foodLogsError: "We couldn't load food history for this day.",
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
  }, [dateKey]);

  return state;
}
