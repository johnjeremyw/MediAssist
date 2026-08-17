import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, ActivityIndicator } from 'react-native';
import { colors, type, touch, space } from '../theme';
import { BigButton } from '../components/ui';
import { useAuth } from '../AuthContext';
import { doses as dosesApi } from '../api';
import { formatTime, startOfDay, endOfDay } from '../formatters';

/**
 * S2 — Reminder Alert
 *  - Medication name at 24pt bold (report spec)
 *  - Full-width green confirm button, exactly 72px tall
 *  - Snooze rendered as a clearly secondary (outline) action
 *  - Confirming a dose is 1 tap from this screen (NF2: <= 3 taps)
 *  - Immediate feedback on confirm (Norman: Feedback) + screen-reader
 *    announcement for TalkBack users
 *
 * Shows whichever dose is next due (or overdue) today — the backend's
 * reminder dispatcher is what actually fires the push notification that
 * would bring the user to this screen; here we just look up the same
 * pending occurrence so it can be confirmed/snoozed.
 */
export default function ReminderScreen() {
  const { session } = useAuth();
  const [dose, setDose] = useState(null); // { id, name, dose, time }
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState('pending'); // pending | confirmed | snoozed
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { doses } = await dosesApi.list(session.patientId, {
        from: startOfDay().toISOString(),
        to: endOfDay().toISOString(),
      });
      const next = doses
        .filter((d) => d.status === 'PENDING' || d.status === 'SNOOZED')
        .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];

      setDose(
        next
          ? {
              id: next.id,
              name: next.medication.name,
              instruction: next.medication.dose,
              time: formatTime(next.scheduledFor),
            }
          : null
      );
      setState('pending');
    } catch (err) {
      setError(err.message || 'Could not load your next reminder.');
    }
  }, [session.patientId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 20000); // pick up reminders the backend just fired
    return () => clearInterval(interval);
  }, [load]);

  const confirm = async () => {
    try {
      await dosesApi.confirm(session.patientId, dose.id);
      setState('confirmed');
      AccessibilityInfo.announceForAccessibility('Well done! Dose confirmed.');
    } catch (err) {
      setError(err.message || 'Could not confirm this dose.');
    }
  };

  const snooze = async () => {
    try {
      await dosesApi.snooze(session.patientId, dose.id);
      setState('snoozed');
      AccessibilityInfo.announceForAccessibility('Reminder snoozed for 10 minutes.');
    } catch (err) {
      setError(err.message || 'Could not snooze this reminder.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.greenDot} />
      </View>
    );
  }

  if (!dose || state === 'confirmed') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.pillIconStandalone}>💊</Text>
        <Text style={styles.feedbackGood}>
          {state === 'confirmed' ? '✓ Well done! Dose confirmed.' : 'All caught up — no reminders due right now.'}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.timeBadge}>⏰ {dose.time} Reminder</Text>

      <View style={styles.pillIcon}>
        <Text style={{ fontSize: 40 }}>💊</Text>
      </View>

      {/* 24pt bold medication name */}
      <Text style={styles.medName}>{dose.name}</Text>
      <Text style={styles.instruction}>{dose.instruction}</Text>

      {state === 'snoozed' && (
        <Text style={styles.feedbackSnooze}>Reminder will ring again in 10 minutes.</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ flex: 1 }} />

      {/* Primary: full-width green, 72px */}
      <BigButton
        label="✓ I took it"
        onPress={confirm}
        background={colors.green600}
        textColor={colors.textOnGreen}
        height={touch.confirm}
        accessibilityHint="Confirms you have taken this medicine"
      />
      <View style={{ height: space.sm }} />
      {/* Secondary: outline style, visually subordinate but still 48px+ */}
      <BigButton
        label="Snooze 10 min"
        onPress={snooze}
        secondary
        accessibilityHint="Reminds you again in ten minutes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: space.lg,
    alignItems: 'center',
  },
  centered: { justifyContent: 'center' },
  timeBadge: {
    fontSize: type.body,
    color: colors.textSecondary,
    marginBottom: space.xl,
  },
  pillIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  pillIconStandalone: { fontSize: 56, marginBottom: space.lg },
  medName: {
    fontSize: type.heading,       // 24pt
    fontWeight: '700',            // bold
    color: colors.textPrimary,
    textAlign: 'center',
  },
  instruction: {
    fontSize: type.body,
    color: colors.textSecondary,
    marginTop: space.xs,
    textAlign: 'center',
  },
  feedbackGood: {
    fontSize: type.bodyLarge,
    fontWeight: '700',
    color: colors.greenText,
    marginTop: space.lg,
    textAlign: 'center',
  },
  feedbackSnooze: {
    fontSize: type.body,
    color: colors.orangeText,
    marginTop: space.lg,
    textAlign: 'center',
  },
  error: {
    fontSize: type.body,
    color: colors.redText,
    marginTop: space.md,
    textAlign: 'center',
  },
});
