/**
 * Opt-in knowledge checks. Load this on a lesson that uses [data-dfd-quiz].
 * Old lessons keep their own checkQ / checkQuiz handlers and [data-quiz]
 * markup. This file does not query those and does not rewrite them.
 *
 * Markup:
 *   <section data-dfd-quiz data-explanation="Optional sentence.">
 *     <p id="q1" data-dfd-prompt>Question</p>
 *     <div data-dfd-choices>
 *       <button type="button" data-correct="true">Yes</button>
 *       <button type="button" data-correct="false">No</button>
 *     </div>
 *     <p data-dfd-feedback hidden></p>
 *     <p data-dfd-explain hidden>Optional longer explanation.</p>
 *   </section>
 *
 * Click, Enter, and Space answer immediately. Arrow keys move between choices.
 * A correct choice is marked in text as well as color. data-explanation is
 * optional; [data-dfd-explain] is shown after an answer when present.
 */
(function () {
    'use strict';

    if (window.__DFD_QUIZ__) return;
    window.__DFD_QUIZ__ = true;

    function choices(quiz) {
        return Array.prototype.filter.call(quiz.querySelectorAll('[data-correct]'), function (el) {
            return el.closest('[data-dfd-quiz]') === quiz;
        });
    }

    function isCorrect(el) {
        return String(el.getAttribute('data-correct') || '').toLowerCase() === 'true';
    }

    function prepare(quiz) {
        if (quiz.getAttribute('data-dfd-quiz-ready') === 'true') return;
        quiz.setAttribute('data-dfd-quiz-ready', 'true');
        var prompt = quiz.querySelector('[data-dfd-prompt]');
        var group = quiz.querySelector('[data-dfd-choices]') || quiz;
        if (!group.getAttribute('role')) group.setAttribute('role', 'group');
        if (prompt) {
            if (!prompt.id) prompt.id = 'dfd-quiz-prompt-' + Math.random().toString(36).slice(2, 8);
            group.setAttribute('aria-labelledby', prompt.id);
        }
        var feedback = quiz.querySelector('[data-dfd-feedback]');
        if (feedback) {
            feedback.setAttribute('role', 'status');
            feedback.setAttribute('aria-live', 'polite');
        }
        choices(quiz).forEach(function (el) {
            el.classList.add('dfd-quiz-choice', 'dfd-hit');
            if (el.tagName === 'BUTTON' && !el.getAttribute('type')) el.setAttribute('type', 'button');
            if (el.tagName !== 'BUTTON') {
                if (!el.getAttribute('role')) el.setAttribute('role', 'button');
                if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
            }
        });
    }

    function answer(quiz, chosen) {
        if (!quiz || !chosen || quiz.getAttribute('data-dfd-answered') === 'true') return;
        if (chosen.closest('[data-dfd-quiz]') !== quiz) return;
        var ok = isCorrect(chosen);
        choices(quiz).forEach(function (el) {
            el.setAttribute('aria-disabled', 'true');
            if (isCorrect(el)) el.classList.add('dfd-quiz-correct');
            else if (el === chosen) el.classList.add('dfd-quiz-wrong');
        });
        chosen.setAttribute('aria-pressed', 'true');
        quiz.setAttribute('data-dfd-answered', 'true');
        var verdict = ok ? 'Correct.' : 'Not quite.';
        var feedback = quiz.querySelector('[data-dfd-feedback]');
        var explain = quiz.querySelector('[data-dfd-explain]');
        var extra = quiz.getAttribute('data-explanation') || '';
        if (feedback) {
            feedback.hidden = false;
            feedback.textContent = verdict;
        }
        if (explain) {
            if (!explain.textContent.trim() && extra) explain.textContent = extra;
            explain.hidden = false;
        } else if (extra && feedback) {
            feedback.textContent = verdict + ' ' + extra;
        }
    }

    function move(quiz, current, delta) {
        var list = choices(quiz);
        if (!list.length) return;
        var index = list.indexOf(current);
        if (index < 0) index = 0;
        var next = list[(index + delta + list.length) % list.length];
        if (next && next.focus) next.focus();
    }

    function onClick(event) {
        var choice = event.target.closest && event.target.closest('[data-correct]');
        if (!choice) return;
        var quiz = choice.closest('[data-dfd-quiz]');
        if (!quiz) return;
        answer(quiz, choice);
    }

    function onKey(event) {
        var choice = event.target.closest && event.target.closest('[data-correct]');
        if (!choice) return;
        var quiz = choice.closest('[data-dfd-quiz]');
        if (!quiz) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(quiz, choice, 1);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(quiz, choice, -1);
        } else if ((event.key === 'Enter' || event.key === ' ') && choice.tagName !== 'BUTTON') {
            event.preventDefault();
            answer(quiz, choice);
        }
    }

    function init() {
        document.querySelectorAll('[data-dfd-quiz]').forEach(prepare);
    }

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.DFD_Quiz = { init: init };
})();
