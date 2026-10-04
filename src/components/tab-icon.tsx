import { StyleSheet, View, type ColorValue } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Colors, Radii } from '@/constants/theme';

export type TabIconName = 'home' | 'history' | 'add' | 'insights' | 'profile';

type TabIconProps = {
  name: TabIconName;
  color: ColorValue;
  size?: number;
  emphasized?: boolean;
};

function IconDrawing({ name, color, size }: Omit<TabIconProps, 'emphasized'>) {
  const shared = {
    fill: 'none',
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === 'home' ? (
        <>
          <Path d="M3 11.5 12 4l9 7.5" {...shared} />
          <Path d="M5.5 10.5V20h13v-9.5M9.5 20v-5.5h5V20" {...shared} />
        </>
      ) : null}
      {name === 'history' ? (
        <>
          <Circle cx="12" cy="12" r="8" {...shared} />
          <Path d="M12 7.5V12l3 2" {...shared} />
        </>
      ) : null}
      {name === 'insights' ? (
        <>
          <Line x1="5" x2="5" y1="19" y2="13" {...shared} />
          <Line x1="12" x2="12" y1="19" y2="8" {...shared} />
          <Line x1="19" x2="19" y1="19" y2="5" {...shared} />
        </>
      ) : null}
      {name === 'profile' ? (
        <>
          <Circle cx="12" cy="8" r="3.5" {...shared} />
          <Path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" {...shared} />
        </>
      ) : null}
      {name === 'add' ? (
        <>
          <Line x1="12" x2="12" y1="6" y2="18" {...shared} />
          <Line x1="6" x2="18" y1="12" y2="12" {...shared} />
        </>
      ) : null}
    </Svg>
  );
}

export function TabIcon({ name, color, size = 24, emphasized = false }: TabIconProps) {
  if (emphasized) {
    return (
      <View style={styles.emphasized}>
        <IconDrawing color={Colors.onPrimary} name={name} size={size} />
      </View>
    );
  }

  return <IconDrawing color={color} name={name} size={size} />;
}

const styles = StyleSheet.create({
  emphasized: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
});
