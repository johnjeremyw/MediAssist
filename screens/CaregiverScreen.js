import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { colors, type, space } from '../theme';
import { Card, ScreenHeader, StatusDot, statusTextColor, BigButton } from '../components/ui';
import { useAuth } from '../AuthContext';
import { caregiver } from '../api';
import { doseUiStatus, formatTime, isLowStock } from '../formatters';
import MedicationDetailScreen from './MedicationDetailScreen';

/**
 * S5 — Caregiver Dashboard (Peter's view)
 *  - Red missed-dose alert card pinned at the very top
 *  - Real-time medication status list
 *  - 'Add medicine for Grace' remote-add button at the bottom
 *  - Privacy note per NF4: caregiver sees adherence status only
 */
export default function CaregiverScreen({ onNavigate }) {
  const { session } = useAuth();
  const [statusList, setStatusList] = useState([]);
  const [missedAlert, setMissedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedMedId, setSelectedMedId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const { doses, missedAlerts } = await caregiver.patientDashboard(session.patientId);
      setStatusList(
        doses.map((d) => ({
          id: d.id,
          medicationId: d.medication.id,
          name: d.medication.name,
          status: doseUiStatus(d.status),
          detail:
            d.status === 'TAKEN'
              ? `Taken ${formatTime(d.confirmedAt)}`
              : d.status === 'MISSED'
              ? `Missed ${formatTime(d.scheduledFor)}`
              : `Due ${formatTime(d.scheduledFor)}`,
          lowStock: isLowStock(d.medication),
          quantityRemaining: d.medication.quantityRemaining,
        }))
      );
      const latest = missedAlerts[0];
      setMissedAlert(
        latest ? { name: latest.medication.name, time: formatTime(latest.scheduledFor), when: 'today' } : null
      );
    } catch (err) {
      setError(err.message || 'Could not load the dashboard.');
    }
  }, [session.patientId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: space.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader
          eyebrow={`${session.user.name}'s caregiver view`}
          title={`${session.patientName}'s Status`}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Missed dose alert — always first */}
        {missedAlert && (
          <Card
            style={styles.alertCard}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`Alert. Missed dose. ${missedAlert.name} at ${missedAlert.time} ${missedAlert.when}.`}
          >
            <Text style={styles.alertTitle}>⚠ Missed dose</Text>
            <Text style={styles.alertBody}>
              {missedAlert.name} — {missedAlert.time} {missedAlert.when}
            </Text>
          </Card>
        )}

        {/* Real-time status list — tap any row for full detail */}
        {statusList.map(item => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedMedId(item.medicationId)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, view details`}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <Card style={styles.statusRow}>
              <StatusDot status={item.status} />
              <View style={{ flex: 1 }}>
                <View style={styles.statusNameRow}>
                  <Text style={styles.statusName}>{item.name}</Text>
                  {item.lowStock && (
                    <View
                      style={styles.lowStockBadge}
                      accessibilityLabel={`Low stock, ${item.quantityRemaining} left`}
                    >
                      <Text style={styles.lowStockText}>⚠ {item.quantityRemaining} left</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.statusDetail, { color: statusTextColor(item.status) }]}>
                  {item.detail}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      {/* Remote add — pinned at bottom */}
      <View style={styles.footer}>
        <BigButton
          label={`+ Add medicine for ${session.patientName}`}
          onPress={() => onNavigate && onNavigate('add')}
          height={56}
          accessibilityHint="Opens the add medicine form for the patient's schedule"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  alertCard: {
    backgroundColor: colors.red700,   // white text on this = 8.6:1
    marginBottom: space.lg,
  },
  alertTitle: {
    fontSize: type.bodyLarge,
    fontWeight: '800',
    color: colors.textOnRed,
  },
  alertBody: {
    fontSize: type.body,
    color: colors.textOnRed,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
    minHeight: 72,
  },
  statusNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  statusName: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  statusDetail: { fontSize: type.body, marginTop: 2 },
  lowStockBadge: {
    backgroundColor: colors.red700,
    borderRadius: 14,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  lowStockText: { fontSize: 14, fontWeight: '700', color: colors.textOnRed },
  chevron: { fontSize: type.display, color: colors.textSecondary, marginLeft: space.xs },
  footer: {
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  error: { fontSize: type.body, color: colors.redText, marginBottom: space.md },
});
