import { StyleSheet, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

type BrandMarkProps = {
  size?: number;
};

/** A small leaf mark made from native views so it stays crisp on Android and web. */
export function BrandMark({ size = 88 }: BrandMarkProps) {
  const unit = size / 100;
  const scaled = (value: number) => value * unit;

  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <View
        style={[
          styles.leaf,
          {
            left: scaled(8),
            top: scaled(43),
            width: scaled(43),
            height: scaled(41),
            backgroundColor: Colors.accentStrong,
            borderTopLeftRadius: scaled(44),
            borderBottomRightRadius: scaled(44),
            transform: [{ rotate: '-18deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.leaf,
          {
            left: scaled(29),
            top: scaled(10),
            width: scaled(59),
            height: scaled(74),
            backgroundColor: Colors.primary,
            borderTopLeftRadius: scaled(62),
            borderBottomRightRadius: scaled(62),
          },
        ]}
      />
      <View
        style={[
          styles.vein,
          {
            left: scaled(53),
            top: scaled(30),
            width: scaled(4),
            height: scaled(56),
            transform: [{ rotate: '37deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.vein,
          {
            left: scaled(59),
            top: scaled(48),
            width: scaled(3),
            height: scaled(22),
            transform: [{ rotate: '-38deg' }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
  },
  vein: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
  },
});
