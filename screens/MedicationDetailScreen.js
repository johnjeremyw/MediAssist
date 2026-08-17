import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, type, touch, space, radius } from '../theme';
import { Card } from '../components/ui';
import { useAuth } from '../AuthContext';
import { medications as medicationsApi } from '../api';
import { formatTime, formatTimeOfDay, formatDaysOfWeek, isLowStock } from '../formatters';

/**
 * Medication detail: everything about one medicine in one place — full
 * schedule (not just today's next dose), refill status, who added it, and
 * a short adherence history — reached by tapping any medication row on the
 * Home or Family screens.
 */
export default function MedicationDetailScreen({ medicationId, onBack }) {
  const { session } = useAuth();
  const [data, setData] = useState(null); // { medication, recentDoses, adherence }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await medicationsApi.get(session.patientId, medicationId);
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not load this medicine.');
    }
  }, [session.patientId, medicationId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.backBar}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={[styles.screen, styles.centered]}>
          <ActivityIndicator size="large" color={colors.greenDot} />
        </View>
      ) : error ? (
        <View style={styles.screen}>
          <Text style={[styles.error, { padding: space.md }]}>{error}</Text>
        </View>
      ) : (
        <DetailBody data={data} />
      )}
    </View>
  );
}

function DetailBody({ data }) {
  const { medication: med, recentDoses, adherence } = data;
  const lowStock = isLowStock(med);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md }}>
      <Text style={styles.name}>{med.name}</Text>
      <Text style={styles.dose}>{med.dose} · {med.frequency}</Text>

      {med.instructions ? (
        <Text style={styles.instructions}>{med.instructions}</Text>
      ) : null}

      {!med.active && (
        <View style={styles.inactiveBadge}>
          <Text style={styles.inactiveText}>Inactive — no longer reminding</Text>
        </View>
      )}

      {/* Reminder schedule */}
      <SectionTitle>Reminder schedule</SectionTitle>
      <Card style={{ marginBottom: space.lg }}>
        {med.reminderTimes.length === 0 ? (
          <Text style={styles.muted}>No reminder times set.</Text>
        ) : (
          med.reminderTimes.map((rt, i) => (
            <View
              key={rt.id}
              style={[styles.reminderRow, i > 0 && styles.reminderRowDivider]}
            >
              <Text style={styles.reminderTime}>{formatTimeOfDay(rt.timeOfDay)}</Text>
              <Text style={styles.reminderDays}>
                {formatDaysOfWeek(rt.daysOfWeek)}{rt.active ? '' : ' (paused)'}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* Refill / stock */}
      <SectionTitle>Refill status</SectionTitle>
      <Card style={{ marginBottom: space.lg }}>
        {med.quantityRemaining === null || med.quantityRemaining === undefined ? (
          <Text style={styles.muted}>Pill count isn’t being tracked for this medicine.</Text>
        ) : (
          <>
            <Text style={[styles.stockCount, lowStock && { color: colors.redText }]}>
              {med.quantityRemaining} pill{med.quantityRemaining === 1 ? '' : 's'} left
            </Text>
            {lowStock && (
              <Text style={styles.stockWarning}>
                ⚠ Below the refill threshold ({med.refillThreshold}) — time to reorder.
              </Text>
            )}
          </>
        )}
      </Card>

      {/* 30-day adherence for this medicine */}
      <SectionTitle>Last 30 days</SectionTitle>
      <Card style={{ marginBottom: space.lg }}>
        {adherence.pct === null ? (
          <Text style={styles.muted}>No completed or missed doses yet in this window.</Text>
        ) : (
          <Text style={styles.adherencePct}>
            {adherence.pct}% adherence
            <Text style={styles.muted}> ({adherence.sampleSize} scheduled dose{adherence.sampleSize === 1 ? '' : 's'})</Text>
          </Text>
        )}
      </Card>

      {/* Recent dose history */}
      <SectionTitle>Recent doses</SectionTitle>
      {recentDoses.length === 0 ? (
        <Text style={styles.muted}>No dose history yet.</Text>
      ) : (
        recentDoses.map((d) => (
          <Card key={d.id} style={styles.historyRow}>
            <Text style={styles.historyDate}>
              {new Date(d.scheduledFor).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              {'  '}{formatTime(d.scheduledFor)}
            </Text>
            <Text style={[styles.historyStatus, historyStatusColor(d.status)]}>
              {historyStatusLabel(d, d.status)}
            </Text>
          </Card>
        ))
      )}

      {/* Provenance */}
      <SectionTitle>Details</SectionTitle>
      <Card>
        <DetailLine label="Added by" value={med.addedBy?.name || '—'} />
        <DetailLine label="Added on" value={new Date(med.createdAt).toLocaleDateString()} />
      </Card>
    </ScrollView>
  );
}

function historyStatusLabel(d, status) {
  if (status === 'TAKEN') return `✓ Taken${d.confirmedAt ? ` at ${formatTime(d.confirmedAt)}` : ''}`;
  if (status === 'MISSED') return 'Missed';
  if (status === 'SNOOZED') return 'Snoozed';
  return 'Upcoming';
}

function historyStatusColor(status) {
  if (status === 'TAKEN') return { color: colors.greenText };
  if (status === 'MISSED') return { color: colors.redText };
  return { color: colors.orangeText };
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function DetailLine({ label, value }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  backBar: {
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: { minHeight: touch.min, justifyContent: 'center' },
  backText: { fontSize: type.bodyLarge, color: colors.textPrimary, fontWeight: '700' },
  name: { fontSize: type.display, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  dose: { fontSize: type.bodyLarge, color: colors.textSecondary, marginBottom: space.sm },
  instructions: { fontSize: type.body, color: colors.textPrimary, marginBottom: space.md },
  inactiveBadge: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.button,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.md,
    alignSelf: 'flex-start',
  },
  inactiveText: { fontSize: type.body, color: colors.textSecondary, fontWeight: '700' },
  sectionTitle: {
    fontSize: type.body,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: space.sm,
    marginTop: space.xs,
  },
  reminderRow: { paddingVertical: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  reminderTime: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  reminderDays: { fontSize: type.body, color: colors.textSecondary },
  muted: { fontSize: type.body, color: colors.textSecondary },
  stockCount: { fontSize: type.bodyLarge, fontWeight: '800', color: colors.textPrimary },
  stockWarning: { fontSize: type.body, color: colors.redText, marginTop: 4, fontWeight: '700' },
  adherencePct: { fontSize: type.bodyLarge, fontWeight: '800', color: colors.textPrimary },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
    minHeight: 56,
  },
  historyDate: { fontSize: type.body, color: colors.textPrimary },
  historyStatus: { fontSize: type.body, fontWeight: '700' },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { fontSize: type.body, color: colors.textSecondary },
  detailValue: { fontSize: type.body, color: colors.textPrimary, fontWeight: '600' },
  error: { fontSize: type.body, color: colors.redText },
});
