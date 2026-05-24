// ============================================================
// HAYAT Mobile — Navigation
// Bottom Tabs + Stack Navigator
// ============================================================
import React from 'react';
import { Text, View, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, fontSize } from '../theme';

// Screens
import AuthScreen from '../screens/AuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TasksScreen from '../screens/TasksScreen';
import FinanceScreen from '../screens/FinanceScreen';
import HabitsScreen from '../screens/HabitsScreen';
import AIChatScreen from '../screens/AIChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { LoadingScreen } from '../components/UI';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Theme ──────────────────────────────────────────────────
const NavigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.amber,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

// ─── Tab Icon ───────────────────────────────────────────────
function TabIcon({ icon, label, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, paddingTop: 6 }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
      <Text style={{
        fontSize: 10,
        color: focused ? colors.amber : colors.textMuted,
        fontFamily: focused ? fonts.semibold : fonts.regular,
      }}>{label}</Text>
    </View>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface, shadowColor: 'transparent', elevation: 0 },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: fontSize.lg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 4,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textMuted,
      }}>

      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Ana Sayfa" focused={focused} />,
        }} />

      <Tab.Screen name="Tasks" component={TasksScreen}
        options={{
          headerTitle: 'Görevler',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Görevler" focused={focused} />,
        }} />

      <Tab.Screen name="Finance" component={FinanceScreen}
        options={{
          headerTitle: 'Finans',
          tabBarIcon: ({ focused }) => <TabIcon icon="💰" label="Finans" focused={focused} />,
        }} />

      <Tab.Screen name="Habits" component={HabitsScreen}
        options={{
          headerTitle: 'Alışkanlıklar',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔥" label="Alışkanlıklar" focused={focused} />,
        }} />

      <Tab.Screen name="AI" component={AIChatScreen}
        options={{
          headerTitle: '🧠 AI Asistan',
          tabBarIcon: ({ focused }) => <TabIcon icon="🧠" label="AI" focused={focused} />,
        }} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ─────────────────────────────────────────
export default function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer theme={NavigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Settings" component={SettingsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Ayarlar',
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: { fontFamily: fonts.semibold },
                animation: 'slide_from_right',
              }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
