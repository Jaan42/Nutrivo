import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';

import { auth } from '@/config/firebase';
import { subscribeFoodLogsForDateRange } from '@/services/food-logs';
import type { FoodLogRecord } from '@/types/food-log';

type WeeklyFoodLogsState = {
  authLoading: boolean;
  foodLogsLoading: boolean;
  user: User | null;
  foodLogs: FoodLogRecord[];
  authError: string | null;
  foodLogsError: string | null;
  reload: () => void;
};

const INITIAL_STATE = {
  authLoading: true,
  foodLogsLoading: false,
  user: null,
  foodLogs: [],
  authError: null,
  foodLogsError: null,
} satisfies Omit<WeeklyFoodLogsState, 'reload'>;

/** Maintains one real-time listener for the inclusive seven-day dateKey range. */
export function useWeeklyFoodLogs(
  startDateKey: string,
  endDateKey: string,
): WeeklyFoodLogsState {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<Omit<WeeklyFoodLogsState, 'reload'>>(INITIAL_STATE);

  const reload = useCallback(() => {
    setState((current) => ({
      ...current,
      authLoading: current.user === null,
      foodLogsLoading: current.user !== null,
      authError: null,
      foodLogsError: null,
    }));
    setReloadKey((current) => current + 1);
  }, []);

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

        unsubscribeFoodLogs = subscribeFoodLogsForDateRange(
          user.uid,
          startDateKey,
          endDateKey,
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
              foodLogsError: "We couldn't load your seven-day nutrition history.",
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
  }, [endDateKey, reloadKey, startDateKey]);

  return { ...state, reload };
}
