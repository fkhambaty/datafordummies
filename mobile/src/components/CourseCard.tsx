import { Pressable, StyleSheet, Text, View } from 'react-native';

import { completedCount, freeLessonCount, readingTime, type Course } from '../lib/catalog';
import type { CourseProgress } from '../lib/types';
import { colors, fonts, radius, shadow, space } from '../theme';
import { ProgressBar } from './ui';

export function CourseCard({ course, progress, onPress }: { course: Course; progress?: CourseProgress; onPress: () => void }) {
  const done = completedCount(course, progress);
  const total = course.lessons.length;
  const free = freeLessonCount(course);
  const pct = total ? (done / total) * 100 : 0;
  const summary = `${total} lessons, ${free} free, about ${readingTime(course.minutes)} of reading`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}. ${summary}.${progress ? ` ${done} of ${total} saved.` : ''}`}
      accessibilityHint="Opens the course lessons"
      onPress={onPress}
      testID={`course-${course.id}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.badge, { backgroundColor: course.accent }]}>
        <Text style={styles.badgeText}>{course.title.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.meta}>{summary}</Text>
        {progress ? (
          <View style={styles.progress}>
            <ProgressBar value={pct} color={course.accent} label={`${course.title} progress`} />
            <Text style={styles.meta}>
              {done} of {total} saved
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space(1.5),
    padding: space(1.75),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  pressed: { backgroundColor: colors.accentSoft },
  badge: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 16, color: colors.surface },
  text: { flex: 1, gap: space(0.5) },
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  progress: { gap: space(0.5), marginTop: space(0.5) },
});
