
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
    initializeLanguage();
    preloadImages();

    // === Interactive Elements ===
    setupInteractions();

    // Stop speaking when page changes
    function stopSpeechOnNavigation() {
        if (synth && synth.speaking) {
            isReadingCanceled = true;
            synth.cancel();
            if (typeof removeAllHighlights === 'function') removeAllHighlights();
            isSpeaking = false;
            updateTTSUI();
        }
    }

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
            6: 'sounds/turning.mp3',
            8: 'sounds/machining.mp3',
            9: 'sounds/5axis.mp3',
            10: 'sounds/grinding.mp3'
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
                if (machineId === 9) osc.type = 'sawtooth'; // 5-Axis
                else if (machineId === 10) osc.type = 'square'; // Grinding
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
                    if (p === 9) { // 5-Axis
                        img.classList.add('machine-shake');
                    } else {
                        img.classList.add('machine-bounce');
                    }

                    // Add some stars/sparks effect to the container
                    const container = pageEl.querySelector('.page-illustration');
                    if (container && !container.querySelector('.success-animation')) {
                        const stars = document.createElement('div');
                        stars.className = 'success-animation';
                        stars.textContent = p === 9 ? '⚡⚡' : '✨✨';
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
    function initializeLanguage() {
        // Apply the starting currentLang text to all data attributes
        document.body.classList.toggle('lang-en', currentLang === 'en');
        document.querySelectorAll(`[data-${currentLang}]`).forEach(el => {
            const text = el.getAttribute(`data-${currentLang}`);
            if (text) {
                if (text.includes('<br>')) {
                    el.innerHTML = text;
                } else {
                    el.textContent = text;
                }
            }
        });

        // Update language toggle button icon
        const langIcon = langToggle.querySelector('.lang-icon');
        langIcon.textContent = currentLang === 'ja' ? '🇯🇵' : '🇺🇸';

        // Update page title
        document.title = currentLang === 'ja'
            ? 'こうさくきかいの せかいへ ようこそ！'
            : 'Welcome to the World of Machine Tools!';
    }

    function toggleLanguage() {
        currentLang = currentLang === 'ja' ? 'en' : 'ja';
        initializeLanguage();
    }

    // === Image Preloading ===
    function preloadImages() {
        for (let i = 1; i <= totalPages; i++) {
            const img = new Image();
            img.src = `${import.meta.env.BASE_URL}images/page${String(i).padStart(2, '0')}.png`;
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
    let isReadingCanceled = false; // Prevents recursive chaining
    let activeUtterance = null; // Prevents Garbage Collection

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

        if (synth.speaking || isSpeaking) {
            isReadingCanceled = true;
            synth.cancel();
            if (typeof removeAllHighlights === 'function') removeAllHighlights();
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

    function removeAllHighlights() {
        document.querySelectorAll('.reading-highlight').forEach(el => {
            el.classList.remove('reading-highlight');
        });
    }

    function toggleSpeech() {
        if (synth.speaking || isSpeaking) {
            isReadingCanceled = true;
            synth.cancel();
            removeAllHighlights();
            isSpeaking = false;
            updateTTSUI();
            return;
        }

        readCurrentPage();
    }

    function readCurrentPage() {
        // Cancel any ongoing speech and remove highlights
        isReadingCanceled = true;
        synth.cancel();
        removeAllHighlights();

        const activePageEl = document.querySelector(`.page[data-page="${currentPage}"]`);
        if (!activePageEl) return;

        // Collect all text from paragraphs and headings on the current page
        const textElementsList = activePageEl.querySelectorAll(".page-text h1, .page-text h2, .page-text p");
        const validElements = [];
        let globalSpanIndex = 0;

        textElementsList.forEach(el => {
            let rawText = el.getAttribute(`data-${currentLang}`);
            if (rawText) {
                let parts = rawText.split(/(?:<br\s*\/?>|\n|&#10;)+/);
                let isBr = rawText.includes('<br');
                let newHtml = '';

                parts.forEach((part) => {
                    let cleanText = part.replace(/<[^>]*>?/gm, ' ').trim();
                    if (cleanText) {
                        let spanId = `tts-span-${globalSpanIndex++}`;
                        newHtml += `<span id="${spanId}" class="tts-sentence">${part}</span>`;
                        if (currentLang === "ja" && !cleanText.match(/[。！？!?]$/)) {
                            cleanText += '。';
                        } else if (currentLang === "en" && !cleanText.match(/[.!?]$/)) {
                            cleanText += '.';
                        }
                        validElements.push({ spanId, cleanText });
                    }
                    newHtml += isBr ? '<br>' : '\n';
                });

                if (isBr && newHtml.endsWith('<br>')) newHtml = newHtml.slice(0, -4);
                if (!isBr && newHtml.endsWith('\n')) newHtml = newHtml.slice(0, -1);

                el.innerHTML = newHtml;
            }
        });

        if (validElements.length === 0) return;

        isReadingCanceled = false;
        let currentUtteranceIndex = 0;

        function playNextUtterance() {
            if (isReadingCanceled) return;

            if (currentUtteranceIndex >= validElements.length) {
                isSpeaking = false;
                updateTTSUI();

                if (isAutoReading) {
                    if (currentPage < totalPages) {
                        setTimeout(() => {
                            if (isAutoReading && !isReadingCanceled) {
                                nextPage();
                            }
                        }, 1000);
                    } else {
                        stopAutoRead();
                    }
                }
                return;
            }

            const item = validElements[currentUtteranceIndex];
            const utterance = new SpeechSynthesisUtterance(item.cleanText);

            if (currentLang === "ja") {
                utterance.lang = "ja-JP";
                const jpVoice = voices.find(v => v.lang === "ja-JP" || v.lang === "ja_JP");
                if (jpVoice) utterance.voice = jpVoice;
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
            } else {
                utterance.lang = "en-US";
                const enVoice = voices.find(v => v.lang === "en-US" || v.lang === "en_US");
                if (enVoice) utterance.voice = enVoice;
                utterance.rate = 0.9;
            }

            utterance.onstart = () => {
                if (isReadingCanceled) {
                    synth.cancel();
                    return;
                }
                isSpeaking = true;
                updateTTSUI();
                removeAllHighlights();
                let spanEl = document.getElementById(item.spanId);
                if (spanEl) spanEl.classList.add('reading-highlight');
            };

            utterance.onend = () => {
                let spanEl = document.getElementById(item.spanId);
                if (spanEl) spanEl.classList.remove('reading-highlight');

                if (!isReadingCanceled) {
                    currentUtteranceIndex++;
                    playNextUtterance();
                }
            };

            utterance.onerror = (e) => {
                console.error("Speech synthesis error", e);
                let spanEl = document.getElementById(item.spanId);
                if (spanEl) spanEl.classList.remove('reading-highlight');

                if (!isReadingCanceled) {
                    currentUtteranceIndex++;
                    playNextUtterance();
                }
            };

            activeUtterance = utterance; // Prevent GC
            synth.speak(utterance);
        }

        playNextUtterance();
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
                if (typeof removeAllHighlights === 'function') removeAllHighlights();
                isSpeaking = false;
                updateTTSUI();
            }
        });
    }

});

