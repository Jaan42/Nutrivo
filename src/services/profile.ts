import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/config/firebase";
import type { NutritionProfile } from "@/types/nutrition-profile";

export class ProfileNotSignedInError extends Error {
  constructor() {
    super("Please log in before finishing your profile.");
    this.name = "ProfileNotSignedInError";
  }
}

export class NutritionProfileSaveError extends Error {
  constructor() {
    super("We couldn't save your profile. Please try again.");
    this.name = "NutritionProfileSaveError";
  }
}

export async function saveNutritionProfile(profile: NutritionProfile): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new ProfileNotSignedInError();
  }

  const userRef = doc(db, "users", user.uid);

  try {
    const existingUser = await getDoc(userRef);
    const initialAccountFields = existingUser.exists()
      ? {}
      : {
          name: user.displayName?.trim() ?? "",
          email: user.email ?? "",
          createdAt: serverTimestamp(),
        };

    await setDoc(
      userRef,
      {
        ...initialAccountFields,
        age: profile.age,
        sex: profile.sex,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        bmi: profile.bmi,
        bmr: profile.bmr,
        tdee: profile.tdee,
        calorieTarget: profile.calorieTarget,
        proteinTarget: profile.proteinTarget,
        carbohydrateTarget: profile.carbohydrateTarget,
        fatTarget: profile.fatTarget,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new NutritionProfileSaveError();
  }
}

/** Updates editable profile fields without replacing account metadata or unrelated data. */
export async function updateNutritionProfile(
  name: string,
  profile: NutritionProfile,
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new ProfileNotSignedInError();
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new NutritionProfileSaveError();
  }

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name: normalizedName,
        age: profile.age,
        sex: profile.sex,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        bmi: profile.bmi,
        bmr: profile.bmr,
        tdee: profile.tdee,
        calorieTarget: profile.calorieTarget,
        proteinTarget: profile.proteinTarget,
        carbohydrateTarget: profile.carbohydrateTarget,
        fatTarget: profile.fatTarget,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new NutritionProfileSaveError();
  }
}
