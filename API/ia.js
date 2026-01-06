(function () {
    if (window.CODEHUB_IA_LOADED) return;
    window.CODEHUB_IA_LOADED = true;

    var script = document.createElement('script');
    script.src =
        'https://assistente-ia--socialkoala6579904.on.websim.com/embed.js' +
        (window.location.search || '') +
        (window.location.hash || '');

    document.head.appendChild(script);
})();