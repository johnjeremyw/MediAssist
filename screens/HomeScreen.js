import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { colors, type, space, radius, touch } from '../theme';
import { Card, ScreenHeader, StatusDot, statusTextColor } from '../components/ui';
import { useAuth } from '../AuthContext';
import { doses as dosesApi } from '../api';
import { doseUiStatus, formatTime, formatDayHeading, startOfDay, endOfDay, isLowStock } from '../formatters';
import MedicationDetailScreen from './MedicationDetailScreen';

/**
 * S1 — Home / Today's Schedule
 *  - Summary cards: taken / missed / upcoming counts
 *  - Medication list with colour-coded status dots + text labels
 *  - Zero taps needed to see today's status (visibility principle)
 */
export default function HomeScreen() {
  const { session } = useAuth();
  const [todaysMeds, setTodaysMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'taken' | 'missed' | 'upcoming'
  const [selectedMedId, setSelectedMedId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { doses } = await dosesApi.list(session.patientId, {
        from: startOfDay().toISOString(),
        to: endOfDay().toISOString(),
      });
      setTodaysMeds(
        doses.map((d) => ({
          id: d.id,
          medicationId: d.medication.id,
          name: d.medication.name,
          time: formatTime(d.scheduledFor),
          status: doseUiStatus(d.status),
          takenAt: d.confirmedAt ? formatTime(d.confirmedAt) : null,
          lowStock: isLowStock(d.medication),
          quantityRemaining: d.medication.quantityRemaining,
        }))
      );
    } catch (err) {
      setError(err.message || 'Could not load today’s schedule.');
    }
  }, [session.patientId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const counts = {
    taken: todaysMeds.filter(m => m.status === 'taken').length,
    missed: todaysMeds.filter(m => m.status === 'missed').length,
    upcoming: todaysMeds.filter(m => m.status === 'upcoming').length,
  };

  // Tapping a summary card filters the list to that status; tapping it
  // again (or "Show all") clears the filter — one tap either way, no
  // separate filter control competing for space on an already-dense screen.
  const toggleFilter = (status) => setFilter(prev => (prev === status ? 'all' : status));
  const visibleMeds = filter === 'all' ? todaysMeds : todaysMeds.filter(m => m.status === filter);

  if (selectedMedId) {
    return (
      <MedicationDetailScreen
        medicationId={selectedMedId}
        onBack={() => setSelectedMedId(null)}
      />
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader eyebrow={formatDayHeading()} title="Today's Medicines" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Summary cards — double as filter toggles */}
      <View style={styles.summaryRow} accessibilityRole="radiogroup">
        <SummaryCard
          label="Taken"
          count={counts.taken}
          color={colors.greenText}
          selected={filter === 'taken'}
          onPress={() => toggleFilter('taken')}
        />
        <SummaryCard
          label="Missed"
          count={counts.missed}
          color={colors.redText}
          selected={filter === 'missed'}
          onPress={() => toggleFilter('missed')}
        />
        <SummaryCard
          label="Upcoming"
          count={counts.upcoming}
          color={colors.textPrimary}
          selected={filter === 'upcoming'}
          onPress={() => toggleFilter('upcoming')}
        />
      </View>

      {filter !== 'all' && (
        <Pressable
          onPress={() => setFilter('all')}
          accessibilityRole="button"
          accessibilityLabel="Show all medicines"
          style={styles.clearFilter}
        >
          <Text style={styles.clearFilterText}>Showing {filter} only — tap to show all</Text>
        </Pressable>
      )}

      {todaysMeds.length === 0 && !error && (
        <Text style={styles.empty}>No medicines scheduled for today yet.</Text>
      )}

      {todaysMeds.length > 0 && visibleMeds.length === 0 && (
        <Text style={styles.empty}>No {filter} medicines today.</Text>
      )}

      {/* Medication list — tap any row for full detail */}
      {visibleMeds.map(med => (
        <Pressable
          key={med.id}
          onPress={() => setSelectedMedId(med.medicationId)}
          accessibilityRole="button"
          accessibilityLabel={`${med.name}, view details`}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <Card style={styles.medRow}>
            <StatusDot status={med.status} />
            <View style={{ flex: 1 }}>
              <View style={styles.medNameRow}>
                <Text style={styles.medName}>{med.name}</Text>
                {med.lowStock && (
                  <View
                    style={styles.lowStockBadge}
                    accessibilityLabel={`Low stock, ${med.quantityRemaining} left`}
                  >
                    <Text style={styles.lowStockText}>⚠ {med.quantityRemaining} left</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.medDetail, { color: statusTextColor(med.status) }]}>
                {med.status === 'taken' && `${med.time}  ✓ Taken${med.takenAt ? ` at ${med.takenAt}` : ''}`}
                {med.status === 'missed' && `${med.time} — MISSED`}
                {med.status === 'upcoming' && `${med.time}  Due later`}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SummaryCard({ label, count, color, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${count} ${label} doses`}
      accessibilityHint={selected ? 'Double tap to show all medicines' : `Double tap to show only ${label.toLowerCase()} medicines`}
      style={({ pressed }) => [
        styles.summaryCard,
        selected && { borderWidth: 2, borderColor: color },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  summaryRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    minHeight: touch.min,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'transparent', // reserves space so selecting a card doesn't shift layout
  },
  summaryCount: { fontSize: type.display, fontWeight: '800' },
  summaryLabel: { fontSize: type.body, color: colors.textSecondary, marginTop: 4 },
  clearFilter: { marginBottom: space.md, minHeight: touch.min, justifyContent: 'center' },
  clearFilterText: { fontSize: type.body, color: colors.textSecondary, textDecorationLine: 'underline' },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
    minHeight: 72,
  },
  medNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  medName: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  medDetail: { fontSize: type.body, marginTop: 2 },
  lowStockBadge: {
    backgroundColor: colors.red700,
    borderRadius: radius.button,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  lowStockText: { fontSize: 14, fontWeight: '700', color: colors.textOnRed },
  chevron: { fontSize: type.display, color: colors.textSecondary, marginLeft: space.xs },
  error: { fontSize: type.body, color: colors.redText, marginBottom: space.md },
  empty: { fontSize: type.body, color: colors.textSecondary, marginBottom: space.md },
});
