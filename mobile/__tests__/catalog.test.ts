import fs from 'node:fs';
import path from 'node:path';

import { catalog, completedCount, continueTarget, courses, findCourse, readingTime, searchCourses, tools } from '../src/lib/catalog';
import type { CourseProgress } from '../src/lib/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expectedCatalogText, SITE_ROOT, TARGET } = require('../scripts/sync-catalog.js') as {
  expectedCatalogText: () => string;
  SITE_ROOT: string;
  TARGET: string;
};

const siteCatalog = JSON.parse(fs.readFileSync(path.join(SITE_ROOT, 'data', 'course-catalog.json'), 'utf8')) as {
  courses: Record<string, { lessons: { id: string; href: string }[] }>;
};

function row(courseId: string, lastLessonId: string | null, visited: string, done: string[] = []): CourseProgress {
  return {
    course_id: courseId,
    last_lesson_id: lastLessonId,
    last_lesson_label: null,
    completed_lesson_ids: done,
    progress_pct: null,
    last_visited_at: visited,
  };
}

describe('bundled catalog', () => {
  it('matches data/course-catalog.json; run npm run sync:catalog after the site build', () => {
    expect(fs.readFileSync(TARGET, 'utf8')).toBe(expectedCatalogText());
  });

  it('keeps every course and lesson id the Worker accepts', () => {
    expect(courses.map((course) => course.id).sort()).toEqual(Object.keys(siteCatalog.courses).sort());
    for (const course of courses) {
      const expected = siteCatalog.courses[course.id]?.lessons.map((lesson) => lesson.id).sort();
      expect(course.lessons.map((lesson) => lesson.id).sort()).toEqual(expected);
    }
  });

  it('points only at files that exist in this repository', () => {
    const paths = [...courses.flatMap((course) => [course.hub, ...course.lessons.map((lesson) => lesson.href)]), ...tools.map((tool) => tool.path)];
    const missing = paths.filter((relative) => !fs.existsSync(path.join(SITE_ROOT, relative)));
    expect(missing).toEqual([]);
  });

  it('has a free lesson in every course and marks Pro from the page itself', () => {
    for (const course of courses) {
      expect(course.lessons.some((lesson) => lesson.access === 'free')).toBe(true);
      for (const lesson of course.lessons) {
        const html = fs.readFileSync(path.join(SITE_ROOT, lesson.href), 'utf8');
        const body = html.match(/<body\b[^>]*>/iu)?.[0] ?? '';
        expect(lesson.access).toBe(/data-access\s*=\s*["']pro["']/iu.test(body) ? 'pro' : 'free');
      }
    }
  });

  it('carries the honest reading-time note', () => {
    expect(catalog.estimate).toMatch(/not a classroom hour/u);
  });
});

describe('catalog helpers', () => {
  it('formats reading time', () => {
    expect(readingTime(45)).toBe('45 min');
    expect(readingTime(60)).toBe('1 hour');
    expect(readingTime(210)).toBe('3.5 hours');
  });

  it('counts only catalog lessons as completed', () => {
    const snowflake = findCourse('snowflake');
    expect(snowflake).toBeDefined();
    if (!snowflake) return;
    const first = snowflake.lessons[0]?.id ?? '';
    expect(completedCount(snowflake, row('snowflake', null, '2026-10-01', [first, 'not-a-lesson']))).toBe(1);
    expect(completedCount(snowflake, undefined)).toBe(0);
  });

  it('resumes the most recent course with a known lesson', () => {
    const python = findCourse('python');
    const lesson = python?.lessons[2];
    expect(lesson).toBeDefined();
    const target = continueTarget([
      row('dbt', 'meet-dbt', '2026-10-01T00:00:00Z'),
      row('python', lesson?.id ?? null, '2026-10-10T00:00:00Z'),
      row('unknown', 'x', '2026-10-12T00:00:00Z'),
      row('snowflake', 'removed-lesson', '2026-10-11T00:00:00Z'),
    ]);
    expect(target?.course.id).toBe('python');
    expect(target?.lesson.id).toBe(lesson?.id);
    expect(continueTarget([])).toBeNull();
  });

  it('searches titles and lesson labels', () => {
    expect(searchCourses('')).toHaveLength(courses.length);
    expect(searchCourses('snowflake').map((course) => course.id)).toContain('snowflake');
    expect(searchCourses('zzzz-no-match')).toHaveLength(0);
  });
});
