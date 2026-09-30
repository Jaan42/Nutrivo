import { StyleSheet, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

type OnboardingIllustrationProps = {
  size?: number;
};

const produceColors = {
  tomato: '#E97450',
  carrot: '#F1AE61',
} as const;

/** Decorative salad bowl built with views; it does not require an image download. */
export function OnboardingIllustration({ size = 240 }: OnboardingIllustrationProps) {
  const unit = size / 240;
  const scaled = (value: number) => value * unit;

  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <View
        style={[
          styles.orb,
          {
            left: scaled(23),
            top: scaled(14),
            width: scaled(194),
            height: scaled(194),
          },
        ]}
      />
      <View
        style={[
          styles.softCircle,
          {
            left: scaled(6),
            top: scaled(89),
            width: scaled(77),
            height: scaled(77),
          },
        ]}
      />
      <View
        style={[
          styles.ground,
          {
            left: scaled(11),
            top: scaled(216),
            width: scaled(218),
            height: scaled(12),
          },
        ]}
      />

      <View
        style={[
          styles.leaf,
          {
            left: scaled(40),
            top: scaled(77),
            width: scaled(61),
            height: scaled(92),
            borderTopLeftRadius: scaled(65),
            borderBottomRightRadius: scaled(65),
            backgroundColor: Colors.primary,
            transform: [{ rotate: '-20deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.leaf,
          {
            left: scaled(84),
            top: scaled(39),
            width: scaled(66),
            height: scaled(112),
            borderTopLeftRadius: scaled(70),
            borderBottomRightRadius: scaled(70),
            backgroundColor: Colors.accentStrong,
            transform: [{ rotate: '12deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.leaf,
          {
            left: scaled(146),
            top: scaled(73),
            width: scaled(57),
            height: scaled(91),
            borderTopLeftRadius: scaled(60),
            borderBottomRightRadius: scaled(60),
            backgroundColor: Colors.primary,
            transform: [{ rotate: '24deg' }],
          },
        ]}
      />

      <View
        style={[
          styles.produce,
          {
            left: scaled(67),
            top: scaled(123),
            width: scaled(42),
            height: scaled(42),
            backgroundColor: produceColors.carrot,
          },
        ]}
      />
      <View
        style={[
          styles.produce,
          {
            left: scaled(101),
            top: scaled(111),
            width: scaled(49),
            height: scaled(49),
            backgroundColor: produceColors.tomato,
          },
        ]}
      />
      <View
        style={[
          styles.produce,
          {
            left: scaled(143),
            top: scaled(124),
            width: scaled(39),
            height: scaled(39),
            backgroundColor: Colors.accentStrong,
          },
        ]}
      />

      <View
        style={[
          styles.bowlBody,
          {
            left: scaled(38),
            top: scaled(153),
            width: scaled(164),
            height: scaled(64),
            borderBottomLeftRadius: scaled(82),
            borderBottomRightRadius: scaled(82),
          },
        ]}
      />
      <View
        style={[
          styles.bowlRim,
          {
            left: scaled(31),
            top: scaled(143),
            width: scaled(178),
            height: scaled(24),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    backgroundColor: Colors.accent,
    borderRadius: Radii.pill,
  },
  softCircle: {
    position: 'absolute',
    backgroundColor: Colors.background,
    borderRadius: Radii.pill,
  },
  ground: {
    position: 'absolute',
    backgroundColor: Colors.accentStrong,
    borderRadius: Radii.pill,
  },
  leaf: {
    position: 'absolute',
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
  },
  produce: {
    position: 'absolute',
    borderRadius: Radii.pill,
  },
  bowlBody: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bowlRim: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});
