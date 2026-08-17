import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, type, touch, space, radius } from '../theme';

/* ------------------------------------------------------------------
 * StatusDot — traffic-light indicator (Section 9: Consistency).
 * Never conveys information by colour alone: every dot is always
 * paired with a text label by the screen that uses it (WCAG 1.4.1).
 * ---------------------------------------------------------------- */
export function StatusDot({ status }) {
  const dotColor =
    status === 'taken' ? colors.greenDot :
    status === 'missed' ? colors.redDot :
    colors.orangeDot;
  return <View style={[styles.dot, { backgroundColor: dotColor }]} />;
}

export function statusTextColor(status) {
  if (status === 'taken') return colors.greenText;
  if (status === 'missed') return colors.redText;
  return colors.orangeText;
}

/* ------------------------------------------------------------------
 * BigButton — the only button primitive in the app.
 * Enforces the 48px minimum touch target at the component level so
 * no screen can accidentally violate NF1. `height` may only raise it
 * (e.g. 72 for the confirm button), never lower it.
 * ---------------------------------------------------------------- */
export function BigButton({
  label, onPress, background, textColor, height, secondary, accessibilityHint,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        background && { backgroundColor: background },
        { minHeight: Math.max(touch.min, height || 0) },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          secondary && { color: colors.textPrimary },
          textColor && { color: textColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* Card container */
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* Screen title block */
export function ScreenHeader({ eyebrow, title }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 16,
    height: 16,
    borderRadius: radius.dot,
    marginRight: space.sm,
  },
  button: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    backgroundColor: colors.blue600,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
  buttonLabel: {
    fontSize: type.bodyLarge,     // 20 — above the 18 minimum
    fontWeight: '700',
    color: colors.textOnBlue,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: space.md,
  },
  eyebrow: {
    fontSize: type.body,          // 18 minimum respected
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: type.display,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
