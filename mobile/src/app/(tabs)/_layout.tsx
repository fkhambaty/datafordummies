import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors, fonts } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focusedName: IconName) {
  return function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? focusedName : name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.wash },
        sceneStyle: { backgroundColor: colors.wash },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: icon('library-outline', 'library') }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools', tabBarIcon: icon('construct-outline', 'construct') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
