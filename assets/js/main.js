/* =====================================================
   QB OFICIAL — main.js
   Otimizações: passive listeners, debounce, lazy Firebase
   ===================================================== */

// Aguarda GSAP carregar (defer) antes de qualquer animação
function initApp() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        requestAnimationFrame(initApp);
        return;
    }

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    /* ── 1. ANIMAÇÃO DE ENTRADA HERO ── */
    const tlIntro = gsap.timeline({ defaults: { ease: "power4.out" } });

    tlIntro.to(["#video-container"], {
        y: 0, opacity: 1, duration: 1.2, ease: "power2.out"
    });

    tlIntro.to(".text-reveal-content", {
        y: "0%", opacity: 1,
        duration: 0.6, stagger: 0.08, ease: "power4.out"
    }, "-=1.0");

    tlIntro.to(".ctas", {
        y: 0, opacity: 1, duration: 0.5, ease: "power4.out"
    }, "-=1.0");

    tlIntro.to([".sub-headline"], {
        y: 0, opacity: 1, duration: 0.7, ease: "power2.out"
    }, "-=0.6");

    /* ── 1.1 Header Scroll (passive para não bloquear scroll) ── */
    const header = document.getElementById('site-header');
    let ticking = false;
    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                if (window.scrollY > 50) {
                    header.classList.add("scrolled");
                } else {
                    header.classList.remove("scrolled");
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    /* ── 2. IMAGE SEQUENCE (Canvas Hero) ── */
    const canvas = document.getElementById("hero-canvas");
    const context = canvas.getContext("2d");

    const frameCount = 40;
    const currentFrame = index => `assets/video_frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;

    // Pré-carrega frame 1 de imediato para zero flash
    const images = new Array(frameCount);
    const glassesObj = { frame: 1 };
    let loadedCount = 0;
    let lastLoadedFrameIndex = 0;

    function render() {
        let frameIndex = Math.round(glassesObj.frame) - 1;
        frameIndex = Math.max(0, Math.min(frameIndex, frameCount - 1));

        let activeImage = images[frameIndex];
        if (!activeImage || !activeImage.complete || activeImage.naturalWidth === 0) {
            activeImage = images[lastLoadedFrameIndex];
        } else {
            lastLoadedFrameIndex = frameIndex;
        }

        if (!activeImage || !activeImage.complete || activeImage.naturalWidth === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
        }

        const stageW = canvas.width / dpr;
        const stageH = canvas.height / dpr;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, stageW, stageH);

        const imgW = activeImage.naturalWidth;
        const imgH = activeImage.naturalHeight;
        const imgRatio = imgW / imgH;
        const isMobile = w < 768;

        if (isMobile) {
            context.save();
            context.translate(stageW / 2, stageH / 2);
            context.rotate(Math.PI / 2);
            const scaleW = stageH / imgW;
            const scaleH = stageW / imgH;
            const scale = Math.max(scaleW, scaleH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            context.drawImage(activeImage, -drawW / 2, -drawH / 2, drawW, drawH);
            context.restore();
        } else {
            const canvasRatio = stageW / stageH;
            let drawW, drawH, drawX, drawY;
            if (canvasRatio > imgRatio) {
                drawW = stageW; drawH = stageW / imgRatio;
                drawX = 0; drawY = (stageH - drawH) / 2;
            } else {
                drawH = stageH; drawW = stageH * imgRatio;
                drawX = (stageW - drawW) / 2; drawY = 0;
            }
            context.drawImage(activeImage, drawX, drawY, drawW, drawH);
        }
    }

    // Carrega frame 1 imediatamente, rest com prioridade baixa
    const firstImg = new Image();
    firstImg.src = currentFrame(1);
    firstImg.onload = () => {
        images[0] = firstImg;
        loadedCount++;
        render();

        // Carrega restantes com requestIdleCallback para não bloquear LCP
        const loadRest = (i) => {
            if (i > frameCount) return;
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                images[i - 1] = img;
                loadedCount++;
                if (glassesObj.frame === i) render();
            };
            // Distribui carga ao longo do tempo livre
            if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => loadRest(i + 1), { timeout: 500 });
            } else {
                setTimeout(() => loadRest(i + 1), 20);
            }
        };
        loadRest(2);
    };
    images[0] = firstImg;

    // Resize com debounce
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 150);
    }, { passive: true });

    // Scrub da sequência com GSAP
    gsap.to(glassesObj, {
        frame: frameCount,
        snap: "frame",
        ease: "none",
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.8
        },
        onUpdate: render
    });

    /* ── 3. Parallax Hero Text ── */
    gsap.to([".hero-headline", ".sub-headline", ".ctas"], {
        y: -120, opacity: 0, filter: "blur(12px)",
        stagger: 0.06, ease: "power2.inOut",
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "top -100%",
            scrub: 1.0
        }
    });

    /* ── 4. Animações da Galeria de Produtos ── */
    const productCards = gsap.utils.toArray('.product-card');

    productCards.forEach((card) => {
        const titleItems = card.querySelectorAll('.product-title-reveal');
        const internalElems = card.querySelectorAll('.product-elem, .card-meta');

        const cardTL = gsap.timeline({
            scrollTrigger: {
                trigger: card,
                start: "top bottom",
                toggleActions: "play none none none"
            }
        });

        cardTL
            .fromTo(card, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" })
            .fromTo(titleItems, { y: "110%", opacity: 0 }, { y: "0%", opacity: 1, stagger: 0.05, duration: 0.3, ease: "power4.out" }, "-=0.3");

        if (internalElems.length) {
            cardTL.fromTo(internalElems, { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.02, duration: 0.3, ease: "power2.out" }, "-=0.3");
        }

        // Parallax suave na imagem do card
        const img = card.querySelector('.card-img');
        if (img) {
            gsap.to(img, {
                y: 40, scale: 1.15, ease: "none",
                scrollTrigger: {
                    trigger: card,
                    start: "top bottom", end: "bottom top",
                    scrub: 1.5
                }
            });
        }
    });

    // Orbes Parallax
    if (document.querySelector('.parallax-bg-orb')) {
        gsap.to(['.parallax-bg-orb', '.parallax-bg-orb-3'], {
            y: 150, scale: 1.2, ease: "none",
            scrollTrigger: { trigger: '#collection', start: "top bottom", end: "bottom top", scrub: 0.8 }
        });
    }

    // Spotlight mousemove nos cards
    productCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--y', `${e.clientY - rect.top}px`);
        }, { passive: true });
    });

    // Animações do heritage e lifestyle sections
    gsap.utils.toArray('.product-elem').forEach(el => {
        gsap.fromTo(el,
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
            }
        );
    });

    ScrollTrigger.refresh();

    /* ── 5. SISTEMA DE CARRINHO ── */
    let cart = (() => { try { return JSON.parse(localStorage.getItem('qb_cart') || '[]'); } catch { return []; } })();

    const cartDrawer = document.getElementById("cart-drawer");
    const cartOverlay = document.getElementById("cart-overlay");
    const cartContainer = document.getElementById("cart-items-container");
    const cartCountEl = document.getElementById("cart-count");
    const cartTotalEl = document.getElementById("cart-total");

    // Inicializa UI do carrinho com dados do localStorage
    updateCartUI();

    function toggleCart(open = true) {
        if (open) {
            cartOverlay.classList.add("active");
            cartOverlay.setAttribute('aria-hidden', 'false');
            gsap.to(cartDrawer, { x: "0%", duration: 0.6, ease: "expo.out" });
        } else {
            cartOverlay.classList.remove("active");
            cartOverlay.setAttribute('aria-hidden', 'true');
            gsap.to(cartDrawer, { x: "100%", duration: 0.6, ease: "expo.in" });
        }
    }

    function updateWhatsAppLink() {
        const waLink = document.getElementById('main-wa-concierge');
        if (!waLink) return;
        if (cart.length === 0) {
            waLink.href = "https://wa.me/message/FV37UMP6GFRWL1";
            return;
        }
        const msg = encodeURIComponent(`Olá QB! Gostaria de finalizar meu pedido: ${cart.map(i => `${i.name} (x${i.quantity})`).join(', ')}.`);
        waLink.href = `https://wa.me/message/FV37UMP6GFRWL1?text=${msg}`;
    }

    function updateCartUI() {
        localStorage.setItem('qb_cart', JSON.stringify(cart));
        const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
        if (cartCountEl) cartCountEl.textContent = totalItems;

        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="cart-empty">
                    <iconify-icon icon="solar:cart-plus-linear" width="48" aria-hidden="true"></iconify-icon>
                    <p>Carrinho Vazio</p>
                </div>`;
            if (cartTotalEl) cartTotalEl.textContent = "R$ 0,00";
            updateWhatsAppLink();
            return;
        }

        cartContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.img}" class="cart-item-img" alt="${item.name}" width="80" height="80" loading="lazy">
                <div style="flex:1">
                    <h4 style="font-size:.875rem;font-weight:700;color:#1c1917;margin:0 0 .25rem">${item.name}</h4>
                    <p style="font-size:.75rem;color:#a8a29e;font-family:'JetBrains Mono',monospace">R$ ${item.price},00 &times; ${item.quantity}</p>
                </div>
                <button class="remove-item icon-btn" data-id="${item.id}" aria-label="Remover ${item.name} do carrinho">
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="18" aria-hidden="true"></iconify-icon>
                </button>
            </div>`).join('');

        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        if (cartTotalEl) cartTotalEl.textContent = `R$ ${total.toLocaleString('pt-BR')},00`;

        cartContainer.querySelectorAll(".remove-item").forEach(btn => {
            btn.onclick = () => {
                cart = cart.filter(it => it.id !== btn.getAttribute("data-id"));
                updateCartUI();
            };
        });
        updateWhatsAppLink();
    }

    function addToCart(product) {
        const existing = cart.find(i => i.id === product.id);
        if (existing) { existing.quantity++; } else { cart.push({ ...product, quantity: 1 }); }
        updateCartUI();
        toggleCart(true);

        const cartBtn = document.getElementById('header-cart-btn');
        if (cartBtn) {
            cartBtn.classList.add('cart-bounce');
            setTimeout(() => cartBtn.classList.remove('cart-bounce'), 600);
        }
    }

    /* ── User Drawer ── */
    const userDrawer = document.getElementById('user-drawer');
    const userOverlay = document.getElementById('user-overlay');

    function toggleUserDrawer(show) {
        if (show) {
            toggleCart(false);
            userDrawer.classList.add('active');
            userOverlay.classList.add('active');
            userOverlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        } else {
            userDrawer.classList.remove('active');
            userOverlay.classList.remove('active');
            userOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    document.getElementById('header-user-btn').onclick = () => toggleUserDrawer(true);
    document.getElementById('close-user').onclick = () => toggleUserDrawer(false);
    userOverlay.onclick = () => toggleUserDrawer(false);

    document.getElementById("header-cart-btn").onclick = () => { toggleUserDrawer(false); toggleCart(true); };
    document.getElementById("close-cart").onclick = () => toggleCart(false);
    cartOverlay.onclick = () => toggleCart(false);

    const checkoutTrigger = document.getElementById("final-checkout-btn");
    if (checkoutTrigger) {
        checkoutTrigger.onclick = () => {
            if (cart.length === 0) return alert("Seu carrinho está vazio!");
            window.location.href = 'checkout.html';
        };
    }

    // Final CTA → scroll para coleção
    const finalCta = document.getElementById('final-cta');
    if (finalCta) {
        finalCta.onclick = () => {
            const col = document.getElementById('collection');
            if (col) gsap.to(window, { duration: 1.5, scrollTo: { y: col, offsetY: 80 }, ease: "power4.inOut" });
        };
    }

    // Add to cart buttons
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        const action = () => {
            addToCart({
                id: btn.getAttribute("data-id"),
                name: btn.getAttribute("data-name"),
                price: parseInt(btn.getAttribute("data-price")),
                img: btn.getAttribute("data-img")
            });
        };
        btn.addEventListener("click", action);
        btn.addEventListener("keydown", e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
    });

    /* ── 6. PRODUCT DETAILS DRAWER ── */
    const productDrawer = document.getElementById("product-drawer");
    const productOverlay = document.getElementById("product-overlay");
    let currentDrawerData = null;

    function toggleProductDrawer(open = true) {
        if (open) {
            productOverlay.classList.add("active");
            productOverlay.setAttribute('aria-hidden', 'false');
            gsap.to(productDrawer, { x: "0%", duration: 0.6, ease: "expo.out" });
            document.body.style.overflow = 'hidden';
        } else {
            productOverlay.classList.remove("active");
            productOverlay.setAttribute('aria-hidden', 'true');
            gsap.to(productDrawer, { x: "100%", duration: 0.6, ease: "expo.in" });
            document.body.style.overflow = '';
        }
    }

    document.getElementById("close-product").onclick = () => toggleProductDrawer(false);
    productOverlay.onclick = () => toggleProductDrawer(false);

    productCards.forEach(card => {
        const clickableArea = card.querySelector('.card-image-wrap');
        const titleArea = card.querySelector('.product-title-reveal');

        const openAction = () => {
            const btn = card.querySelector('.add-to-cart');
            if (!btn) return;
            currentDrawerData = {
                id: btn.getAttribute("data-id"),
                name: btn.getAttribute("data-name"),
                price: btn.getAttribute("data-price"),
                img: btn.getAttribute("data-img"),
                model: card.querySelector('.card-number')?.textContent || "PRODUTO EXCLUSIVO"
            };

            document.getElementById('drawer-p-img').src = currentDrawerData.img;
            document.getElementById('drawer-p-img').alt = `Óculos ${currentDrawerData.name} QB Oficial`;
            document.getElementById('drawer-p-name').textContent = currentDrawerData.name;
            document.getElementById('drawer-p-price').textContent = `R$ ${parseInt(currentDrawerData.price).toLocaleString('pt-BR')},00`;
            document.getElementById('drawer-p-model').textContent = currentDrawerData.model;

            document.getElementById('drawer-add-btn').onclick = () => {
                addToCart({ ...currentDrawerData, price: parseInt(currentDrawerData.price) });
                toggleProductDrawer(false);
            };

            toggleProductDrawer(true);
        };

        if (clickableArea) {
            clickableArea.style.cursor = 'pointer';
            clickableArea.onclick = openAction;
        }
        if (titleArea) {
            titleArea.closest('.text-reveal-wrapper').style.cursor = 'pointer';
            titleArea.closest('.text-reveal-wrapper').onclick = openAction;
        }
    });

    /* ── 7. AUTENTICAÇÃO (User Views) ── */
    window.switchUserView = (target) => {
        const viewLogin = document.getElementById('view-login');
        const viewRegister = document.getElementById('view-register');
        if (target === 'register') {
            viewLogin.style.display = 'none';
            viewRegister.classList.remove('hidden');
            viewRegister.style.display = 'block';
            gsap.fromTo(viewRegister, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 });
        } else {
            viewRegister.style.display = 'none';
            viewLogin.classList.remove('hidden');
            viewLogin.style.display = 'block';
            gsap.fromTo(viewLogin, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 });
        }
    };

    // Firebase Auth (listeners configurados após módulo carregar)
    const connectFirebaseAuth = () => {
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } = window.qbAuthMethods || {};
        const auth = window.qbAuth;

        if (!auth) {
            setTimeout(connectFirebaseAuth, 300);
            return;
        }

        onAuthStateChanged(auth, (user) => {
            const headerLabel = document.getElementById('user-name-header');
            const viewLogin = document.getElementById('view-login');
            const viewMember = document.getElementById('view-member');
            const drawerName = document.getElementById('user-display-name');

            if (user) {
                const name = user.displayName || user.email.split('@')[0];
                if (headerLabel) {
                    headerLabel.textContent = `Olá, ${name}`;
                    headerLabel.style.opacity = "1";
                    headerLabel.style.transform = "translateX(0)";
                }
                if (drawerName) drawerName.textContent = name;
                if (viewLogin) viewLogin.style.display = 'none';
                if (viewMember) viewMember.classList.add('active');
            } else {
                if (headerLabel) { headerLabel.textContent = "Log In"; headerLabel.style.opacity = "0.5"; }
                if (viewLogin) viewLogin.style.display = 'block';
                if (viewMember) viewMember.classList.remove('active');
            }
        });

        const loginBtn = document.getElementById('mock-login-btn');
        if (loginBtn) {
            loginBtn.onclick = async () => {
                const email = document.getElementById('login-email')?.value;
                const pass = document.getElementById('login-pass')?.value;
                if (!email || !pass) return alert("Preencha todos os campos.");
                loginBtn.textContent = "Verificando...";
                try {
                    await signInWithEmailAndPassword(auth, email, pass);
                    toggleUserDrawer(false);
                } catch {
                    alert("Erro ao entrar: Verifique suas credenciais.");
                    loginBtn.textContent = "Entrar na Conta";
                }
            };
        }

        const registerBtn = document.querySelector('#view-register .btn-dark');
        if (registerBtn) {
            registerBtn.onclick = async () => {
                const email = document.getElementById('reg-email')?.value;
                const pass = document.getElementById('reg-pass')?.value;
                if (!email || !pass) return alert("Preencha e-mail e senha.");
                registerBtn.textContent = "Criando Conta...";
                try {
                    await createUserWithEmailAndPassword(auth, email, pass);
                    alert("Conta criada! Bem-vindo ao Clube QB.");
                    toggleUserDrawer(false);
                } catch (e) {
                    alert("Erro: " + e.message);
                    registerBtn.textContent = "Confirmar Cadastro";
                }
            };
        }

        window.logoutMock = () => {
            if (auth) signOut(auth).then(() => location.reload());
        };

        // Firestore observer
        const { doc, onSnapshot } = window.qbDBMethods || {};
        const db = window.qbDB;
        if (db && doc && onSnapshot) {
            onSnapshot(doc(db, "settings", "catalog"), (snapshot) => {
                if (!snapshot.exists()) return;
                const data = snapshot.data();
                Object.keys(data).forEach(key => {
                    const prodId = key.startsWith('p') ? key.substring(1) : key;
                    const rawValue = data[key];
                    const price = (typeof rawValue === 'object') ? rawValue.price : rawValue;
                    const name = (typeof rawValue === 'object') ? rawValue.name : null;

                    document.querySelectorAll(`article.product-card`).forEach(card => {
                        const addToCartBtn = card.querySelector(`[data-id="${prodId}"]`);
                        if (!addToCartBtn) return;
                        if (price) addToCartBtn.setAttribute('data-price', price);
                        if (name) addToCartBtn.setAttribute('data-name', name);
                        const titleElem = card.querySelector('.product-title-reveal');
                        if (titleElem && name) titleElem.textContent = name;
                    });
                });
            });
        }
    };
    // Inicia Firebase auth com pequeno delay para não bloquear render inicial
    setTimeout(connectFirebaseAuth, 500);

    /* ── 8. SISTEMA DE BUSCA ── */
    const searchBtn = document.getElementById('header-search-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearch = document.getElementById('close-search');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsGrid = document.getElementById('search-results-grid');

    const productCatalog = [
        { name: "IBIZA",     id: "1", img: "assets/img/tech_glasses.png" },
        { name: "MALDIVES",  id: "2", img: "assets/img/white_glasses.png" },
        { name: "ST. TROPEZ",id: "3", img: "assets/img/produto 03.png" },
        { name: "MYKONOS",   id: "4", img: "assets/img/produto 04.png" },
        { name: "BORA BORA", id: "5", img: "assets/img/produto 05.png" },
        { name: "CAPRI",     id: "6", img: "assets/img/produto 06.png" },
        { name: "NAVARIO",   id: "7", img: "assets/img/produto 07.png" },
        { name: "VIK",       id: "8", img: "assets/img/produto 08.png" }
    ];

    if (searchBtn) searchBtn.onclick = () => {
        searchOverlay.classList.add('active');
        setTimeout(() => searchInput.focus(), 500);
    };
    if (closeSearch) closeSearch.onclick = () => {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResultsContainer.classList.add('hidden');
    };

    // Debounce na busca para performance
    let searchDebounce;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                const query = e.target.value.toLowerCase().trim();
                if (query.length < 2) { searchResultsContainer.classList.add('hidden'); return; }
                const matches = productCatalog.filter(p => p.name.toLowerCase().includes(query));
                if (matches.length > 0) {
                    searchResultsContainer.classList.remove('hidden');
                    searchResultsGrid.innerHTML = matches.map(p => `
                        <div class="search-card" onclick="scrollToProduct('${p.name}')" role="button" tabindex="0" aria-label="Ver ${p.name}" style="cursor:pointer;background:#fafaf9;padding:1.5rem;border-radius:2rem;text-align:center;transition:background .3s ease">
                            <img src="${p.img}" style="width:100%;height:6rem;object-fit:contain;mix-blend-mode:multiply;transition:transform .3s ease" loading="lazy" alt="${p.name}" width="120" height="96">
                            <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-top:1rem;color:#1c1917">${p.name}</p>
                        </div>`).join('');
                } else {
                    searchResultsContainer.classList.add('hidden');
                }
            }, 150);
        });
    }

    window.scrollToProduct = (name) => {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (searchInput) searchInput.value = '';
        if (searchResultsContainer) searchResultsContainer.classList.add('hidden');

        const titles = Array.from(document.querySelectorAll('.product-title-reveal'));
        const target = titles.find(t => t.textContent.trim().toUpperCase() === name.toUpperCase());
        if (target) {
            const card = target.closest('article');
            gsap.to(window, { duration: 1.5, scrollTo: { y: card, offsetY: 120 }, ease: "power4.inOut" });
            gsap.timeline()
                .fromTo(card, { scale: 1 }, { scale: 1.02, filter: "brightness(1.1)", duration: 0.4, ease: "power2.out" })
                .to(card, { scale: 1, filter: "brightness(1)", duration: 0.6, ease: "power2.in" });
        }
    };

    // Smooth scroll links
    document.querySelectorAll('.scroll-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) gsap.to(window, { duration: 1.5, scrollTo: target.offsetTop, ease: "power4.inOut" });
        };
    });

    // Logo → topo suave
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.onclick = (e) => {
            e.preventDefault();
            gsap.to(window, { duration: 1.5, scrollTo: 0, ease: "power4.inOut" });
        };
    }

    // Admin utility (console)
    window.updateProductPrice = async (id, newPrice) => {
        const { doc, getDoc, updateDoc, setDoc } = window.qbDBMethods || {};
        const db = window.qbDB;
        if (!db) return;
        try {
            const ref = doc(db, "settings", "catalog");
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, { [id]: { price: newPrice, name: "Produto Novo" } });
            } else {
                await updateDoc(ref, { [`${id}.price`]: newPrice });
            }
            console.log(`Preço ID ${id} → R$ ${newPrice}`);
        } catch (err) {
            console.error("Erro ao atualizar catálogo:", err);
        }
    };
}

// Inicia quando DOM está pronto (script é defer)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
