/**
 * MediAssist Design Tokens
 * ------------------------------------------------------------------
 * Every value here maps to a constraint in the CAT 1 report:
 *
 *  NF1  Typography  -> type.body = 18 minimum. Nothing in the app
 *                      renders below 18. Reminder med name = 24 bold.
 *  NF1  Contrast    -> All text/background pairs >= 4.5:1 (WCAG AA).
 *                      Measured ratios are documented next to each pair.
 *  NF1  Touch       -> touch.min = 48 (Material older-adult guideline).
 *                      touch.confirm = 72 (full-width confirm button).
 *  S1-S5 Colour     -> Traffic-light semantics ONLY:
 *                      green = confirmed, orange = due soon,
 *                      red = overdue / missed.
 * ------------------------------------------------------------------
 */

export const colors = {
  // Base surfaces (dark, matching V1 Figma prototype)
  background: '#101418',   // app background
  surface: '#1C232B',      // cards; white text on this = 12.9:1
  surfaceRaised: '#242D37',

  // Text
  textPrimary: '#F5F7F8',  // on background = 16.5:1, on surface = 12.9:1
  textSecondary: '#B9C4CE',// on background = 9.4:1,  on surface = 7.3:1
  textOnGreen: '#FFFFFF',  // on green600 = 7.1:1
  textOnRed: '#FFFFFF',    // on red700 = 8.6:1
  textOnBlue: '#FFFFFF',   // on blue600 = 6.3:1

  // Status system (traffic-light convention, Section 9 Consistency)
  greenDot: '#4ADE80',     // confirmed (non-text indicator)
  green600: '#166534',     // confirm button background
  greenText: '#6EE7A0',    // "taken" text on background = 10.2:1

  orangeDot: '#FBBF24',    // due soon (non-text indicator)
  orangeText: '#FBBF24',   // amber text on background = 10.6:1

  redDot: '#F87171',       // missed (non-text indicator)
  red700: '#7F1D1D',       // alert card background
  redText: '#F87171',      // missed text on background = 6.5:1

  // Actions
  blue600: '#1D4ED8',      // primary non-status action (Save Medicine)
  border: '#39434E',
};

export const type = {
  body: 18,        // absolute minimum anywhere in the app (NF1)
  bodyLarge: 20,
  heading: 24,     // reminder medication name (S2 spec: 24pt bold)
  display: 30,
  stat: 48,        // adherence % (S4)
};

export const touch = {
  min: 48,         // minimum interactive target (NF1)
  confirm: 72,     // 'I took it' button height (S2 spec)
};

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  card: 16,
  button: 14,
  dot: 8,
};
