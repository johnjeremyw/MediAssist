import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, type, space, radius } from '../theme';
import { BigButton, ScreenHeader } from '../components/ui';
import { useAuth } from '../AuthContext';

/**
 * Sign-in screen. Not part of the original CAT 1 Figma set (V1 assumed a
 * single-user prototype); added so the app can tell a patient session
 * (Grace) apart from a caregiver session (Peter) against the real backend.
 * Quick demo buttons log in as the seeded personas without typing.
 */
export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (demoEmail) => {
    const useEmail = demoEmail || email;
    const usePassword = demoEmail ? 'password123' : password;
    setError('');
    setBusy(true);
    try {
      await login(useEmail, usePassword);
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: space.md, flexGrow: 1 }}>
      <ScreenHeader eyebrow="MediAssist" title="Sign in" />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Email"
      />

      <View style={{ height: space.md }} />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Password"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: space.lg }} />
      {busy ? (
        <ActivityIndicator size="large" color={colors.greenDot} />
      ) : (
        <BigButton label="Sign in" onPress={() => submit()} height={64} />
      )}

      <View style={{ flex: 1 }} />

      <Text style={styles.demoLabel}>Demo accounts (seeded backend)</Text>
      <BigButton
        label="Continue as Grace (patient)"
        onPress={() => submit('grace@example.com')}
        secondary
        accessibilityHint="Signs in as the elderly patient demo account"
      />
      <View style={{ height: space.sm }} />
      <BigButton
        label="Continue as Peter (caregiver)"
        onPress={() => submit('peter@example.com')}
        secondary
        accessibilityHint="Signs in as the family caregiver demo account"
      />
      <View style={{ height: space.sm }} />
      <BigButton
        label="Continue as Dr. Nancy (clinician)"
        onPress={() => submit('nancy@example.com')}
        secondary
        accessibilityHint="Signs in as the clinician demo account"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: type.body, color: colors.textSecondary, marginBottom: space.xs },
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
  error: {
    fontSize: type.body,
    color: colors.redText,
    marginTop: space.md,
  },
  demoLabel: {
    fontSize: type.body,
    color: colors.textSecondary,
    marginBottom: space.sm,
    textAlign: 'center',
  },
});
