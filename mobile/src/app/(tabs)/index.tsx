import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CourseCard } from '../../components/CourseCard';
import { Body, Button, Card, Heading, Notice, Pill, Row, Screen } from '../../components/ui';
import { continueTarget, courses, findCourse, tools } from '../../lib/catalog';
import { accessFor } from '../../lib/entitlement';
import { openSitePage } from '../../lib/navigation';
import { useSession } from '../../lib/session';
import { useRemote } from '../../lib/use-remote';
import { space } from '../../theme';

const STARTERS = ['python', 'postgres', 'snowflake'];

export default function Home() {
  const { status, user, api } = useSession();
  const signedIn = status === 'signedIn';
  const { remote } = useRemote(api.progress, signedIn);

  const progress = remote.state === 'ready' ? remote.data.progress : [];
  const resume = continueTarget(progress);
  const access = accessFor(user);
  const firstName = user?.full_name?.trim().split(/\s+/u)[0] || user?.username || null;
  const started = progress.map((row) => findCourse(row.course_id)).filter((course) => course !== undefined);
  const starters = courses.filter((course) => STARTERS.includes(course.id));

  return (
    <Screen testID="home">
      <Image source={require('../../../assets/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Data For Dummies" />
      <View style={styles.greeting}>
        <Heading>{firstName ? `Welcome back, ${firstName}` : 'Learn data the plain way'}</Heading>
        {signedIn ? <Pill label={access === 'free' ? 'FREE PLAN' : access === 'admin' ? 'OWNER' : 'PRO'} tone={access === 'free' ? 'muted' : 'ok'} /> : null}
      </View>

      {!signedIn ? (
        <Card>
          <Body>Sign in to save lessons and pick up where you left off on the website.</Body>
          <Button label="Sign in" onPress={() => router.push('/sign-in')} testID="home-sign-in" />
          <Button label="Create a free account" variant="secondary" onPress={() => router.push('/sign-up')} />
        </Card>
      ) : null}

      {remote.state === 'error' ? <Notice tone="warn">{remote.message}</Notice> : null}

      {resume ? (
        <Card accent={resume.course.accent}>
          <Heading level={3}>Continue learning</Heading>
          <Body muted>
            {resume.course.title}: {resume.lesson.label}
          </Body>
          <Button
            label="Resume lesson"
            icon="play"
            onPress={() => openSitePage(resume.lesson.href, resume.lesson.label)}
            testID="home-resume"
          />
        </Card>
      ) : null}

      <Heading level={2}>{started.length ? 'Your courses' : 'Good places to start'}</Heading>
      {(started.length ? started : starters).map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          progress={progress.find((row) => row.course_id === course.id)}
          onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        />
      ))}
      <Button label="See all courses" variant="secondary" onPress={() => router.push('/(tabs)/courses')} />

      <Heading level={2}>Hands-on tools</Heading>
      {tools.slice(0, 3).map((tool) => (
        <Row key={tool.id} title={tool.title} subtitle={tool.summary} icon={tool.icon} onPress={() => openSitePage(tool.path, tool.title)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 180, height: 129, alignSelf: 'center' },
  greeting: { gap: space(1) },
});
