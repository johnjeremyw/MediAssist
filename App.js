import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors, type, touch, space } from './theme';
import { AuthProvider, useAuth } from './AuthContext';

import HomeScreen from './screens/HomeScreen';
import ReminderScreen from './screens/ReminderScreen';
import AddMedicationScreen from './screens/AddMedicationScreen';
import ReportScreen from './screens/ReportScreen';
import CaregiverScreen from './screens/CaregiverScreen';
import ClinicianScreen from './screens/ClinicianScreen';
import ConsultationScreen from './screens/ConsultationScreen';
import ClinicianConsultationsScreen from './screens/ClinicianConsultationsScreen';
import LoginScreen from './screens/LoginScreen';

/**
 * MediAssist — root navigation
 *
 * A flat, always-visible bottom tab bar (no drawers, no nested stacks)
 * so that EVERY screen is exactly 1 tap away and every core action is
 * reachable in <= 2 taps (NF2), satisfying Norman's Visibility principle:
 * all navigation options are permanently on screen.
 *
 * Tab targets are 64px tall (> 48px minimum) with 18pt labels.
 *
 * Two distinct tab sets per the report's Reflections section ("design
 * tension between simplicity for the primary user and the feature
 * richness required by the caregiver persona... led us to separate the
 * two interfaces into distinct user modes"): a patient session never sees
 * the caregiver dashboard, and a caregiver session goes straight to it.
 */
const PATIENT_TABS = [
  { key: 'home', label: 'Home', icon: '🏠', screen: HomeScreen },
  { key: 'reminder', label: 'Remind', icon: '⏰', screen: ReminderScreen },
  { key: 'add', label: 'Add', icon: '➕', screen: AddMedicationScreen },
  { key: 'report', label: 'Report', icon: '📊', screen: ReportScreen },
];

const CAREGIVER_TABS = [
  { key: 'caregiver', label: 'Family', icon: '👤', screen: CaregiverScreen },
  { key: 'add', label: 'Add', icon: '➕', screen: AddMedicationScreen },
  { key: 'report', label: 'Report', icon: '📊', screen: ReportScreen },
  { key: 'consult', label: 'Consult', icon: '💬', screen: ConsultationScreen },
];

// A clinician has no medications/dose logs of their own — just the list of
// consenting patients (NF4) and the consultation requests those patients'
// caregivers have raised — so it gets a tab set of its own rather than
// reusing the patient/caregiver tab shapes.
const CLINICIAN_TABS = [
  { key: 'patients', label: 'Patients', icon: '🩺', screen: ClinicianScreen },
  { key: 'consults', label: 'Consults', icon: '💬', screen: ClinicianConsultationsScreen },
];

function tabsForRole(role) {
  if (role === 'CAREGIVER') return CAREGIVER_TABS;
  if (role === 'CLINICIAN') return CLINICIAN_TABS;
  return PATIENT_TABS;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const { session, loading, logout } = useAuth();
  const tabs = tabsForRole(session?.user.role);
  const [active, setActive] = useState(tabs[0].key);

  // Reset to that role's first tab whenever the signed-in role changes
  // (e.g. logging out of a patient session and into a caregiver one) —
  // otherwise a shared tab key (like 'report') stays selected across
  // sessions instead of landing on the new role's home tab.
  useEffect(() => {
    setActive(tabs[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.role]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.greenDot} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  const ActiveScreen = tabs.find((t) => t.key === active)?.screen ?? tabs[0].screen;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>MediAssist</Text>
        <Pressable
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <ActiveScreen onNavigate={setActive} />
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {tabs.map(tab => {
          const selected = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActive(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitle: { fontSize: type.bodyLarge, fontWeight: '800', color: colors.textPrimary },
  logoutButton: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: space.sm },
  logoutText: { fontSize: type.body, color: colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: 64,                     // comfortably above 48px
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xs,
  },
  tabSelected: {
    borderTopWidth: 3,
    borderTopColor: colors.greenDot,
  },
  tabIcon: { fontSize: 22 },
  tabLabel: {
    fontSize: type.body,               // 18 minimum even on tab labels
    color: colors.textSecondary,
  },
  tabLabelSelected: { color: colors.textPrimary, fontWeight: '700' },
});
