import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { courses } from '../lib/catalog';
import { finishOnboarding } from '../lib/secure-session';
import { colors, fonts, radius, space } from '../theme';

const freeLessons = courses.reduce((sum, course) => sum + course.lessons.filter((lesson) => lesson.access === 'free').length, 0);

const SLIDES = [
  {
    icon: 'school-outline',
    title: 'Data, explained plainly',
    body: `${courses.length} courses, from Python and SQL to Snowflake, dbt and Kubernetes. ${freeLessons} lessons are free to read.`,
  },
  {
    icon: 'sync-outline',
    title: 'One account, web and app',
    body: 'Sign in with the account you use on datafordummies.in. Lessons you save in either place show up in both.',
  },
  {
    icon: 'lock-open-outline',
    title: 'Pro works if you already have it',
    body: 'This app does not sell Pro. If your account already has Pro, sign in and the Pro lessons open here too.',
  },
] as const;

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];
  const last = index === SLIDES.length - 1;

  async function leave(target: '/(tabs)' | '/sign-in' | '/sign-up') {
    await finishOnboarding();
    router.replace('/(tabs)');
    if (target !== '/(tabs)') router.push(target);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Data For Dummies" />
      </View>
      <View style={styles.slide} accessibilityLiveRegion="polite">
        <View style={styles.iconWrap}>
          <Ionicons name={slide.icon} size={34} color={colors.accent} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {slide.title}
        </Text>
        <Text style={styles.body}>{slide.body}</Text>
        <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((item, dot) => (
            <View key={item.title} style={[styles.dot, dot === index && styles.dotActive]} />
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        {last ? (
          <>
            <Button label="Create a free account" onPress={() => void leave('/sign-up')} testID="onboarding-sign-up" />
            <Button label="I already have an account" variant="secondary" onPress={() => void leave('/sign-in')} testID="onboarding-sign-in" />
            <Button label="Look around first" variant="ghost" onPress={() => void leave('/(tabs)')} testID="onboarding-browse" />
          </>
        ) : (
          <>
            <Button label="Next" onPress={() => setIndex(index + 1)} testID="onboarding-next" />
            <Button label="Skip" variant="ghost" onPress={() => setIndex(SLIDES.length - 1)} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: space(3) },
  top: { alignItems: 'center', paddingTop: space(3) },
  logo: { width: '80%', aspectRatio: 900 / 644, maxHeight: 220 },
  slide: { flex: 1, justifyContent: 'center', gap: space(1.5) },
  iconWrap: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 27, color: colors.muted },
  dots: { flexDirection: 'row', gap: space(1), marginTop: space(1) },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.line },
  dotActive: { width: 24, backgroundColor: colors.accent },
  actions: { gap: space(1), paddingBottom: space(2) },
});
