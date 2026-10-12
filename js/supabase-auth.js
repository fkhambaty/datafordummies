/**
 * Account session for Data For Dummies.
 * The browser talks to the Cloudflare API. The database password never reaches this file.
 */
(function () {
    'use strict';

    var API = window.DFD_API || '';
    var STORAGE_KEY = 'dfd_session';
    var listeners = [];

    function readStored() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    function writeStored(session) {
        if (!session) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        listeners.forEach(function (listener) {
            listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        });
    }

    function authHeader() {
        var stored = readStored();
        return stored && stored.token ? { Authorization: 'Bearer ' + stored.token } : {};
    }

    function request(path, options) {
        if (!API) return Promise.resolve({ data: null, error: { message: 'Account service is not configured.' } });
        var headers = Object.assign({ 'Content-Type': 'application/json' }, authHeader(), (options && options.headers) || {});
        return fetch(API + path, {
            method: (options && options.method) || 'GET',
            headers: headers,
            body: options && options.body ? JSON.stringify(options.body) : undefined
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok) {
                    return {
                        data: null,
                        error: {
                            message: body.error || 'Request failed.',
                            needs_verification: Boolean(body.needs_verification),
                            email: body.email || ''
                        },
                        status: response.status
                    };
                }
                return { data: body, error: null };
            });
        }).catch(function () {
            return { data: null, error: { message: 'The account service did not answer.' } };
        });
    }

    function sessionObject(user) {
        var stored = readStored();
        if (!user || !stored) return null;
        return { access_token: stored.token, user: user };
    }

    function getSession() {
        var stored = readStored();
        if (!stored || !stored.user) return Promise.resolve({ data: { session: null }, error: null });
        return Promise.resolve({ data: { session: sessionObject(stored.user) }, error: null });
    }

    function getUser() {
        return getSession().then(function (res) {
            var session = res.data && res.data.session;
            return { data: { user: session ? session.user : null }, error: null };
        });
    }

    function onAuthStateChange(callback) {
        listeners.push(callback);
        return function () {
            listeners = listeners.filter(function (listener) { return listener !== callback; });
        };
    }

    function signInWithPassword(email, password) {
        return request('/v1/login', { method: 'POST', body: { email: email, password: password } }).then(function (res) {
            if (res.error) return res;
            writeStored({ token: res.data.token, user: res.data.user });
            return { data: { session: sessionObject(res.data.user), user: res.data.user }, error: null };
        });
    }

    function signUp(email, password, options) {
        var data = (options && options.data) || {};
        return request('/v1/signup', {
            method: 'POST',
            body: {
                email: email,
                password: password,
                full_name: data.full_name || data.fullName || '',
                phone: data.phone || '',
                country_code: data.country_code || data.countryCode || ''
            }
        }).then(function (res) {
            if (res.error) return res;
            return { data: { session: null, user: null, needs_verification: true, email: res.data.email }, error: null };
        });
    }

    function verifyEmail(email, code) {
        return request('/v1/verify', { method: 'POST', body: { email: email, code: code } }).then(function (res) {
            if (res.error) return res;
            writeStored({ token: res.data.token, user: res.data.user });
            return { data: { session: sessionObject(res.data.user), user: res.data.user }, error: null };
        });
    }

    function resendCode(email) {
        return request('/v1/resend-code', { method: 'POST', body: { email: email } });
    }

    function requestPasswordReset(email) {
        return request('/v1/forgot-password', { method: 'POST', body: { email: email } });
    }

    function resetPassword(email, code, password) {
        return request('/v1/reset-password', { method: 'POST', body: { email: email, code: code, password: password } });
    }

    function signOut() {
        return request('/v1/logout', { method: 'POST', body: {} }).then(function () {
            writeStored(null);
            return { error: null };
        });
    }

    function updateUserPassword(password) {
        return request('/v1/password', { method: 'POST', body: { password: password } });
    }

    function getProfile() {
        var stored = readStored();
        if (!stored) return Promise.resolve({ data: null, error: null });
        return request('/v1/profile').then(function (res) {
            if (res.error) return { data: stored.user, error: null };
            stored.user = res.data.profile;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            return { data: res.data.profile, error: null };
        });
    }

    function createSubscription(plan) {
        return request('/v1/payments/razorpay/subscriptions', {
            method: 'POST',
            body: { plan: plan }
        });
    }

    function confirmSubscription(payment) {
        return request('/v1/payments/razorpay/confirm', {
            method: 'POST',
            body: payment
        });
    }

    function checkSubscription(subscriptionId) {
        return request('/v1/payments/razorpay/status', {
            method: 'POST',
            body: { subscription_id: subscriptionId || '' }
        });
    }

    function cancelSubscription() {
        return request('/v1/payments/razorpay/cancel', { method: 'POST', body: {} });
    }

    function getAdminAnalytics(since) {
        return request('/v1/admin/analytics?since=' + encodeURIComponent(since || '2020-01-01T00:00:00Z'));
    }

    function saveProgress(row) {
        return request('/v1/progress', { method: 'PUT', body: row });
    }

    function getProgress(courseId) {
        var path = courseId ? '/v1/progress?course_id=' + encodeURIComponent(courseId) : '/v1/progress';
        return request(path).then(function (res) {
            return { data: (res.data && res.data.progress) || [], error: res.error };
        });
    }

    function track(path, body) {
        return request(path, { method: 'POST', body: body });
    }

    window.FKTI_Auth = {
        getSession: getSession,
        getUser: getUser,
        onAuthStateChange: onAuthStateChange,
        signUp: signUp,
        signInWithPassword: signInWithPassword,
        verifyEmail: verifyEmail,
        resendCode: resendCode,
        requestPasswordReset: requestPasswordReset,
        resetPassword: resetPassword,
        signOut: signOut,
        updateUserPassword: updateUserPassword,
        getProfile: getProfile,
        createSubscription: createSubscription,
        confirmSubscription: confirmSubscription,
        checkSubscription: checkSubscription,
        cancelSubscription: cancelSubscription,
        getAdminAnalytics: getAdminAnalytics,
        saveProgress: saveProgress,
        getProgress: getProgress,
        track: track,
        upsertProfile: function () { return Promise.resolve({ data: null, error: null }); },
        ensureProfile: function () { return Promise.resolve(); },
        signInWithOtp: function () { return Promise.resolve({ data: null, error: { message: 'Email codes are off. Use your password.' } }); },
        verifyOtp: function () { return Promise.resolve({ data: null, error: { message: 'Email codes are off. Use your password.' } }); },
        updateUserMetadata: function () { return Promise.resolve({ data: null, error: null }); },
        getSupabase: function () { return null; }
    };
})();
