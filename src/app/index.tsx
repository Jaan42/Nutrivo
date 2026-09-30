import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";

import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const testFirebase = async () => {
    try {
      setMessage("Testing Firebase...");

      // 1. Create Firebase Authentication account
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const uid = userCredential.user.uid;

      // 2. Save a test profile in Firestore
      await setDoc(doc(db, "users", uid), {
        name: "Nutrivo Test User",
        email: email.trim(),
        test: true,
      });

      // 3. Read the profile back
      const userDoc = await getDoc(
        doc(db, "users", uid)
      );

      if (userDoc.exists()) {
        setMessage(
          `SUCCESS!\n\nAuthentication works.\nFirestore write works.\nFirestore read works.\n\nUID: ${uid}`
        );
      } else {
        setMessage(
          "Authentication worked, but Firestore read failed."
        );
      }
    } catch (error: any) {
      setMessage(
        `ERROR:\n${error.code ?? ""}\n${error.message}`
      );
    }
  };

  const testLogout = async () => {
    try {
      await signOut(auth);
      setMessage("Logout successful.");
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Nutrivo</Text>

      <Text style={styles.subtitle}>
        Firebase Service Test
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Test Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={styles.button}
        onPress={testFirebase}
      >
        <Text style={styles.buttonText}>
          Test Firebase
        </Text>
      </Pressable>

      <Pressable
        style={styles.logoutButton}
        onPress={testLogout}
      >
        <Text style={styles.logoutText}>
          Test Logout
        </Text>
      </Pressable>

      <Text style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#F8FBF3",
  },

  logo: {
    fontSize: 38,
    fontWeight: "800",
    textAlign: "center",
    color: "#176B3A",
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#176B3A",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  logoutButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#176B3A",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: "#176B3A",
    fontWeight: "600",
  },

  message: {
    marginTop: 24,
    lineHeight: 22,
  },
});