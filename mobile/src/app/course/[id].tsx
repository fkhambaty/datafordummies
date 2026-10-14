import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Body, Button, Card, Heading, Notice, Pill, ProgressBar, Row, Screen } from '../../components/ui';
import { completedCount, findCourse, freeLessonCount, readingTime } from '../../lib/catalog';
import { accessFor } from '../../lib/entitlement';
import { openSitePage } from '../../lib/navigation';
import { useSession } from '../../lib/session';
import { useRemote } from '../../lib/use-remote';
import { colors, space } from '../../theme';

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = findCourse(String(id));
  const { status, user, api } = useSession();
  const { remote } = useRemote(api.progress, status === 'signedIn');

  if (!course) {
    return (
      <Screen edges={['left', 'right']}>
        <Notice tone="error">That course is not in the catalog.</Notice>
      </Screen>
    );
  }

  const row = remote.state === 'ready' ? remote.data.progress.find((item) => item.course_id === course.id) : undefined;
  const done = new Set(row?.completed_lesson_ids ?? []);
  const saved = completedCount(course, row);
  const unlocked = accessFor(user) !== 'free';

  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: course.title }} />
      <Card accent={course.accent}>
        <Heading>{course.title}</Heading>
        <Body muted>{course.outcomes}</Body>
        <Body muted>
          {course.lessons.length} lessons, {freeLessonCount(course)} free, about {readingTime(course.minutes)} of reading.
        </Body>
        {row ? (
          <View style={styles.progress}>
            <ProgressBar value={(saved / course.lessons.length) * 100} color={course.accent} label={`${course.title} progress`} />
            <Body muted>
              {saved} of {course.lessons.length} saved
            </Body>
          </View>
        ) : null}
        <Button label="Open the course hub" variant="secondary" icon="map-outline" onPress={() => openSitePage(course.hub, course.title)} />
      </Card>

      {!unlocked ? (
        <Notice tone="info">Lessons marked Pro show a lock unless your account already has Pro. The app does not sell Pro.</Notice>
      ) : null}

      <Heading level={2}>Lessons</Heading>
      {course.lessons.map((lesson) => {
        const complete = done.has(lesson.id);
        const locked = lesson.access === 'pro' && !unlocked;
        return (
          <Row
            key={lesson.id}
            title={lesson.label}
            subtitle={`${lesson.minutes} min${lesson.access === 'pro' ? ' · Pro' : ' · Free'}${complete ? ' · Saved' : ''}`}
            onPress={() => openSitePage(lesson.href, lesson.label)}
            testID={`lesson-${lesson.id}`}
            right={
              <Ionicons
                name={complete ? 'checkmark-circle' : locked ? 'lock-closed-outline' : 'chevron-forward'}
                size={20}
                color={complete ? colors.ok : colors.faint}
              />
            }
          />
        );
      })}

      <Heading level={2}>Before you start</Heading>
      <Body muted>{course.prerequisites}</Body>
      <Pill label="FINISHING" tone="muted" />
      <Body muted>{course.capstoneNote}</Body>
      <Body muted>{course.vendorNote}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: space(0.5) },
});
