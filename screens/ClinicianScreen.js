import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, type, touch, space, radius } from '../theme';
import { Card, ScreenHeader } from '../components/ui';
import { useAuth } from '../AuthContext';
import { clinician as clinicianApi } from '../api';
import ReportScreen from './ReportScreen';

/**
 * Clinician portal (UC5/UC6, NF4): a clinician sees only the patients who
 * have explicitly granted consent, and only their adherence report — never
 * medication names, dose logs, or account details. Selecting a patient
 * reuses ReportScreen (the same view a patient/caregiver sees) rather than
 * a separate clinician-only report, so there is exactly one adherence UI
 * to keep consistent and test.
 */
export default function ClinicianScreen() {
  const { session } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // { id, name } | null

  const load = useCallback(async () => {
    setError('');
    try {
      const { patients: p } = await clinicianApi.myPatients();
      setPatients(p);
    } catch (err) {
      setError(err.message || 'Could not load your patients.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (selected) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.backBar}>
          <Pressable
            onPress={() => setSelected(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to patient list"
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹ All patients</Text>
          </Pressable>
        </View>
        <ReportScreen patientId={selected.id} patientName={selected.name} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.greenDot} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md }}>
      <ScreenHeader eyebrow={session.user.name} title="Your Patients" />

      <Text style={styles.privacyNote}>
        You see adherence status only — never medication names or dose detail.
        Patients choose what to share and can revoke access at any time.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!error && patients.length === 0 && (
        <Text style={styles.empty}>No patients have shared their adherence report with you yet.</Text>
      )}

      {patients.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => setSelected(p)}
          accessibilityRole="button"
          accessibilityLabel={`View ${p.name}'s adherence report`}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <Card style={styles.patientRow}>
            <Text style={styles.patientName}>{p.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  privacyNote: {
    fontSize: type.body,
    color: colors.textSecondary,
    marginBottom: space.lg,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
    marginBottom: space.sm,
  },
  patientName: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  chevron: { fontSize: type.display, color: colors.textSecondary },
  error: { fontSize: type.body, color: colors.redText, marginBottom: space.md },
  empty: { fontSize: type.body, color: colors.textSecondary, marginBottom: space.md },
  backBar: {
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: { minHeight: touch.min, justifyContent: 'center' },
  backText: { fontSize: type.bodyLarge, color: colors.textPrimary, fontWeight: '700' },
});
