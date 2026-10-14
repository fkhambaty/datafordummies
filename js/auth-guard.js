/**
 * Auth Guard — injects Login/Sign Up or My Account into nav, redirects protected routes.
 * Call FKTI_AuthGuard.init() after DOM ready. Ensure nav has container with id="auth-nav-slot".
 */
(function () {
    'use strict';

    var AUTH_NAV_SLOT_ID = 'auth-nav-slot';

    function authBase() {
        if (window.FKTI_BASE_URL) return window.FKTI_BASE_URL.replace(/\/$/, '');
        return window.location.origin;
    }

    function loggedInLinks() {
        var base = authBase();
        return '<a href="' + base + '/auth/profile.html" class="nav-link auth-nav-account">My Account</a>' +
            '<button type="button" class="nav-link auth-logout-btn" style="background:none;border:none;cursor:pointer;font:inherit;">Logout</button>';
    }
    function loggedOutLinks() {
        var base = authBase();
        return '<a href="' + base + '/auth/login.html" class="nav-link auth-nav-login">Login</a>' +
            '<a href="' + base + '/auth/signup.html" class="nav-link auth-nav-signup">Sign Up</a>';
    }

    function renderNavSlot(signedIn) {
        var slot = document.getElementById(AUTH_NAV_SLOT_ID);
        if (!slot) return;
        slot.innerHTML = signedIn ? loggedInLinks() : loggedOutLinks();
        if (signedIn) {
            var logoutBtn = slot.querySelector('.auth-logout-btn');
            if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        }
    }

    function handleLogout() {
        var auth = window.FKTI_Auth;
        if (auth && auth.signOut) {
            auth.signOut().then(function (result) {
                if (result && result.error) {
                    window.alert('Logout could not be completed. Please try again so this session can be closed safely.');
                    return;
                }
                window.location.reload();
            });
        }
    }

    function init() {
        var slot = document.getElementById(AUTH_NAV_SLOT_ID);
        if (!slot) return;

        // Show Login/Sign Up immediately so they're never missing (then update when session is known)
        renderNavSlot(false);

        var auth = window.FKTI_Auth;
        if (!auth || !auth.getSession) return;

        auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            renderNavSlot(!!session);
        }).catch(function () {
            renderNavSlot(false);
        });

        if (auth.onAuthStateChange) {
            auth.onAuthStateChange(function (event, session) {
                renderNavSlot(!!session);
            });
        }
    }

    window.FKTI_AuthGuard = {
        init: init,
        renderNavSlot: renderNavSlot
    };
})();
