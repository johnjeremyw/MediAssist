import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, type, touch, space, radius } from '../theme';
import { Card, ScreenHeader } from '../components/ui';
import { useAuth } from '../AuthContext';
import { reports } from '../api';

/**
 * S4 — Weekly Adherence Report
 *  - Large overall percentage at the top (48pt)
 *  - Date range selector (48px+ targets)
 *  - Per-medication progress bars: green >= 90, amber 80-89, red < 80
 *    Each bar also shows the % as text, so colour is never the only cue.
 */
const RANGES = ['This week', 'Last week', 'This month', 'Last month', 'Last 3 months'];
const TREND_UNITS = [
  { key: 'week', label: 'Weekly', title: 'Last 6 weeks', periods: 6 },
  { key: 'month', label: 'Monthly', title: 'Last 6 months', periods: 6 },
];

function rangeToDates(range) {
  const to = new Date();
  const from = new Date();
  if (range === 'This week') from.setDate(from.getDate() - 7);
  else if (range === 'Last week') {
    from.setDate(from.getDate() - 14);
    to.setDate(to.getDate() - 7);
  } else if (range === 'This month') from.setDate(from.getDate() - 30);
  else if (range === 'Last month') {
    // Calendar previous month, not a rolling 30 days — so "Last month"
    // matches how a patient/caregiver actually thinks about history.
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: firstOfLastMonth.toISOString(), to: firstOfThisMonth.toISOString() };
  } else if (range === 'Last 3 months') from.setDate(from.getDate() - 90);
  return { from: from.toISOString(), to: to.toISOString() };
}

function barColor(pct) {
  if (pct >= 90) return colors.greenDot;
  if (pct >= 80) return colors.orangeDot;
  return colors.redDot;
}
function pctTextColor(pct) {
  if (pct >= 90) return colors.greenText;
  if (pct >= 80) return colors.orangeText;
  return colors.redText;
}

// `patientId`/`patientName` are optional overrides so a clinician can reuse
// this same screen to view a consented patient's report (read-only, adherence
// only per NF4) instead of the signed-in user's own schedule.
export default function ReportScreen({ patientId: patientIdProp, patientName } = {}) {
  const { session } = useAuth();
  const patientId = patientIdProp || session.patientId;
  const [range, setRange] = useState('This week');
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState(null);
  const [trendUnit, setTrendUnit] = useState('week'); // 'week' | 'month'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { from, to } = rangeToDates(range);
      const unitConfig = TREND_UNITS.find(u => u.key === trendUnit);
      const [{ report: r }, { trend: t }] = await Promise.all([
        reports.weekly(patientId, { from, to }),
        reports.trend(patientId, { periods: unitConfig.periods, unit: trendUnit }),
      ]);
      setReport(r);
      setTrend(t);
    } catch (err) {
      setError(err.message || 'Could not load the adherence report.');
    }
  }, [patientId, range, trendUnit]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const eyebrow = report
    ? `${new Date(report.range.from).toLocaleDateString()} – ${new Date(report.range.to).toLocaleDateString()}`
    : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md }}>
      <ScreenHeader eyebrow={eyebrow} title={patientName ? `${patientName}'s Report` : 'Weekly Report'} />

      {/* Date range selector */}
      <View style={styles.rangeRow} accessibilityRole="tablist">
        {RANGES.map(r => {
          const selected = r === range;
          return (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.rangeChip, selected && styles.rangeChipSelected]}
            >
              <Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={colors.greenDot} />
      ) : report ? (
        <>
          {/* Overall adherence */}
          <Card style={styles.overallCard}>
            <Text
              style={[styles.overallPct, { color: pctTextColor(report.overall) }]}
              accessibilityLabel={`Overall adherence ${report.overall} percent`}
            >
              {report.overall}%
            </Text>
            <Text style={styles.overallLabel}>Overall adherence</Text>
          </Card>

          {report.perMedication.length === 0 && (
            <Text style={styles.empty}>No completed or missed doses in this range yet.</Text>
          )}

          {/* Per-medication bars */}
          {report.perMedication.map(med => (
            <View key={med.name} style={styles.medBlock}>
              <View style={styles.medHeader}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={[styles.medPct, { color: pctTextColor(med.pct) }]}>
                  {med.pct}%
                </Text>
              </View>
              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: med.pct }}
                accessibilityLabel={`${med.name} adherence ${med.pct} percent`}
              >
                <View
                  style={[styles.fill, { width: `${med.pct}%`, backgroundColor: barColor(med.pct) }]}
                />
              </View>
            </View>
          ))}

          {/* Adherence trend — so a caregiver/clinician can see direction of
              travel rather than only one range's snapshot. Toggle between a
              week-by-week view and a month-by-month view of previous months. */}
          <View style={styles.trendBlock}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>
                {TREND_UNITS.find(u => u.key === trendUnit).title}
              </Text>
              <View style={styles.unitToggle} accessibilityRole="tablist">
                {TREND_UNITS.map(u => {
                  const selected = u.key === trendUnit;
                  return (
                    <Pressable
                      key={u.key}
                      onPress={() => setTrendUnit(u.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      style={[styles.unitChip, selected && styles.unitChipSelected]}
                    >
                      <Text style={[styles.unitText, selected && styles.unitTextSelected]}>
                        {u.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {trend && trend.some(p => p.pct !== null) ? (
              <View style={styles.trendRow} accessibilityRole="none">
                {trend.map((period) => (
                  <View key={period.periodStart} style={styles.trendCol}>
                    <Text style={styles.trendPct}>
                      {period.pct === null ? '—' : `${period.pct}%`}
                    </Text>
                    <View
                      style={styles.trendTrack}
                      accessibilityLabel={
                        period.pct === null
                          ? `${trendUnit === 'month' ? 'Month' : 'Week'} of ${new Date(period.periodStart).toLocaleDateString()}, no doses logged`
                          : `${trendUnit === 'month' ? 'Month' : 'Week'} of ${new Date(period.periodStart).toLocaleDateString()}, ${period.pct} percent adherence`
                      }
                    >
                      <View
                        style={[
                          styles.trendFill,
                          {
                            height: `${period.pct ?? 0}%`,
                            backgroundColor: period.pct === null ? colors.border : barColor(period.pct),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.trendLabel}>
                      {trendUnit === 'month'
                        ? new Date(period.periodStart).toLocaleDateString([], { month: 'short' })
                        : new Date(period.periodEnd).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>No completed or missed doses in this window yet.</Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.lg },
  rangeChip: {
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipSelected: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  rangeText: { fontSize: type.body, color: colors.textPrimary },
  rangeTextSelected: { color: colors.textOnBlue, fontWeight: '700' },
  overallCard: { alignItems: 'center', paddingVertical: space.lg, marginBottom: space.lg },
  overallPct: { fontSize: type.stat, fontWeight: '800' },
  overallLabel: { fontSize: type.body, color: colors.textSecondary, marginTop: 4 },
  medBlock: { marginBottom: space.lg },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  medName: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  medPct: { fontSize: type.bodyLarge, fontWeight: '800' },
  track: {
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 9 },
  error: { fontSize: type.body, color: colors.redText, marginBottom: space.md },
  empty: { fontSize: type.body, color: colors.textSecondary, marginBottom: space.md },
  trendBlock: { marginTop: space.sm, marginBottom: space.lg },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
    marginBottom: space.sm,
  },
  trendTitle: {
    fontSize: type.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unitToggle: { flexDirection: 'row', gap: space.xs },
  unitChip: {
    minHeight: touch.min,
    paddingHorizontal: space.sm,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipSelected: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  unitText: { fontSize: type.body, color: colors.textPrimary },
  unitTextSelected: { color: colors.textOnBlue, fontWeight: '700' },
  muted: { fontSize: type.body, color: colors.textSecondary },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  trendCol: { flex: 1, alignItems: 'center' },
  trendPct: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  trendTrack: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendFill: { width: '100%', borderRadius: 6 },
  trendLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
