document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    /* 1. Animação de Entrada (Intro / Hero Reveal) */
    const tlIntro = gsap.timeline({ defaults: { ease: "power4.out" } });

    // Textos grandes entrando com Fade mask (de baixo pra cima, linha por linha)
    tlIntro.to(".text-reveal-content", {
        y: "0%",
        opacity: 1,
        duration: 1.4,
        stagger: 0.2
    });

    // Resto dos elementos da esquerda (Eyebrow, Paragrafo, Botoes) entrando suave
    tlIntro.to([".eyebrow-text", ".sub-headline", ".ctas"], {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.15
    }, "-=1.0");

    // Mídia Central (Vídeo), as setinhas verticais e a Logo
    tlIntro.to(["#video-container", ".vertical-nav", ".logo-entrance"], {
        y: 0,
        opacity: 1,
        duration: 1.5,
        ease: "power2.out"
    }, "-=1.0");


    /* 2. Apple-style Image Sequence para Scrub Perfeito (Revertido para Frames Nativos) */
    const canvas = document.getElementById("hero-canvas");
    const context = canvas.getContext("2d");

    const frameCount = 40; // Total de frames na pasta
    // Ajustado template literal (backticks) para funcionar e interpolar nativamente em JS:
    const currentFrame = index => `assets/video_frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;
    const images = [];
    const glassesObj = { frame: 1 };

    // Buffer Pré-carregamento total: injeta as Imagens diretamente na memória para eliminar o engasgo
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        images.push(img);
    }

    let loadedCount = 0;
    const imagesArray = images;
    
    imagesArray.forEach(img => {
        if (img.complete) loadedCount++;
        else img.onload = () => {
            loadedCount++;
            if (loadedCount === 1) render(); // Força render assim que o primeiro frame for decodificado
        };
    });
    if (imagesArray[0] && imagesArray[0].complete) render(); // Tratativa para browser cache

    let lastLoadedFrameIndex = 0;

    function render() {
        let frameIndex = Math.round(glassesObj.frame) - 1;
        if (frameIndex < 0) frameIndex = 0;
        if (frameIndex >= frameCount) frameIndex = frameCount - 1;

        let activeImage = imagesArray[frameIndex];

        // Fallback macio na rolagem rápida
        if (!activeImage || !activeImage.complete) {
            activeImage = imagesArray[lastLoadedFrameIndex];
        } else {
            lastLoadedFrameIndex = frameIndex;
        }

        if (activeImage && activeImage.complete) {
            // Mapeia proporção caso redimensione a janela
            if (activeImage.width > 0 && canvas.width !== activeImage.width) {
                canvas.width = activeImage.width;
                canvas.height = activeImage.height;
            }

            // Forçar o navegador a usar renderização de alta qualidade ao plotar 
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(activeImage, 0, 0, canvas.width, canvas.height);
        }
    }

    gsap.to(glassesObj, {
        frame: frameCount,
        snap: "frame",
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.8
        },
        onUpdate: render
    });

    /* 3. Parallax e Desfoque nas Letrings ao fazer a rolagem (Scroll Down) */
    gsap.to([".eyebrow-text", ".hero-headline", ".sub-headline", ".ctas", ".vertical-nav", ".logo-entrance"], {
        y: -120, // Move 120px para cima acompanhando a rolagem
        opacity: 0,
        filter: "blur(12px)", // Efeito cinematic de Apple
        stagger: 0.06, // Cascata element-by-element
        ease: "power2.inOut",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "top -100%", // Acontece apenas durante a primeira dobra de rolagem (100vh)
            scrub: 1.0 // Sincronizado suavemente com a roda do mouse
        }
    });

    /* 4. Animações da Galeria de Cards (Dobra 2 Unificada) */
    const foldTrigger = {
        trigger: '#dobra-2',
        start: "top bottom",
        toggleActions: "play reverse play reverse"
    };

    // Orbes Parallax (Sincronizados)
    gsap.to(['.parallax-bg-orb', '.parallax-bg-orb-3'], {
        y: 100,
        scale: 1.15,
        ease: "none",
        scrollTrigger: {
            trigger: '#dobra-2',
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5
        }
    });

    // Animação de Letreiros e Elementos (Staggered para ambos os cards)
    gsap.fromTo(['.fold2-title-reveal', '.fold3-title-reveal'],
        { y: "110%", opacity: 0 },
        {
            y: "0%",
            opacity: 1,
            duration: 1.2,
            stagger: 0.1,
            ease: "power4.out",
            scrollTrigger: foldTrigger
        }
    );

    gsap.fromTo(['.fold2-elem', '.fold3-elem'],
        { y: 60, opacity: 0, filter: "blur(10px)" },
        {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.2,
            stagger: 0.05,
            ease: "cubic-bezier(0.16, 1, 0.3, 1)",
            scrollTrigger: foldTrigger
        }
    );

    // Parallax das Imagens nos Cards
    gsap.fromTo(['.fold2-img-parallax', '.fold3-img-parallax'],
        { scale: 1.15 },
        {
            scale: 1,
            y: 40,
            ease: "none",
            scrollTrigger: {
                trigger: '#dobra-2',
                start: "top bottom",
                end: "bottom top",
                scrub: 1.5
            }
        }
    );

    // Entrada dos Cards (Cards subindo juntos - Snap Instantâneo)
    gsap.fromTo(['.fold2-card', '.fold3-card'],
        { y: 50, opacity: 0 },
        {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.05,
            ease: "expo.out",
            scrollTrigger: {
                trigger: '#dobra-2',
                start: "top bottom",
                toggleActions: "play none none none"
            }
        }
    );
});
