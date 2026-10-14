import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Body, Button, Card, Heading, Notice, ProgressBar, Row, Screen } from '../../components/ui';
import { completedCount, courses } from '../../lib/catalog';
import { CONTACT_EMAIL, LEGAL_PAGES } from '../../lib/config';
import { describeAccess } from '../../lib/entitlement';
import { openSitePage } from '../../lib/navigation';
import { useSession } from '../../lib/session';
import { useRemote } from '../../lib/use-remote';

export default function Account() {
  const { status, user, api, signOut, refreshProfile } = useSession();
  const signedIn = status === 'signedIn';
  const { remote } = useRemote(api.progress, signedIn);
  const [signingOut, setSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile]),
  );

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need your password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setSigningOut(true);
          void signOut().finally(() => setSigningOut(false));
        },
      },
    ]);
  }

  const progress = remote.state === 'ready' ? remote.data.progress : [];
  const started = courses
    .map((course) => ({ course, row: progress.find((item) => item.course_id === course.id) }))
    .filter((item) => item.row !== undefined);

  return (
    <Screen edges={['left', 'right']}>
      {signedIn && user ? (
        <>
          <Card>
            <Heading level={2}>{user.full_name || user.username || user.email}</Heading>
            <Body muted>{user.email}</Body>
            <Notice tone="info" testID="account-access">
              {describeAccess(user)}
            </Notice>
            <Row title="About Pro on mobile" icon="information-circle-outline" onPress={() => router.push('/pro')} />
          </Card>

          <Heading level={2}>Progress</Heading>
          {remote.state === 'error' ? <Notice tone="warn">{remote.message}</Notice> : null}
          {remote.state === 'ready' && started.length === 0 ? (
            <Body muted>No saved lessons yet. Mark a lesson complete at the end of the page; it counts here and on the website.</Body>
          ) : null}
          {started.map(({ course, row }) => {
            const done = completedCount(course, row);
            return (
              <Card key={course.id} accent={course.accent}>
                <Heading level={3}>{course.title}</Heading>
                <ProgressBar value={(done / course.lessons.length) * 100} color={course.accent} label={`${course.title} progress`} />
                <Body muted>
                  {done} of {course.lessons.length} lessons saved
                </Body>
              </Card>
            );
          })}
          <Row
            title="Completion records"
            subtitle="Request a record when every lesson in a course is saved"
            icon="ribbon-outline"
            onPress={() => router.push('/certificates')}
          />
        </>
      ) : (
        <Card>
          <Heading level={2}>You are browsing as a guest</Heading>
          <Body muted>Free lessons are open. Sign in to save progress and to open Pro lessons on an account that has Pro.</Body>
          <Button label="Sign in" onPress={() => router.push('/sign-in')} testID="account-sign-in" />
          <Button label="Create a free account" variant="secondary" onPress={() => router.push('/sign-up')} />
        </Card>
      )}

      <Heading level={2}>Help and policies</Heading>
      {LEGAL_PAGES.map((page) => (
        <Row key={page.path} title={page.label} icon="document-text-outline" onPress={() => openSitePage(page.path, page.label)} />
      ))}
      <Row
        title="Email us"
        subtitle={CONTACT_EMAIL}
        icon="mail-outline"
        onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
      />

      {signedIn ? (
        <>
          <Button label="Sign out" variant="secondary" icon="log-out-outline" loading={signingOut} onPress={confirmSignOut} testID="account-sign-out" />
          <Button
            label="Delete account"
            variant="danger"
            onPress={() => router.push('/delete-account')}
            hint="Asks for your password, then deletes the account on the server"
            testID="account-delete"
          />
        </>
      ) : null}
      <Body muted>Version {Constants.expoConfig?.version ?? 'unknown'}</Body>
    </Screen>
  );
}
