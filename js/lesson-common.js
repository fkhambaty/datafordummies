/**
 * Shared lesson behavior for Data For Dummies.
 * Opt-in only. Safe to load on a page that does not use it.
 *
 * Does not bind .nav-link, .lesson-nav, or hub-script.js handlers.
 * Does not add a second click or scroll handler when .back-to-top or
 * #backToTop is already on the page.
 * Does not rename FKTI_Auth, FKTI_Progress, or fkti_ storage keys.
 *
 * Reveal: [data-dfd-reveal]
 * Back to top: inserted only when the page has no .back-to-top / #backToTop
 * Progress: body[data-course-id][data-lesson-id] records through
 *   FKTI_Progress.recordPage, or FKTI_Auth.getProgress/saveProgress.
 *   [data-dfd-complete] writes completion the same way.
 *   Missing ids or missing APIs do nothing.
 */
(function () {
    'use strict';

    if (window.__DFD_LESSON_COMMON__) return;
    window.__DFD_LESSON_COMMON__ = true;

    function reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function lessonFromBody() {
        var body = document.body;
        if (!body) return null;
        var courseId = body.getAttribute('data-course-id');
        var lessonId = body.getAttribute('data-lesson-id');
        if (!courseId || !lessonId) return null;
        var total = Number(body.getAttribute('data-total-lessons') || 0);
        if (!isFinite(total) || total < 0) total = 0;
        return {
            courseId: courseId,
            lessonId: lessonId,
            label: body.getAttribute('data-lesson-label') || '',
            total: total
        };
    }

    function sessionUser() {
        var auth = window.FKTI_Auth;
        if (!auth || !auth.getSession) return Promise.resolve(null);
        return auth.getSession().then(function (res) {
            var session = res && res.data && res.data.session;
            return session && session.user ? session.user : null;
        }).catch(function () { return null; });
    }

    function paintProgress(row, lesson) {
        var signedIn = !!row;
        var pct = signedIn ? Math.max(0, Math.min(100, Number(row.progress_pct || 0))) : 0;
        var completed = signedIn && Array.isArray(row.completed_lesson_ids) &&
            row.completed_lesson_ids.indexOf(lesson.lessonId) !== -1;
        document.querySelectorAll('[data-dfd-progress-fill]').forEach(function (el) {
            el.style.width = pct + '%';
        });
        document.querySelectorAll('[data-dfd-progress-bar]').forEach(function (el) {
            el.setAttribute('role', 'progressbar');
            el.setAttribute('aria-valuemin', '0');
            el.setAttribute('aria-valuemax', '100');
            el.setAttribute('aria-valuenow', String(Math.round(pct)));
            el.setAttribute('aria-label', 'Course progress');
        });
        document.querySelectorAll('[data-dfd-progress-label]').forEach(function (el) {
            el.textContent = signedIn
                ? ('Course progress ' + Math.round(pct) + '%')
                : 'Sign in to save your place.';
        });
        if (completed) {
            document.querySelectorAll('[data-dfd-complete]').forEach(function (button) {
                button.setAttribute('aria-pressed', 'true');
                button.textContent = 'Completed';
            });
        }
    }

    function refreshProgress(lesson) {
        return sessionUser().then(function (user) {
            if (!user) {
                paintProgress(null, lesson);
                return;
            }
            if (window.FKTI_Progress && window.FKTI_Progress.getProgress) {
                return window.FKTI_Progress.getProgress().then(function (rows) {
                    var match = (rows || []).filter(function (item) {
                        return item && item.course_id === lesson.courseId;
                    })[0] || null;
                    paintProgress(match || { progress_pct: 0, completed_lesson_ids: [] }, lesson);
                });
            }
            var auth = window.FKTI_Auth;
            if (!auth || !auth.getProgress) {
                paintProgress(null, lesson);
                return;
            }
            return auth.getProgress(lesson.courseId).then(function (res) {
                var row = (res && res.data && res.data[0]) || { progress_pct: 0, completed_lesson_ids: [] };
                paintProgress(row, lesson);
            });
        }).catch(function () {
            paintProgress(null, lesson);
        });
    }

    function recordVisit(lesson) {
        if (window.FKTI_Progress && window.FKTI_Progress.recordPage) {
            return window.FKTI_Progress.recordPage(lesson.courseId, lesson.lessonId, lesson.label);
        }
        var auth = window.FKTI_Auth;
        if (!auth || !auth.getProgress || !auth.saveProgress) return Promise.resolve();
        return sessionUser().then(function (user) {
            if (!user) return;
            return auth.getProgress(lesson.courseId).then(function (res) {
                if (!res || res.error) return;
                var row = (res.data && res.data[0]) || {};
                return auth.saveProgress({
                    course_id: lesson.courseId,
                    last_lesson_id: lesson.lessonId,
                    last_lesson_label: lesson.label || row.last_lesson_label || null,
                    last_visited_at: new Date().toISOString(),
                    progress_pct: Number(row.progress_pct || 0),
                    completed_lesson_ids: row.completed_lesson_ids || []
                });
            });
        }).catch(function () {});
    }

    function sayStatus(button, text) {
        var host = button && button.parentNode;
        var status = host ? host.querySelector('[data-dfd-complete-status]') : null;
        if (!status) return;
        status.setAttribute('role', 'status');
        status.textContent = text;
    }

    function completeLesson(lesson, button) {
        return sessionUser().then(function (user) {
            if (!user) {
                sayStatus(button, 'Sign in to save your place.');
                return;
            }
            var auth = window.FKTI_Auth;
            if (auth && auth.completeLesson) {
                return auth.completeLesson(lesson.courseId, lesson.lessonId).then(function (saved) {
                    if (!saved || saved.error) {
                        sayStatus(button, (saved && saved.error && saved.error.message) || 'Lesson could not be saved.');
                        return;
                    }
                    var follow = auth.saveProgress
                        ? auth.saveProgress({
                            course_id: lesson.courseId,
                            last_lesson_id: lesson.lessonId,
                            last_lesson_label: lesson.label || null,
                            last_visited_at: new Date().toISOString()
                        })
                        : Promise.resolve(null);
                    return follow.then(function (place) {
                        if (place && place.error) {
                            sayStatus(button, 'The lesson was saved, but the continue link could not be updated.');
                            return;
                        }
                        sayStatus(button, 'Lesson saved on your account.');
                        return refreshProgress(lesson);
                    });
                });
            }
            if (window.FKTI_Progress && window.FKTI_Progress.markComplete) {
                window.FKTI_Progress.markComplete(lesson.courseId, lesson.lessonId, lesson.total);
                sayStatus(button, 'Lesson saved.');
            }
        }).catch(function () {
            sayStatus(button, 'Progress could not be saved.');
        });
    }

    function setupProgress() {
        var lesson = lessonFromBody();
        if (!lesson) return;
        document.querySelectorAll('[data-dfd-complete]').forEach(function (button) {
            button.classList.add('dfd-hit');
            if (!button.getAttribute('type')) button.setAttribute('type', 'button');
            button.addEventListener('click', function () {
                completeLesson(lesson, button);
            });
        });
        Promise.resolve(recordVisit(lesson)).then(function () {
            return refreshProgress(lesson);
        }).catch(function () {
            return refreshProgress(lesson);
        });
    }

    function setupReveal() {
        var nodes = document.querySelectorAll('[data-dfd-reveal]');
        if (!nodes.length) return;
        if (reducedMotion() || typeof IntersectionObserver !== 'function') {
            nodes.forEach(function (el) { el.classList.add('dfd-revealed'); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.remove('dfd-reveal-pending');
                entry.target.classList.add('dfd-revealed');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        nodes.forEach(function (el) {
            el.classList.add('dfd-reveal-pending');
            observer.observe(el);
        });
    }

    function setupBackTop() {
        if (document.querySelector('.back-to-top, #backToTop, [data-dfd-back-top]')) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'dfd-back-top dfd-hit';
        button.setAttribute('data-dfd-back-top', '');
        button.setAttribute('aria-label', 'Back to top');
        button.textContent = 'Top';
        button.hidden = true;
        document.body.appendChild(button);
        function paint() {
            var show = window.scrollY > 320;
            button.hidden = !show;
            button.classList.toggle('dfd-back-top-on', show);
        }
        button.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
        });
        paint();
        window.addEventListener('scroll', paint, { passive: true });
    }

    function setupDiagrams() {
        document.querySelectorAll('[data-dfd-diagram]').forEach(function (diagram) {
            var buttons = diagram.querySelectorAll('[data-dfd-diagram-step]');
            if (!buttons.length) return;
            function show(id) {
                diagram.querySelectorAll('[data-dfd-diagram-panel]').forEach(function (panel) {
                    panel.hidden = panel.getAttribute('data-dfd-diagram-panel') !== id;
                });
                buttons.forEach(function (item) {
                    var on = item.getAttribute('data-dfd-diagram-step') === id;
                    item.setAttribute('aria-pressed', on ? 'true' : 'false');
                    item.classList.toggle('dfd-diagram-active', on);
                });
            }
            buttons.forEach(function (item) {
                if (!item.getAttribute('type')) item.setAttribute('type', 'button');
                item.classList.add('dfd-diagram-control', 'dfd-hit');
                item.addEventListener('click', function () {
                    show(item.getAttribute('data-dfd-diagram-step'));
                });
            });
            var initial = null;
            buttons.forEach(function (item) {
                if (!initial && item.getAttribute('aria-pressed') === 'true') initial = item;
            });
            show((initial || buttons[0]).getAttribute('data-dfd-diagram-step'));
        });
    }

    function init() {
        setupReveal();
        setupBackTop();
        setupDiagrams();
        setupProgress();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
