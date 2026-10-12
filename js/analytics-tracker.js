/**
 * FKTI Analytics Tracker
 * Tracks page views, events, visitor info, IP/geo across all devices.
 * Self-contained: loads Supabase CDN if not already present.
 * Include on every page: <script src="js/analytics-tracker.js"></script>
 * (or ../js/analytics-tracker.js from subdirectories)
 */
(function () {
    'use strict';

    var SUPABASE_URL = 'https://gfskxboxvzuwozknfulo.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmc2t4Ym94dnp1d296a25mdWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTM2NjgsImV4cCI6MjA4OTEyOTY2OH0.K01uHrgxIeXKYhr_-Wy-CLEtIqDOb_sxPniZaJBGLy4';

    var SESSION_TIMEOUT = 30 * 60 * 1000;
    var GEO_API = 'https://ipapi.co/json/';
    var _sb = null;
    var _geo = null;
    var _visitorId = getOrCreateVisitorId();
    var _sessionId = getOrCreateSession();
    var _userId = null;

    function getOrCreateVisitorId() {
        var key = 'fkti_vid';
        var id = localStorage.getItem(key);
        if (!id) {
            id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(key, id);
        }
        return id;
    }

    function getOrCreateSession() {
        var key = 'fkti_sid';
        var tsKey = 'fkti_sid_ts';
        var now = Date.now();
        var lastTs = parseInt(localStorage.getItem(tsKey) || '0', 10);
        var sid = localStorage.getItem(key);

        if (!sid || (now - lastTs) > SESSION_TIMEOUT) {
            sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem(key, sid);
        }
        localStorage.setItem(tsKey, String(now));
        return sid;
    }

    function detectDevice() {
        var ua = navigator.userAgent || '';
        if (/Mobi|Android/i.test(ua)) return 'mobile';
        if (/Tablet|iPad/i.test(ua)) return 'tablet';
        return 'desktop';
    }

    function detectBrowser() {
        var ua = navigator.userAgent || '';
        if (ua.indexOf('Firefox') > -1) return 'Firefox';
        if (ua.indexOf('Edg') > -1) return 'Edge';
        if (ua.indexOf('Chrome') > -1) return 'Chrome';
        if (ua.indexOf('Safari') > -1) return 'Safari';
        if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
        return 'Other';
    }

    function detectOS() {
        var ua = navigator.userAgent || '';
        if (ua.indexOf('Win') > -1) return 'Windows';
        if (ua.indexOf('Mac') > -1) return 'macOS';
        if (ua.indexOf('Linux') > -1) return 'Linux';
        if (ua.indexOf('Android') > -1) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        return 'Other';
    }

    function getPagePath() {
        var path = window.location.pathname;
        if (window.location.protocol === 'file:') {
            var parts = path.split('/');
            var idx = parts.indexOf('Website');
            if (idx > -1) return '/' + parts.slice(idx + 1).join('/');
            return '/' + (parts.pop() || 'index.html');
        }
        return path || '/';
    }

    function fetchGeo(cb) {
        if (_geo) { cb(_geo); return; }
        var cached = sessionStorage.getItem('fkti_geo');
        if (cached) {
            try { _geo = JSON.parse(cached); cb(_geo); return; } catch (e) { /* fall through */ }
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', GEO_API, true);
        xhr.timeout = 4000;
        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    _geo = JSON.parse(xhr.responseText);
                    sessionStorage.setItem('fkti_geo', xhr.responseText);
                } catch (e) { _geo = {}; }
            } else { _geo = {}; }
            cb(_geo);
        };
        xhr.onerror = xhr.ontimeout = function () { _geo = {}; cb(_geo); };
        xhr.send();
    }

    function ensureSupabase(cb) {
        if (_sb) { cb(_sb); return; }
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            cb(_sb); return;
        }
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.onload = function () {
            if (window.supabase && window.supabase.createClient) {
                _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
            cb(_sb);
        };
        s.onerror = function () { cb(null); };
        document.head.appendChild(s);
    }

    function getUserId(sb) {
        if (_userId) return Promise.resolve(_userId);
        if (!sb) return Promise.resolve(null);
        return sb.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            _userId = session ? session.user.id : null;
            return _userId;
        }).catch(function () { return null; });
    }

    function trackPageView() {
        if (!window.FKTI_Auth || !window.FKTI_Auth.track) return;
        fetchGeo(function (geo) {
            window.FKTI_Auth.track('/v1/page-view', {
                visitor_id: _visitorId,
                session_id: _sessionId,
                page_path: getPagePath(),
                page_title: document.title || '',
                referrer: document.referrer || '',
                country: (geo && geo.country_name) || '',
                city: (geo && geo.city) || '',
                device_type: detectDevice(),
                browser: detectBrowser(),
                os: detectOS(),
                screen_size: screen.width + 'x' + screen.height
            });
        });
    }

    function trackEvent(eventType, eventData) {
        if (!window.FKTI_Auth || !window.FKTI_Auth.track) return;
        fetchGeo(function (geo) {
            window.FKTI_Auth.track('/v1/event', {
                visitor_id: _visitorId,
                session_id: _sessionId,
                event_type: eventType,
                event_data: eventData || {},
                page_path: getPagePath(),
                country: (geo && geo.country_name) || ''
            });
        });
    }

    function autoTrackClicks() {
        document.addEventListener('click', function (e) {
            var el = e.target.closest('a, button');
            if (!el) return;

            var href = el.getAttribute('href') || '';
            var text = (el.textContent || '').trim().substring(0, 80);

            if (href.indexOf('pricing') > -1 || text.indexOf('Upgrade') > -1 || text.indexOf('Pro') > -1) {
                trackEvent('pricing_click', { text: text, href: href });
            }

            if (el.id === 'proCheckoutBtn' || href.indexOf('razorpay') > -1) {
                trackEvent('checkout_click', { text: text, href: href });
            }

            if (href.indexOf('_course') > -1 || href.indexOf('course') > -1) {
                trackEvent('course_click', { text: text, href: href });
            }

            if (href.indexOf('projects/') > -1 || href.indexOf('projects.html') > -1) {
                trackEvent('project_click', { text: text, href: href });
            }
        }, true);
    }

    function autoTrackPricingPage() {
        var path = getPagePath();
        if (path.indexOf('pricing') > -1) {
            trackEvent('pricing_page_view', {});
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            trackPageView();
            autoTrackClicks();
            autoTrackPricingPage();
        });
    } else {
        trackPageView();
        autoTrackClicks();
        autoTrackPricingPage();
    }

    window.FKTI_Analytics = {
        trackEvent: trackEvent,
        getVisitorId: function () { return _visitorId; },
        getSessionId: function () { return _sessionId; }
    };
})();
