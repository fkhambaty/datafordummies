/**
 * Hides instructor-only static pages unless the Worker profile is an admin.
 * This is a UI access guard; no secret data should be embedded in static HTML.
 */
(function () {
    'use strict';

    function deny(message) {
        document.body.innerHTML = [
            '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Inter,-apple-system,sans-serif;background:#f8fafc;">',
            '<section style="max-width:440px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px;">',
            '<h1 style="font-size:1.4rem;margin:0 0 10px;">Instructor access</h1>',
            '<p style="color:#64748b;line-height:1.6;">' + message + '</p>',
            '<a href="../auth/login.html?returnTo=' + encodeURIComponent(window.location.pathname) + '" style="display:inline-block;margin-top:12px;padding:12px 20px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;">Log in</a>',
            '</section></main>'
        ].join('');
    }

    if (!window.FKTI_Auth || !window.FKTI_Auth.getSession || !window.FKTI_Auth.getProfile) {
        deny('The account service is unavailable.');
        return;
    }
    window.FKTI_Auth.getSession().then(function (result) {
        var session = result.data && result.data.session;
        if (!session) {
            deny('Log in with an owner account to open this page.');
            return;
        }
        window.FKTI_Auth.getProfile().then(function (profileResult) {
            if (!profileResult.data || profileResult.data.role !== 'admin') {
                deny('This page is available only to a Data For Dummies owner account.');
            }
        }).catch(function () {
            deny('Admin access could not be verified.');
        });
    }).catch(function () {
        deny('Admin access could not be verified.');
    });
})();
