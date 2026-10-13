/**
 * FKTI Analytics Tracker
 * Tracks minimal page views and events through the Cloudflare Worker.
 * Include on every page: <script src="js/analytics-tracker.js"></script>
 * (or ../js/analytics-tracker.js from subdirectories)
 */
(function () {
    'use strict';

    var SESSION_TIMEOUT = 30 * 60 * 1000;
    var API = window.DFD_API || 'https://datafordummies-api.fkhambaty.workers.dev';
    var _visitorId = getOrCreateVisitorId();
    var _sessionId = getOrCreateSession();

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

    function send(path, body) {
        var headers = { 'Content-Type': 'application/json' };
        try {
            var stored = JSON.parse(localStorage.getItem('dfd_session') || 'null');
            if (stored && stored.token) headers.Authorization = 'Bearer ' + stored.token;
        } catch (e) {}
        fetch(API + path, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            keepalive: true
        }).catch(function () {});
    }

    function trackPageView() {
        send('/v1/page-view', {
            visitor_id: _visitorId,
            session_id: _sessionId,
            page_path: getPagePath(),
            page_title: document.title || '',
            referrer: document.referrer || '',
            device_type: detectDevice(),
            browser: detectBrowser(),
            os: detectOS(),
            screen_size: screen.width + 'x' + screen.height
        });
    }

    function trackEvent(eventType, eventData) {
        send('/v1/event', {
            visitor_id: _visitorId,
            session_id: _sessionId,
            event_type: eventType,
            event_data: eventData || {},
            page_path: getPagePath()
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

    function videoHost(src) {
        return /youtube\.com|youtube-nocookie\.com|youtu\.be|player\.vimeo\.com/i.test(src || '');
    }

    function posterButton(poster) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'home-video-play';
        if (poster) {
            var img = document.createElement('img');
            img.src = poster;
            img.alt = '';
            img.width = 1280;
            img.height = 720;
            button.appendChild(img);
        }
        var label = document.createElement('span');
        label.className = 'home-video-play-label';
        label.textContent = 'Play the lesson video';
        button.appendChild(label);
        return button;
    }

    function playVideo(container) {
        var src = container.getAttribute('data-video-src');
        if (!src) return;
        var frame = document.createElement('iframe');
        var join = src.indexOf('?') >= 0 ? '&' : '?';
        frame.src = src + join + 'autoplay=1&rel=0';
        frame.title = container.getAttribute('data-video-title') || 'Lesson video';
        frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        frame.allowFullscreen = true;
        container.replaceChildren(frame);
    }

    function releaseEmbeddedPlayers() {
        document.querySelectorAll('iframe').forEach(function (frame) {
            var src = frame.getAttribute('src') || '';
            if (!videoHost(src)) return;
            var box = frame.closest('.home-video, .ux-video-frame');
            var clean = src.replace(/([?&])autoplay=1&?/, '$1').replace(/[?&]$/, '');
            if (box) {
                box.setAttribute('data-video-src', clean);
                if (!box.getAttribute('data-video-title')) {
                    box.setAttribute('data-video-title', frame.title || 'Lesson video');
                }
                box.replaceChildren(posterButton(box.getAttribute('data-video-poster')));
            } else {
                frame.removeAttribute('src');
            }
        });
        var overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.remove();
        if (document.body) document.body.style.overflow = '';
    }

    function armVideoPosters() {
        document.querySelectorAll('.home-video, .ux-video-frame').forEach(function (box) {
            if (box.getAttribute('data-video-armed') === '1') return;
            box.setAttribute('data-video-armed', '1');
            box.addEventListener('click', function (event) {
                var button = event.target.closest('.home-video-play');
                if (!button || !box.contains(button)) return;
                playVideo(box);
            });
        });
    }

    window.addEventListener('pagehide', releaseEmbeddedPlayers);
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) releaseEmbeddedPlayers();
        armVideoPosters();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            trackPageView();
            autoTrackClicks();
            autoTrackPricingPage();
            armVideoPosters();
        });
    } else {
        trackPageView();
        autoTrackClicks();
        autoTrackPricingPage();
        armVideoPosters();
    }

    window.FKTI_Analytics = {
        trackEvent: trackEvent,
        getVisitorId: function () { return _visitorId; },
        getSessionId: function () { return _sessionId; }
    };
})();
