import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Card, Heading, Notice, Pill, ProgressBar, Screen } from '../components/ui';
import { completedCount, courses } from '../lib/catalog';
import { useSession } from '../lib/session';
import { useRemote } from '../lib/use-remote';

function day(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Certificates() {
  const { status, api } = useSession();
  const signedIn = status === 'signedIn';
  const records = useRemote(api.certificates, signedIn);
  const progress = useRemote(api.progress, signedIn);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const reloadRecords = records.reload;

  if (!signedIn) {
    return (
      <Screen edges={['left', 'right']}>
        <Body>Sign in to see completion records.</Body>
        <Button label="Sign in" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  async function request(courseId: string) {
    setPending(courseId);
    setMessage(null);
    const result = await api.requestCertificate(courseId);
    setPending(null);
    if (result.ok) {
      setMessage({ tone: 'ok', text: 'Request recorded. It shows below as requested.' });
      void reloadRecords();
    } else {
      const missing = result.missing.length ? ` ${result.missing.length} lessons are not saved yet.` : '';
      setMessage({ tone: 'error', text: `${result.message}${missing}` });
    }
  }

  const certs = records.remote.state === 'ready' ? records.remote.data.certificates : [];
  const rows = progress.remote.state === 'ready' ? progress.remote.data.progress : [];
  const requested = new Set(certs.map((cert) => cert.course_id));

  return (
    <Screen edges={['left', 'right']}>
      <Notice tone="info">
        A completion record says every catalog lesson in a course is saved on your account, with the dates. It is not a
        vendor exam. A request is saved as “requested”. Neither the app nor the website issues certificates or verification links.
      </Notice>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {records.remote.state === 'error' ? <Notice tone="warn">{records.remote.message}</Notice> : null}

      <Heading level={2}>Your records</Heading>
      {records.remote.state === 'ready' && certs.length === 0 ? <Body muted>No requests yet.</Body> : null}
      {certs.map((cert) => (
        <Card key={cert.id}>
          <Heading level={3}>{cert.course_title}</Heading>
          <Pill label={cert.status === 'issued' ? 'ISSUED' : 'REQUESTED'} tone={cert.status === 'issued' ? 'ok' : 'muted'} />
          <Body muted>
            Requested {day(cert.requested_at)}
            {cert.issued_at ? `. Issued ${day(cert.issued_at)}.` : '.'} {cert.evidence.length} lessons in the evidence.
          </Body>
        </Card>
      ))}

      <Heading level={2}>Courses</Heading>
      {courses.map((course) => {
        const row = rows.find((item) => item.course_id === course.id);
        const done = completedCount(course, row);
        const total = course.lessons.length;
        if (!row || requested.has(course.id)) return null;
        return (
          <Card key={course.id} accent={course.accent}>
            <Heading level={3}>{course.title}</Heading>
            <ProgressBar value={(done / total) * 100} color={course.accent} label={`${course.title} progress`} />
            <Body muted>
              {done} of {total} lessons saved
            </Body>
            {done === total ? (
              <Button label="Request completion record" loading={pending === course.id} onPress={() => void request(course.id)} />
            ) : (
              <Body muted>Save the remaining {total - done} lessons to request a record.</Body>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
