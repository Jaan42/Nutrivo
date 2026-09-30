import { StyleSheet, View } from 'react-native';

import { Colors, Radii } from '../constants/theme';

type ProgressBarProps = {
  /** A fraction between 0 and 1. Values outside that range are clamped. */
  progress: number;
  color?: string;
  accessibilityLabel?: string;
};

export function ProgressBar({
  progress,
  color = Colors.accentStrong,
  accessibilityLabel = 'Progress',
}: ProgressBarProps) {
  const value = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width: `${value * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.progressTrack,
    borderRadius: Radii.pill,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: Radii.pill,
    height: '100%',
  },
});
