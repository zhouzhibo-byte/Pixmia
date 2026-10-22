import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateScreen from '../screens/CreateScreen';
import GalleryScreen from '../screens/GalleryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../constants/theme';

export type RootTabParamList = {
  Create: undefined;
  Gallery: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Create: { active: 'sparkles', inactive: 'sparkles-outline' },
  Gallery: { active: 'images', inactive: 'images-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: COLORS.faint,
        tabBarStyle: [
          styles.tabBar,
          { height: 62 + insets.bottom, paddingBottom: Math.max(insets.bottom, 10) },
        ],
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ focused, color }) => (
          <Ionicons
            name={focused ? ICONS[route.name].active : ICONS[route.name].inactive}
            size={22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Create" component={CreateScreen} options={{ tabBarLabel: '创作' }} />
      <Tab.Screen name="Gallery" component={GalleryScreen} options={{ tabBarLabel: '作品' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: '设置' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line,
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
});
