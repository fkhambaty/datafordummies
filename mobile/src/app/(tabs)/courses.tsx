import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CourseCard } from '../../components/CourseCard';
import { Body, Field } from '../../components/ui';
import { catalog, searchCourses } from '../../lib/catalog';
import { useSession } from '../../lib/session';
import { useRemote } from '../../lib/use-remote';
import { colors, space } from '../../theme';

export default function Courses() {
  const { status, api } = useSession();
  const [query, setQuery] = useState('');
  const { remote } = useRemote(api.progress, status === 'signedIn');

  const progress = remote.state === 'ready' ? remote.data.progress : [];
  const results = searchCourses(query);

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={results}
      keyExtractor={(course) => course.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <Field
            label="Search courses and lessons"
            value={query}
            onChangeText={setQuery}
            placeholder="Try “joins” or “Snowflake”"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <Body muted>{catalog.estimate}</Body>
        </View>
      }
      ListEmptyComponent={<Body muted>No course or lesson matches “{query.trim()}”.</Body>}
      renderItem={({ item }) => (
        <CourseCard
          course={item}
          progress={progress.find((row) => row.course_id === item.id)}
          onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.wash },
  content: { padding: space(2.5), paddingBottom: space(6) },
  header: { gap: space(1.5), marginBottom: space(2) },
  gap: { height: space(1.5) },
});
