import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, fonts, MIN_TOUCH, radius, shadow, space } from '../theme';

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right'],
  testID,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  testID?: string;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export function Heading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 | 3 }) {
  const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return (
    <Text accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, icon, hint, testID }: ButtonProps) {
  const inactive = disabled || loading;
  const tint = variant === 'primary' ? colors.surface : variant === 'danger' ? colors.danger : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Ionicons name={icon} size={20} color={tint} /> : null}
          <Text style={[styles.buttonText, { color: tint }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  secret?: boolean;
};

export function Field({ label, error, secret = false, ...input }: FieldProps) {
  const [hidden, setHidden] = useState(secret);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.faint}
          secureTextEntry={hidden}
          style={styles.input}
          {...input}
        />
        {secret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
            onPress={() => setHidden((value) => !value)}
            style={styles.reveal}
            hitSlop={8}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const NOTICE = {
  info: { bg: colors.accentSoft, fg: colors.accentStrong, icon: 'information-circle-outline' },
  ok: { bg: colors.okSoft, fg: colors.ok, icon: 'checkmark-circle-outline' },
  warn: { bg: colors.warnSoft, fg: colors.warn, icon: 'alert-circle-outline' },
  error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle-outline' },
} as const;

export function Notice({ tone = 'info', children, testID }: { tone?: keyof typeof NOTICE; children: ReactNode; testID?: string }) {
  const palette = NOTICE[tone];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: palette.bg }]}
      testID={testID}
    >
      <Ionicons name={palette.icon} size={20} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: ViewStyle; accent?: string }) {
  return <View style={[styles.card, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : null, style]}>{children}</View>;
}

export function ProgressBar({ value, color = colors.accent, label }: { value: number; color?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Pill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'ok' | 'muted' }) {
  const bg = tone === 'ok' ? colors.okSoft : tone === 'muted' ? colors.wash : colors.accentSoft;
  const fg = tone === 'ok' ? colors.ok : tone === 'muted' ? colors.muted : colors.accentStrong;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  icon,
  onPress,
  accessibilityHint,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityHint?: string;
  right?: ReactNode;
  testID?: string;
}) {
  const content = (
    <>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={22} color={colors.accent} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.faint} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash },
  scroll: { padding: space(2.5), paddingBottom: space(6), gap: space(2) },
  h1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink },
  h2: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27, color: colors.ink },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  muted: { color: colors.muted },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dangerSoft },
  inactive: { opacity: 0.55 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  field: { gap: space(0.75) },
  label: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: MIN_TOUCH, paddingHorizontal: space(1.75), fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  reveal: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.regular, fontSize: 14, color: colors.danger },
  notice: { flexDirection: 'row', gap: space(1), padding: space(1.5), borderRadius: radius.md, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(2), gap: space(1), borderWidth: 1, borderColor: colors.line, ...shadow },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space(1.25), paddingVertical: space(0.25) },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    minHeight: 56,
    paddingVertical: space(1.25),
    paddingHorizontal: space(1.5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressedRow: { backgroundColor: colors.accentSoft },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowSubtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.muted },
});
