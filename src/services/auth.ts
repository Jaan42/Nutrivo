import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/config/firebase";
import { AccountProfileSaveError } from "@/utils/firebase-errors";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      name: name.trim(),
      email: normalizedEmail,
      profileCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Auth has succeeded, so keep this separate from account creation errors.
    throw new AccountProfileSaveError();
  }
}

export async function signInAndCheckProfile(email: string, password: string): Promise<boolean> {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  const userSnapshot = await getDoc(doc(db, "users", credential.user.uid));

  // A missing document can be completed through Profile Setup later.
  return userSnapshot.exists() && userSnapshot.data().profileCompleted === true;
}

export class AccountSignOutError extends Error {
  constructor() {
    super("We couldn't sign you out. Please try again.");
    this.name = "AccountSignOutError";
  }
}

export async function signOutAccount(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    throw new AccountSignOutError();
  }
}
