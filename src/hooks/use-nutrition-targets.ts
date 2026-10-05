import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, type DocumentData, type Unsubscribe } from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import type { DailyNutritionTargets } from '@/utils/nutrition-insights';

type NutritionTargetsState = {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  loading: boolean;
  targets: DailyNutritionTargets | null;
  error: string | null;
};

const INITIAL_STATE: NutritionTargetsState = {
  authStatus: 'loading',
  loading: true,
  targets: null,
  error: null,
};

function readPositiveTarget(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function mapTargets(data: DocumentData): DailyNutritionTargets {
  return {
    calorieTarget: readPositiveTarget(data.calorieTarget),
    proteinTarget: readPositiveTarget(data.proteinTarget),
    carbohydrateTarget: readPositiveTarget(data.carbohydrateTarget),
    fatTarget: readPositiveTarget(data.fatTarget),
  };
}

export function useNutritionTargets(): NutritionTargetsState {
  const [state, setState] = useState<NutritionTargetsState>(INITIAL_STATE);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribeProfile?.();
        unsubscribeProfile = null;

        if (!user) {
          setState({
            authStatus: 'unauthenticated',
            loading: false,
            targets: null,
            error: null,
          });
          return;
        }

        setState({
          authStatus: 'authenticated',
          loading: true,
          targets: null,
          error: null,
        });

        unsubscribeProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snapshot) => {
            setState({
              authStatus: 'authenticated',
              loading: false,
              targets: snapshot.exists() ? mapTargets(snapshot.data()) : null,
              error: null,
            });
          },
          () => {
            setState({
              authStatus: 'authenticated',
              loading: false,
              targets: null,
              error: "We couldn't load your daily targets.",
            });
          },
        );
      },
      () => {
        unsubscribeProfile?.();
        unsubscribeProfile = null;
        setState({
          authStatus: 'unauthenticated',
          loading: false,
          targets: null,
          error: "We couldn't confirm your session.",
        });
      },
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  return state;
}
