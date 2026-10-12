/**
 * Project section-level paywall.
 * Locks .pro-locked-wrapper sections; unlocks for Pro/Admin users.
 * Works with the Cloudflare Worker-backed FKTI_Auth; falls back to locked.
 */
(function () {
    'use strict';

    function lockSections() {
        document.querySelectorAll('.pro-locked-wrapper').forEach(function (w) {
            w.classList.add('is-locked');
        });
    }
    function unlockSections() {
        document.querySelectorAll('.pro-locked-wrapper').forEach(function (w) {
            w.classList.remove('is-locked');
            var overlay = w.querySelector('.pro-lock-overlay');
            if (overlay) overlay.style.display = 'none';
        });
    }

    function init() {
        var auth = window.FKTI_Auth;
        if (!auth || !auth.getSession) { lockSections(); return; }
        auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (!session) { lockSections(); return; }
            auth.getProfile(session.user.id).then(function (profRes) {
                var p = profRes.data;
                var isAdmin = p && p.role === 'admin';
                var isPro = p && (p.subscription_status === 'active' || p.subscription_status === 'pro');
                if (p && p.subscription_end_date && !isAdmin) {
                    if (new Date(p.subscription_end_date) < new Date()) isPro = false;
                }
                if (isAdmin || isPro) unlockSections();
                else lockSections();
            }).catch(function () { lockSections(); });
        }).catch(function () { lockSections(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.FKTI_ProjectPaywall = { init: init, lock: lockSections, unlock: unlockSections };
})();
