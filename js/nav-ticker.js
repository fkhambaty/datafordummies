(function(){
    var facts = [
        "\ud83d\udcca 90% of the world\u2019s data was created in the last 2 years",
        "\ud83e\udde0 Netflix saves $1B/year using data pipelines like these",
        "\ud83d\udc40 We explain SQL like you're five. No PhD required.",
        "\u26a1 ClickHouse can scan 1 billion rows per second per core",
        "\ud83d\udc0d Python is the #1 language for data science worldwide",
        "\ud83d\udce6 SQL was invented in 1974 \u2014 older than Star Wars!",
        "\ud83d\ude0a From 'what's a JOIN?' to 'I built a pipeline' \u2014 we got you.",
        "\ud83c\udf0d 1 exabyte = 1 billion gigabytes of data",
        "\ud83d\ude80 Airflow orchestrates pipelines at Airbnb, Uber & Spotify",
        "\ud83d\udca1 DBT is used by 30,000+ companies for data transforms",
        "\ud83d\udcc8 Data engineers are the fastest-growing tech role in 2025",
        "\ud83d\udd2e ML models improve with every new data point they see",
        "\u2601\ufe0f AWS processes 100+ exabytes of data per quarter",
        "\ud83c\udfe6 Banks score millions of transactions per second for fraud",
        "\ud83d\uded2 Walmart processes 2.5 petabytes of data every hour",
        "\ud83c\udfaf Good data pipelines save companies 40% in analytics costs",
        "\ud83e\udd16 ChatGPT was trained on 570GB of text data",
        "\ud83d\udcf1 The average person generates 1.7 MB of data per second",
        "\ud83d\udd11 PostgreSQL has been developed for 35+ years",
        "\ud83e\uddf1 Data warehouses use columnar storage for 100x faster queries",
        "\ud83c\udfac YouTube uploads 500 hours of video every minute",
        "\ud83d\udcb0 Bad data costs US businesses $3.1 trillion per year",
        "\u23f1\ufe0f Redshift can query petabytes in under 5 seconds",
        "\ud83c\udf10 There are 5 billion internet users generating data right now",
        "\ud83d\udccb Metabase has 50,000+ active installations worldwide",
        "\ud83c\udfd7\ufe0f The medallion architecture (Bronze\u2192Silver\u2192Gold) is industry standard",
        "\ud83d\udc4b Real projects, real skills. No fake it till you make it.",
        "\u2705 Pro = full courses + certs from \u20b910 a week."
    ];
    var el = document.getElementById('tickerText');
    var iconEl = document.querySelector('.ticker-icon');
    if (!el) return;
    var idx = Math.floor(Math.random() * facts.length);
    function show() {
        var fact = facts[idx % facts.length];
        var icon = fact.substring(0, 2);
        var text = fact.substring(2).trim();
        if (iconEl) iconEl.textContent = icon;
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px)';
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(function() {
            el.textContent = '';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            var i = 0;
            var speed = Math.max(20, Math.min(40, 800 / text.length));
            function type() {
                if (i < text.length) {
                    el.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                }
            }
            type();
        }, 300);
        idx++;
    }
    show();
    setInterval(show, 8000);
})();
