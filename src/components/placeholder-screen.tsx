import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PlaceholderScreenProps = PropsWithChildren<{
  title: string;
}>;

export function PlaceholderScreen({ title, children }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
