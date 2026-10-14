#!/usr/bin/env node
/**
 * Writes src/data/catalog.json from the site's generated data/course-catalog.json.
 *
 * Adds three facts the site already states in HTML: lesson order (first link on the
 * course hub), free/Pro (body data-access="pro"), and the hub accent (--hub-color).
 * Run from mobile/: npm run sync:catalog
 */
const fs = require('node:fs');
const path = require('node:path');

const SITE_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = path.join(SITE_ROOT, 'data', 'course-catalog.json');
const TARGET = path.resolve(__dirname, '..', 'src', 'data', 'catalog.json');
const DEFAULT_ACCENT = '#4f46e5';

function readText(relative) {
  const file = path.join(SITE_ROOT, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function shortTitle(title) {
  return title
    .replace(/^[^A-Za-z0-9]+/u, '')
    .replace(/\s+(Course Hub|Mastery Hub|Hub)$/u, '')
    .trim();
}

function lessonAccess(html) {
  const body = html.match(/<body\b[^>]*>/iu);
  return body && /data-access\s*=\s*["']pro["']/iu.test(body[0]) ? 'pro' : 'free';
}

function labelNumber(label) {
  const match = label.match(/^(?:Module|Session|Lesson|Part|Chapter)\s+(\d+)\b/iu);
  return match ? Number(match[1]) : null;
}

function hubAccent(html) {
  const match = html.match(/--hub-color\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/u);
  return match ? match[1].toLowerCase() : DEFAULT_ACCENT;
}

function hubOrder(hubHtml, hubHref) {
  const hubDir = path.posix.dirname(hubHref);
  const order = new Map();
  const links = hubHtml.matchAll(/href\s*=\s*["']([^"'#?]+)/giu);
  for (const [, href] of links) {
    if (/^[a-z]+:/iu.test(href) || href.startsWith('/')) continue;
    const resolved = path.posix.normalize(path.posix.join(hubDir, href));
    if (!order.has(resolved)) order.set(resolved, order.size);
  }
  return order;
}

function buildMobileCatalog(source) {
  const courses = Object.values(source.courses).map((course) => {
    const hubHtml = readText(course.hub);
    const order = hubOrder(hubHtml, course.hub);
    const lessons = course.lessons
      .map((lesson, index) => ({
        id: lesson.id,
        href: lesson.href,
        label: lesson.label,
        minutes: lesson.minutes,
        access: lessonAccess(readText(lesson.href)),
        number: labelNumber(lesson.label),
        rank: order.has(lesson.href) ? order.get(lesson.href) : Number.MAX_SAFE_INTEGER,
        index,
      }))
      .sort(
        (a, b) =>
          (a.number === null) - (b.number === null) ||
          (a.number ?? 0) - (b.number ?? 0) ||
          a.rank - b.rank ||
          a.index - b.index,
      )
      .map(({ number, rank, index, ...lesson }) => lesson);
    return {
      id: course.id,
      title: shortTitle(course.title),
      hub: course.hub,
      accent: hubAccent(hubHtml),
      minutes: course.minutes,
      prerequisites: course.prerequisites,
      outcomes: course.outcomes,
      capstoneNote: course.capstone_note,
      vendorNote: course.vendor_note,
      lessons,
    };
  });
  return {
    source: 'data/course-catalog.json',
    generatedOn: source.generated_on,
    estimate: source.estimate,
    courses,
  };
}

function render(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function expectedCatalogText() {
  return render(buildMobileCatalog(JSON.parse(fs.readFileSync(SOURCE, 'utf8'))));
}

if (require.main === module) {
  const text = expectedCatalogText();
  fs.mkdirSync(path.dirname(TARGET), { recursive: true });
  fs.writeFileSync(TARGET, text);
  const catalog = JSON.parse(text);
  const lessons = catalog.courses.reduce((sum, course) => sum + course.lessons.length, 0);
  console.log(`wrote ${path.relative(process.cwd(), TARGET)}: ${catalog.courses.length} courses, ${lessons} lessons`);
}

module.exports = { buildMobileCatalog, expectedCatalogText, TARGET, SITE_ROOT };
