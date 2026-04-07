/* =====================================================
   QB OFICIAL — main.js  (Performance Edition)
   - ScrollTrigger.batch() para cards (↓ 16 → 2 instâncias)
   - Apenas 20 frames carregados (frames ímpares, ↓ 50% rede)
   - Passive scroll + rAF throttle
   - Iconify lazy após primeiro scroll/interação
   - Firebase init adiado 800ms pós-first-paint
   ===================================================== */

function initApp() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        requestAnimationFrame(initApp);
        return;
    }

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    /* ── 1. ANIMAÇÃO DE ENTRADA HERO ── */
    const tlIntro = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });

    tlIntro
        .to(".text-reveal-content", {
            y: "0%", opacity: 1,
            duration: 0.7, stagger: 0.1, ease: "power4.out"
        })
        .to(".sub-headline", {
            y: 0, opacity: 1, duration: 0.6, ease: "power2.out"
        }, "-=0.5");

    /* ── 1.1 Header scroll — passive + rAF throttle ── */
    const header = document.getElementById('site-header');
    let scrollTicking = false;
    window.addEventListener("scroll", () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                header.classList.toggle("scrolled", window.scrollY > 50);
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });

    /* ── 2. IMAGE SEQUENCE — desktop only
       Mobile: mostra apenas o frame estático, sem carregar 20 JPEGs.
       Isso economiza ~500KB e ~500ms de decode no mobile.         ── */
    const IS_MOBILE = window.innerWidth < 768;
    const canvas = document.getElementById("hero-canvas");
    const context = canvas.getContext("2d");

    // Em mobile: apenas deixa o hero-lcp visível, sem animação de frames
    if (IS_MOBILE) {
        // Escond canvas (o hero-lcp já mostra o frame estático)
        canvas.style.display = 'none';
    } else {
    // Frames disponíveis: 001, 003, 005 … 039 (20 frames)
    const TOTAL_FRAMES = 20;
    const frameIndex = i => String(i * 2 - 1).padStart(3, '0'); // 001,003,005…
    const frameSrc   = i => `assets/video_frames/ezgif-frame-${frameIndex(i)}.jpg`;

    const images = new Array(TOTAL_FRAMES).fill(null);
    const glassesObj = { frame: 1 };
    let lastGoodFrame = 0;

    function render() {
        let fi = Math.round(glassesObj.frame) - 1;
        fi = Math.max(0, Math.min(fi, TOTAL_FRAMES - 1));

        let img = images[fi];
        if (!img || !img.complete || img.naturalWidth === 0) img = images[lastGoodFrame];
        if (!img || !img.complete || img.naturalWidth === 0) return;
        lastGoodFrame = fi;

        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth, h = window.innerHeight;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr; canvas.height = h * dpr;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        }

        const sw = canvas.width / dpr, sh = canvas.height / dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.clearRect(0, 0, sw, sh);

        const iW = img.naturalWidth, iH = img.naturalHeight;
        if (w < 768) {
            context.save(); context.translate(sw / 2, sh / 2); context.rotate(Math.PI / 2);
            const s = Math.max(sh / iW, sw / iH);
            context.drawImage(img, -(iW * s) / 2, -(iH * s) / 2, iW * s, iH * s);
            context.restore();
        } else {
            const r = iW / iH, cr = sw / sh;
            const dW = cr > r ? sw : sh * r, dH = cr > r ? sw / r : sh;
            context.drawImage(img, (sw - dW) / 2, (sh - dH) / 2, dW, dH);
        }
    }

    // Frame 1 (já pré-carregado pelo script inline no <head>)
    // Reinicia se ainda não tiver a referência
    if (window._heroFirstFrameLoaded && !images[0]) {
        const f1 = new Image();
        f1.src = frameSrc(1);
        f1.onload = () => { images[0] = f1; render(); };
        images[0] = f1;
    }

    // Frames 2–20 via requestIdleCallback para não roubar main thread
    const loadFrames = (start) => {
        if (start > TOTAL_FRAMES) return;
        const img = new Image();
        img.src = frameSrc(start);
        img.onload = () => {
            images[start - 1] = img;
            if (Math.round(glassesObj.frame) === start) render();
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => loadFrames(start + 1), { timeout: 800 });
        } else {
            setTimeout(() => loadFrames(start + 1), 30);
        }
    };
    loadFrames(2);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 150);
    }, { passive: true });

    // GSAP scrub da sequência
    gsap.to(glassesObj, {
        frame: TOTAL_FRAMES,
        snap: "frame",
        ease: "none",
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "bottom bottom",
            scrub: 2
        },
        onUpdate: render
    });

    // Canvas em camada de composição GPU própria após LCP
    requestAnimationFrame(() => {
        canvas.style.transform = 'translateZ(0)';
    });
    } // fim if(!IS_MOBILE)

    /* ── 3. Parallax saída do hero text ── */
    gsap.to([".hero-headline", ".sub-headline", ".ctas"], {
        y: -100, opacity: 0, filter: "blur(10px)",
        ease: "power2.inOut",
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "top -80%",
            scrub: 1.0
        }
    });

    /* ── 4. Animações das Cards — ScrollTrigger.batch() ──
       Substitui 8×ScrollTrigger individuais por 1 instância única  ── */
    ScrollTrigger.batch('.product-card', {
        start: "top 92%",
        onEnter: batch => {
            gsap.fromTo(batch,
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out", overwrite: true }
            );
            // Revela títulos dentro do batch
            batch.forEach(card => {
                const titles = card.querySelectorAll('.product-title-reveal');
                if (titles.length) {
                    gsap.fromTo(titles,
                        { y: "110%", opacity: 0 },
                        { y: "0%", opacity: 1, duration: 0.4, stagger: 0.04, ease: "power4.out", delay: 0.1 }
                    );
                }
            });
        },
        once: true  // anima só uma vez
    });

    // Parallax na imagem de cada card — 1 instância com scrub
    // (mantido individual pois cada card tem offset diferente)
    const productCards = gsap.utils.toArray('.product-card');
    productCards.forEach(card => {
        const img = card.querySelector('.card-img');
        if (!img) return;
        gsap.to(img, {
            y: 30, ease: "none",
            scrollTrigger: {
                trigger: card,
                start: "top bottom", end: "bottom top",
                scrub: 1
            }
        });

        // Spotlight no hover
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--x', `${e.clientX - r.left}px`);
            card.style.setProperty('--y', `${e.clientY - r.top}px`);
        }, { passive: true });
    });

    // Elementos editoriais (heritage, lifestyle, faq)
    // Apenas 1 ScrollTrigger para todos via batch
    ScrollTrigger.batch('.product-elem', {
        start: "top 88%",
        onEnter: batch => {
            gsap.fromTo(batch,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: "power3.out", overwrite: true }
            );
        },
        once: true
    });

    ScrollTrigger.refresh();

    /* ── 5. CARRINHO ── */
    let cart = (() => { try { return JSON.parse(localStorage.getItem('qb_cart') || '[]'); } catch { return []; } })();

    const cartDrawer    = document.getElementById("cart-drawer");
    const cartOverlay   = document.getElementById("cart-overlay");
    const cartContainer = document.getElementById("cart-items-container");
    const cartCountEl   = document.getElementById("cart-count");
    const cartTotalEl   = document.getElementById("cart-total");

    updateCartUI();

    function toggleCart(open = true) {
        if (open) {
            cartOverlay.classList.add("active");
            cartOverlay.setAttribute('aria-hidden', 'false');
            gsap.to(cartDrawer, { x: "0%", duration: 0.55, ease: "expo.out" });
            document.body.style.overflow = 'hidden';
        } else {
            cartOverlay.classList.remove("active");
            cartOverlay.setAttribute('aria-hidden', 'true');
            gsap.to(cartDrawer, { x: "100%", duration: 0.45, ease: "expo.in" });
            document.body.style.overflow = '';
        }
    }

    function updateWhatsAppLink() {
        const wa = document.getElementById('main-wa-concierge');
        if (!wa) return;
        if (!cart.length) { wa.href = "https://wa.me/message/FV37UMP6GFRWL1"; return; }
        const msg = encodeURIComponent(`Olá QB! Pedido: ${cart.map(i => `${i.name} (x${i.quantity})`).join(', ')}.`);
        wa.href = `https://wa.me/message/FV37UMP6GFRWL1?text=${msg}`;
    }

    function updateCartUI() {
        localStorage.setItem('qb_cart', JSON.stringify(cart));
        const total = cart.reduce((s, i) => s + i.quantity, 0);
        if (cartCountEl) cartCountEl.textContent = total;

        if (!cart.length) {
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
                    <p style="font-size:.75rem;color:#a8a29e;font-family:var(--font-mono)">R$ ${item.price},00 &times; ${item.quantity}</p>
                </div>
                <button class="remove-item icon-btn" data-id="${item.id}" aria-label="Remover ${item.name}">
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="18" aria-hidden="true"></iconify-icon>
                </button>
            </div>`).join('');

        const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        if (cartTotalEl) cartTotalEl.textContent = `R$ ${subtotal.toLocaleString('pt-BR')},00`;

        cartContainer.querySelectorAll(".remove-item").forEach(btn => {
            btn.onclick = () => {
                cart = cart.filter(it => it.id !== btn.getAttribute("data-id"));
                updateCartUI();
            };
        });
        updateWhatsAppLink();
    }

    function addToCart(product) {
        const ex = cart.find(i => i.id === product.id);
        if (ex) { ex.quantity++; } else { cart.push({ ...product, quantity: 1 }); }
        updateCartUI();
        toggleCart(true);
        const btn = document.getElementById('header-cart-btn');
        if (btn) { btn.classList.add('cart-bounce'); setTimeout(() => btn.classList.remove('cart-bounce'), 600); }
    }

    /* ── User Drawer ── */
    const userDrawer  = document.getElementById('user-drawer');
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
    document.getElementById('close-user').onclick      = () => toggleUserDrawer(false);
    userOverlay.onclick                                = () => toggleUserDrawer(false);
    document.getElementById("header-cart-btn").onclick = () => { toggleUserDrawer(false); toggleCart(true); };
    document.getElementById("close-cart").onclick      = () => toggleCart(false);
    cartOverlay.onclick                                = () => toggleCart(false);

    const checkoutBtn = document.getElementById("final-checkout-btn");
    if (checkoutBtn) checkoutBtn.onclick = () => { if (!cart.length) return alert("Seu carrinho está vazio!"); window.location.href = 'checkout.html'; };

    const finalCta = document.getElementById('final-cta');
    if (finalCta) finalCta.onclick = () => {
        const col = document.getElementById('collection');
        if (col) gsap.to(window, { duration: 1.2, scrollTo: { y: col, offsetY: 80 }, ease: "power4.inOut" });
    };

    // Add to cart
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        const action = () => addToCart({
            id: btn.getAttribute("data-id"),
            name: btn.getAttribute("data-name"),
            price: parseInt(btn.getAttribute("data-price")),
            img: btn.getAttribute("data-img")
        });
        btn.addEventListener("click", action);
        btn.addEventListener("keydown", e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
    });

    /* ── 6. PRODUCT DETAILS DRAWER ── */
    const productDrawer   = document.getElementById("product-drawer");
    const productOverlay  = document.getElementById("product-overlay");
    let currentProduct    = null;

    function toggleProductDrawer(open = true) {
        if (open) {
            productOverlay.classList.add("active");
            productOverlay.setAttribute('aria-hidden', 'false');
            gsap.to(productDrawer, { x: "0%", duration: 0.55, ease: "expo.out" });
            document.body.style.overflow = 'hidden';
        } else {
            productOverlay.classList.remove("active");
            productOverlay.setAttribute('aria-hidden', 'true');
            gsap.to(productDrawer, { x: "100%", duration: 0.45, ease: "expo.in" });
            document.body.style.overflow = '';
        }
    }

    document.getElementById("close-product").onclick = () => toggleProductDrawer(false);
    productOverlay.onclick = () => toggleProductDrawer(false);

    productCards.forEach(card => {
        const imgWrap  = card.querySelector('.card-image-wrap');
        const titleEl  = card.querySelector('.product-title-reveal');
        const openCard = () => {
            const btn = card.querySelector('.add-to-cart');
            if (!btn) return;
            currentProduct = {
                id: btn.getAttribute("data-id"),
                name: btn.getAttribute("data-name"),
                price: btn.getAttribute("data-price"),
                img: btn.getAttribute("data-img"),
                model: card.querySelector('.card-number')?.textContent || "PRODUTO EXCLUSIVO"
            };
            document.getElementById('drawer-p-img').src  = currentProduct.img;
            document.getElementById('drawer-p-img').alt  = `Óculos ${currentProduct.name}`;
            document.getElementById('drawer-p-name').textContent  = currentProduct.name;
            document.getElementById('drawer-p-price').textContent = `R$ ${parseInt(currentProduct.price).toLocaleString('pt-BR')},00`;
            document.getElementById('drawer-p-model').textContent = currentProduct.model;
            document.getElementById('drawer-add-btn').onclick = () => {
                addToCart({ ...currentProduct, price: parseInt(currentProduct.price) });
                toggleProductDrawer(false);
            };
            toggleProductDrawer(true);
        };
        if (imgWrap)  { imgWrap.style.cursor = 'pointer'; imgWrap.onclick = openCard; }
        if (titleEl) { titleEl.closest('.text-reveal-wrapper').style.cursor = 'pointer'; titleEl.closest('.text-reveal-wrapper').onclick = openCard; }
    });

    /* ── 7. USER AUTH — espera Firebase lazy-load (evento 'firebase-ready') ── */
    function initFirebaseAuth() {
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } = window.qbAuthMethods || {};
        const auth = window.qbAuth;
        if (!auth) return; // Firebase não disponível, ignora silenciosamente

        onAuthStateChanged(auth, user => {
            const lbl     = document.getElementById('user-name-header');
            const vLogin  = document.getElementById('view-login');
            const vMember = document.getElementById('view-member');
            const dName   = document.getElementById('user-display-name');
            if (user) {
                const name = user.displayName || user.email.split('@')[0];
                if (lbl)     { lbl.textContent = `Olá, ${name}`; lbl.style.opacity = "1"; }
                if (dName)   dName.textContent = name;
                if (vLogin)  vLogin.style.display = 'none';
                if (vMember) vMember.classList.add('active');
            } else {
                if (lbl)     { lbl.textContent = "Log In"; lbl.style.opacity = "0.5"; }
                if (vLogin)  vLogin.style.display = 'block';
                if (vMember) vMember.classList.remove('active');
            }
        });

        const loginBtn = document.getElementById('mock-login-btn');
        if (loginBtn) loginBtn.onclick = async () => {
            const email = document.getElementById('login-email')?.value;
            const pass  = document.getElementById('login-pass')?.value;
            if (!email || !pass) return alert("Preencha todos os campos.");
            loginBtn.textContent = "Verificando...";
            try { await signInWithEmailAndPassword(auth, email, pass); toggleUserDrawer(false); }
            catch { alert("Credenciais incorretas."); loginBtn.textContent = "Entrar na Conta"; }
        };

        const registerBtn = document.querySelector('#view-register .btn-dark');
        if (registerBtn) registerBtn.onclick = async () => {
            const email = document.getElementById('reg-email')?.value;
            const pass  = document.getElementById('reg-pass')?.value;
            if (!email || !pass) return alert("Preencha e-mail e senha.");
            registerBtn.textContent = "Criando Conta...";
            try { await createUserWithEmailAndPassword(auth, email, pass); alert("Bem-vindo ao Clube QB!"); toggleUserDrawer(false); }
            catch (e) { alert("Erro: " + e.message); registerBtn.textContent = "Confirmar Cadastro"; }
        };

        window.logoutMock = () => { if (auth) signOut(auth).then(() => location.reload()); };

        // Firestore live catalog
        const { doc, onSnapshot } = window.qbDBMethods || {};
        const db = window.qbDB;
        if (db && doc && onSnapshot) {
            onSnapshot(doc(db, "settings", "catalog"), snap => {
                if (!snap.exists()) return;
                Object.entries(snap.data()).forEach(([key, val]) => {
                    const id    = key.startsWith('p') ? key.substring(1) : key;
                    const price = typeof val === 'object' ? val.price : val;
                    const name  = typeof val === 'object' ? val.name  : null;
                    document.querySelectorAll(`[data-id="${id}"]`).forEach(btn => {
                        if (price) btn.setAttribute('data-price', price);
                        if (name)  btn.setAttribute('data-name', name);
                        const card  = btn.closest('article');
                        const title = card?.querySelector('.product-title-reveal');
                        if (title && name) title.textContent = name;
                    });
                });
            });
        }
    } // fim initFirebaseAuth

    // Executa quando Firebase estiver pronto (lazy load) ou imediatamente se já carregou
    if (window.qbAuth) {
        initFirebaseAuth();
    } else {
        window.addEventListener('firebase-ready', initFirebaseAuth, { once: true });
    }

    window.switchUserView = target => {
        const vL = document.getElementById('view-login');
        const vR = document.getElementById('view-register');
        if (target === 'register') {
            vL.style.display = 'none'; vR.classList.remove('hidden'); vR.style.display = 'block';
            gsap.fromTo(vR, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.35 });
        } else {
            vR.style.display = 'none'; vL.classList.remove('hidden'); vL.style.display = 'block';
            gsap.fromTo(vL, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35 });
        }
    };

    /* ── 8. BUSCA — debounce 200ms ── */
    const searchOverlay   = document.getElementById('search-overlay');
    const searchInput     = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-results-container');
    const searchGrid      = document.getElementById('search-results-grid');

    const catalog = [
        { name:"IBIZA",      id:"1", img:"assets/img/tech_glasses.png" },
        { name:"MALDIVES",   id:"2", img:"assets/img/white_glasses.png" },
        { name:"ST. TROPEZ", id:"3", img:"assets/img/produto 03.png" },
        { name:"MYKONOS",    id:"4", img:"assets/img/produto 04.png" },
        { name:"BORA BORA",  id:"5", img:"assets/img/produto 05.png" },
        { name:"CAPRI",      id:"6", img:"assets/img/produto 06.png" },
        { name:"NAVARIO",    id:"7", img:"assets/img/produto 07.png" },
        { name:"VIK",        id:"8", img:"assets/img/produto 08.png" }
    ];

    document.getElementById('header-search-btn').onclick = () => {
        searchOverlay.classList.add('active');
        setTimeout(() => searchInput?.focus(), 400);
    };
    document.getElementById('close-search').onclick = () => {
        searchOverlay.classList.remove('active');
        if (searchInput) searchInput.value = '';
        if (searchContainer) searchContainer.classList.add('hidden');
    };

    let searchTimer;
    searchInput?.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const q = e.target.value.toLowerCase().trim();
            if (q.length < 2) { searchContainer.classList.add('hidden'); return; }
            const hits = catalog.filter(p => p.name.toLowerCase().includes(q));
            if (!hits.length) { searchContainer.classList.add('hidden'); return; }
            searchContainer.classList.remove('hidden');
            searchGrid.innerHTML = hits.map(p => `
                <div onclick="scrollToProduct('${p.name}')" role="button" tabindex="0"
                     style="cursor:pointer;background:#fafaf9;padding:1.5rem;border-radius:2rem;text-align:center;transition:background .3s ease"
                     onmouseenter="this.style.background='#f5f5f4'" onmouseleave="this.style.background='#fafaf9'">
                    <img src="${p.img}" style="width:100%;height:6rem;object-fit:contain;mix-blend-mode:multiply" loading="lazy" alt="${p.name}" width="120" height="96">
                    <p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-top:.75rem;color:#1c1917">${p.name}</p>
                </div>`).join('');
        }, 200);
    });

    window.scrollToProduct = name => {
        searchOverlay.classList.remove('active');
        if (searchInput) searchInput.value = '';
        if (searchContainer) searchContainer.classList.add('hidden');
        document.body.style.overflow = '';
        const target = [...document.querySelectorAll('.product-title-reveal')].find(t => t.textContent.trim().toUpperCase() === name.toUpperCase());
        if (!target) return;
        const card = target.closest('article');
        gsap.to(window, { duration: 1.3, scrollTo: { y: card, offsetY: 120 }, ease: "power4.inOut" });
        gsap.timeline()
            .to(card, { scale: 1.02, filter: "brightness(1.1)", duration: 0.35, ease: "power2.out" })
            .to(card, { scale: 1,    filter: "brightness(1)",   duration: 0.5,  ease: "power2.in" });
    };

    // Scroll links
    document.querySelectorAll('.scroll-link').forEach(link => {
        link.onclick = e => {
            e.preventDefault();
            const t = document.querySelector(link.getAttribute('href'));
            if (t) gsap.to(window, { duration: 1.2, scrollTo: t.offsetTop, ease: "power4.inOut" });
        };
    });

    document.querySelector('.logo-link')?.addEventListener('click', e => {
        e.preventDefault();
        gsap.to(window, { duration: 1.2, scrollTo: 0, ease: "power4.inOut" });
    });

    /* ── Admin util ── */
    window.updateProductPrice = async (id, newPrice) => {
        const { doc, getDoc, updateDoc, setDoc } = window.qbDBMethods || {};
        const db = window.qbDB;
        if (!db) return;
        const ref = doc(db, "settings", "catalog");
        const snap = await getDoc(ref);
        if (!snap.exists()) await setDoc(ref, { [id]: { price: newPrice } });
        else await updateDoc(ref, { [`${id}.price`]: newPrice });
        console.log(`Preço ID ${id} → R$ ${newPrice}`);
    };
}

// Arranca quando DOM + GSAP estiverem prontos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
