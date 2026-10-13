/**
 * Course hub facts: continue link, reading-time estimate, prerequisites,
 * outcomes, and capstone. Numbers come from data/course-catalog.json.
 */
(function () {
    'use strict';

    var script = document.currentScript || document.querySelector('script[src*="hub-learning.js"]');
    if (!script) return;
    var src = script.getAttribute('src') || '';
    var prefix = src.replace(/js\/hub-learning\.js(?:\?.*)?$/, '');

    function relLink(sitePath) {
        var parts = (location.pathname || '').split('/').filter(Boolean);
        var folder = parts.length > 1 ? parts[parts.length - 2] : '';
        var target = String(sitePath || '').split('/');
        var ups = (src.match(/\.\.\//g) || []).length;
        if (target.length >= 2 && target[target.length - 2] === folder) {
            return target[target.length - 1];
        }
        return '../'.repeat(ups) + sitePath;
    }

    function lessonHref(course, lessonId) {
        var match = (course.lessons || []).filter(function (lesson) {
            return lesson.id === lessonId;
        })[0];
        if (match) return relLink(match.href);
        if (course.lessons && course.lessons[0]) return relLink(course.lessons[0].href);
        return relLink(course.hub);
    }

    function render(course, progressRow) {
        var host = document.querySelector('.header') || document.querySelector('h1');
        if (!host || document.querySelector('.dfd-hub-learning')) return;
        var panel = document.createElement('section');
        panel.className = 'dfd-hub-learning';
        panel.setAttribute('aria-label', 'Course guide');

        var continueLink = document.createElement('a');
        continueLink.className = 'dfd-continue';
        if (progressRow && (progressRow.last_lesson_id || progressRow.last_lesson_label)) {
            continueLink.href = lessonHref(course, progressRow.last_lesson_id);
            continueLink.textContent = 'Continue: ' + (progressRow.last_lesson_label || progressRow.last_lesson_id);
        } else {
            continueLink.href = relLink('auth/login.html');
            continueLink.textContent = 'Sign in to continue where you left off';
        }

        var heading = document.createElement('h2');
        heading.textContent = 'How this course is laid out';
        panel.appendChild(heading);
        panel.appendChild(continueLink);

        var time = document.createElement('p');
        time.textContent = 'About ' + course.minutes + ' minutes of reading across ' +
            course.lessons.length + ' lessons. ' + (course.estimate || '');
        panel.appendChild(time);

        var prereq = document.createElement('p');
        prereq.textContent = 'Prerequisites: ' + course.prerequisites;
        panel.appendChild(prereq);

        var outcome = document.createElement('p');
        outcome.textContent = 'Outcomes: ' + course.outcomes;
        panel.appendChild(outcome);

        var cap = document.createElement('p');
        if (course.capstone && course.capstone.href) {
            var capLink = document.createElement('a');
            capLink.href = relLink(course.capstone.href);
            capLink.textContent = course.capstone.label || 'Capstone';
            cap.appendChild(document.createTextNode('Capstone evidence: '));
            cap.appendChild(capLink);
            cap.appendChild(document.createTextNode('. ' + course.capstone_note));
        } else {
            cap.textContent = 'Capstone evidence: ' + course.capstone_note;
        }
        panel.appendChild(cap);

        var vendor = document.createElement('p');
        vendor.textContent = 'Vendor note checked ' + course.vendor_checked_on + '. ' + course.vendor_note;
        panel.appendChild(vendor);

        var list = document.createElement('ol');
        list.className = 'dfd-hub-lessons';
        course.lessons.forEach(function (lesson, index) {
            var item = document.createElement('li');
            var link = document.createElement('a');
            link.href = relLink(lesson.href);
            link.textContent = (index + 1) + '. ' + (lesson.label || lesson.id);
            var minutes = document.createElement('span');
            minutes.textContent = lesson.minutes + ' min';
            item.appendChild(link);
            item.appendChild(minutes);
            list.appendChild(item);
        });
        panel.appendChild(list);

        if (host.classList && host.classList.contains('header')) host.insertAdjacentElement('afterend', panel);
        else host.insertAdjacentElement('afterend', panel);

        var auth = window.FKTI_Auth;
        if (!progressRow && auth && auth.getProgress) {
            auth.getProgress(course.id).then(function (res) {
                var row = res && res.data && res.data[0];
                if (!row) return;
                continueLink.href = lessonHref(course, row.last_lesson_id);
                continueLink.textContent = 'Continue: ' + (row.last_lesson_label || row.last_lesson_id || 'last lesson');
            }).catch(function () {});
        }
    }

    fetch(prefix + 'data/course-catalog.json')
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (catalog) {
            if (!catalog || !catalog.courses) return;
            var courseId = document.body.getAttribute('data-course-id');
            var course = courseId ? catalog.courses[courseId] : null;
            if (!course) return;
            var page = (location.pathname || '').split('/').pop();
            var hubName = (course.hub || '').split('/').pop();
            if (page && hubName && page !== hubName) return;
            render(course, null);
        })
        .catch(function () {});
})();
