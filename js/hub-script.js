/**
 * FKTI Learning Hub JavaScript
 * Handles navigation, interactions, and course routing
 */

// Global variables
let mobileMenuOpen = false;

/* Keep equal to CSS @media (max-width: 768px). Widths 721–768 stay on the mobile menu. */
const DFD_NAV_QUERY = '(max-width: 768px)';

function navIsMobile() {
    return window.matchMedia(DFD_NAV_QUERY).matches;
}

// Reset Learn dropdown when page is shown (fixes bfcache / back-forward cache layout bug)
function resetNavDropdown() {
    var nav = document.querySelector('.main-nav, .top-nav');
    if (!nav) return;
    var active = document.activeElement;
    if (active && nav.contains(active)) {
        active.blur();
    }
    // Force reflow so layout is recalculated after navigation
    nav.offsetHeight;
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    resetNavDropdown();
    initializeHub();
    setupEventListeners();
    setupScrollEffects();
});

// When page is restored from back-forward cache, reset dropdown so menu doesn't stay stuck
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        resetNavDropdown();
    }
});

/**
 * Initialize the hub
 */
function initializeHub() {
    // Add smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });

    // Initialize intersection observer for animations
    setupIntersectionObserver();
    
    // Setup course cards hover effects
    setupCourseCardEffects();
    
    // Initialize DataBot interactions
    initializeDataBot();
    
    // Initialize theme system
    initializeThemes();

    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    if (toggleBtn) {
        if (!toggleBtn.getAttribute('aria-label')) toggleBtn.setAttribute('aria-label', 'Menu');
        toggleBtn.setAttribute('aria-expanded', 'false');
    }

    console.log('FKTI Learning Hub initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Window resize handler
    window.addEventListener('resize', handleResize);
    
    // Scroll handler for navbar
    window.addEventListener('scroll', handleScroll);
    
    // Course card click handlers
    setupCourseClickHandlers();
}

/**
 * Handle navigation link clicks
 */
function handleNavClick(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
        const navHeight = document.querySelector('.main-nav').offsetHeight;
        const targetPosition = targetElement.offsetTop - navHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (mobileMenuOpen) {
            toggleMobileMenu();
        }
    }
}

/**
 * Handle scroll effects
 */
function handleScroll() {
    const nav = document.querySelector('.main-nav');
    const scrolled = window.scrollY > 50;
    
    if (scrolled) {
        nav.style.background = 'rgba(255, 255, 255, 0.98)';
        nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
        nav.style.boxShadow = 'none';
    }
}

/**
 * Setup intersection observer for animations
 */
function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.course-card, .feature-item, .path-step');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Setup course card effects
 */
function setupCourseCardEffects() {
    const courseCards = document.querySelectorAll('.course-card');
    
    courseCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

/**
 * Setup course click handlers
 */
function setupCourseClickHandlers() {
    // Course buttons
    const courseBtns = document.querySelectorAll('[onclick*="enterCourse"]');
    courseBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const course = this.onclick.toString().match(/'(\w+)'/)[1];
            enterCourse(course);
        });
    });
}

/**
 * Enter a specific course
 */
function enterCourse(courseType) {
    var stuck = document.getElementById('loadingOverlay');
    if (stuck) stuck.remove();
    document.body.style.overflow = '';

    // Course routing (hub-first: use hub.html where available)
    const courseUrls = {
        'python': 'python_course/index.html',
        'datascience': 'data_science_course/index.html',
        'airflow': 'airflow_course/hub.html',
        'clickhouse': 'clickhouse_course/hub.html',
        'redshift': 'redshift_course/hub.html',
        'mssql': 'mssql_course/hub.html',
        'dbt': 'dbt_course/hub.html',
        'metabase': 'metabase_course/hub.html',
        'postgres': 'postgres_course/hub.html',
        'llm': 'llm_course/index.html',
        'snowflake': 'snowflake_course/hub.html',
        'kubernetes': 'kubernetes_course/hub.html',
        'terraform': 'terraform_course/hub.html',
        'dms': 'dms_course/hub.html'
    };
    
    const url = courseUrls[courseType];
    if (url) {
        window.location.assign(url);
    } else {
        console.error('Course type not found:', courseType);
    }
}

/**
 * Scroll to specific course card in courses section
 */
function scrollToCourseCard(courseType) {
    // First scroll to courses section
    const coursesSection = document.getElementById('courses');
    if (!coursesSection) return;
    
    // Map course types to CSS class names
    const courseClassMap = {
        'python': 'python-card',
        'datascience': 'datascience-card',
        'airflow': 'airflow-card',
        'clickhouse': 'clickhouse-card',
        'redshift': 'redshift-card',
        'mssql': 'mssql-card',
        'dbt': 'dbt-card',
        'metabase': 'metabase-card',
        'postgres': 'postgres-card',
        'llm': 'llm-card'
    };
    
    const courseClass = courseClassMap[courseType];
    if (!courseClass) {
        // Fallback: just scroll to courses section
        coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    
    // Scroll to courses section first
    coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Then find and scroll to the specific course card
    setTimeout(() => {
        let courseCard;
        
        if (courseType === 'datascience') {
            // Try to find by class first, then by data attribute or content
            courseCard = document.querySelector('.datascience-card') || 
                        document.querySelector('.course-card[data-course="datascience"]') ||
                        Array.from(document.querySelectorAll('.course-card')).find(card => 
                            card.querySelector('.course-title') && 
                            card.querySelector('.course-title').textContent.includes('Data Science')
                        );
        } else {
            courseCard = document.querySelector(`.${courseClass}`);
        }
        
        if (courseCard) {
            courseCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a highlight effect
            courseCard.style.transition = 'all 0.3s ease';
            courseCard.style.transform = 'scale(1.02)';
            courseCard.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            
            setTimeout(() => {
                courseCard.style.transform = 'scale(1)';
                courseCard.style.boxShadow = '';
            }, 1000);
        }
    }, 500); // Wait for initial scroll to complete
}

/**
 * Scroll to courses section
 */
function scrollToCourses() {
    const coursesSection = document.getElementById('courses');
    if (coursesSection) {
        const navHeight = document.querySelector('.main-nav').offsetHeight;
        const targetPosition = coursesSection.offsetTop - navHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    } else {
        // Home page no longer has courses section; go to learning path page
        window.location.href = 'learning-path.html';
    }
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    if (!navLinks || !toggleBtn) return;

    mobileMenuOpen = !mobileMenuOpen;

    if (mobileMenuOpen) {
        navLinks.classList.add('nav-open');
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.justifyContent = 'flex-start';
        navLinks.style.alignItems = 'stretch';
        navLinks.style.position = 'absolute';
        navLinks.style.top = 'calc(100% + 6px)';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.maxHeight = 'min(70vh, calc(100dvh - 96px))';
        navLinks.style.overflowY = 'auto';
        navLinks.style.background = 'rgba(255, 255, 255, 0.96)';
        navLinks.style.backdropFilter = 'blur(20px)';
        navLinks.style.webkitBackdropFilter = 'blur(20px)';
        navLinks.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
        navLinks.style.padding = '8px';
        navLinks.style.borderRadius = '16px';
        navLinks.style.border = '1px solid rgba(255, 255, 255, 0.6)';
        navLinks.style.gap = '2px';
        navLinks.style.zIndex = '1001';
        toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('aria-label', 'Close menu');
    } else {
        navLinks.classList.remove('nav-open');
        navLinks.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Menu');
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    if (!navIsMobile() && mobileMenuOpen) {
        toggleMobileMenu();
    }

    if (!navIsMobile()) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.classList.remove('nav-open');
            navLinks.style.cssText = '';
        }
    }
}

/**
 * Show loading animation
 */
function showLoadingAnimation() {
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading Course...</div>
        </div>
    `;
    
    // Add loading styles
    const loadingStyles = `
        <style>
            #loadingOverlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(5px);
            }
            
            .loading-container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid #e2e8f0;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #e2e8f0;
                border-top: 4px solid #0077be;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            .loading-text {
                color: #4a4a4a;
                font-weight: 600;
                font-size: 1.125rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', loadingStyles);
    document.body.appendChild(overlay);
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
}

/**
 * Hide loading animation
 */
function hideLoadingAnimation() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
    document.body.style.overflow = 'auto';
}

/**
 * Open demo modal (placeholder function)
 */
function openDemo() {
    alert('Demo video coming soon! For now, explore our interactive courses by clicking on the course buttons below.');
}

/**
 * Setup scroll effects for floating animations
 */
function setupScrollEffects() {
    const floatingElements = document.querySelectorAll('.floating-card');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        
        floatingElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

/**
 * Add keyboard navigation support
 */
document.addEventListener('keydown', function(e) {
    // Only trigger if not in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Press 'P' to go to Python course
    if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.altKey) {
        enterCourse('python');
    }
    
    // Press 'A' to go to Airflow course
    if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.altKey) {
        enterCourse('airflow');
    }
    
    // Press 'R' to go to Redshift course
    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.altKey) {
        enterCourse('redshift');
    }
    
    // Press 'M' to go to MSSQL course
    if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey) {
        enterCourse('mssql');
    }
    
    // Press 'D' to go to DBT course
    if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.altKey) {
        enterCourse('dbt');
    }
    
    // Press 'B' to go to Metabase course
    if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.altKey) {
        enterCourse('metabase');
    }
    
    // Press 'Escape' to scroll to top
    if (e.key === 'Escape') {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
});

/**
 * Add course progress tracking (if returning from a course)
 */
function checkCourseProgress() {
    const pythonProgress = localStorage.getItem('fkti-python-progress');
    const airflowProgress = localStorage.getItem('fkti-airflow-progress');
    
    if (pythonProgress) {
        const progress = JSON.parse(pythonProgress);
        updateCourseCardProgress('python', progress.completedSections || 0);
    }
    
    if (airflowProgress) {
        const progress = JSON.parse(airflowProgress);
        updateCourseCardProgress('airflow', progress.completedSections || 0);
    }
}

/**
 * Update course card with progress indicator
 */
function updateCourseCardProgress(courseType, completedSections) {
    const courseCard = document.querySelector(`.${courseType}-card`);
    if (courseCard && completedSections > 0) {
        const progressBadge = document.createElement('div');
        progressBadge.className = 'progress-badge';
        progressBadge.innerHTML = `<i class="fas fa-check-circle"></i> ${completedSections} sections completed`;
        progressBadge.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(76, 175, 80, 0.1);
            color: #4caf50;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        courseCard.style.position = 'relative';
        courseCard.appendChild(progressBadge);
    }
}

// Initialize progress checking when page loads
document.addEventListener('DOMContentLoaded', checkCourseProgress);

/**
 * Scroll to top of page (for logo click)
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Initialize DataBot interactions
 */
function initializeDataBot() {
    const databotSpeech = document.getElementById('databot-speech');
    const journeySteps = document.querySelectorAll('.journey-step');
    
    if (!databotSpeech || journeySteps.length === 0) return;
    
    // DataBot speech messages for each step (matches HTML step order: 9 steps)
    const speechMessages = {
        default: "Let me show you how we turn chaos into insights! 🤖",
        1: "All data starts in a database! Let me show you the chaos! 😵",
        2: "Python to the rescue! Let me analyze this data! 🔍",
        3: "ClickHouse answers analytics queries in a blink! ⚡",
        4: "Redshift will organize everything perfectly! ✨",
        5: "Airflow automates everything! No more manual work! 🤖",
        6: "DBT transforms raw data into business insights! 👨‍🍳",
        7: "Metabase makes beautiful dashboards everyone loves! 📊",
        8: "Data Science finds hidden patterns and predicts the future! 🔮",
        9: "LLMs turn data into plain-English answers! 🧠",
        result: "Mission accomplished! From chaos to clarity! 🎉"
    };
    
    // Intersection Observer for DataBot speech
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const step = entry.target.getAttribute('data-step');
                if (step && speechMessages[step]) {
                    clearInterval(window._botCycleTimer);
                    updateDatabotSpeech(speechMessages[step]);
                    setTimeout(() => { if (typeof startBotCycle === 'function') startBotCycle(); }, 6000);
                }
            }
        });
    }, {
        threshold: 0.6,
        rootMargin: '-50px 0px'
    });
    
    // Observe all journey steps
    journeySteps.forEach(step => {
        observer.observe(step);
    });
    
    // Also observe the result card
    const resultCard = document.querySelector('.journey-result');
    if (resultCard) {
        const resultObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    clearInterval(window._botCycleTimer);
                    updateDatabotSpeech(speechMessages.result);
                    setTimeout(() => { if (typeof startBotCycle === 'function') startBotCycle(); }, 6000);
                }
            });
        }, {
            threshold: 0.5
        });
        resultObserver.observe(resultCard);
    }
    
    // Add click interaction to DataBot
    const databot = document.querySelector('.databot');
    if (databot) {
        databot.addEventListener('click', () => {
            clearInterval(window._botCycleTimer);
            const funnyMessages = [
                "Beep boop! Want to learn data engineering? 🤖",
                "I love organizing messy data! It's like LEGO for adults! 🧱",
                "Fun fact: I run on coffee and SQL queries! ☕",
                "My favorite hobby? Making data pipelines go BRRRR! 🚀",
                "I dream in JSON and wake up in SQL! 💭",
                "Click a course below to start your data journey! 👇",
                "Did you know? Netflix uses data pipelines like these! 🎬",
                "I can process 1 billion rows before you blink! 👀",
                "Ask me anything! Or just scroll down to explore 👇",
            ];
            const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
            updateDatabotSpeech(randomMessage);
            databot.style.animation = 'bounce 0.6s ease-in-out';
            setTimeout(() => {
                databot.style.animation = 'bounce 2s ease-in-out infinite';
                startBotCycle();
            }, 3000);
        });
    }

    // Auto-cycling contextual messages
    const cycleMsgs = {
        idle: [
            "Scroll down to see each tool in action! 👇",
            "Pick a different industry above to see how the story changes! 🔄",
            "Every step below shows a real-world scenario! 🌍",
            "I update my stories for each industry. Try Healthcare! 🏥",
            "Hover over any step to learn more! 🖱️",
            "Try clicking on me for a surprise! 😄",
            "Fun fact: companies like Uber use this exact stack! 🚕",
            "The tools below work together like a symphony 🎵",
            "Data engineering is the backbone of every AI product! 🤖",
        ],
        stepContext: function(step) {
            const extras = {
                1: ["PostgreSQL handles 80% of the world's app data! 🌍", "Every app you use has a database like this behind it!", "Raw data is messy — that's why we need step 2! 🧹"],
                2: ["Python is the #1 language for data! 🐍", "pandas alone is downloaded 100M+ times/month! 📦", "Python makes the impossible look easy! ✨"],
                3: ["ClickHouse was created by Yandex for analytics! ⚡", "It can scan 1 billion rows per second per core!", "Column storage = only read what you need! 🎯"],
                4: ["Redshift was the first cloud data warehouse! ☁️", "It uses MPP — Massively Parallel Processing! 🚀", "Sort keys are the secret to fast Redshift queries! 🔑"],
                5: ["Airflow was built at Airbnb in 2014! 🏠", "A DAG is just a fancy to-do list for data! 📋", "Airflow never sleeps — your data is always fresh! ⏰"],
                6: ["DBT runs 'SELECT' statements — that's it! Simple! 💡", "DBT auto-generates documentation for your data! 📚", "SQL + version control = analytics engineering! 🛠️"],
                7: ["Metabase is open source and free! 🆓", "Anyone can build dashboards — no SQL needed! 📊", "Execs love Metabase because it's so visual! 🎨"],
                8: ["ML models improve every time they see new data! 📈", "Data Science is 80% cleaning, 20% modelling! 🧹", "Predictions get better with more data — feed the model! 🤖"],
                9: ["GPT-4 has 1.7 trillion parameters! 🤯", "LLMs understand context, not just keywords! 🧠", "RAG = Retrieval Augmented Generation. Ask me more! 📖"]
            };
            return extras[step] || extras[1];
        }
    };

    let lastVisibleStep = null;
    const origObserverCb = observer;

    function getCurrentVisibleStep() {
        let visible = null;
        journeySteps.forEach(s => {
            const rect = s.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.7 && rect.bottom > 100) {
                visible = parseInt(s.getAttribute('data-step')) || null;
            }
        });
        return visible;
    }

    function startBotCycle() {
        clearInterval(window._botCycleTimer);
        let cycleIndex = 0;
        window._botCycleTimer = setInterval(() => {
            const step = getCurrentVisibleStep();
            let msg;
            if (step && Math.random() < 0.6) {
                const pool = cycleMsgs.stepContext(step);
                msg = pool[Math.floor(Math.random() * pool.length)];
            } else {
                msg = cycleMsgs.idle[cycleIndex % cycleMsgs.idle.length];
                cycleIndex++;
            }
            updateDatabotSpeech(msg);
        }, 5000);
    }

    startBotCycle();
}

/**
 * Update DataBot speech bubble
 */
let _typingTimer = null;
function updateDatabotSpeech(message) {
    const speechElement = document.getElementById('databot-speech');
    if (!speechElement) return;
    clearTimeout(_typingTimer);

    const bubble = speechElement.parentElement;
    bubble.style.transform = 'scale(0.96)';
    bubble.style.opacity = '0.6';
    bubble.style.transition = 'all 0.2s ease';

    _typingTimer = setTimeout(() => {
        speechElement.textContent = '';
        bubble.style.transform = 'scale(1)';
        bubble.style.opacity = '1';

        let i = 0;
        const speed = Math.max(18, Math.min(35, 900 / message.length));
        function type() {
            if (i < message.length) {
                speechElement.textContent += message.charAt(i);
                i++;
                _typingTimer = setTimeout(type, speed);
            }
        }
        type();
    }, 200);
}

/**
 * Theme Management Functions
 */

// Initialize theme system
function initializeThemes() {
    // Load saved theme or default to blue
    const savedTheme = localStorage.getItem('fkti-theme') || 'blue';
    setTheme(savedTheme);
    
    // Close theme dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.theme-selector')) {
            const dropdown = document.getElementById('themeDropdown');
            if (dropdown) {
                dropdown.classList.remove('active');
            }
        }
    });
}

// Toggle theme selector dropdown
function toggleThemeSelector() {
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Set theme
function setTheme(themeName) {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Save to localStorage
    localStorage.setItem('fkti-theme', themeName);
    
    // Close dropdown
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    
    console.log(`Theme changed to: ${themeName}`);
}

// ═══════════════════════════════════════════════════════════════
// STORY THEME SYSTEM - Interactive Industry Scenarios
// Steps: 1=PostgreSQL, 2=Python, 3=ClickHouse, 4=Redshift, 5=Airflow, 6=DBT, 7=Metabase, 8=Data Science, 9=LLM
// ═══════════════════════════════════════════════════════════════

const storyThemes = {
    walmart: {
        name: "Retail Giant", icon: "🛒", badge: "RETAIL",
        title: "Meet DataBot 🤖 - Your Retail Data Guide!",
        subtitle: "Follow DataBot as he transforms messy store data into sales insights using our 9 essential tools!",
        speech: "Welcome to the world of Retail! Let me show you how we turn messy store data into golden sales insights!",
        steps: {
            step1: { title: "PostgreSQL - The Busy Store Register", desc: "Imagine thousands of cash registers across 5,000 stores! 🏪 Every beep, every scan, every receipt creates data. But it's all scattered - frozen pizza in one table, customer info in another, inventory somewhere else!", example: "Customer Sarah bought diapers, beer, and chips at Store #4521 at 8:47 PM. But this data is split across 12 different tables! 😱" },
            step2: { title: "Python - The Smart Shopping Assistant", desc: "Python is that super-smart employee who memorizes EVERYTHING! 🧠 It reads millions of receipts, spots patterns humans miss, and says 'People who buy diapers also buy beer on Friday evenings!'", example: "Analyzed 50 million transactions! Found that putting bananas near cereal increases banana sales by 23%! 🍌" },
            step3: { title: "ClickHouse - The Lightning Receipt Scanner", desc: "ClickHouse scans billions of receipts in milliseconds! ⚡ Need 'total ice cream sales by hour, by store, for the last year'? Other databases choke - ClickHouse answers before you finish your coffee.", example: "'Which products sell best at 9 PM on Fridays across all 5,000 stores?' 8 billion rows scanned in 0.4 seconds! Beer and chips win! 🍺" },
            step4: { title: "Redshift - The Super Organized Warehouse", desc: "Redshift is like having a warehouse where EVERYTHING is perfectly organized! 📦 5 billion rows of data, but finding 'all customers who bought organic milk on Tuesdays' takes 2 seconds!", example: "'Which stores sold out of toilet paper last March?' Searching 10 years of data... Found 847 stores in 0.8 seconds! 🚀" },
            step5: { title: "Airflow - The Night-Shift Manager", desc: "Airflow is that manager who NEVER sleeps! ⏰ Every night at midnight: 'Collect all store data! Clean it up! Load it to warehouse! Update inventory!' 365 days a year, never takes vacation!", example: "12:00 AM - Extract sales ✓, 12:30 AM - Clean data ✓, 1:00 AM - Load to Redshift ✓, 1:30 AM - Update dashboards ✓, Ready for morning! ☕" },
            step6: { title: "DBT - The Business Translator", desc: "DBT translates 'txn_id: 847291, prod_sku: 001847' into 'Sarah bought 2 gallons of milk worth $6.98 and has been a loyal customer for 3 years!' Business-ready data!", example: "Customer Lifetime Value model ready! Sarah = $12,847 over 3 years. Top 5% customer! Time to send her a VIP coupon! 👑" },
            step7: { title: "Metabase - The Beautiful Storyteller", desc: "Metabase turns numbers into stories that even your grandma would understand! 📊 No more 10,000-row spreadsheets - instead: beautiful charts, interactive maps, and dashboards that make the CEO say 'WOW!'", example: "Live dashboard: Sales up 12% today! Store #4521 is the MVP! Hot product: Organic avocados! Alert: Store #2847 running low on eggs! 🥚" },
            step8: { title: "Data Science - The Crystal Ball", desc: "Data Science predicts what customers will buy BEFORE they know they want it! 🔮 Machine learning analyzes 50 million shopping trips and finds hidden patterns no human could spot.", example: "ML model predicts: Customers who buy organic milk on Tuesdays will buy avocados on Fridays (87% accuracy). Stock up avocados Thursday night! 🥑" },
            step9: { title: "LLMs - The AI Store Manager", desc: "Large Language Models understand plain English! 🧠 Store managers ask 'Why did Store #42 sales drop last week?' and the LLM analyzes data, weather, promotions, and gives a clear answer in seconds!", example: "Manager asks: 'Best promotion for Thanksgiving?' LLM analyzes 5 years of holiday data → 'Bundle turkey + stuffing + cranberry, 20% off. Predicted +34% basket size!' 🦃" }
        },
        result: { title: "The Retail Magic! ✨", desc: "From 5,000 chaotic stores to one beautiful command center! Store managers now see real-time sales, inventory alerts, and customer trends. All 9 tools working together like a symphony! 🎵", before: "How did we do on Black Friday?", beforeResult: "*2 weeks of number crunching* 😵", after: "How did we do?", afterResult: "*Real-time dashboard* → '$2.3B in sales, up 15%!' 🎉" }
    },
    cinema: {
        name: "Movie Theatre", icon: "🎬", badge: "CINEMA",
        title: "Meet DataBot 🤖 - Your Box Office Analyst!",
        subtitle: "Watch DataBot turn ticket stubs into blockbuster predictions using all 9 tools!",
        speech: "Lights, Camera, DATA! Let me show you how we predict the next blockbuster hit!",
        steps: {
            step1: { title: "PostgreSQL - The Ticket Counter Chaos", desc: "Picture 500 movie theatres with popcorn-sticky keyboards! 🎟️ Every ticket sale, every large popcorn upgrade, every 'extra butter please!' gets logged. But data is everywhere - ticket sales here, concessions there!", example: "John bought 2 tickets for 'Avatar 5' at 7:30 PM, large popcorn combo, and snuck in his own candy (we know, John!) 🍿" },
            step2: { title: "Python - The Box Office Predictor", desc: "Python analyzes years of movie data and predicts hits! 🎯 'Based on director, cast, genre, and release date... this movie will make $150M opening weekend!' Like a time-traveling film critic!", example: "Predicted 'Superhero Movie X' would flop based on runtime + similar films. Saved $2M in marketing! 💰" },
            step3: { title: "ClickHouse - The Instant Box Office", desc: "ClickHouse crunches billions of ticket records instantly! ⚡ 'Total concession revenue per film genre per quarter' across 500 theatres? Answer in 0.3 seconds. Real-time box office tracking!", example: "'Which snacks sell most during horror movies vs comedies?' 2 billion rows... Horror = nachos, Comedy = chocolate. Done in 0.5s! 🍫" },
            step4: { title: "Redshift - The Box Office Archive", desc: "Redshift stores decades of movie data perfectly organized! 📦 20 years of ticket sales, but finding 'all horror movies that sold out on Friday nights' takes 1 second!", example: "'Which movies had the best popcorn sales?' Searching 15 years... Found top 10 in 0.5 seconds! Horror + nachos = gold! 🍿" },
            step5: { title: "Airflow - The Showtime Scheduler", desc: "Airflow runs nightly: pull today's ticket sales, update concession inventory, calculate per-screen profitability, and alert managers about underperforming screens! All automated, every single night.", example: "11 PM - Collect ticket data ✓, 11:30 PM - Update revenue per screen ✓, Midnight - Generate tomorrow's pricing ✓ 🎬" },
            step6: { title: "DBT - The Revenue Translator", desc: "DBT transforms raw ticket IDs into business gold: 'Screen 5 at Downtown location earns $2,847/day on comedies but only $1,200 on dramas. Switch Tuesday drama to comedy!' Actionable insights!", example: "Revenue-per-seat model shows IMAX earns 3.4x standard screens. Recommendation: convert Screen 8 to IMAX! 💰" },
            step7: { title: "Metabase - The Theatre Dashboard", desc: "Metabase shows theatre managers everything at a glance! 📊 Real-time occupancy rates, concession trends, and revenue heat maps. No spreadsheets - just beautiful, interactive charts!", example: "Dashboard: 'Avatar 5' at 92% occupancy! Downtown location #1 in popcorn sales! Alert: Screen 3 projector needs service! 🍿" },
            step8: { title: "Data Science - The Hit Predictor", desc: "Data Science predicts which movies will be hits months before release! 🔮 Analyzing cast, director, genre trends, social media buzz, and trailer views to forecast opening weekends.", example: "ML model predicts indie film 'Moonlight 2' will fill 87% of date-night slots based on similar films + social buzz. Book it! 💑" },
            step9: { title: "LLMs - The AI Film Critic", desc: "LLMs read thousands of reviews, social media posts, and scripts in seconds! 🧠 Ask it 'Summarize audience sentiment for our new release' and get instant, nuanced analysis.", example: "Theater chain asks: 'What concessions should we promote for the horror marathon?' LLM: 'Nachos +47% during horror. Bundle nachos + soda, place near Screen 3!' 🍿" }
        },
        result: { title: "The Box Office Magic! ✨", desc: "From scattered ticket stubs to predicting the next billion-dollar franchise! Theatre managers know exactly which movies to book, when, and how much popcorn to order! 🍿", before: "Should we book this indie film?", beforeResult: "*Gut feeling and crossed fingers* 🤞", after: "Should we book this indie film?", afterResult: "*AI prediction* → 'Yes! 87% fill rate predicted for date-night slots!' 💑" }
    },
    airline: {
        name: "Airlines", icon: "✈️", badge: "AVIATION",
        title: "Meet DataBot 🤖 - Your Flight Operations Expert!",
        subtitle: "Soar with DataBot as he optimizes flight routes and passenger experiences!",
        speech: "Welcome aboard Flight DATA-101! Let me show you how we keep millions of passengers happy!",
        steps: {
            step1: { title: "PostgreSQL - The Busy Airport Terminal", desc: "Imagine managing 1,000 flights daily! ✈️ Passengers checking in, bags being loaded, pilots filing reports. Data flying everywhere faster than the planes! Gate assignments here, passenger manifests there!", example: "Flight 747 to Paris: 234 passengers, 847 bags, 3 vegetarian meals, 1 emotional support peacock. All in different systems! 🦚" },
            step2: { title: "Python - The Route Optimizer", desc: "Python calculates the most efficient flight paths! 🗺️ Fuel prices, weather patterns, air traffic - it processes everything to find the perfect route. Saves millions in fuel costs!", example: "Optimized Pacific routes based on jet streams. Saved 15 minutes per flight = $50M in fuel annually! ⛽" },
            step3: { title: "ClickHouse - The Real-Time Flight Tracker", desc: "ClickHouse processes millions of GPS pings, delay events, and passenger check-ins in real-time! ⚡ 'How many passengers are connecting through O'Hare with under 30 min?' Answer in 0.2 seconds.", example: "Weather delay at JFK. ClickHouse instantly found 847 affected connecting passengers across 23 flights. Rebooking started! 🌧️" },
            step4: { title: "Redshift - The Flight Data Warehouse", desc: "Redshift stores 30 years of flight records perfectly organized! 📦 Finding 'all delayed flights due to weather in December' takes 2 seconds across billions of records!", example: "'Which routes have the most delays?' Searching 10 years... Found top 50 in 1.2 seconds! Chicago O'Hare + winter = delays! ❄️" },
            step5: { title: "Airflow - The Ground Control Scheduler", desc: "Airflow automates everything: nightly delay analysis, crew schedule optimization, fuel cost reports, and maintenance alerts. Runs 365 days a year. Never calls in sick!", example: "2 AM - Analyze today's delays ✓, 3 AM - Optimize tomorrow's crew ✓, 4 AM - Flag maintenance due ✓, Ready for dispatch! ☕" },
            step6: { title: "DBT - The Aviation Translator", desc: "DBT turns flight codes and timestamps into business insights: 'Route LAX→JFK averages 23-min delay, costs $4,200/flight in fuel overage. Recommend schedule padding.'", example: "On-time performance model: Adding 15-min buffer to Route 447 would improve on-time rate from 71% to 94%. CFO approved! 📋" },
            step7: { title: "Metabase - The Control Tower Dashboard", desc: "Metabase gives operations a live view: flight status map, delay heat maps, passenger satisfaction scores. The CEO opens it every morning!", example: "Dashboard: 97.2% on-time today! Hub capacity at 84%. Alert: Storm approaching Dallas - 12 flights need rerouting! ⛈️" },
            step8: { title: "Data Science - The Delay Prophet", desc: "Data Science predicts delays 6 hours ahead using weather, historical patterns, and airport congestion! 🔮 Passengers get proactive alerts and automatic rebooking before delays even happen.", example: "ML predicts 89% chance of 45-min delay for Flight 302 due to DFW congestion. Auto-rebooked 47 connecting passengers! 🎉" },
            step9: { title: "LLMs - The AI Passenger Agent", desc: "LLMs power the virtual assistant that passengers chat with! 🧠 'My connecting flight is tight, will I make it?' The LLM checks gates, walking time, current delays, and responds instantly.", example: "Pilot asks: 'Optimal altitude for fuel efficiency on LAX→JFK given today's jet stream?' LLM: '38,000ft, saving 340 gallons vs FL350.' ✈️" }
        },
        result: { title: "The Aviation Magic! ✨", desc: "From flight delays to proactive operations! The ops center now predicts delays 6 hours ahead, automatically rebooks passengers, and optimizes crew schedules. Passengers arrive happy! 😊", before: "Why is my flight delayed?", beforeResult: "*Shrug* 'Weather somewhere maybe?' ☁️", after: "Will my flight be delayed?", afterResult: "*Proactive alert* → 'Yes, but we've already rebooked you!' 🎉" }
    },
    oilrig: {
        name: "Oil & Gas", icon: "🛢️", badge: "ENERGY",
        title: "Meet DataBot 🤖 - Your Energy Sector Analyst!",
        subtitle: "Drill into data with DataBot as he monitors oil rigs and optimizes production!",
        speech: "Welcome to the oil fields! Let me show you how we turn sensor data into energy efficiency!",
        steps: {
            step1: { title: "PostgreSQL - The Sensor Ocean", desc: "Picture an oil rig with 10,000 sensors! 🌡️ Temperature, pressure, flow rates, vibrations - data streaming every millisecond! One rig generates more data than a small country!", example: "Sensor #4521: pressure 4,521 PSI. Sensor #4522: temperature 347°F. That's 864 million readings per day! 📊" },
            step2: { title: "Python - The Predictive Maintenance Brain", desc: "Python predicts equipment failures BEFORE they happen! 🔮 By analyzing vibration patterns, it says 'This pump will fail in 72 hours.' Replace it now, avoid $10M in lost production!", example: "Predicted turbine bearing failure 5 days early. Scheduled repair during planned downtime. Zero production loss! 🎯" },
            step3: { title: "ClickHouse - The Sensor Speed Reader", desc: "ClickHouse ingests and queries billions of sensor readings in real-time! ⚡ 'Show me pressure anomalies across all 50 rigs in the last hour' - answer in 0.3 seconds. Critical for safety!", example: "'Which pumps show vibration patterns matching pre-failure signatures?' Scanning 10 billion readings... 3 pumps flagged in 0.5s! 🔧" },
            step4: { title: "Redshift - The Sensor Data Archive", desc: "Redshift stores decades of sensor data perfectly organized! 📦 20 years of pressure, temperature, and flow data, all queryable in seconds!", example: "'Which pumps had the most failures?' Searching 15 years... Found top 20 in 0.8 seconds! Predictive maintenance scheduled! 🔧" },
            step5: { title: "Airflow - The Rig Night Watchman", desc: "Airflow runs automated checks every hour: sensor health, anomaly detection, production reports, and safety compliance. Never misses a reading!", example: "Every hour: Check 10,000 sensors ✓, Flag anomalies ✓, Update production dashboard ✓, Email safety report ✓ 🛢️" },
            step6: { title: "DBT - The Engineering Translator", desc: "DBT turns raw sensor codes into engineer-friendly insights: 'Pump #7 at Well #23 is running 12% hot. Historical pattern suggests bearing replacement in 5 days.' Clear, actionable!", example: "Equipment health scorecard: 47 pumps green, 2 yellow (schedule maintenance), 1 red (replace this week). Saved $3M! 📋" },
            step7: { title: "Metabase - The Rig Commander Dashboard", desc: "Metabase shows the control room a live map of every rig, well, and pump with color-coded health status! 📊 Engineers spot problems at a glance.", example: "Dashboard: Production at 98.7% capacity! Rig #12 flagged yellow - Pump #7 bearing wear. Maintenance team dispatched! 🔧" },
            step8: { title: "Data Science - The Failure Prophet", desc: "Data Science models learn from 20 years of sensor data to predict failures weeks in advance! 🔮 Pattern recognition that no human could do manually across 500,000 sensors.", example: "ML predicts: Pump #7 bearing will fail in 72 hours (94% confidence). Replacement ordered, zero unplanned downtime! 🎯" },
            step9: { title: "LLMs - The AI Field Engineer", desc: "LLMs let field engineers ask questions in plain English! 🧠 'What's the maintenance history of Pump #7?' and get an instant summary with recommended actions from 20 years of service logs.", example: "Engineer asks: 'Why is Well #23 underperforming?' LLM analyzes sensor data, geology reports → 'Scale buildup detected. Recommend acid wash. Similar wells improved 31% after treatment.' 🛢️" }
        },
        result: { title: "The Energy Magic! ✨", desc: "From reactive repairs to predictive maintenance! Engineers see problems coming weeks ahead. Production up 15%, accidents down 40%, equipment lasts 30% longer! 🛢️", before: "Why did that pump explode?", beforeResult: "*Investigation* 'It was old, I guess?' 🤷", after: "Is anything about to fail?", afterResult: "*AI Alert* → 'Yes, replace Pump #7 bearing in 3 days!' 🔧" }
    },
    procurement: {
        name: "Procurement", icon: "📦", badge: "SUPPLY",
        title: "Meet DataBot 🤖 - Your Supply Chain Guru!",
        subtitle: "Watch DataBot optimize procurement and save millions in purchasing!",
        speech: "Welcome to the supply chain! Let me show you how we turn purchase orders into profit!",
        steps: {
            step1: { title: "PostgreSQL - The Vendor Jungle", desc: "Managing 5,000 vendors is like herding cats! 🐱 Purchase orders, invoices, delivery schedules, quality reports - all in different formats! Some vendors email Excel, others fax (yes, fax!), some use carrier pigeons!", example: "Order #78451: 10,000 widgets from Vendor A. But Vendor B is 15% cheaper... Vendor C has better quality! 😵" },
            step2: { title: "Python - The Price Predictor", desc: "Python analyzes market trends and predicts prices! 📈 'Steel prices will rise 20% next month due to shipping constraints.' Buy now and save millions!", example: "Predicted copper shortage 2 months early. Pre-ordered at current prices. Saved $4.2M when prices spiked! 💰" },
            step3: { title: "ClickHouse - The Spend Analyzer", desc: "ClickHouse scans billions of line items to find spend patterns in milliseconds! ⚡ 'Show me all vendors where unit price increased more than 10% this quarter.' Instant answer.", example: "'Which commodity prices are trending up across 5,000 vendors?' 3 billion line items scanned in 0.6 seconds! Steel +18%, copper +22%! 📈" },
            step4: { title: "Redshift - The Vendor Data Warehouse", desc: "Redshift stores years of vendor and purchase data perfectly organized! 📦 Finding 'all vendors who delivered late in Q4' takes 1 second across 10 years of data!", example: "'Which vendors have the best on-time delivery?' Searching 5 years... Found top 100 in 0.6 seconds! Negotiations just got easier! 💰" },
            step5: { title: "Airflow - The Procurement Automator", desc: "Airflow automates the daily grind: check reorder points, compare vendor prices, generate purchase orders, and flag late deliveries. Runs every night without fail!", example: "6 AM - Check inventory levels ✓, 6:30 AM - Auto-generate POs for low stock ✓, 7 AM - Email late-delivery alerts ✓ 📦" },
            step6: { title: "DBT - The Vendor Scorecard Builder", desc: "DBT transforms raw PO data into vendor scorecards: 'Vendor X: 98% on-time, 2.1% defect rate, avg lead time 5 days.' Clear comparison across all 5,000 vendors!", example: "Vendor performance model: Vendor A scores 94/100 vs Vendor B at 67/100. Recommendation: consolidate to Vendor A. Save $1.2M! 📊" },
            step7: { title: "Metabase - The Spend Dashboard", desc: "Metabase shows procurement leaders total spend by category, vendor performance, and savings opportunities in real-time! 📊 Beautiful charts instead of endless spreadsheets!", example: "Dashboard: Total spend $42M this quarter. Top savings opportunity: consolidate packaging vendors = $800K savings! Alert: Steel price spike coming! 🚨" },
            step8: { title: "Data Science - The Demand Oracle", desc: "Data Science predicts demand and supply disruptions weeks ahead! 🔮 'Based on shipping data + weather + market trends: order raw materials NOW before the shortage hits.'", example: "ML predicts: 78% chance of shipping delay from Asia next month. Recommendation: order 2 weeks early. Saved $4.2M in rush fees! 🚀" },
            step9: { title: "LLMs - The AI Procurement Agent", desc: "LLMs read vendor contracts, emails, and market reports in seconds! 🧠 Ask 'Which vendors offer the best terms for copper?' and get a comparison from 500 contracts instantly.", example: "Buyer asks: 'Draft a negotiation email to Vendor X about their 15% price increase.' LLM drafts email with data points: competitor pricing, volume commitment, historical relationship. Sent in 2 minutes! 📧" }
        },
        result: { title: "The Procurement Magic! ✨", desc: "From chaotic purchasing to strategic sourcing! Procurement team now has vendor scorecards, price predictions, and automatic reordering. Costs down 18%, supplier quality up! 📦", before: "Why do we keep running out of parts?", beforeResult: "*Spreadsheet chaos* 'Reorder point was wrong?' 📊", after: "When should we reorder?", afterResult: "*Smart Alert* → 'Order now! Lead time increased + demand spike coming!' 🚀" }
    },
    hospital: {
        name: "Healthcare", icon: "🏥", badge: "HEALTH",
        title: "Meet DataBot 🤖 - Your Healthcare Analytics Partner!",
        subtitle: "Heal with DataBot as he improves patient outcomes through data!",
        speech: "Welcome to healthcare data! Let me show you how we save lives with analytics!",
        steps: {
            step1: { title: "PostgreSQL - The Medical Records Maze", desc: "Hospitals generate MASSIVE data! 🩺 Lab results, vital signs, prescriptions, imaging, doctor notes - scattered across dozens of systems! Finding a patient's complete history is like a treasure hunt!", example: "Patient John: Blood test in Lab System A, X-ray in Imaging System B, prescription in Pharmacy System C. 🧩" },
            step2: { title: "Python - The Diagnostic Assistant", desc: "Python analyzes symptoms and flags conditions humans might miss! 🤖 Not replacing doctors - helping them. 'Based on these 47 symptoms and test results, consider checking for...'", example: "Flagged rare condition matching patient symptoms. Doctor confirmed. Early detection = full recovery! ❤️" },
            step3: { title: "ClickHouse - The Clinical Speed Engine", desc: "ClickHouse queries millions of patient records in milliseconds! ⚡ 'All diabetic patients on Medication X who had adverse reactions' - answer before the doctor finishes asking.", example: "'Which patients on Drug X + Drug Y had adverse reactions?' 50 million records scanned in 0.4 seconds. 847 cases found! 💊" },
            step4: { title: "Redshift - The Medical Data Warehouse", desc: "Redshift stores 25 years of patient data perfectly organized and secure! 📦 Finding medication interaction patterns across millions of patients takes seconds!", example: "'Which drug combinations cause the most ER visits?' Searching 10 years... Found top 20 interactions in 1.1 seconds! Protocol updated! 💊" },
            step5: { title: "Airflow - The Clinical Data Pipeline", desc: "Airflow runs nightly: sync lab results, update patient records, check for drug interactions, and generate compliance reports. Automated, auditable, and reliable!", example: "Midnight - Sync lab results ✓, 1 AM - Check drug interactions ✓, 2 AM - Generate compliance report ✓, 3 AM - Alert on anomalies ✓ 🏥" },
            step6: { title: "DBT - The Clinical Translator", desc: "DBT transforms ICD codes and medical jargon into clear insights: 'Patient cohort on Medication X shows 12% higher readmission rate. Recommend protocol review.'", example: "Readmission risk model: Patients discharged on Fridays have 18% higher readmission. Recommendation: enhanced Friday discharge process! 📋" },
            step7: { title: "Metabase - The Hospital Dashboard", desc: "Metabase shows hospital administrators bed occupancy, wait times, and patient satisfaction in real-time! 📊 Doctors see their patient panels at a glance.", example: "Dashboard: ER wait time 22 min (down 30%!). ICU at 87% capacity. Alert: Flu admissions trending up - prepare overflow beds! 🤒" },
            step8: { title: "Data Science - The Outcome Predictor", desc: "Data Science predicts patient outcomes and readmission risk! 🔮 'This patient has a 73% readmission risk - schedule a follow-up call.' Proactive care saves lives!", example: "ML model flags: Patient #4521 has 73% readmission risk based on vitals + history. Follow-up call scheduled. Readmission prevented! ❤️" },
            step9: { title: "LLMs - The AI Medical Scribe", desc: "LLMs transcribe doctor-patient conversations and generate structured clinical notes in seconds! 🧠 They also answer medical questions using hospital guidelines and latest research.", example: "Doctor asks: 'What are the latest treatment guidelines for Type 2 diabetes with kidney complications?' LLM summarizes 50 papers in 3 seconds with citations! 📋" }
        },
        result: { title: "The Healthcare Magic! ✨", desc: "From fragmented records to unified patient care! Doctors see complete history instantly, AI flags issues, research happens 10x faster. Better care, saved lives! 🏥", before: "What medications is this patient on?", beforeResult: "*Calling 5 pharmacies* 'Let me check...' 📞", after: "What medications is this patient on?", afterResult: "*Instant view* → 'Complete history + interaction warnings!' 💊" }
    },
    automotive: {
        name: "Automotive", icon: "🚗", badge: "AUTO",
        title: "Meet DataBot 🤖 - Your Manufacturing Intelligence!",
        subtitle: "Rev up with DataBot as he optimizes car production lines!",
        speech: "Welcome to the factory floor! Let me show you how we build perfect cars with data!",
        steps: {
            step1: { title: "PostgreSQL - The Assembly Line Symphony", desc: "A car has 30,000 parts! 🔩 Each part has origin, quality checks, and installation time. Multiply by 1,000 cars per day = 30 MILLION data points daily! Tracking one defective bolt is like finding Waldo!", example: "Bolt #47829-C installed in Car #78451 at Station 23 by Robot Arm #7 at 14:23:47. Now imagine ALL bolts! 🤯" },
            step2: { title: "Python - The Production Optimizer", desc: "Python balances the entire production line! ⚖️ If one station is slow, it ripples through everything. Python simulates changes and finds the perfect flow!", example: "Optimized station sequence. Reduced bottleneck at door assembly. Production up 8% = 80 extra cars/day! 🚗" },
            step3: { title: "ClickHouse - The Defect Detective", desc: "ClickHouse scans millions of quality checks per second! ⚡ 'Show me all paint defects from Booth #3 grouped by humidity level' - answer before the engineer finishes coffee.", example: "'Which stations produce the most defects by shift?' 500 million records in 0.4 seconds. Night shift, Station 7! 🔍" },
            step4: { title: "Redshift - The Manufacturing Warehouse", desc: "Redshift stores 10 years of production data perfectly organized! 📦 Every bolt, every paint job, every quality check - queryable in seconds!", example: "'Which stations have the most defects?' Searching 5 years... Found top 20 in 0.7 seconds! Root cause identified! 🔧" },
            step5: { title: "Airflow - The Factory Night Owl", desc: "Airflow runs after every shift: aggregate quality metrics, update supplier scorecards, generate production reports, flag anomalies. Automated, consistent, tireless!", example: "Shift end - Aggregate quality data ✓, Calculate defect rates ✓, Update supplier scores ✓, Flag Station 7 anomaly ✓ 🏭" },
            step6: { title: "DBT - The Quality Translator", desc: "DBT transforms raw station codes into business insights: 'Station 7 paint defect rate is 2.3% (vs 0.5% target). Root cause: humidity > 60%. Fix: improve booth ventilation.'", example: "Quality scorecard: 14 stations green, 1 yellow (Station 7 paint). Action item: Fix ventilation by Friday. Est. savings: $2M/year! 📋" },
            step7: { title: "Metabase - The Factory Floor Dashboard", desc: "Metabase shows the plant manager everything: production rates, quality scores, supply chain status, and robot uptime - all live! 📊", example: "Dashboard: 1,012 cars built today (target: 1,000!). Quality score 99.2%. Alert: Supplier X delayed - switch to backup! ⚠️" },
            step8: { title: "Data Science - The Defect Predictor", desc: "Data Science predicts defects before they happen! 🔮 By analyzing 30,000 parameters per car, it spots anomalies forming. 'Station 7 showing early signs of paint issue.'", example: "ML detects: Station 7 vibration pattern matches pre-defect signature (91% confidence). Maintenance scheduled. Zero recalls! 🎯" },
            step9: { title: "LLMs - The AI Quality Engineer", desc: "LLMs analyze defect reports, maintenance logs, and engineering specs in seconds! 🧠 Engineers ask questions in plain English and get root-cause analysis instantly.", example: "Engineer asks: 'Why are door panel gaps wider on night shift?' LLM cross-references temperature, humidity, robot calibration logs → 'Booth temp drops 3°C at 11PM. Adhesive viscosity changes. Recommend pre-heating.' 🚗" }
        },
        result: { title: "The Manufacturing Magic! ✨", desc: "From reactive quality control to predictive perfection! Factory managers see defects forming before they happen, optimize in real-time, and build perfect cars! 🚗", before: "Why did we have recalls last quarter?", beforeResult: "*Root cause analysis for months* 🔍", after: "Will we have quality issues?", afterResult: "*Predictive Alert* → 'Station 7 showing anomaly. Inspect before next shift!' ⚠️" }
    },
    banking: {
        name: "Banking", icon: "🏦", badge: "FINANCE",
        title: "Meet DataBot 🤖 - Your Financial Data Guardian!",
        subtitle: "Watch DataBot secure billions in transactions and catch fraud in milliseconds!",
        speech: "Welcome to Finance! Let me show you how we protect money and catch bad actors with data!",
        steps: {
            step1: { title: "PostgreSQL - The Vault of Transactions", desc: "Banks process MILLIONS of transactions every second! 💰 ATM withdrawals, wire transfers, card swipes, loan payments - all across the globe. Each has sender, receiver, amount, time, location, risk score!", example: "John swipes card in New York 2:15 PM, then London 2:17 PM. 3,500 miles in 2 minutes! 🚨 FRAUD ALERT!" },
            step2: { title: "Python - The Fraud Hunter", desc: "Python builds AI models that learn what 'normal' looks like! 🧠 It scores every transaction in real-time. Unusual spending? Different location? Weird timing? Caught before the transaction completes!", example: "ML flagged card #4521 - spending changed 847% from baseline. Card was cloned at a gas station skimmer! 🎯" },
            step3: { title: "ClickHouse - The Real-Time Fraud Scanner", desc: "ClickHouse scores millions of transactions per second! ⚡ 'Flag all transactions where amount > $5K AND account < 30 days old AND country differs from registration.' Instant!", example: "'Which accounts show structuring patterns (many deposits just under $10K)?' 2 billion transactions in 0.3 seconds. 47 flagged! 🚨" },
            step4: { title: "Redshift - The Financial Data Warehouse", desc: "Redshift stores 20 years of transaction data perfectly organized and secure! 📦 Finding suspicious patterns across billions of records takes seconds!", example: "'Which accounts show suspicious patterns?' Searching 5 years... Found 47 flagged accounts in 0.9 seconds! 🚨" },
            step5: { title: "Airflow - The Compliance Robot", desc: "Airflow automates nightly: anti-money-laundering checks, suspicious activity reports, regulatory filings, and risk score recalculations. Regulators love the consistency!", example: "Midnight - Run AML checks ✓, 1 AM - Generate SARs ✓, 2 AM - Update risk scores ✓, 3 AM - Regulatory reports ✓ 🏦" },
            step6: { title: "DBT - The Risk Translator", desc: "DBT turns raw transaction codes into risk insights: 'Account #78451 has 23 international transfers in 7 days, all just under reporting threshold. Risk score: HIGH.'", example: "Customer risk model: 847 accounts reclassified. 12 flagged for enhanced due diligence. Compliance officer notified! 📋" },
            step7: { title: "Metabase - The Risk Command Center", desc: "Metabase shows the compliance team a live fraud map, transaction volumes, and risk alerts! 📊 Real-time visibility into billions of dollars flowing through the bank.", example: "Dashboard: $2.3B processed today. 12 fraud attempts blocked. Risk score distribution healthy. Alert: Unusual wire pattern from Branch #47! 🚨" },
            step8: { title: "Data Science - The Fraud Oracle", desc: "Data Science models learn from millions of fraud cases to catch new patterns! 🔮 They adapt in real-time - when fraudsters change tactics, the model updates within hours.", example: "New fraud pattern detected: 'micro-transactions to test stolen cards.' Model updated. 234 compromised cards blocked in 1 hour! ⚡" },
            step9: { title: "LLMs - The AI Compliance Officer", desc: "LLMs read regulations, audit reports, and suspicious activity filings in seconds! 🧠 Compliance officers ask 'Summarize all SAR filings related to wire transfers this month' and get instant analysis.", example: "Analyst asks: 'Is this transaction pattern consistent with money laundering?' LLM analyzes against 200 known typologies → 'Matches layering pattern #47. Recommend escalation to BSA officer.' 🏦" }
        },
        result: { title: "The Financial Fortress! 🏰", desc: "From reactive fraud detection to real-time protection! Banks stop fraudsters mid-transaction, prevent money laundering, and keep money safe - processing billions in legitimate transactions! 💎", before: "Why did we lose $2M to fraud?", beforeResult: "*Reviewing paper reports* → 'Investigating...' 📄", after: "Is this transaction safe?", afterResult: "*Real-time AI* → 'BLOCKED! Card cloned. Customer notified. New card shipped!' ⚡" }
    },
    ecommerce: {
        name: "E-Commerce", icon: "🛍️", badge: "SHOP",
        title: "Meet DataBot 🤖 - Your E-Commerce Growth Engine!",
        subtitle: "Watch DataBot turn clicks into customers and abandoned carts into sales!",
        speech: "Welcome to Online Shopping! Let me show you how we turn browsers into buyers with data wizardry!",
        steps: {
            step1: { title: "PostgreSQL - The Digital Shopping Mall", desc: "Every click, scroll, hover, and purchase creates data! 🖱️ 50 MILLION events per day. Product views, wishlist adds, cart abandonment, search queries - like watching millions of shoppers through cameras!", example: "User #78234 viewed blue sneakers 7 times, added to cart twice, removed once, checked competitor prices. Buy or bounce? 🤔" },
            step2: { title: "Python - The Recommendation Wizard", desc: "Python builds the 'Customers also bought' magic! 🪄 Collaborative filtering, content-based recommendations, real-time personalization. Every user sees a store built just for them!", example: "'Based on your browsing: 5 items you'll LOVE!' Click-through rate jumped 340%. Average order value up $23! 🎯" },
            step3: { title: "ClickHouse - The Clickstream Analyzer", desc: "ClickHouse processes billions of click events in real-time! ⚡ 'Show me the top abandoned products in the last hour, by region.' Perfect for real-time A/B testing and personalization.", example: "'Which products have highest add-to-cart but lowest purchase rate?' 5 billion events in 0.4 seconds. Blue sneakers #1! Time to add free shipping! 👟" },
            step4: { title: "Redshift - The Shopping Data Warehouse", desc: "Redshift stores 5 years of customer behavior perfectly organized! 📦 Finding 'all users who abandoned cart at checkout' takes 1 second! Marketing team's goldmine!", example: "'Which products have highest conversion?' Searching 3 years... Found top 100 in 0.8 seconds! Campaigns optimized! 📈" },
            step5: { title: "Airflow - The E-Commerce Automator", desc: "Airflow runs nightly: update product recommendations, recalculate customer segments, sync inventory, generate marketing reports. Every morning, the team has fresh data!", example: "Midnight - Update recommendations ✓, 1 AM - Recalculate segments ✓, 2 AM - Sync inventory ✓, 3 AM - Generate reports ✓ 🛍️" },
            step6: { title: "DBT - The Conversion Translator", desc: "DBT transforms clickstream data into business gold: 'Users who view 3+ times but don't buy have a 67% conversion rate with a 10% coupon. Segment: High-Intent Browsers.'", example: "Customer Lifetime Value model: User #78234 = $847 over 2 years. Top 10% customer. Trigger: VIP welcome email! 👑" },
            step7: { title: "Metabase - The Sales Dashboard", desc: "Metabase shows the team everything: live sales, conversion funnels, cart abandonment rates, and top products! 📊 The CEO checks it before every meeting.", example: "Dashboard: $1.2M in sales today (up 18%)! Conversion rate 3.4%. Alert: Cart abandonment spiked at shipping page - investigate! 🛒" },
            step8: { title: "Data Science - The Customer Whisperer", desc: "Data Science predicts what customers want before they know it! 🔮 Churn prediction, next-purchase prediction, dynamic pricing - turning browsing into buying.", example: "ML predicts: User #78234 will buy in 24 hours if shown 10% discount. Push notification sent... PURCHASED! Revenue +$89! 💰" },
            step9: { title: "LLMs - The AI Shopping Assistant", desc: "LLMs power the chat assistant that helps shoppers find exactly what they need! 🧠 'I need a gift for my mom who likes gardening and cooking' → personalized recommendations with explanations.", example: "Customer asks: 'Is this laptop good for video editing?' LLM reads 10,000 reviews + specs → 'Great for 1080p editing, struggles with 4K. Consider this model instead for $50 more. Users rate it 4.8/5 for editing.' 💻" }
        },
        result: { title: "The Conversion Kingdom! 👑", desc: "From guessing to knowing! E-commerce teams rescue abandoned carts, personalize every experience, and turn one-time buyers into loyal fans! 🛒", before: "Why is our conversion rate only 2%?", beforeResult: "*Basic analytics* → 'Maybe better photos?' 📸", after: "How do we increase sales?", afterResult: "*AI Insight* → 'User hesitating! Send 10% off NOW!' → PURCHASED! 💰" }
    },
    datascience: {
        name: "Data Science", icon: "📊", badge: "AI",
        title: "Meet DataBot 🤖 - Your Data Science Mentor!",
        subtitle: "Learn with DataBot as he transforms raw data into powerful predictions and insights!",
        speech: "Welcome to Data Science! Let me show you how we turn numbers into superpowers!",
        steps: {
            step1: { title: "PostgreSQL - The Data Treasure Chest", desc: "Data Science starts with data! 📦 Customer behavior, sales trends, sensor readings, social media posts - millions of records waiting to tell a story. But raw data is messy, incomplete, and scattered!", example: "10 million transactions, 500,000 reviews, 2 million clicks. All separate, all waiting to reveal hidden patterns! 🔍" },
            step2: { title: "Python - The Pattern Detective", desc: "Python is the superpower of Data Science! 🐍 pandas, scikit-learn, matplotlib - it reads millions of rows, finds correlations humans miss, and visualizes everything beautifully.", example: "Analyzed 5 years of sales! Ice cream spikes 340% when temp > 85°F. Stocked up before heatwave. Profit up 50%! 🍦" },
            step3: { title: "ClickHouse - The Feature Store Engine", desc: "ClickHouse computes features for ML models in real-time! ⚡ 'User's average spend in last 30 days, number of logins this week, days since last purchase' - computed over billions of rows instantly.", example: "'Compute 50 features for 10 million users for churn model training.' 8 billion calculations in 2.1 seconds! Model training can begin! 🧠" },
            step4: { title: "Redshift - The Analytics Warehouse", desc: "Redshift stores massive datasets for analysis! 📦 10 years of data, perfectly organized. Data scientists run complex queries and joins across billions of rows.", example: "'Correlation between weather, day-of-week, and ice cream sales across 5 years?' Found 0.89 in 1.0 seconds! 📈" },
            step5: { title: "Airflow - The ML Pipeline Orchestrator", desc: "Airflow automates the ML lifecycle: collect data, compute features, train model, evaluate, deploy. Runs daily so your models are always fresh!", example: "Daily - Pull new data ✓, Compute features ✓, Retrain model ✓, Evaluate accuracy ✓, Deploy if better ✓ 🤖" },
            step6: { title: "DBT - The Feature Engineer", desc: "DBT transforms raw data into clean features for ML: 'customer_lifetime_value', 'days_since_last_purchase', 'avg_order_value'. SQL-based, version-controlled, documented!", example: "Feature store: 200 features computed nightly. Model accuracy improved 12% just from better feature engineering! 📋" },
            step7: { title: "Metabase - The Insight Dashboard", desc: "Metabase visualizes model results and business impact! 📊 A/B test results, model accuracy over time, feature importance - all in beautiful, shareable dashboards.", example: "Dashboard: Churn model saving $2.1M/month! Recommendation engine +23% revenue! A/B test: New model wins by 7%! 📈" },
            step8: { title: "Data Science - The Prediction Engine", desc: "This is where it all comes together! 🔮 Machine learning models predict churn, recommend products, detect anomalies, and forecast demand. From raw data to business superpowers!", example: "Churn model: 'Customer #4521 has 78% churn risk. Trigger: retention offer.' Result: customer stayed. LTV +$2,400! 🎯" },
            step9: { title: "LLMs - The AI Data Scientist", desc: "LLMs help data scientists work 10x faster! 🧠 'Write a Python script to find the top 10 features correlated with churn' → working code in 5 seconds. They also explain model results to non-technical stakeholders.", example: "Data scientist asks: 'Explain this model's predictions to the marketing team.' LLM: 'Customers who haven't purchased in 45+ days AND visited the cancellation page are 6x more likely to churn. Target them with a win-back email within 48 hours.' 🎯" }
        },
        result: { title: "The Data Science Revolution! 🚀", desc: "From guessing to knowing! Data scientists predict customer behavior, optimize decisions, and solve problems before they happen. Data into dollars, insights into impact! 💡", before: "Will customers like this new product?", beforeResult: "*Market research for months* → 'Maybe? 60% think so?' 🤷", after: "Will customers like this new product?", afterResult: "*ML Prediction* → '87% will love it! Target: Millennials, urban, launch Q2!' 🎯" }
    }
};

// Current story theme
let currentStoryTheme = 'walmart';

// Select story theme
function selectStoryTheme(themeName) {
    if (!storyThemes[themeName]) return;
    
    currentStoryTheme = themeName;
    const theme = storyThemes[themeName];
    
    // Update theme card active state
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.theme === themeName) {
            card.classList.add('active');
        }
    });
    
    // Update DataBot appearance
    const databotHat = document.getElementById('databot-hat');
    const databotBadge = document.getElementById('databot-badge');
    if (databotHat) databotHat.textContent = theme.icon;
    if (databotBadge) databotBadge.textContent = theme.badge;
    
    // Update title and subtitle
    const journeyTitle = document.getElementById('journey-title');
    const journeySubtitle = document.getElementById('journey-subtitle');
    if (journeyTitle) journeyTitle.textContent = theme.title;
    if (journeySubtitle) journeySubtitle.textContent = theme.subtitle;
    
    // Update DataBot speech
    clearInterval(window._botCycleTimer);
    updateDatabotSpeech(theme.speech);
    setTimeout(() => { if (typeof startBotCycle === 'function') startBotCycle(); }, 5000);
    
    // Update all 9 journey steps
    const steps = theme.steps;
    const stepLabels = {
        1: 'Real Scenario:',
        2: 'Python discovers:',
        3: 'ClickHouse answers:',
        4: 'Redshift stores:',
        5: "Airflow's schedule:",
        6: 'DBT creates:',
        7: 'Metabase shows:',
        8: 'Data Science predicts:',
        9: 'LLM powers:'
    };
    
    // Update all steps dynamically (step1 through step9)
    Object.keys(steps).forEach((key, index) => {
        const stepNum = index + 1;
        const titleEl = document.getElementById(`step${stepNum}-title`);
        const descEl = document.getElementById(`step${stepNum}-desc`);
        const exampleEl = document.getElementById(`step${stepNum}-example`);
        
        if (titleEl && steps[key]) titleEl.textContent = steps[key].title;
        if (descEl && steps[key]) descEl.textContent = steps[key].desc;
        if (exampleEl && steps[key]) {
            const label = stepLabels[stepNum] || 'Example:';
            exampleEl.innerHTML = `<strong>${label}</strong> "${steps[key].example}"`;
        }
    });
    
    // Update result card
    const result = theme.result;
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-desc');
    const finalExample = document.getElementById('final-example');
    
    if (resultTitle) resultTitle.textContent = result.title;
    if (resultDesc) resultDesc.textContent = result.desc;
    if (finalExample) {
        finalExample.innerHTML = `
            <strong>Before:</strong> "${result.before}" → ${result.beforeResult}<br>
            <strong>After:</strong> "${result.after}" → ${result.afterResult}
        `;
    }
    
    // Scroll to journey section
    const journeySection = document.getElementById('data-journey');
    if (journeySection) {
        journeySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    console.log(`Story theme changed to: ${themeName}`);
}

// Export functions for global access
window.enterCourse = enterCourse;
window.scrollToCourses = scrollToCourses;
window.scrollToCourseCard = scrollToCourseCard;
window.toggleMobileMenu = toggleMobileMenu;
window.openDemo = openDemo;
window.toggleThemeSelector = toggleThemeSelector;
window.setTheme = setTheme;
window.scrollToTop = scrollToTop;
window.selectStoryTheme = selectStoryTheme;
