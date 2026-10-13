#!/usr/bin/env node
/**
 * Viewport audit for the static Data For Dummies site.
 *
 * Playwright loads from PLAYWRIGHT_MODULE, then ./node_modules, then the
 * Okavo checkout. This does not install packages or build an app.
 *
 *   python3 -m http.server 8877
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8877 --mode sweep
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8877 --mode full
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8877 --mode clicks
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8877 --mode all
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8877 --group python_course --widths 390,768
 *
 * --mode sweep  every HTML page at 390x844, 768x1024, and 1440x900
 * --mode full   representative routes at all six target viewports
 * --mode clicks real tap paths (menu, video, hubs, lessons, auth, tools)
 * --mode all    sweep, then the extra representative viewports, then clicks
 *
 * BASE_URL, PAGES, and VIEWPORT_MODE override the defaults.
 * Local page-view and event beacons are stubbed with HTTP 204 so a CORS
 * refusal from the production worker does not hide a real console error.
 * When the base host is 127.0.0.1 or localhost, Chromium is launched with
 * web security disabled so the real dummy login can call the worker before
 * the loopback CORS change in cloudflare/worker is deployed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_PARTS = new Set(['.git', 'node_modules', 'supabase']);

const VIEWPORTS = [
    { width: 390, height: 667 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 820, height: 1180 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
];

const SWEEP_VIEWPORTS = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
];

const HUBS = [
    'python_course/index.html',
    'data_science_course/index.html',
    'snowflake_course/hub.html',
    'airflow_course/hub.html',
    'dbt_course/hub.html',
    'clickhouse_course/hub.html',
    'postgres_course/hub.html',
    'mssql_course/hub.html',
    'redshift_course/hub.html',
    'metabase_course/hub.html',
    'llm_course/index.html',
    'kubernetes_course/hub.html',
    'terraform_course/hub.html',
    'dms_course/hub.html',
];

const LESSONS = [
    ['python_course/s1-intro.html', 'python_course/s6-functions1.html'],
    ['data_science_course/ml-introduction.html', 'data_science_course/classification.html'],
    ['snowflake_course/meet-snowflake.html', 'snowflake_course/architecture.html'],
    ['airflow_course/meet-airflow.html', 'airflow_course/best-practices.html'],
    ['dbt_course/meet-dbt.html', 'dbt_course/advanced.html'],
    ['clickhouse_course/meet-clickhouse.html', 'clickhouse_course/architecture.html'],
    ['postgres_course/meet-postgresql.html', 'postgres_course/data-types.html'],
    ['mssql_course/meet-sql-server.html', 'mssql_course/datasets.html'],
    ['redshift_course/meet-redshift.html', 'redshift_course/architecture.html'],
    ['metabase_course/meet-metabase.html', 'metabase_course/dashboards.html'],
    ['llm_course/what-are-llms.html', 'llm_course/attention.html'],
    ['kubernetes_course/meet-kubernetes.html', 'kubernetes_course/capstone.html'],
    ['terraform_course/meet-terraform.html', 'terraform_course/capstone.html'],
    ['dms_course/architecture.html', 'dms_course/cdc.html'],
];

const REPRESENTATIVE = [
    'index.html',
    'data-science.html',
    'data-science-basics.html',
    'pricing.html',
    'learning-path.html',
    'curriculum.html',
    'founder.html',
    'certifications.html',
    'projects.html',
    'projects/ecommerce-data-warehouse.html',
    'auth/login.html',
    'auth/signup.html',
    'auth/profile.html',
    'admin/analytics.html',
    'pipeline-designer.html',
    'data-modelling.html',
    'bus-matrix.html',
    'distributed-computing.html',
    'data-adventure.html',
    'interviews/index.html',
    ...HUBS,
    ...LESSONS.flat(),
];

function arg(name) {
    const index = process.argv.indexOf(name);
    if (index === -1) return '';
    return process.argv[index + 1] || '';
}

function loadPlaywright() {
    const candidates = [
        process.env.PLAYWRIGHT_MODULE || '',
        path.join(ROOT, 'node_modules/playwright/index.js'),
        '/Users/fakhruddinkhambaty/product-reviews/okavo/node_modules/playwright/index.js',
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (!fs.existsSync(candidate)) continue;
        return require(candidate);
    }
    throw new Error(
        'Playwright was not found. Set PLAYWRIGHT_MODULE to playwright/index.js ' +
        'or install it beside this script.'
    );
}

function discoverPages() {
    const found = [];
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (SKIP_PARTS.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.name.endsWith('.html') || entry.name.endsWith('.backup')) continue;
            found.push(path.relative(ROOT, full).split(path.sep).join('/'));
        }
    }
    walk(ROOT);
    found.sort();
    return found;
}

function groupOf(pagePath) {
    const slash = pagePath.indexOf('/');
    return slash === -1 ? 'root' : pagePath.slice(0, slash);
}

function pagesForGroup(group) {
    const all = discoverPages();
    if (!group || group === 'all') return all;
    return all.filter((pagePath) => groupOf(pagePath) === group);
}

function parseWidths(raw) {
    if (!raw || raw === 'sweep') return SWEEP_VIEWPORTS;
    if (raw === 'full') return VIEWPORTS;
    const wanted = new Set(raw.split(',').map((item) => Number(item.trim())).filter(Boolean));
    const picked = VIEWPORTS.filter((viewport) => wanted.has(viewport.width));
    if (!picked.length) throw new Error('No known viewports in --widths ' + raw);
    return picked;
}

function assertBreakpointContract() {
    const css = fs.readFileSync(path.join(ROOT, 'css/dfd-system.css'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'js/hub-script.js'), 'utf8');
    const problems = [];
    if (/@media \(max-width:\s*720px\)/.test(css)) problems.push('css/dfd-system.css still has a 720px breakpoint');
    if (!css.includes('@media (max-width: 768px)')) problems.push('css/dfd-system.css is missing the 768px breakpoint');
    if (!js.includes("'(max-width: 768px)'")) problems.push('js/hub-script.js is missing matchMedia (max-width: 768px)');
    if (/innerWidth\s*>\s*768/.test(js)) problems.push('js/hub-script.js still branches on innerWidth > 768');
    return problems;
}

function loopbackBase(base) {
    try {
        const url = new URL(base);
        return url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    } catch (error) {
        return false;
    }
}

function isAnalyticsUrl(url) {
    return /\/v1\/(?:page-view|event)(?:\?|$)/.test(url);
}

function isNoiseUrl(url) {
    const lower = url.toLowerCase();
    return [
        'youtube.com',
        'youtube-nocookie.com',
        'youtu.be',
        'ytimg.com',
        'googlevideo.com',
        'doubleclick.net',
        'googleads',
        'fonts.gstatic.com',
        'fonts.googleapis.com',
        'favicon.ico',
    ].some((host) => lower.includes(host));
}

function ignorableConsole(text) {
    const lower = String(text || '').toLowerCase();
    if (!lower) return true;
    if (lower.includes('favicon')) return true;
    if (lower.includes('compute-pressure') || lower.includes('permissions policy violation')) return true;
    if (lower.includes('/v1/page-view') || lower.includes('/v1/event')) return true;
    if (lower.includes('datafordummies-api.fkhambaty.workers.dev') &&
        (lower.includes('cors') || lower.includes('failed to fetch') || lower.includes('access-control') || lower.includes('net::err'))) {
        return true;
    }
    if ((lower.includes('127.0.0.1') || lower.includes('localhost')) && lower.includes('cors')) return true;
    if (isNoiseUrl(lower) && (lower.includes('failed') || lower.includes('cors') || lower.includes('err_') || lower.includes('blocked') || lower.includes('refused'))) {
        return true;
    }
    return false;
}

async function mapPool(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function run() {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index], index);
        }
    }
    const workers = Math.max(1, Math.min(limit, items.length || 1));
    await Promise.all(Array.from({ length: workers }, run));
    return results;
}

async function prepareContext(browser, viewport) {
    const context = await browser.newContext({ viewport });
    await context.route('**/*', (route) => {
        if (isAnalyticsUrl(route.request().url())) {
            route.fulfill({ status: 204, body: '' });
            return;
        }
        route.continue();
    });
    return context;
}

function attachLogs(page) {
    const logs = [];
    page.on('pageerror', (error) => {
        logs.push('pageerror: ' + (error && error.message ? error.message : String(error)));
    });
    page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (ignorableConsole(text)) return;
        logs.push('console: ' + text);
    });
    page.on('requestfailed', (request) => {
        const url = request.url();
        if (isAnalyticsUrl(url) || isNoiseUrl(url)) return;
        const type = request.resourceType();
        if (type !== 'document' && type !== 'script' && type !== 'stylesheet') return;
        const failure = request.failure();
        logs.push('request failed: ' + type + ' ' + (failure ? failure.errorText : '') + ' ' + url);
    });
    return logs;
}

async function measure(page) {
    return page.evaluate(() => {
        const width = window.innerWidth;
        const root = document.documentElement;
        const body = document.body;
        const overflow = Math.max(
            root ? root.scrollWidth - width : 0,
            body ? body.scrollWidth - width : 0
        );
        const offenders = [];
        if (overflow > 1 && body) {
            const nodes = body.querySelectorAll('body *');
            for (const el of nodes) {
                const rect = el.getBoundingClientRect();
                if (rect.width < 8 || rect.height < 8) continue;
                if (rect.right <= width + 1 && rect.left >= -1) continue;
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') continue;
                let parent = el.parentElement;
                let contained = false;
                while (parent) {
                    const parentStyle = window.getComputedStyle(parent);
                    const scrolls = parentStyle.overflowX === 'auto' || parentStyle.overflowX === 'scroll' || parentStyle.overflowX === 'hidden' || parentStyle.overflowX === 'clip';
                    if (scrolls && parent.clientWidth <= width + 1) {
                        contained = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                if (contained) continue;
                const cls = typeof el.className === 'string' ? el.className : '';
                offenders.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.trim().split(/\s+/).slice(0, 2).join('.') : ''));
                if (offenders.length >= 4) break;
            }
        }
        const issues = [];
        const toggle = document.querySelector('.mobile-menu-toggle');
        const links = document.querySelector('.nav-links');
        const mobile = window.matchMedia('(max-width: 768px)').matches;
        if (toggle && links && toggle.closest('.main-nav')) {
            const toggleStyle = window.getComputedStyle(toggle);
            const linkStyle = window.getComputedStyle(links);
            const toggleShown = toggleStyle.display !== 'none' && toggleStyle.visibility !== 'hidden';
            const linksShown = linkStyle.display !== 'none' && linkStyle.visibility !== 'hidden';
            if (mobile && !toggleShown) issues.push('mobile nav toggle is hidden');
            if (!mobile && toggleShown) issues.push('desktop still shows the mobile toggle');
            if (!mobile && !linksShown) issues.push('desktop nav links are hidden');
            if (mobile && toggleShown) {
                const rect = toggle.getBoundingClientRect();
                if (rect.width < 47 || rect.height < 47) {
                    issues.push('menu toggle is ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
                }
            }
        }
        if (width <= 1024) {
            document.querySelectorAll('input, select, textarea').forEach((el) => {
                const type = (el.getAttribute('type') || 'text').toLowerCase();
                if (['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'hidden', 'image', 'file'].includes(type)) return;
                const size = parseFloat(window.getComputedStyle(el).fontSize);
                if (size < 16) issues.push('input font ' + size + 'px on ' + (el.id || el.name || type));
            });
        }
        return { overflow, offenders, issues };
    });
}

async function exerciseCopy(page, problems, label) {
    const hasCode = await page.locator('.code-block, pre').count();
    const buttons = page.locator('.fkti-copy-btn');
    const count = await buttons.count();
    if (hasCode > 0 && count === 0) {
        problems.push(label + ' code block has no copy button');
        return;
    }
    if (count === 0) return;
    try {
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    } catch (error) {
        // Some headless builds reject clipboard permissions. The click still runs.
    }
    const clicked = await page.evaluate(() => {
        const btn = document.querySelector('.fkti-copy-btn');
        if (!btn) return 'missing';
        btn.click();
        return 'clicked';
    });
    if (clicked !== 'clicked') problems.push(label + ' copy button did not run');
}

async function exerciseQuiz(page, problems, label) {
    const locked = await page.evaluate(() => {
        const overlay = document.getElementById('paywall-overlay');
        if (!overlay) return false;
        const style = window.getComputedStyle(overlay);
        return style.display !== 'none' && style.visibility !== 'hidden' && overlay.getAttribute('aria-hidden') !== 'true';
    });
    if (locked) return;
    const quiz = page.locator('[data-dfd-quiz]');
    if (await quiz.count() > 0) {
        if (!(await quiz.first().isVisible())) {
            problems.push(label + ' knowledge check is not visible');
            return;
        }
        const choices = page.locator('[data-dfd-quiz] [data-correct]');
        if (await choices.count() < 2) {
            problems.push(label + ' quiz has fewer than two choices');
            return;
        }
        await choices.first().focus();
        await page.keyboard.press('ArrowDown');
        const moved = await page.evaluate(() => {
            const el = document.activeElement;
            return !!(el && el.hasAttribute && el.hasAttribute('data-correct'));
        });
        if (!moved) problems.push(label + ' arrow key did not move quiz focus');
        const wrong = page.locator('[data-dfd-quiz] [data-correct="false"]').first();
        await wrong.click();
        const feedback = page.locator('[data-dfd-feedback]').first();
        const text = ((await feedback.textContent()) || '').trim();
        if (!/Not quite/i.test(text)) problems.push(label + ' quiz feedback was "' + text + '"');
        return;
    }
    const legacy = page.locator('.quiz-opt, .quiz-option').first();
    if (await legacy.count() === 0) return;
    if (!(await legacy.isVisible())) return;
    await legacy.click();
}

async function auditJob(browser, base, pagePath, viewport, exercise) {
    const label = pagePath + ' @ ' + viewport.width + 'x' + viewport.height;
    const problems = [];
    const context = await prepareContext(browser, viewport);
    const page = await context.newPage();
    const logs = attachLogs(page);
    try {
        let response = null;
        try {
            response = await page.goto(base + '/' + pagePath.replace(/^\//, ''), {
                waitUntil: 'load',
                timeout: 30000,
            });
        } catch (error) {
            problems.push(label + ' navigation: ' + error.message);
            return problems;
        }
        if (!response) problems.push(label + ' returned no response');
        else if (response.status() >= 400) problems.push(label + ' HTTP ' + response.status());
        const measured = await measure(page);
        if (measured.overflow > 1) {
            const who = measured.offenders.length ? ' via ' + measured.offenders.join(', ') : '';
            problems.push(label + ' document overflow ' + measured.overflow + 'px' + who);
        }
        measured.issues.forEach((issue) => problems.push(label + ' ' + issue));
        logs.forEach((line) => problems.push(label + ' ' + line));
        if (exercise) {
            await exerciseQuiz(page, problems, label);
            await exerciseCopy(page, problems, label);
        }
    } finally {
        await context.close();
    }
    return problems;
}

function summarize(pages, checks, problems) {
    const groups = new Map();
    pages.forEach((pagePath) => {
        const name = groupOf(pagePath);
        if (!groups.has(name)) groups.set(name, { pages: 0, problems: 0 });
        groups.get(name).pages += 1;
    });
    problems.forEach((line) => {
        const pagePath = line.split(' @ ')[0];
        const name = groupOf(pagePath);
        if (!groups.has(name)) groups.set(name, { pages: 0, problems: 0 });
        groups.get(name).problems += 1;
    });
    const names = Array.from(groups.keys()).sort();
    names.forEach((name) => {
        const row = groups.get(name);
        console.log('summary ' + name + ' pages=' + row.pages + ' problems=' + row.problems);
    });
    console.log('pages: ' + pages.length);
    console.log('checks: ' + checks);
    console.log('problems: ' + problems.length);
}

async function runMatrix(browser, base, pages, viewports, jobs) {
    const tasks = [];
    pages.forEach((pagePath) => {
        viewports.forEach((viewport, index) => {
            tasks.push({ pagePath, viewport, exercise: index === 0 });
        });
    });
    const nested = await mapPool(tasks, jobs, (task) => {
        return auditJob(browser, base, task.pagePath, task.viewport, task.exercise);
    });
    return { checks: tasks.length, problems: nested.flat() };
}

async function runClicks(browser, base) {
    const problems = [];
    const context = await prepareContext(browser, { width: 390, height: 844 });
    const page = await context.newPage();
    attachLogs(page).forEach(() => {});
    const logs = [];
    page.on('pageerror', (error) => logs.push(error.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error' && !ignorableConsole(msg.text())) logs.push(msg.text());
    });
    let paymentHit = false;
    page.on('request', (request) => {
        const url = request.url();
        if (url.includes('razorpay.com') || url.includes('/v1/payments')) paymentHit = true;
    });

    async function open(pagePath) {
        const response = await page.goto(base + '/' + pagePath, { waitUntil: 'load', timeout: 30000 });
        if (!response || response.status() >= 400) problems.push('clicks ' + pagePath + ' HTTP ' + (response ? response.status() : 'none'));
        const measured = await measure(page);
        if (measured.overflow > 1) {
            problems.push('clicks ' + pagePath + ' overflow ' + measured.overflow + 'px ' + measured.offenders.join(', '));
        }
    }

    try {
        await open('index.html');
        const toggle = page.locator('.mobile-menu-toggle');
        await toggle.click();
        const courses = page.locator('.nav-links a[href="learning-path.html"]');
        if (!(await courses.isVisible())) problems.push('clicks home menu did not show Courses');
        const box = await toggle.boundingBox();
        if (!box || box.width < 47 || box.height < 47) problems.push('clicks menu toggle under 48px');
        const video = page.locator('.home-video iframe');
        if (await video.count() === 0) problems.push('clicks home video missing');
        else {
            const frame = await video.boundingBox();
            if (!frame || frame.width < 280 || frame.height < 120) problems.push('clicks home video is not visible');
        }
        await page.setViewportSize({ width: 768, height: 1024 });
        await open('index.html');
        if (!(await page.locator('.mobile-menu-toggle').isVisible())) problems.push('clicks 768 hides the menu toggle');
        await page.setViewportSize({ width: 820, height: 1180 });
        await open('index.html');
        if (await page.locator('.mobile-menu-toggle').isVisible()) problems.push('clicks 820 still shows the hamburger');
        if (!(await page.locator('.nav-links').isVisible())) problems.push('clicks 820 hides desktop links');

        await page.setViewportSize({ width: 390, height: 844 });
        for (const hub of HUBS) {
            await open(hub);
            const lesson = page.locator('a.lesson-link').first();
            if (await lesson.count() === 0) {
                problems.push('clicks ' + hub + ' has no lesson link');
                continue;
            }
            const href = await lesson.getAttribute('href');
            await lesson.click();
            await page.waitForLoadState('load');
            if (href && !page.url().includes(href.replace(/^\.\//, ''))) {
                problems.push('clicks ' + hub + ' did not open ' + href);
            }
        }

        for (const pair of LESSONS) {
            await open(pair[0]);
            await exerciseQuiz(page, problems, 'clicks ' + pair[0]);
            await exerciseCopy(page, problems, 'clicks ' + pair[0]);
            await open(pair[1]);
            const pro = await page.evaluate(() => document.body && document.body.getAttribute('data-access') === 'pro');
            const overlay = page.locator('#paywall-overlay');
            if (pro) {
                try {
                    await overlay.waitFor({ state: 'visible', timeout: 8000 });
                } catch (error) {
                    problems.push('clicks ' + pair[1] + ' Pro gate is not visible while logged out');
                }
            }
        }

        await open('auth/signup.html');
        if (!(await page.locator('#signupForm, form').first().isVisible())) problems.push('clicks signup form hidden');
        await open('auth/login.html');
        await page.fill('#email', 'dummy');
        await page.fill('#password', 'dummy');
        await page.click('#submitBtn');
        await page.waitForURL(/profile\.html/, { timeout: 20000 });
        await page.waitForTimeout(800);
        const badge = ((await page.locator('#subscriptionBadge').textContent()) || '').trim();
        const profileText = ((await page.locator('#subscriptionText').textContent()) || '').trim();
        if (!/Lifetime/i.test(badge) && !/lifetime/i.test(profileText)) {
            problems.push('clicks dummy profile is "' + badge + '" / "' + profileText + '"');
        }

        await open('pricing.html');
        paymentHit = false;
        const weekly = page.locator('#proWeeklyBtn');
        if (await weekly.count() && await weekly.isVisible()) await weekly.click();
        else {
            await page.evaluate(() => {
                if (window.FKTI_RazorpayCheckout) window.FKTI_RazorpayCheckout.openProCheckout('weekly');
            });
        }
        await page.waitForURL(/demo=1/, { timeout: 15000 });
        const msg = ((await page.locator('#profileError, .auth-error, body').first().textContent()) || '');
        if (!/no charge|Demo account/i.test(msg) && !page.url().includes('demo=1')) {
            problems.push('clicks dummy checkout message missing');
        }
        if (paymentHit) problems.push('clicks dummy checkout contacted a payment endpoint');
        if (/razorpay\.com/i.test(page.url())) problems.push('clicks dummy checkout left the site');

        await open('projects.html');
        const project = page.locator('a[href^="projects/"]').first();
        if (await project.count()) await project.click();
        await page.waitForLoadState('load');

        await open('pipeline-designer.html');
        const source = page.locator('#srcGrid .opt-btn[data-val="s3"]');
        if (await source.count()) {
            await source.click();
            const selected = await source.evaluate((el) => el.classList.contains('selected'));
            if (!selected) problems.push('clicks pipeline source did not select');
        } else problems.push('clicks pipeline source missing');

        await open('data-modelling.html');
        const topic = page.locator('.topic-title').first();
        if (await topic.count()) {
            await topic.click();
            const collapsed = await topic.evaluate((el) => {
                const body = el.nextElementSibling;
                return !!(body && body.classList.contains('collapsed'));
            });
            if (!collapsed) problems.push('clicks data modelling topic did not collapse');
        }

        await open('bus-matrix.html');
        await page.evaluate(() => { if (typeof loadRetailExample === 'function') loadRetailExample(); });
        const cells = await page.locator('.dot-cell').count();
        if (cells < 1) problems.push('clicks bus matrix retail example drew no cells');

        await open('distributed-computing.html');
        await page.locator('.tab-btn[data-tab="concepts"]').click();
        const concepts = page.locator('#tab-concepts');
        if (!(await concepts.isVisible())) problems.push('clicks distributed concepts tab hidden');

        await open('data-adventure.html');
        const cinema = page.locator('.theme-card[data-theme="cinema"]');
        await cinema.click();
        const active = await cinema.evaluate((el) => el.classList.contains('active'));
        if (!active) problems.push('clicks data adventure theme did not activate');

        await open('admin/analytics.html');
        const gate = page.locator('input, .auth-gate, .admin-signin-modal, .dashboard');
        if (await gate.count() === 0) problems.push('clicks admin shows neither a gate nor a dashboard');

        logs.forEach((line) => problems.push('clicks console ' + line));
    } catch (error) {
        problems.push('clicks failed: ' + (error && error.message ? error.message : String(error)));
    } finally {
        await context.close();
    }
    return problems;
}

async function main() {
    const base = (arg('--base') || process.env.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
    const mode = (arg('--mode') || process.env.VIEWPORT_MODE || '').toLowerCase();
    const group = arg('--group') || '';
    const jobs = Number(arg('--jobs') || process.env.VIEWPORT_JOBS || '4') || 4;
    const contract = assertBreakpointContract();
    const explicit = arg('--pages') || process.env.PAGES || '';
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch({
        headless: true,
        args: loopbackBase(base) ? ['--disable-web-security', '--disable-site-isolation-trials'] : [],
    });
    const problems = contract.slice();
    let checks = 0;
    let pages = [];
    try {
        if (explicit) {
            pages = explicit.split(',').map((item) => item.trim()).filter(Boolean);
            const widths = parseWidths(arg('--widths') || 'full');
            const result = await runMatrix(browser, base, pages, widths, jobs);
            checks += result.checks;
            problems.push(...result.problems);
            console.log('viewports: ' + widths.map((item) => item.width + 'x' + item.height).join(', '));
        } else if (mode === 'clicks') {
            pages = ['clicks'];
            const found = await runClicks(browser, base);
            checks += 1;
            problems.push(...found);
        } else if (mode === 'full') {
            pages = Array.from(new Set(REPRESENTATIVE));
            const result = await runMatrix(browser, base, pages, VIEWPORTS, jobs);
            checks += result.checks;
            problems.push(...result.problems);
            console.log('viewports: ' + VIEWPORTS.map((item) => item.width + 'x' + item.height).join(', '));
        } else if (mode === 'all') {
            pages = pagesForGroup('all');
            const sweep = await runMatrix(browser, base, pages, SWEEP_VIEWPORTS, jobs);
            checks += sweep.checks;
            problems.push(...sweep.problems);
            const extra = VIEWPORTS.filter((viewport) => !SWEEP_VIEWPORTS.some((item) => item.width === viewport.width && item.height === viewport.height));
            const representative = Array.from(new Set(REPRESENTATIVE));
            const rest = await runMatrix(browser, base, representative, extra, jobs);
            checks += rest.checks;
            problems.push(...rest.problems);
            const found = await runClicks(browser, base);
            checks += 1;
            problems.push(...found);
            console.log('viewports: sweep ' + SWEEP_VIEWPORTS.map((item) => item.width + 'x' + item.height).join(', ') +
                '; representative also ' + extra.map((item) => item.width + 'x' + item.height).join(', '));
        } else {
            pages = group ? pagesForGroup(group) : (mode === 'sweep' ? pagesForGroup('all') : [
                'postgres_course/hub.html',
                'python_course/s1-intro.html',
                'python_course/s6-functions1.html',
            ]);
            const widths = parseWidths(arg('--widths') || (mode === 'sweep' ? 'sweep' : 'full'));
            const result = await runMatrix(browser, base, pages, widths, jobs);
            checks += result.checks;
            problems.push(...result.problems);
            console.log('viewports: ' + widths.map((item) => item.width + 'x' + item.height).join(', '));
        }
    } finally {
        await browser.close();
    }
    if (mode !== 'clicks') summarize(pages.filter((pagePath) => pagePath !== 'clicks'), checks, problems.filter((line) => !line.startsWith('clicks')));
    else {
        console.log('checks: ' + checks);
        console.log('problems: ' + problems.length);
    }
    if (mode === 'all') {
        const clickProblems = problems.filter((line) => line.startsWith('clicks') || line.startsWith('css/') || line.startsWith('js/'));
        console.log('click-problems: ' + clickProblems.length);
    }
    problems.forEach((line) => console.log('FAIL ' + line));
    if (problems.length) {
        console.log('RESULT fail');
        process.exitCode = 1;
        return;
    }
    console.log('RESULT ok');
}

main().catch((error) => {
    console.error('RESULT fail');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
