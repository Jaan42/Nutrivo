import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type DocumentData, type Unsubscribe } from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import {
  ACTIVITY_LEVELS,
  GOALS,
  SEX_OPTIONS,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '@/types/nutrition-profile';

export type UserNutritionProfile = {
  name: string;
  email: string;
  profileCompleted: boolean;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbohydrateTarget: number | null;
  fatTarget: number | null;
};

type UserProfileState = {
  authLoading: boolean;
  profileLoading: boolean;
  user: User | null;
  profile: UserNutritionProfile | null;
  authError: string | null;
  profileError: string | null;
  reload: () => void;
};

function readPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function readChoice<T extends string>(options: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && options.some((option) => option === value)
    ? (value as T)
    : null;
}

function mapUserProfile(data: DocumentData, user: User): UserNutritionProfile {
  return {
    name:
      typeof data.name === 'string' && data.name.trim()
        ? data.name.trim()
        : user.displayName?.trim() ?? '',
    email:
      typeof data.email === 'string' && data.email.trim()
        ? data.email.trim()
        : user.email ?? '',
    profileCompleted: data.profileCompleted === true,
    age: readPositiveNumber(data.age),
    sex: readChoice(SEX_OPTIONS, data.sex),
    heightCm: readPositiveNumber(data.heightCm),
    weightKg: readPositiveNumber(data.weightKg),
    activityLevel: readChoice(ACTIVITY_LEVELS, data.activityLevel),
    goal: readChoice(GOALS, data.goal),
    bmi: readPositiveNumber(data.bmi),
    bmr: readPositiveNumber(data.bmr),
    tdee: readPositiveNumber(data.tdee),
    calorieTarget: readPositiveNumber(data.calorieTarget),
    proteinTarget: readPositiveNumber(data.proteinTarget),
    carbohydrateTarget: readPositiveNumber(data.carbohydrateTarget),
    fatTarget: readPositiveNumber(data.fatTarget),
  };
}

/** Keeps authenticated account and users/{uid} profile data in sync in real time. */
export function useUserProfile(): UserProfileState {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<Omit<UserProfileState, 'reload'>>({
    authLoading: true,
    profileLoading: false,
    user: null,
    profile: null,
    authError: null,
    profileError: null,
  });

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribeProfile?.();
        unsubscribeProfile = null;

        if (!user) {
          setState({
            authLoading: false,
            profileLoading: false,
            user: null,
            profile: null,
            authError: null,
            profileError: null,
          });
          return;
        }

        setState({
          authLoading: false,
          profileLoading: true,
          user,
          profile: null,
          authError: null,
          profileError: null,
        });

        unsubscribeProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snapshot) => {
            setState({
              authLoading: false,
              profileLoading: false,
              user,
              profile: snapshot.exists() ? mapUserProfile(snapshot.data(), user) : null,
              authError: null,
              profileError: null,
            });
          },
          () => {
            setState({
              authLoading: false,
              profileLoading: false,
              user,
              profile: null,
              authError: null,
              profileError: "We couldn't load your profile. Check your connection and try again.",
            });
          },
        );
      },
      () => {
        unsubscribeProfile?.();
        unsubscribeProfile = null;
        setState({
          authLoading: false,
          profileLoading: false,
          user: null,
          profile: null,
          authError: "We couldn't confirm your session. Please try again.",
          profileError: null,
        });
      },
    );

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, [reloadKey]);

  return { ...state, reload };
}
