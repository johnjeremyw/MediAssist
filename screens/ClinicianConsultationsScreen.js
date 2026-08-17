import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, type, space, radius } from '../theme';
import { Card, ScreenHeader } from '../components/ui';
import { clinician as clinicianApi, consultations as consultationsApi } from '../api';
import { formatTime } from '../formatters';

/**
 * The clinician's own inbox of consultation requests raised by caregivers,
 * across every patient who has granted them consent. Open requests first
 * (oldest first within that) so nothing sits unanswered at the bottom.
 */
export default function ClinicianConsultationsScreen() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { consultations: list } = await clinicianApi.inbox();
      setConsultations(list);
    } catch (err) {
      setError(err.message || 'Could not load consultation requests.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const resolve = async (patientId, id) => {
    setResolvingId(id);
    try {
      await consultationsApi.resolve(patientId, id);
      await load();
    } catch (err) {
      setError(err.message || 'Could not resolve this request.');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.greenDot} />
      </View>
    );
  }

  const open = consultations.filter((c) => c.status === 'OPEN');
  const resolved = consultations.filter((c) => c.status === 'RESOLVED');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md }}>
      <ScreenHeader eyebrow="From your patients' caregivers" title="Consultation Requests" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {consultations.length === 0 && !error && (
        <Text style={styles.empty}>No consultation requests yet.</Text>
      )}

      {open.map((c) => (
        <Card key={c.id} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.patientName}>{c.patient.name}</Text>
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>Open</Text>
            </View>
          </View>
          <Text style={styles.from}>from {c.caregiver.name}</Text>
          <Text style={styles.message}>{c.message}</Text>
          <Text style={styles.meta}>
            {new Date(c.createdAt).toLocaleDateString()} · {formatTime(c.createdAt)}
          </Text>
          <Pressable
            onPress={() => resolve(c.patient.id, c.id)}
            disabled={resolvingId === c.id}
            accessibilityRole="button"
            accessibilityLabel={`Mark consultation for ${c.patient.name} resolved`}
            style={({ pressed }) => [styles.resolveButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.resolveText}>
              {resolvingId === c.id ? 'Marking resolved…' : 'Mark resolved'}
            </Text>
          </Pressable>
        </Card>
      ))}

      {resolved.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Resolved</Text>
          {resolved.map((c) => (
            <Card key={c.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.patientName}>{c.patient.name}</Text>
                <View style={styles.resolvedBadge}>
                  <Text style={styles.resolvedBadgeText}>Resolved</Text>
                </View>
              </View>
              <Text style={styles.from}>from {c.caregiver.name}</Text>
              <Text style={styles.message}>{c.message}</Text>
              <Text style={styles.meta}>
                {new Date(c.createdAt).toLocaleDateString()} · {formatTime(c.createdAt)}
              </Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: type.body, color: colors.redText, marginBottom: space.md },
  empty: { fontSize: type.body, color: colors.textSecondary },
  card: { marginBottom: space.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  patientName: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  from: { fontSize: type.body, color: colors.textSecondary, marginBottom: space.xs },
  message: { fontSize: type.body, color: colors.textPrimary, marginBottom: space.xs },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: space.sm },
  openBadge: { backgroundColor: colors.blue600, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.button },
  openBadgeText: { fontSize: 13, fontWeight: '700', color: colors.textOnBlue },
  resolvedBadge: { backgroundColor: colors.surfaceRaised, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.button },
  resolvedBadgeText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  resolveButton: {
    minHeight: 44,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveText: { fontSize: type.body, color: colors.textPrimary, fontWeight: '700' },
  sectionTitle: {
    fontSize: type.body,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: space.md,
    marginBottom: space.sm,
  },
});
