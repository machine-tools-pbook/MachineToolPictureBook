/* ============================================
   工作機械の絵本 — JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // === State ===
    let currentPage = 1;
    let currentLang = 'ja';
    const totalPages = 14;

    // === DOM Elements ===
    const pages = document.querySelectorAll('.page');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');
    const langToggle = document.getElementById('lang-toggle');
    const dotsContainer = document.getElementById('page-dots');

    // === Initialize ===
    totalPagesEl.textContent = totalPages;
    createDots();
    updateUI();
    preloadImages();

    // === Page Navigation ===
    function goToPage(pageNum, direction = 'forward') {
        if (pageNum < 1 || pageNum > totalPages || pageNum === currentPage) return;

        const currentEl = document.querySelector('.page.active');
        const nextEl = document.querySelector(`.page[data-page="${pageNum}"]`);

        if (!currentEl || !nextEl) return;

        // Remove any existing animation classes
        pages.forEach(p => {
            p.classList.remove('slide-out', 'slide-in-reverse');
        });

        // Animate out current page
        currentEl.classList.remove('active');
        currentEl.style.display = 'none';

        // Animate in new page
        nextEl.style.display = 'flex';
        nextEl.classList.add('active');

        if (direction === 'backward') {
            nextEl.classList.add('slide-in-reverse');
        }

        currentPage = pageNum;
        updateUI();
        handlePage6Video(pageNum);
    }

    // === Page 6 Video Autoplay ===
    function handlePage6Video(pageNum) {
        const page6Media = document.querySelector('.page06-media');
        const video = document.querySelector('.page06-video');
        if (!page6Media || !video) return;

        if (pageNum === 6) {
            // Start video after a short delay for crossfade effect
            video.currentTime = 0;
            video.play().then(() => {
                setTimeout(() => {
                    page6Media.classList.add('show-video');
                }, 500);
            }).catch(() => {
                // Autoplay blocked, show video anyway
                page6Media.classList.add('show-video');
            });
        } else {
            page6Media.classList.remove('show-video');
            video.pause();
            video.currentTime = 0;
        }
    }

    function nextPage() {
        goToPage(currentPage + 1, 'forward');
    }

    function prevPage() {
        goToPage(currentPage - 1, 'backward');
    }

    // === UI Updates ===
    function updateUI() {
        currentPageEl.textContent = currentPage;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        updateDots();
    }

    // === Dots ===
    function createDots() {
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const dot = document.createElement('button');
            dot.className = 'dot' + (i === 1 ? ' active' : '');
            dot.setAttribute('aria-label', `Page ${i}`);
            dot.dataset.page = i;
            dot.addEventListener('click', () => {
                const direction = i > currentPage ? 'forward' : 'backward';
                goToPage(i, direction);
            });
            dotsContainer.appendChild(dot);
        }
    }

    function updateDots() {
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === currentPage);
        });
    }

    // === Language Switching ===
    function toggleLanguage() {
        currentLang = currentLang === 'ja' ? 'en' : 'ja';

        // Update body class
        document.body.classList.toggle('lang-en', currentLang === 'en');

        // Update all text elements with data attributes
        document.querySelectorAll('[data-ja]').forEach(el => {
            const text = el.getAttribute(`data-${currentLang}`);
            if (text) {
                el.textContent = text;
            }
        });

        // Update language toggle button
        const langIcon = langToggle.querySelector('.lang-icon');
        langIcon.textContent = currentLang === 'ja' ? '🇯🇵' : '🇺🇸';

        // Update page title
        document.title = currentLang === 'ja'
            ? 'こうさくきかいの せかいへ ようこそ！'
            : 'Welcome to the World of Machine Tools!';
    }

    // === Image Preloading ===
    function preloadImages() {
        for (let i = 1; i <= totalPages; i++) {
            const img = new Image();
            img.src = `images/page${String(i).padStart(2, '0')}.png`;
        }
    }

    // === Event Listeners ===
    prevBtn.addEventListener('click', prevPage);
    nextBtn.addEventListener('click', nextPage);
    langToggle.addEventListener('click', toggleLanguage);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
            nextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
            prevPage();
        }
    });

    // Touch/Swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    const book = document.getElementById('book');

    book.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    book.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) < swipeThreshold) return;

        if (diff > 0) {
            // Swiped left → next page
            nextPage();
        } else {
            // Swiped right → prev page
            prevPage();
        }
    }
});
