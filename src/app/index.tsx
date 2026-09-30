import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function Index() {
  return (
    <PlaceholderScreen title="Nutrivo">
      <Text>Routing preview</Text>
      <View style={styles.links}>
        <Link href="/login">Log In</Link>
        <Link href="/register">Register</Link>
        <Link href="/profile-setup">Profile Setup</Link>
        <Link href="/home">Open App</Link>
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  links: {
    alignItems: 'center',
    gap: 12,
  },
});
