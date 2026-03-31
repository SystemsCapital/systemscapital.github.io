/* =====================================================
   SCROLL REVEAL
===================================================== */
(function () {
    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;

    function revealOnScroll() {
        const trigger = window.innerHeight * 0.9;

        reveals.forEach(el => {
            const top = el.getBoundingClientRect().top;
            if (top < trigger) {
                el.classList.add("visible");
            }
        });
    }

    window.addEventListener("scroll", revealOnScroll);
    window.addEventListener("load", revealOnScroll);
})();

/* =====================================================
   INTRO FLOWER INTERACTION
===================================================== */
(function () {
    const flowerBtn = document.getElementById("flowerBtn");
    if (!flowerBtn) return;

    let rotation = 0;
    const flower = document.getElementById("flower");
    const intro = document.getElementById("intro");
    const content = document.getElementById("site-content");

    flowerBtn.addEventListener("click", () => {
        rotation -= 45;
        flower.style.transform = `rotate(${rotation}deg)`;
        flower.classList.add("active");

        setTimeout(() => flower.classList.add("dim"), 500);
        setTimeout(() => {
            intro.classList.add("fade-out");
            content.classList.add("visible");
        }, 900);
    });
})();

/* =====================================================
   HAMBURGER MENU
===================================================== */
(function () {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");

    if (!hamburger || !navLinks) return;

    hamburger.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        hamburger.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (
            navLinks.classList.contains("active") &&
            !hamburger.contains(e.target) &&
            !navLinks.contains(e.target)
        ) {
            navLinks.classList.remove("active");
            hamburger.classList.remove("active");
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            navLinks.classList.remove("active");
            hamburger.classList.remove("active");
        }
    });
})();

console.log("Systems Capital Site Loaded");
