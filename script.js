
/* ============================================
   工作機械の絵本 — JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // === State ===
    let currentPage = 1;
    let currentLang = 'en';
    const totalPages = 12;
    let isAutoReading = false;

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

    // === Interactive Elements ===
    setupInteractions();

    // === Page Navigation ===
    function goToPage(pageNum, direction = 'forward') {
        if (pageNum < 1 || pageNum > totalPages || pageNum === currentPage) return;

        stopSpeechOnNavigation();

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

        // If auto reading, trigger speech for the new page
        if (isAutoReading) {
            // Slight delay so the page animation can start/finish
            setTimeout(() => {
                readCurrentPage();
            }, 600);
        }
    }

    // === Page 6 Video Interaction ===
    function handlePage6Video(pageNum) {
        const page6Media = document.querySelector('.page06-media');
        const video = document.querySelector('.page06-video');
        if (!page6Media || !video) return;

        if (pageNum === 6) {
            // Reset state
            video.pause();
            video.currentTime = 0;
            page6Media.classList.remove('show-video');
        } else {
            page6Media.classList.remove('show-video');
            video.pause();
            video.currentTime = 0;
        }
    }

    // Interactive button handling
    function setupInteractions() {
        const playBtn = document.querySelector('.interactive-play-btn');
        const video = document.querySelector('.page06-video');
        const page6Media = document.querySelector('.page06-media');
        const successAnim = document.querySelector('.success-animation');

        if (playBtn && video) {
            playBtn.addEventListener('click', () => {
                video.currentTime = 0;
                video.play().then(() => {
                    page6Media.classList.add('show-video');
                    if (successAnim) {
                        successAnim.classList.remove('show-stars');
                        // Trigger reflow
                        void successAnim.offsetWidth;
                        successAnim.classList.add('show-stars');
                    }

                    // Automatically stop showing video after it finishes
                    video.onended = () => {
                        page6Media.classList.remove('show-video');
                    };
                });
            });
        }

        // Placeholder sounds configuration
        // In the future, replace these true audio file paths
        const MACHINE_SOUNDS = {
            5: 'sounds/turning.mp3',
            8: 'sounds/machining.mp3',
            9: 'sounds/grinding.mp3',
            10: 'sounds/edm.mp3',
            11: 'sounds/5axis.mp3'
        };

        // Fallback synthesizer so user hears a sound immediately
        function playFallbackBeep(machineId) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                // Set frequency based on machineId
                const baseFreq = 200 + (machineId * 50);
                osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

                // Different types
                if (machineId === 10) osc.type = 'sawtooth'; // EDM
                else if (machineId === 9) osc.type = 'square'; // Grinding
                else osc.type = 'sine';

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start();
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
                osc.stop(ctx.currentTime + 0.3);
            } catch (e) {
                console.error("Audio synth error", e);
            }
        }

        function playMachineSound(machineId) {
            const audioPath = MACHINE_SOUNDS[machineId];
            if (audioPath) {
                const audio = new Audio(audioPath);
                audio.play().catch(e => {
                    console.log(`[Audio Placeholder] Please put a real audio file at: ${audioPath}`);
                    playFallbackBeep(machineId);
                });
            }
        }

        // Add bounce animations to machine images
        const machinePages = [6, 8, 9, 10]; // Turning Center, Machining Center, Grinding, 5-Axis (EDM and Page 7 removed, new numbers)

        machinePages.forEach(p => {
            const pageEl = document.querySelector(`.page[data-page="${p}"]`);
            if (!pageEl) return;

            const img = pageEl.querySelector('.page-illustration img');
            if (img) {
                img.classList.add('interactive-img');
                img.addEventListener('click', () => {
                    // Play Sound
                    playMachineSound(p);

                    // Remove classes in case they are already animating
                    img.classList.remove('machine-bounce', 'machine-shake');

                    // Trigger reflow
                    void img.offsetWidth;

                    // Add different animations based on the machine
                    if (p === 10) { // EDM Machine
                        img.classList.add('machine-shake');
                    } else {
                        img.classList.add('machine-bounce');
                    }

                    // Add some stars/sparks effect to the container
                    const container = pageEl.querySelector('.page-illustration');
                    if (container && !container.querySelector('.success-animation')) {
                        const stars = document.createElement('div');
                        stars.className = 'success-animation';
                        stars.textContent = p === 10 ? '⚡⚡' : '✨✨';
                        container.appendChild(stars);

                        setTimeout(() => {
                            stars.classList.add('show-stars');
                            setTimeout(() => stars.remove(), 1500);
                        }, 50);
                    }
                });
            }
        });
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
    prevBtn.addEventListener('click', () => {
        stopAutoRead(); // Manual interaction stops auto read
        prevPage();
    });
    nextBtn.addEventListener('click', () => {
        stopAutoRead(); // Manual interaction stops auto read
        nextPage();
    });
    langToggle.addEventListener('click', toggleLanguage);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
            stopAutoRead();
            nextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
            stopAutoRead();
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
            stopAutoRead();
            nextPage();
        } else {
            // Swiped right → prev page
            stopAutoRead();
            prevPage();
        }
    }
    // === Audio Narration (TTS) & Auto Read ===
    const autoReadBtn = document.getElementById("auto-read-btn");
    const stopReadBtn = document.getElementById("stop-read-btn");
    let synth = window.speechSynthesis;
    let isSpeaking = false;

    if (autoReadBtn) {
        autoReadBtn.addEventListener("click", startAutoRead);
    }
    if (stopReadBtn) {
        stopReadBtn.addEventListener("click", stopAutoRead);
    }

    function toggleAutoRead() {
        if (isAutoReading) {
            stopAutoRead();
        } else {
            startAutoRead();
        }
    }

    function startAutoRead() {
        isAutoReading = true;

        // Update Auto Read Button UI
        if (autoReadBtn && stopReadBtn) {
            autoReadBtn.style.display = 'none';
            stopReadBtn.style.display = 'flex';
        }

        readCurrentPage();
    }

    function stopAutoRead() {
        isAutoReading = false;

        // Update Auto Read Button UI
        if (autoReadBtn && stopReadBtn) {
            autoReadBtn.style.display = 'flex';
            stopReadBtn.style.display = 'none';
        }

        if (synth.speaking) {
            synth.cancel();
            isSpeaking = false;
            updateTTSUI();
        }
    }


    // Attempt to preload voices so they are ready when the user clicks
    let voices = [];
    function loadVoices() {
        voices = synth.getVoices();
    }
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    function toggleSpeech() {
        if (synth.speaking) {
            synth.cancel();
            isSpeaking = false;
            updateTTSUI();
            return;
        }

        readCurrentPage();
    }

    function readCurrentPage() {
        // Cancel any ongoing speech
        synth.cancel();

        const activePageEl = document.querySelector(`.page[data-page="${currentPage}"]`);
        if (!activePageEl) return;

        // Collect all text from paragraphs and headings on the current page
        const textElements = activePageEl.querySelectorAll(".page-text h1, .page-text h2, .page-text p");

        let textToRead = "";
        textElements.forEach(el => {
            // Read English or Japanese depending on currentLang
            textToRead += el.getAttribute(`data-${currentLang}`) + "。 ";
        });

        if (!textToRead.trim()) return;

        const utterance = new SpeechSynthesisUtterance(textToRead);

        // Set language based on app state
        if (currentLang === "ja") {
            utterance.lang = "ja-JP";
            // Try to find a Japanese voice
            const jpVoice = voices.find(v => v.lang === "ja-JP" || v.lang === "ja_JP");
            if (jpVoice) utterance.voice = jpVoice;

            utterance.rate = 0.9; // Slightly slower for kids
            utterance.pitch = 1.1; // Slightly higher/friendly pitch
        } else {
            utterance.lang = "en-US";
            const enVoice = voices.find(v => v.lang === "en-US" || v.lang === "en_US");
            if (enVoice) utterance.voice = enVoice;

            utterance.rate = 0.9;
        }

        utterance.onstart = () => {
            isSpeaking = true;
            updateTTSUI();
        };

        utterance.onend = () => {
            isSpeaking = false;
            updateTTSUI();

            // If auto-reading, flip the page after a short pause
            if (isAutoReading) {
                if (currentPage < totalPages) {
                    setTimeout(() => {
                        // Check again in case user clicked stop during pause
                        if (isAutoReading) {
                            nextPage();
                        }
                    }, 1000); // 1 second pause between pages
                } else {
                    // Reached the end, switch auto-read off
                    stopAutoRead();
                }
            }
        };

        utterance.onerror = (e) => {
            console.error("Speech synthesis error", e);
            isSpeaking = false;
            updateTTSUI();
        };

        synth.speak(utterance);
    }

    function updateTTSUI() {
        // Obsolete UI update since nav buttons handle their own display states
    }

    // Stop speaking when language changes
    const langToggleBtn = document.getElementById("lang-toggle");
    if (langToggleBtn) {
        langToggleBtn.addEventListener("click", () => {
            if (isAutoReading) stopAutoRead();
            else if (synth.speaking) {
                synth.cancel();
                isSpeaking = false;
                updateTTSUI();
            }
        });
    }

    // Stop speaking when page changes
    function stopSpeechOnNavigation() {
        if (synth && synth.speaking) {
            synth.cancel();
            isSpeaking = false;
            updateTTSUI();
        }
    }

    // Expose stopSpeechOnNavigation to be used in goToPage
    window.stopSpeechOnNavigation = stopSpeechOnNavigation;
});

