/**
 * Progress tracking — where the user stopped, which course/lesson, completion %.
 * Requires FKTI_Auth (Supabase). Call recordPage() on lesson pages; getProgress() on profile.
 */
(function () {
    'use strict';

    function getSupabase() {
        return window.FKTI_Auth && window.FKTI_Auth.getSupabase ? window.FKTI_Auth.getSupabase() : null;
    }

    function getUserId() {
        return new Promise(function (resolve) {
            if (!window.FKTI_Auth || !window.FKTI_Auth.getSession) {
                resolve(null);
                return;
            }
            window.FKTI_Auth.getSession().then(function (res) {
                var session = res.data && res.data.session;
                resolve(session && session.user ? session.user.id : null);
            }).catch(function () { resolve(null); });
        });
    }

    /**
     * Record current page as last visited for this course. Call on lesson/course page load.
     * @param {string} courseId - e.g. 'python', 'airflow', 'llm'
     * @param {string} lessonId - e.g. 's6-functions1', 'index'
     * @param {string} [lessonLabel] - e.g. 'Session 6: Functions'
     */
    function recordPage(courseId, lessonId, lessonLabel) {
        if (!courseId) return Promise.resolve();
        getUserId().then(function (userId) {
            if (!userId) return;
            if (!window.FKTI_Auth || !window.FKTI_Auth.saveProgress) return;
            window.FKTI_Auth.saveProgress({
                course_id: courseId,
                last_lesson_id: lessonId || null,
                last_lesson_label: lessonLabel || null,
                last_visited_at: new Date().toISOString()
            });
        });
    }

    /**
     * Mark a lesson as completed (add to completed_lesson_ids and recalc progress_pct).
     * totalLessons = total number of lessons in the course for percentage.
     */
    function markComplete(courseId, lessonId, totalLessons) {
        if (!courseId || !lessonId) return Promise.resolve();
        getUserId().then(function (userId) {
            if (!userId) return;
            if (!window.FKTI_Auth || !window.FKTI_Auth.getProgress || !window.FKTI_Auth.saveProgress) return;
            window.FKTI_Auth.getProgress(courseId).then(function (res) {
                var row = (res.data && res.data[0]) || {};
                var existing = row.completed_lesson_ids || [];
                if (existing.indexOf(lessonId) !== -1) return;
                var updated = existing.concat([lessonId]);
                var pct = totalLessons > 0 ? Math.min(100, Math.round((updated.length / totalLessons) * 100)) : 0;
                window.FKTI_Auth.saveProgress({
                    course_id: courseId,
                    completed_lesson_ids: updated,
                    progress_pct: pct
                });
            });
        });
    }

    /**
     * Get all progress rows for the current user (for profile page).
     * @returns {Promise<Array<{course_id, last_lesson_id, last_lesson_label, last_visited_at, progress_pct}>>}
     */
    function getProgress() {
        return getUserId().then(function (userId) {
            if (!userId) return [];
            if (!window.FKTI_Auth || !window.FKTI_Auth.getProgress) return [];
            return window.FKTI_Auth.getProgress().then(function (res) {
                return res.data || [];
            });
        }).catch(function () { return []; });
    }

    window.FKTI_Progress = {
        recordPage: recordPage,
        markComplete: markComplete,
        getProgress: getProgress,
        getUserId: getUserId
    };
})();
