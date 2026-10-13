/* Mobile menu for the long tool pages, which do not load hub-script.js. */
(function () {
    function boot() {
        var nav = document.querySelector(".top-nav");
        if (!nav) return;
        var bar = nav.querySelector(".nav-container, .nav-c");
        var links = nav.querySelector(".nav-links");
        if (!bar || !links || bar.querySelector(".mobile-menu-toggle")) return;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "mobile-menu-toggle";
        button.setAttribute("aria-label", "Menu");
        button.setAttribute("aria-expanded", "false");
        button.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
        button.addEventListener("click", function () {
            var open = links.classList.toggle("nav-open");
            button.setAttribute("aria-expanded", open ? "true" : "false");
            button.setAttribute("aria-label", open ? "Close menu" : "Menu");
            button.innerHTML = open
                ? '<i class="fas fa-times" aria-hidden="true"></i>'
                : '<i class="fas fa-bars" aria-hidden="true"></i>';
        });
        bar.appendChild(button);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
