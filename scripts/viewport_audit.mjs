#!/usr/bin/env node
/**
 * Open a served copy of the site and look for HTTP errors, page errors,
 * console errors, and document overflow.
 *
 * Playwright is loaded from PLAYWRIGHT_MODULE, then ./node_modules, then the
 * Okavo checkout next to this repo. No package install is required for that.
 *
 *   python3 -m http.server 8080
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8080
 *   node scripts/viewport_audit.mjs --base http://127.0.0.1:8080 --pages index.html,pricing.html
 *
 * BASE_URL and PAGES (comma-separated) override the defaults.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const VIEWPORTS = [
    { width: 390, height: 667 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 820, height: 1180 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
];

const DEFAULT_PAGES = [
    'postgres_course/hub.html',
    'python_course/s1-intro.html',
    'python_course/s6-functions1.html',
];

function arg(name) {
    const index = process.argv.indexOf(name);
    if (index === -1) return '';
    return process.argv[index + 1] || '';
}

function loadPlaywright() {
    const candidates = [
        process.env.PLAYWRIGHT_MODULE || '',
        new URL('../node_modules/playwright/index.js', import.meta.url).pathname,
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

function pagesFromArgs() {
    const raw = arg('--pages') || process.env.PAGES || DEFAULT_PAGES.join(',');
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
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
    const quiz = page.locator('[data-dfd-quiz]');
    if (await quiz.count() === 0) return;
    // A visible Pro overlay is the gate working. Do not click through it.
    const locked = await page.evaluate(() => {
        const overlay = document.getElementById('paywall-overlay');
        if (!overlay) return false;
        const style = window.getComputedStyle(overlay);
        return style.display !== 'none' && style.visibility !== 'hidden' && overlay.getAttribute('aria-hidden') !== 'true';
    });
    if (locked) return;
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
    if (!/Not quite/i.test(text)) {
        problems.push(label + ' quiz feedback was "' + text + '"');
    }
}

async function main() {
    const base = (arg('--base') || process.env.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
    const pages = pagesFromArgs();
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch({ headless: true });
    const problems = [];
    let checks = 0;
    try {
        for (const pagePath of pages) {
            let exercised = false;
            for (const viewport of VIEWPORTS) {
                const label = pagePath + ' @ ' + viewport.width + 'x' + viewport.height;
                const context = await browser.newContext({ viewport });
                const page = await context.newPage();
                const logs = [];
                page.on('pageerror', (error) => {
                    logs.push('pageerror: ' + (error && error.message ? error.message : String(error)));
                });
                page.on('console', (msg) => {
                    if (msg.type() === 'error') logs.push('console: ' + msg.text());
                });
                page.on('requestfailed', (request) => {
                    if (request.resourceType() === 'document') {
                        const failure = request.failure();
                        logs.push('document failed: ' + (failure ? failure.errorText : request.url()));
                    }
                });
                let response = null;
                try {
                    response = await page.goto(base + '/' + pagePath.replace(/^\//, ''), {
                        waitUntil: 'load',
                        timeout: 30000,
                    });
                } catch (error) {
                    problems.push(label + ' navigation: ' + error.message);
                    await context.close();
                    checks += 1;
                    continue;
                }
                if (!response) problems.push(label + ' returned no response');
                else if (response.status() >= 400) problems.push(label + ' HTTP ' + response.status());
                const overflow = await page.evaluate(() => {
                    const root = document.documentElement;
                    const body = document.body;
                    const width = window.innerWidth;
                    const doc = root ? root.scrollWidth - width : 0;
                    const box = body ? body.scrollWidth - width : 0;
                    return Math.max(doc, box);
                });
                if (overflow > 1) problems.push(label + ' document overflow ' + overflow + 'px');
                logs.forEach((line) => problems.push(label + ' ' + line));
                if (!exercised) {
                    await exerciseQuiz(page, problems, label);
                    await exerciseCopy(page, problems, label);
                    exercised = true;
                }
                checks += 1;
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }
    console.log('viewports: ' + VIEWPORTS.map((item) => item.width + 'x' + item.height).join(', '));
    console.log('pages: ' + pages.join(', '));
    console.log('checks: ' + checks);
    console.log('problems: ' + problems.length);
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
