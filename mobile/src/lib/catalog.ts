import data from '../data/catalog.json';
import type { CourseProgress } from './types';

export type Lesson = {
  id: string;
  href: string;
  label: string;
  minutes: number;
  access: 'free' | 'pro';
};

export type Course = {
  id: string;
  title: string;
  hub: string;
  accent: string;
  minutes: number;
  prerequisites: string;
  outcomes: string;
  capstoneNote: string;
  vendorNote: string;
  lessons: Lesson[];
};

export type Tool = {
  id: string;
  title: string;
  path: string;
  summary: string;
  icon: 'git-network-outline' | 'grid-outline' | 'apps-outline' | 'server-outline' | 'compass-outline' | 'chatbubbles-outline' | 'construct-outline' | 'map-outline';
};

type Catalog = { source: string; generatedOn: string; estimate: string; courses: Course[] };

export const catalog = data as Catalog;

export const courses: readonly Course[] = catalog.courses;

/** Root tools and practice pages; summaries are the pages' own meta descriptions. */
export const tools: readonly Tool[] = [
  { id: 'pipeline', title: 'Pipeline Architect', path: 'pipeline-designer.html', summary: 'Configure source, destination, compute strategy and medallion layers.', icon: 'git-network-outline' },
  { id: 'modelling', title: 'Data Modelling', path: 'data-modelling.html', summary: 'Kimball dimensional modelling, one filing cabinet at a time.', icon: 'grid-outline' },
  { id: 'bus-matrix', title: 'Enterprise Bus Matrix', path: 'bus-matrix.html', summary: 'Add business processes and dimensions, then link them.', icon: 'apps-outline' },
  { id: 'distributed', title: 'Distributed Computing', path: 'distributed-computing.html', summary: 'How data travels from PostgreSQL to Redshift dashboards.', icon: 'server-outline' },
  { id: 'adventure', title: 'Data Adventure', path: 'data-adventure.html', summary: 'Pick an industry and see what data engineering changes there.', icon: 'compass-outline' },
  { id: 'interviews', title: 'Interview practice', path: 'interviews/index.html', summary: 'Data engineering, data science and data architect questions.', icon: 'chatbubbles-outline' },
  { id: 'projects', title: 'Projects', path: 'projects.html', summary: 'Learn by building.', icon: 'construct-outline' },
  { id: 'path', title: 'Learning path', path: 'learning-path.html', summary: 'Choose a path and start with the free lessons.', icon: 'map-outline' },
];

export function findCourse(id: string): Course | undefined {
  return courses.find((course) => course.id === id);
}

export function findLesson(courseId: string, lessonId: string | null): Lesson | undefined {
  if (!lessonId) return undefined;
  return findCourse(courseId)?.lessons.find((lesson) => lesson.id === lessonId);
}

/** Catalog minutes are words / 180 per lesson (see catalog.estimate), not classroom time. */
export function readingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 30) / 2;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function freeLessonCount(course: Course): number {
  return course.lessons.filter((lesson) => lesson.access === 'free').length;
}

export function completedCount(course: Course, progress: CourseProgress | undefined): number {
  if (!progress) return 0;
  const done = new Set(progress.completed_lesson_ids);
  return course.lessons.filter((lesson) => done.has(lesson.id)).length;
}

/** The most recently visited course that still points at a catalog lesson. */
export function continueTarget(progress: readonly CourseProgress[]): { course: Course; lesson: Lesson } | null {
  const sorted = [...progress].sort((a, b) => (b.last_visited_at ?? '').localeCompare(a.last_visited_at ?? ''));
  for (const row of sorted) {
    const course = findCourse(row.course_id);
    const lesson = findLesson(row.course_id, row.last_lesson_id);
    if (course && lesson) return { course, lesson };
  }
  return null;
}

export function searchCourses(query: string): readonly Course[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return courses;
  return courses.filter(
    (course) =>
      course.title.toLowerCase().includes(needle) ||
      course.id.includes(needle) ||
      course.lessons.some((lesson) => lesson.label.toLowerCase().includes(needle)),
  );
}
