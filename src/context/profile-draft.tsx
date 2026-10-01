import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import type { NutritionProfile, ProfileFormValues } from '@/types/nutrition-profile';

type ProfileDraft = {
  uid: string;
  values: ProfileFormValues;
  profile: NutritionProfile;
};

type ProfileDraftContextValue = {
  draft: ProfileDraft | null;
  setDraft: (draft: ProfileDraft | null) => void;
};

const ProfileDraftContext = createContext<ProfileDraftContextValue | null>(null);

export function ProfileDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  return (
    <ProfileDraftContext.Provider value={{ draft, setDraft }}>
      {children}
    </ProfileDraftContext.Provider>
  );
}

export function useProfileDraft() {
  const context = useContext(ProfileDraftContext);
  if (!context) throw new Error('Profile draft is only available inside the auth routes.');
  return context;
}
