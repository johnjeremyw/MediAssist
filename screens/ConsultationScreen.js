import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, type, touch, space, radius } from '../theme';
import { Card, ScreenHeader, BigButton } from '../components/ui';
import { useAuth } from '../AuthContext';
import { consents, consultations } from '../api';
import { formatTime } from '../formatters';

/**
 * Consultation: lets the caregiver ask a specific clinician to weigh in on
 * the patient — but only a clinician the patient has already granted
 * ADHERENCE_ONLY consent to (NF4). This is a request for attention, not a
 * new access grant, so the list of who can be consulted is exactly the
 * patient's own consent decisions, never an open directory of clinicians.
 */
export default function ConsultationScreen() {
  const { session } = useAuth();
  const [clinicians, setClinicians] = useState([]); // consented clinicians
  const [selectedClinicianId, setSelectedClinicianId] = useState(null);
  const [message, setMessage] = useState('');
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentNote, setSentNote] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ consents: grants }, { consultations: history }] = await Promise.all([
        consents.list(session.patientId),
        consultations.list(session.patientId),
      ]);
      const granted = grants
        .filter((g) => g.status === 'GRANTED')
        .map((g) => g.clinician);
      setClinicians(granted);
      setSelectedClinicianId((prev) => prev || granted[0]?.id || null);
      setThread(history);
    } catch (err) {
      setError(err.message || 'Could not load consultations.');
    }
  }, [session.patientId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const send = async () => {
    setError('');
    setSentNote(false);
    if (!selectedClinicianId) {
      setError('Choose which clinician to consult.');
      return;
    }
    if (!message.trim()) {
      setError('Write a short message for the clinician.');
      return;
    }
    setSending(true);
    try {
      await consultations.create(session.patientId, {
        clinicianId: selectedClinicianId,
        message: message.trim(),
      });
      setMessage('');
      setSentNote(true);
      await load();
    } catch (err) {
      setError(err.message || 'Could not send this consultation request.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.greenDot} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md }}>
      <ScreenHeader eyebrow={`For ${session.patientName}`} title="Consultation" />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {clinicians.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No clinician connected yet</Text>
          <Text style={styles.emptyBody}>
            {session.patientName} hasn’t granted a clinician access to their adherence report yet.
            Once they do, that clinician will appear here to consult.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={styles.label}>Clinician</Text>
          <View style={styles.chipRow}>
            {clinicians.map((c) => {
              const selected = c.id === selectedClinicianId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedClinicianId(c.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={c.name}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="e.g. Grace has missed two Amlodipine doses this week — can you advise?"
            placeholderTextColor={colors.textSecondary}
            multiline
            accessibilityLabel="Consultation message"
          />

          {sentNote && !error && (
            <Text style={styles.savedNote}>✓ Sent to the clinician.</Text>
          )}

          <View style={{ height: space.md }} />
          {sending ? (
            <ActivityIndicator size="large" color={colors.greenDot} />
          ) : (
            <BigButton
              label="Send request"
              onPress={send}
              height={56}
              accessibilityHint="Sends this consultation request to the selected clinician"
            />
          )}

          <Text style={styles.historyTitle}>History</Text>
          {thread.length === 0 ? (
            <Text style={styles.emptyBody}>No consultation requests yet.</Text>
          ) : (
            thread.map((c) => (
              <Card key={c.id} style={styles.threadCard}>
                <View style={styles.threadHeader}>
                  <Text style={styles.threadClinician}>{c.clinician.name}</Text>
                  <StatusBadge status={c.status} />
                </View>
                <Text style={styles.threadMessage}>{c.message}</Text>
                <Text style={styles.threadMeta}>
                  Sent {new Date(c.createdAt).toLocaleDateString()} · {formatTime(c.createdAt)}
                  {c.status === 'RESOLVED' && c.resolvedAt
                    ? ` · Resolved ${new Date(c.resolvedAt).toLocaleDateString()}`
                    : ''}
                </Text>
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatusBadge({ status }) {
  const resolved = status === 'RESOLVED';
  return (
    <View style={[styles.badge, { backgroundColor: resolved ? colors.surfaceRaised : colors.blue600 }]}>
      <Text style={[styles.badgeText, resolved && { color: colors.textSecondary }]}>
        {resolved ? 'Resolved' : 'Open'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: type.body, color: colors.redText, marginBottom: space.md },
  emptyTitle: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary, marginBottom: space.xs },
  emptyBody: { fontSize: type.body, color: colors.textSecondary },
  label: { fontSize: type.body, color: colors.textSecondary, marginBottom: space.xs, marginTop: space.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.sm },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  chipText: { fontSize: type.body, color: colors.textPrimary },
  chipTextSelected: { color: colors.textOnBlue, fontWeight: '700' },
  input: {
    minHeight: 96,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: type.bodyLarge,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    textAlignVertical: 'top',
  },
  savedNote: { fontSize: type.body, color: colors.greenText, fontWeight: '700', marginTop: space.sm },
  historyTitle: {
    fontSize: type.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  threadCard: { marginBottom: space.sm },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  threadClinician: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  threadMessage: { fontSize: type.body, color: colors.textPrimary, marginBottom: space.xs },
  threadMeta: { fontSize: 13, color: colors.textSecondary },
  badge: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.button },
  badgeText: { fontSize: 13, fontWeight: '700', color: colors.textOnBlue },
});
