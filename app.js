gsap.registerPlugin(ScrollTrigger);

        // --- 1. CURSOR LOGIC ---
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorOutline = document.querySelector('.cursor-outline');

        // Only activate cursor logic on non-touch devices (CSS media query handles the hiding)
        if (window.matchMedia("(pointer: fine)").matches) {
            window.addEventListener('mousemove', (e) => {
                const posX = e.clientX;
                const posY = e.clientY;

                cursorDot.style.left = `${posX}px`;
                cursorDot.style.top = `${posY}px`;

                gsap.to(cursorOutline, {
                    x: posX,
                    y: posY,
                    duration: 0.15,
                    ease: "power2.out"
                });
            });

            // Hover interactions
            const interactables = document.querySelectorAll('a, .project-card, .marquee-item');
            interactables.forEach(el => {
                el.addEventListener('mouseenter', () => {
                    gsap.to(cursorOutline, { scale: 2.5, backgroundColor: "rgba(255,255,255,0.05)", border: "none", duration: 0.3 });
                });
                el.addEventListener('mouseleave', () => {
                    gsap.to(cursorOutline, { scale: 1, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.5)", duration: 0.3 });
                });
            });
        }

        // --- 2. ANIMATIONS (Kept from original) ---
        
        // Hero Reveal
        const tl = gsap.timeline();
        tl.to('.hero-line span', {
            y: 0,
            duration: 1.2,
            ease: "power4.out",
            stagger: 0.2,
            delay: 0.2
        })
        .from('.hero-meta', {
            opacity: 0,
            y: 20,
            duration: 0.8
        }, "-=0.5");

        // Project Cards Stagger
        gsap.utils.toArray('.project-card').forEach((card, i) => {
            gsap.to(card, {
                scrollTrigger: {
                    trigger: ".project-grid",
                    start: "top 85%",
                },
                opacity: 1,
                y: 0,
                duration: 0.6,
                delay: i * 0.1,
                ease: "power2.out"
            });
        });

        // Philosophy Text Reveal
        gsap.from(".big-text span", {
            scrollTrigger: {
                trigger: ".big-text",
                start: "top 80%",
            },
            opacity: 0.3,
            y: 10,
            duration: 1,
            stagger: 0.05,
            ease: "power2.out"
        });

        // --- 3. MAGNETIC BUTTON ---
        const btn = document.querySelector('.magnetic-btn');
        if(btn) {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3 });
            });
            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
            });
        }
