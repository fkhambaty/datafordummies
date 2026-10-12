/**
 * Paywall — for pages with data-access="pro", show upgrade overlay if user is not Pro.
 * Requires FKTI_Auth, which reads the current profile from the Cloudflare Worker.
 */
(function () {
    'use strict';

    var OVERLAY_ID = 'paywall-overlay';

    function getAccessLevel() {
        var level = document.body.getAttribute('data-access');
        return level === 'pro' ? 'pro' : 'free';
    }

    function findPrefix() {
        if (window.FKTI_BASE_URL) return window.FKTI_BASE_URL.replace(/\/$/, '') + '/';
        var scripts = document.querySelectorAll('script[src*="paywall"]');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src') || '';
            var idx = src.indexOf('js/paywall');
            if (idx >= 0) return src.substring(0, idx);
        }
        return '../';
    }

    function createOverlay() {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) return existing;
        var prefix = findPrefix();
        var pricingHref = prefix + 'pricing.html';
        var homeHref = prefix + 'index.html';
        var wrap = document.createElement('div');
        wrap.id = OVERLAY_ID;
        wrap.setAttribute('aria-hidden', 'false');
        wrap.style.cssText = [
            'position:fixed;inset:0;z-index:9999;',
            'background:rgba(15,23,42,0.92);backdrop-filter:blur(12px);',
            'display:flex;align-items:center;justify-content:center;padding:24px;',
            'font-family:Inter,-apple-system,sans-serif;'
        ].join('');
        wrap.innerHTML = [
            '<div style="max-width:420px;text-align:center;background:rgba(255,255,255,0.98);border-radius:16px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">',
            '<h2 style="margin:0 0 12px;font-size:1.5rem;font-weight:700;color:#1e293b;">Pro Course</h2>',
            '<p style="margin:0 0 24px;color:#64748b;line-height:1.6;">This content is part of Pro. Unlock all advanced courses, projects, and certifications for ₹99/week.</p>',
            '<a href="' + pricingHref + '" id="paywall-cta" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:12px;font-weight:600;text-decoration:none;">Upgrade to Pro</a>',
            '<p style="margin:16px 0 0;font-size:0.875rem;"><a href="' + homeHref + '" style="color:#64748b;">Back to home</a></p>',
            '</div>'
        ].join('');
        document.body.appendChild(wrap);
        return wrap;
    }

    function showOverlay() {
        var overlay = createOverlay();
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideOverlay() {
        var overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    function init() {
        if (getAccessLevel() !== 'pro') {
            hideOverlay();
            return;
        }

        // In Android app: respect native Pro status (set by app after login/IAP)
        if (typeof window.Android !== 'undefined' && typeof window.Android.getProStatus === 'function') {
            try {
                if (window.Android.getProStatus() === 'true') {
                    hideOverlay();
                    return;
                }
            } catch (e) {}
        }

        var auth = window.FKTI_Auth;
        if (!auth || !auth.getSession) {
            showOverlay();
            return;
        }

        auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (!session) {
                showOverlay();
                return;
            }
            auth.getProfile(session.user.id).then(function (profRes) {
                var profile = profRes.data;
                var isAdmin = profile && profile.role === 'admin';
                var isPro = profile && (profile.subscription_status === 'active' || profile.subscription_status === 'pro');
                if (profile && profile.subscription_end_date && !isAdmin) {
                    var end = new Date(profile.subscription_end_date);
                    if (end < new Date()) isPro = false;
                }
                if (isAdmin || isPro) hideOverlay();
                else showOverlay();
            }).catch(function () {
                showOverlay();
            });
        }).catch(function () {
            showOverlay();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.FKTI_Paywall = { init: init, showOverlay: showOverlay, hideOverlay: hideOverlay };
})();
