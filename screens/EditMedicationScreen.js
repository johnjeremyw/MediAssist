import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { colors, type, touch, space, radius } from '../theme';
import { BigButton, ScreenHeader } from '../components/ui';
import { useAuth } from '../AuthContext';
import { medications } from '../api';
import { formatTimeOfDay, to24Hour } from '../formatters';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times'];
const TIME_PRESETS = ['8:00 AM', '12:00 PM', '2:00 PM', '6:00 PM', '9:00 PM'];

export default function EditMedicationScreen({
  medicationId,
  onBack,
  onSaved,
}) {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [time, setTime] = useState('8:00 AM');
  const [quantity, setQuantity] = useState('');

  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadMedication = async () => {
      try {
        const { medication } = await medications.get(
          session.patientId,
          medicationId
        );

        setName(medication.name || '');
        setDose(medication.dose || '');
        setFrequency(medication.frequency || 'Once daily');

        if (medication.reminderTimes?.length > 0) {
          setTime(
            formatTimeOfDay(
              medication.reminderTimes[0].timeOfDay
            )
          );
        }

        if (
          medication.quantityRemaining !== null &&
          medication.quantityRemaining !== undefined
        ) {
          setQuantity(
            String(medication.quantityRemaining)
          );
        }
      } catch (err) {
        setError(
          err.message || 'Could not load this medicine.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadMedication();
  }, [session.patientId, medicationId]);

  const saveChanges = async () => {
    setError('');
    setSaved(false);

    if (!name.trim() || !dose.trim()) {
      setError(
        'Please fill in the medicine name and dose.'
      );
      return;
    }

    if (
      quantity.trim() &&
      !/^\d+$/.test(quantity.trim())
    ) {
      setError(
        'Pill count must be a whole number.'
      );
      return;
    }

    setSaving(true);

    try {
      await medications.update(
        session.patientId,
        medicationId,
        {
          name: name.trim(),
          dose: dose.trim(),
          frequency,
          reminderTimes: [
            {
              timeOfDay: to24Hour(time),
              daysOfWeek: 'DAILY',
            },
          ],
          ...(quantity.trim()
            ? {
                quantityRemaining: parseInt(
                  quantity.trim(),
                  10
                ),
              }
            : {}),
        }
      );

      setSaved(true);

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setError(
        err.message || 'Could not update this medicine.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator
          size="large"
          color={colors.greenDot}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        padding: space.md,
      }}
    >
      <ScreenHeader
        title="Edit Medicine"
        eyebrow="Update your medicine details"
      />

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

      <Field label="How often">
        <ChipRow
          options={FREQUENCIES}
          value={frequency}
          onSelect={setFrequency}
        />
      </Field>

      <Field label="Reminder time">
        <ChipRow
          options={TIME_PRESETS}
          value={time}
          onSelect={setTime}
          wrap
        />
      </Field>

      <Field label="Pills remaining">
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 30"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          accessibilityLabel="Pills remaining"
        />
      </Field>

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      {saved ? (
        <Text style={styles.saved}>
          ✓ Medicine updated successfully.
        </Text>
      ) : null}

      <View style={{ height: space.md }} />

      {saving ? (
        <ActivityIndicator
          size="large"
          color={colors.greenDot}
        />
      ) : (
        <BigButton
          label="Save Changes"
          onPress={saveChanges}
          height={64}
          accessibilityHint="Saves the updated medicine details"
        />
      )}

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Cancel editing"
        style={styles.cancelButton}
      >
        <Text style={styles.cancelText}>
          Cancel
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>
        {label}
      </Text>

      {children}
    </View>
  );
}

function ChipRow({
  options,
  value,
  onSelect,
  wrap,
}) {
  return (
    <View
      style={[
        styles.chipRow,
        wrap && { flexWrap: 'wrap' },
      ]}
    >
      {options.map((option) => {
        const selected = option === value;

        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            accessibilityRole="radio"
            accessibilityState={{
              selected,
            }}
            accessibilityLabel={option}
            style={[
              styles.chip,
              selected && styles.chipSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selected &&
                  styles.chipTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: type.body,
    color: colors.textSecondary,
    marginBottom: space.xs,
  },

  input: {
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: type.bodyLarge,
    paddingHorizontal: space.md,
  },

  chipRow: {
    flexDirection: 'row',
    gap: space.xs,
  },

  chip: {
    minHeight: touch.min,
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

  chipText: {
    fontSize: type.body,
    color: colors.textPrimary,
  },

  chipTextSelected: {
    color: colors.textOnBlue,
    fontWeight: '700',
  },

  saved: {
    fontSize: type.body,
    color: colors.greenText,
    fontWeight: '700',
  },

  error: {
    fontSize: type.body,
    color: colors.redText,
    fontWeight: '700',
  },

  cancelButton: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
  },

  cancelText: {
    fontSize: type.body,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});