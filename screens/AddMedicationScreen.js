import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, type, touch, space, radius } from '../theme';
import { BigButton, ScreenHeader } from '../components/ui';
import { useAuth } from '../AuthContext';
import { medications } from '../api';
import { to24Hour } from '../formatters';

/**
 * S3 — Add Medication Form
 *  - Exactly 4 required fields (report cap): name, dose, frequency, time
 *  - Large 56px inputs, 18pt+ labels and values
 *  - Inline time picker: big tappable chips, no modal, no tiny wheel
 *  - Single primary call-to-action: 'Save Medicine'
 *  - One optional, collapsed 5th field (pill count) — doesn't count against
 *    the 4-field cap since it's opt-in and hidden until asked for.
 */
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times'];
const TIME_PRESETS = ['8:00 AM', '12:00 PM', '2:00 PM', '6:00 PM', '9:00 PM'];

// A conflict is another active medicine reminding within this many minutes
// of the chosen time — worth flagging (easy to mix up two pills taken
// together) but never blocking, since same-time dosing is often intentional.
const CONFLICT_WINDOW_MINUTES = 30;

function timeOfDayToMinutes(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
}

export default function AddMedicationScreen() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [time, setTime] = useState('8:00 AM');
  const [trackStock, setTrackStock] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [existingMeds, setExistingMeds] = useState([]);

  useEffect(() => {
    medications.list(session.patientId)
      .then(({ medications: meds }) => setExistingMeds(meds))
      .catch(() => {}); // conflict check is a soft nicety — a failed fetch shouldn't block adding a medicine
  }, [session.patientId]);

  // F1 extension: warn (non-blocking) when the chosen time lands within
  // CONFLICT_WINDOW_MINUTES of another active medicine's reminder.
  const conflicts = useMemo(() => {
    const chosenMinutes = timeOfDayToMinutes(to24Hour(time));
    const hits = [];
    for (const med of existingMeds) {
      for (const rt of med.reminderTimes || []) {
        if (!rt.active) continue;
        const diff = Math.abs(timeOfDayToMinutes(rt.timeOfDay) - chosenMinutes);
        if (diff <= CONFLICT_WINDOW_MINUTES) {
          hits.push(med.name);
          break;
        }
      }
    }
    return hits;
  }, [time, existingMeds]);

  const save = async () => {
    setError('');
    if (!name.trim() || !dose.trim()) {
      setError('Please fill in the medicine name and dose.');
      return;
    }
    if (trackStock && quantity.trim() && !/^\d+$/.test(quantity.trim())) {
      setError('Pill count must be a whole number.');
      return;
    }
    setSaving(true);
    try {
      await medications.create(session.patientId, {
        name: name.trim(),
        dose: dose.trim(),
        frequency,
        reminderTimes: [{ timeOfDay: to24Hour(time), daysOfWeek: 'DAILY' }],
        ...(trackStock && quantity.trim() ? { quantityRemaining: parseInt(quantity.trim(), 10) } : {}),
      });
      setSaved(true);
      setName('');
      setDose('');
      setQuantity('');
      setTrackStock(false);
    } catch (err) {
      setError(err.message || 'Could not save this medicine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md }}>
      <ScreenHeader
        title="Add Medicine"
        eyebrow={session.user.role === 'CAREGIVER' ? `For ${session.patientName}` : undefined}
      />

      {/* Field 1: name */}
      <Field label="Medicine name">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Medicine name"
        />
      </Field>

      {/* Field 2: dose */}
      <Field label="Dose">
        <TextInput
          style={styles.input}
          value={dose}
          onChangeText={setDose}
          placeholder="e.g. 500mg"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Dose amount"
        />
      </Field>

      {/* Field 3: frequency — large segmented chips */}
      <Field label="How often">
        <ChipRow options={FREQUENCIES} value={frequency} onSelect={setFrequency} />
      </Field>

      {/* Field 4: inline time picker — no modal, no scroll wheel */}
      <Field label="Reminder time">
        <ChipRow options={TIME_PRESETS} value={time} onSelect={setTime} wrap />
      </Field>

      {conflicts.length > 0 && (
        <View style={styles.conflictNote} accessibilityRole="alert">
          <Text style={styles.conflictText}>
            ⚠ {conflicts.join(', ')} {conflicts.length > 1 ? 'are' : 'is'} already scheduled within
            {' '}{CONFLICT_WINDOW_MINUTES} minutes of {time}. Both reminders will fire close together.
          </Text>
        </View>
      )}

      {/* Optional 5th field, collapsed by default — doesn't count against
          the form's 4-field cap since most patients won't need it. */}
      {trackStock ? (
        <Field label="Pills in this bottle (optional)">
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 30"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            accessibilityLabel="Pills in this bottle"
          />
        </Field>
      ) : (
        <Pressable
          onPress={() => setTrackStock(true)}
          accessibilityRole="button"
          accessibilityLabel="Track pill count, optional"
          style={styles.trackStockLink}
        >
          <Text style={styles.trackStockText}>+ Track pill count for refill reminders (optional)</Text>
        </Pressable>
      )}

      {error ? <Text style={styles.errorNote}>{error}</Text> : null}
      {saved && !error && (
        <Text style={styles.savedNote}>✓ Saved. Reminder set for {time}.</Text>
      )}

      <View style={{ height: space.md }} />
      {saving ? (
        <ActivityIndicator size="large" color={colors.greenDot} />
      ) : (
        <BigButton
          label="Save Medicine"
          onPress={save}
          height={64}
          accessibilityHint="Saves this medicine and turns on its reminder"
        />
      )}
    </ScrollView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onSelect, wrap }) {
  return (
    <View style={[styles.chipRow, wrap && { flexWrap: 'wrap' }]}>
      {options.map(opt => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  label: {
    fontSize: type.body,
    color: colors.textSecondary,
    marginBottom: space.xs,
  },
  input: {
    minHeight: 56,                       // > 48px target
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: type.bodyLarge,
    paddingHorizontal: space.md,
  },
  chipRow: { flexDirection: 'row', gap: space.xs },
  chip: {
    minHeight: touch.min,                // 48px
    minWidth: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  chipSelected: {
    backgroundColor: colors.blue600,
    borderColor: colors.blue600,
  },
  chipText: { fontSize: type.body, color: colors.textPrimary },
  chipTextSelected: { color: colors.textOnBlue, fontWeight: '700' },
  savedNote: {
    fontSize: type.body,
    color: colors.greenText,
    fontWeight: '700',
  },
  errorNote: {
    fontSize: type.body,
    color: colors.redText,
    fontWeight: '700',
  },
  conflictNote: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.orangeDot,
    borderRadius: radius.button,
    padding: space.md,
    marginBottom: space.lg,
  },
  conflictText: { fontSize: type.body, color: colors.orangeText },
  trackStockLink: { minHeight: touch.min, justifyContent: 'center', marginBottom: space.lg },
  trackStockText: { fontSize: type.body, color: colors.textSecondary, textDecorationLine: 'underline' },
});
