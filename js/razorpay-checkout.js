/**
 * Data For Dummies Pro checkout.
 * The Worker creates and verifies subscriptions. Hosted checkout is the default
 * until datafordummies.in is approved for Razorpay Standard Checkout.
 */
(function () {
    'use strict';

    var planDescriptions = {
        weekly: 'Data For Dummies Pro — ₹99/week',
        monthly: 'Data For Dummies Pro — ₹349/month'
    };

    function authPageUrl(page) {
        return window.location.origin + '/auth/' + page;
    }

    function profileMessage(type, message) {
        var query = '?' + type + '=1';
        if (message) query += '&msg=' + encodeURIComponent(message);
        window.location.href = authPageUrl('profile.html') + query;
    }

    function openProCheckout(plan) {
        plan = String(plan || 'weekly').toLowerCase();
        if (plan !== 'weekly' && plan !== 'monthly') plan = 'weekly';

        var auth = window.FKTI_Auth;
        if (!auth || !auth.getSession || !auth.createSubscription) {
            window.location.href = authPageUrl('login.html') + '?returnTo=' + encodeURIComponent(window.location.href);
            return;
        }

        auth.getSession().then(function (result) {
            var session = result.data && result.data.session;
            if (!session) {
                window.location.href = authPageUrl('login.html') + '?returnTo=' + encodeURIComponent(window.location.href);
                return;
            }
            var user = session.user || {};
            if (user.id === 'dummy-test-account' || user.username === 'dummy') {
                profileMessage('demo', 'Demo account: no charge.');
                return;
            }

            auth.createSubscription(plan).then(function (created) {
                if (created.error) {
                    profileMessage('payment_error', created.error.message || 'Could not start checkout.');
                    return;
                }
                var data = created.data || {};
                sessionStorage.setItem('dfd_pending_subscription', data.subscription_id || '');
                sessionStorage.setItem('dfd_checkout_return', data.return_url || authPageUrl('profile.html'));
                if (data.checkout_mode !== 'modal') {
                    if (!data.short_url) {
                        profileMessage('payment_error', 'Hosted checkout is temporarily unavailable.');
                        return;
                    }
                    window.location.assign(data.short_url);
                    return;
                }
                openModal(data, user);
            });
        }).catch(function () {
            profileMessage('payment_error', 'The account service did not answer. Please try again.');
        });
    }

    function openModal(data, user) {
        function hostedFallback() {
            if (data.short_url) window.location.assign(data.short_url);
            else profileMessage('payment_error', 'Could not open checkout. Please try again.');
        }

        function loadCheckout(done) {
            if (typeof window.Razorpay !== 'undefined') { done(); return; }
            var script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = done;
            script.onerror = hostedFallback;
            document.head.appendChild(script);
        }

        loadCheckout(function () {
            var email = user.email || '';
            var name = user.full_name || email.split('@')[0] || 'Customer';
            var contact = ((user.country_code || '') + (user.phone || '')).replace(/\s/g, '');
            var prefill = { name: name, email: email };
            if (/^\+?\d{7,15}$/.test(contact)) prefill.contact = contact;
            var opened = false;
            var options = {
                key: data.key_id,
                subscription_id: data.subscription_id,
                name: 'FKTech',
                description: planDescriptions[data.plan] || planDescriptions.weekly,
                image: window.location.origin + '/logo.png',
                prefill: prefill,
                notes: { product: 'datafordummies', user_id: user.id },
                theme: { color: '#4f46e5' },
                modal: {
                    ondismiss: function () {
                        profileMessage('checkout_closed', 'Checkout closed. No payment was completed.');
                    }
                },
                handler: function (payment) {
                    window.FKTI_Auth.confirmSubscription(payment).then(function (confirmed) {
                        if (confirmed.error) {
                            profileMessage('payment_error', confirmed.error.message || 'Payment verification failed.');
                            return;
                        }
                        return window.FKTI_Auth.getProfile().then(function () {
                            window.location.href = authPageUrl('profile.html') + '?subscription=success';
                        });
                    });
                }
            };
            try {
                var checkout = new window.Razorpay(options);
                checkout.on('payment.failed', function (response) {
                    var error = response && response.error ? response.error : {};
                    var description = String(error.description || error.reason || 'Payment failed.');
                    if (/website|domain|origin|whitelist|approved/i.test(description)) {
                        hostedFallback();
                        return;
                    }
                    profileMessage('payment_error', description);
                });
                checkout.open();
                opened = true;
            } catch (error) {
                hostedFallback();
                return;
            }
            setTimeout(function () {
                if (!opened) return;
                var frame = document.querySelector('iframe[src*="razorpay"], .razorpay-container, .razorpay-backdrop');
                if (!frame) hostedFallback();
            }, 6000);
        });
    }

    window.FKTI_RazorpayCheckout = { openProCheckout: openProCheckout };
})();
