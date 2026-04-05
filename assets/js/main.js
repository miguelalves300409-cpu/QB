document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    /* 1. Animação de Entrada (Intro / Hero Reveal) */
    const tlIntro = gsap.timeline({ defaults: { ease: "power4.out" } });

    // Logo e Mídia Central (Óculos) - Revelação Dramática
    tlIntro.to([".logo-entrance", "#video-container"], {
        y: 0,
        opacity: 1,
        duration: 1.2,
        stagger: 0.2,
        ease: "power2.out"
    });

    // Letterings (Títulos Grandes) - Agora entram quase simultâneos para impacto
    tlIntro.to(".text-reveal-content", {
        y: "0%",
        opacity: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "power4.out"
    }, "-=1.0");

    // Botões (CTAs) - Agora entram com impacto imediato junto com os títulos
    tlIntro.to(".ctas", {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power4.out"
    }, "-=1.0");

    // Resto dos elementos (Paragrafo, Nav)
    tlIntro.to([".eyebrow-text", ".sub-headline", ".vertical-nav"], {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.1,
        ease: "power2.out"
    }, "-=0.6");

    /* 1.1 Header Scroll Logic */
    window.addEventListener("scroll", () => {
        const header = document.querySelector("header");
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });

    /* 2. Apple-style Image Sequence para Scrub Perfeito (Revertido para Frames Nativos) */
    const canvas = document.getElementById("hero-canvas");
    const context = canvas.getContext("2d");

    const frameCount = 40; // Total de frames na pasta
    const currentFrame = index => `assets/video_frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;
    const images = [];
    const glassesObj = { frame: 1 };

    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = currentFrame(i);
        images.push(img);
    }

    let loadedCount = 0;
    images.forEach(img => {
        if (img.complete) loadedCount++;
        else img.onload = () => {
            loadedCount++;
            if (loadedCount === 1) render();
        };
    });
    if (images[0] && images[0].complete) render();

    let lastLoadedFrameIndex = 0;
    function render() {
        let frameIndex = Math.round(glassesObj.frame) - 1;
        if (frameIndex < 0) frameIndex = 0;
        if (frameIndex >= frameCount) frameIndex = frameCount - 1;

        let activeImage = images[frameIndex];
        if (!activeImage || !activeImage.complete) {
            activeImage = images[lastLoadedFrameIndex];
        } else {
            lastLoadedFrameIndex = frameIndex;
        }

        if (activeImage && activeImage.complete) {
            if (activeImage.width > 0 && canvas.width !== activeImage.width) {
                canvas.width = activeImage.width;
                canvas.height = activeImage.height;
            }
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
            trigger: "#hero",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.8
        },
        onUpdate: render
    });

    /* 3. Parallax e Desfoque nas Letrings ao fazer a rolagem */
    gsap.to([".eyebrow-text", ".hero-headline", ".sub-headline", ".ctas", ".vertical-nav", ".logo-entrance"], {
        y: -120,
        opacity: 0,
        filter: "blur(12px)",
        stagger: 0.06,
        ease: "power2.inOut",
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "top -100%",
            scrub: 1.0
        }
    });

    /* 4. Animações da Galeria de Produtos */
    const productCards = gsap.utils.toArray('.product-card');
    productCards.forEach((card, i) => {
        const titleItems = card.querySelectorAll('.product-title-reveal');
        const internalElems = card.querySelectorAll('.product-elem');
        const img = card.querySelector('img');

        const cardTL = gsap.timeline({
            scrollTrigger: {
                trigger: card,
                start: "top bottom", 
                toggleActions: "play none none none"
            }
        });

        cardTL.fromTo(card, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" })
            .fromTo(titleItems, { y: "110%", opacity: 0 }, { y: "0%", opacity: 1, stagger: 0.05, duration: 0.3, ease: "power4.out" }, "-=0.3")
            .fromTo(internalElems, { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.02, duration: 0.3, ease: "power2.out" }, "-=0.3");

        gsap.to(img, {
            y: 40,
            scale: 1.15,
            ease: "none",
            scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.5
            }
        });
    });

    // Orbes Parallax
    gsap.to(['.parallax-bg-orb', '.parallax-bg-orb-3'], { y: 150, scale: 1.2, ease: "none", scrollTrigger: { trigger: '#dobra-2', start: "top bottom", end: "bottom top", scrub: 0.8 } });
    gsap.to(['.parallax-bg-orb-4', '.parallax-bg-orb-5'], { y: 120, scale: 1.1, ease: "none", scrollTrigger: { trigger: '#dobra-3', start: "top bottom", end: "bottom top", scrub: 1.0 } });

    productCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--y', `${e.clientY - rect.top}px`);
        });
    });

    ScrollTrigger.refresh();

    /* 5. SISTEMA DE CARRINHO */
    let cart = [];
    const cartDrawer = document.getElementById("cart-drawer");
    const cartOverlay = document.getElementById("cart-overlay");
    const cartContainer = document.getElementById("cart-items-container");
    const cartCount = document.getElementById("cart-count");
    const cartTotal = document.getElementById("cart-total");

    function toggleCart(open = true) {
        if (open) {
            cartOverlay.classList.add("active");
            gsap.to(cartDrawer, { x: "0%", duration: 0.6, ease: "expo.out" });
        } else {
            cartOverlay.classList.remove("active");
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
        const itemsList = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
        const message = encodeURIComponent(`Olá QB! Gostaria de um concierge para finalizar meu pedido: ${itemsList}.`);
        waLink.href = `https://wa.me/message/FV37UMP6GFRWL1?text=${message}`;
    }

    function updateCartUI() {
        localStorage.setItem('qb_cart', JSON.stringify(cart));
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if(cartCount) cartCount.innerText = totalItems;

        if (cart.length === 0) {
            cartContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-stone-400 gap-4"><iconify-icon icon="solar:cart-plus-linear" class="text-5xl opacity-20"></iconify-icon><p class="text-sm font-mono uppercase tracking-widest">Carrinho Vazio</p></div>`;
            cartTotal.innerText = "R$ 0,00";
            updateWhatsAppLink();
            return;
        }

        cartContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.img}" class="cart-item-img" alt="${item.name}">
                <div class="flex-1">
                    <h4 class="text-sm font-bold text-stone-900">${item.name}</h4>
                    <p class="text-xs text-stone-400 font-mono">R$ ${item.price},00 x ${item.quantity}</p>
                </div>
                <button class="remove-item text-stone-300 hover:text-red-500 transition-colors" data-id="${item.id}"><iconify-icon icon="solar:trash-bin-trash-linear" class="text-lg"></iconify-icon></button>
            </div>`).join('');

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.innerText = `R$ ${total.toLocaleString('pt-BR')},00`;

        document.querySelectorAll(".remove-item").forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute("data-id");
                cart = cart.filter(it => it.id !== id);
                updateCartUI();
            };
        });
        updateWhatsAppLink();
    }

    function addToCart(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) { existing.quantity += 1; } else { cart.push({ ...product, quantity: 1 }); }
        updateCartUI();
        toggleCart(true);

        const cartIcon = document.getElementById('header-cart-btn');
        if(cartIcon) {
            cartIcon.classList.add('cart-bounce');
            setTimeout(() => cartIcon.classList.remove('cart-bounce'), 600);
        }
    }

    const userDrawer = document.getElementById('user-drawer');
    const userOverlay = document.getElementById('user-overlay');
    const closeUser = document.getElementById('close-user');
    const openUser = document.getElementById('header-user-btn');

    function toggleUserDrawer(show) {
        if(show) {
            toggleCart(false); 
            userDrawer.classList.add('active');
            userOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            userDrawer.classList.remove('active');
            userOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if(openUser) openUser.onclick = () => toggleUserDrawer(true);
    if(closeUser) closeUser.onclick = () => toggleUserDrawer(false);
    if(userOverlay) userOverlay.onclick = () => toggleUserDrawer(false);

    document.getElementById("header-cart-btn").onclick = () => { toggleUserDrawer(false); toggleCart(true); };
    document.getElementById("close-cart").onclick = () => toggleCart(false);
    cartOverlay.onclick = () => toggleCart(false);

    const checkoutTrigger = document.querySelector("#final-checkout-btn");
    if(checkoutTrigger) {
        checkoutTrigger.onclick = () => {
            if(cart.length === 0) return alert("Seu carrinho está vazio!");
            window.location.href = 'checkout.html';
        };
    }

    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", () => {
            const product = { id: btn.getAttribute("data-id"), name: btn.getAttribute("data-name"), price: parseInt(btn.getAttribute("data-price")), img: btn.getAttribute("data-img") };
            addToCart(product);
        });
    });

    /* 6. SISTEMA DE DETALHES DO PRODUTO (QUICK VIEW) */
    const productDrawer = document.getElementById("product-drawer");
    const productOverlay = document.getElementById("product-overlay");
    const closeProduct = document.getElementById("close-product");
    const drawerAddBtn = document.getElementById("drawer-add-btn");

    function toggleProductDrawer(open = true) {
        if (open) {
            productOverlay.classList.add("active");
            gsap.to(productDrawer, { x: "0%", duration: 0.6, ease: "expo.out" });
            document.body.style.overflow = 'hidden';
        } else {
            productOverlay.classList.remove("active");
            gsap.to(productDrawer, { x: "100%", duration: 0.6, ease: "expo.in" });
            document.body.style.overflow = '';
        }
    }

    if (closeProduct) closeProduct.onclick = () => toggleProductDrawer(false);
    if (productOverlay) productOverlay.onclick = () => toggleProductDrawer(false);

    // Mapear clique nos cards (nas imagens/área do card)
    productCards.forEach(card => {
        const clickableArea = card.querySelector('.relative.overflow-hidden'); // Ãrea da imagem
        const titleArea = card.querySelector('.product-title-reveal');
        
        const openAction = () => {
            const btn = card.querySelector('.add-to-cart');
            const data = {
                id: btn.getAttribute("data-id"),
                name: btn.getAttribute("data-name"),
                price: btn.getAttribute("data-price"),
                img: btn.getAttribute("data-img"),
                model: card.querySelector('.font-mono.text-stone-400')?.innerText || "PRODUTO EXCLUSIVO"
            };

            // Popular Drawer
            document.getElementById('drawer-p-img').src = data.img;
            document.getElementById('drawer-p-name').innerText = data.name;
            document.getElementById('drawer-p-price').innerText = `R$ ${parseInt(data.price).toLocaleString('pt-BR')},00`;
            document.getElementById('drawer-p-model').innerText = data.model;

            // Configurar botão de compra do drawer
            drawerAddBtn.onclick = () => {
                addToCart({ id: data.id, name: data.name, price: parseInt(data.price), img: data.img });
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

    window.switchUserView = (target) => {
        const viewLogin = document.getElementById('view-login');
        const viewRegister = document.getElementById('view-register');
        if (target === 'register') {
            viewLogin.style.display = 'none'; viewRegister.classList.remove('hidden'); viewRegister.style.display = 'block';
            gsap.fromTo(viewRegister, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 });
        } else {
            viewRegister.style.display = 'none'; viewLogin.classList.remove('hidden'); viewLogin.style.display = 'block';
            gsap.fromTo(viewLogin, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 });
        }
    };

    /* --- FIREBASE AUTH REAL --- */
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } = window.qbAuthMethods || {};
    const auth = window.qbAuth;

    if (auth) {
        onAuthStateChanged(auth, (user) => {
            const headerLabel = document.getElementById('user-name-header');
            const viewLogin = document.getElementById('view-login');
            const viewMember = document.getElementById('view-member');
            const drawerName = document.getElementById('user-display-name');

            if (user) {
                // Usuário Logado
                const name = user.displayName || user.email.split('@')[0];
                if(headerLabel) {
                    headerLabel.innerText = `Olá, ${name}`;
                    headerLabel.classList.remove('opacity-0', 'translate-x-1');
                    headerLabel.style.opacity = "1"; headerLabel.style.transform = "translateX(0)";
                }
                if(drawerName) drawerName.innerText = name;
                if(viewLogin) viewLogin.style.display = 'none';
                if(viewMember) viewMember.classList.add('active');
            } else {
                // Usuário Deslogado
                if(headerLabel) {
                    headerLabel.innerText = "Log In";
                    headerLabel.style.opacity = "0.5";
                }
                if(viewLogin) viewLogin.style.display = 'block';
                if(viewMember) viewMember.classList.remove('active');
            }
        });
    }

    const loginBtn = document.getElementById('mock-login-btn');
    if (loginBtn && auth) {
        loginBtn.onclick = async () => {
            const email = document.querySelector('#view-login input[type="email"]')?.value;
            const pass = document.querySelector('#view-login input[type="password"]')?.value;
            
            if(!email || !pass) return alert("Preencha todos os campos.");
            
            loginBtn.innerText = "Verificando...";
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                toggleUserDrawer(false);
            } catch (error) {
                alert("Erro ao entrar: Verifique suas credenciais.");
                loginBtn.innerText = "Entrar no Clube";
            }
        };
    }

    // Cadastro de Usuário
    const registerBtn = document.querySelector('#view-register button');
    if (registerBtn && auth) {
        registerBtn.onclick = async () => {
            const email = document.querySelector('#view-register input[type="email"]')?.value;
            const pass = document.querySelector('#view-register input[type="password"]')?.value;
            
            if(!email || !pass) return alert("Preencha e-mail e senha.");
            
            registerBtn.innerText = "Criando Conta...";
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                alert("Conta criada com sucesso! Bem-vindo ao Clube QB.");
                toggleUserDrawer(false);
            } catch (error) {
                alert("Erro ao criar conta: " + error.message);
                registerBtn.innerText = "Confirmar Cadastro";
            }
        };
    }

    window.logoutMock = () => { if(auth) signOut(auth).then(() => location.reload()); };

    const searchBtn = document.getElementById('header-search-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearch = document.getElementById('close-search');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsGrid = document.getElementById('search-results-grid');

    const productCatalog = [
        { name: "IBIZA", id: "1", img: "assets/img/tech_glasses.png" },
        { name: "MALDIVES", id: "2", img: "assets/img/white_glasses.png" },
        { name: "ST. TROPEZ", id: "3", img: "assets/img/produto 03.png" },
        { name: "MYKONOS", id: "4", img: "assets/img/produto 04.png" },
        { name: "BORA BORA", id: "5", img: "assets/img/produto 05.png" },
        { name: "CAPRI", id: "6", img: "assets/img/produto 06.png" },
        { name: "NAVARIO", id: "7", img: "assets/img/produto 07.png" },
        { name: "VIK", id: "8", img: "assets/img/produto 08.png" }
    ];

    if (searchBtn) searchBtn.onclick = () => { searchOverlay.classList.add('active'); setTimeout(() => searchInput.focus(), 500); };
    if (closeSearch) closeSearch.onclick = () => { searchOverlay.classList.remove('active'); searchInput.value = ''; searchResultsContainer.classList.add('hidden'); };

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length < 2) { searchResultsContainer.classList.add('hidden'); return; }
            const matches = productCatalog.filter(p => p.name.toLowerCase().includes(query));
            if (matches.length > 0) {
                searchResultsContainer.classList.remove('hidden');
                searchResultsGrid.innerHTML = matches.map(p => `
                    <div class="cursor-pointer group bg-stone-50 p-6 rounded-[2rem] hover:bg-stone-100 transition-all text-center" onclick="scrollToProduct('${p.name}')">
                        <img src="${p.img}" class="w-full h-24 object-contain mix-blend-multiply group-hover:scale-110 transition-transform">
                        <p class="text-[10px] font-bold tracking-widest uppercase mt-4 text-stone-900">${p.name}</p>
                    </div>`).join('');
            } else { searchResultsContainer.classList.add('hidden'); }
        });
    }

    window.scrollToProduct = (name) => {
        searchOverlay.classList.remove('active'); document.body.style.overflow = ''; searchInput.value = ''; searchResultsContainer.classList.add('hidden');
        const titles = Array.from(document.querySelectorAll('.product-title-reveal'));
        const targetTitle = titles.find(t => t.innerText.trim().toUpperCase() === name.toUpperCase());
        if (targetTitle) {
            const productCard = targetTitle.closest('article') || targetTitle.closest('section');
            gsap.to(window, { duration: 1.5, scrollTo: { y: productCard, offsetY: 120 }, ease: "power4.inOut" });
            gsap.timeline().fromTo(productCard, { scale: 1, filter: "brightness(1)" }, { scale: 1.02, filter: "brightness(1.1)", duration: 0.4, ease: "power2.out" }).to(productCard, { scale: 1, filter: "brightness(1)", duration: 0.6, ease: "power2.in" });
        }
    };

    document.querySelectorAll('.scroll-link').forEach(link => {
        link.onclick = (e) => { e.preventDefault(); const target = document.querySelector(link.getAttribute('href')); if (target) gsap.to(window, { duration: 1.5, scrollTo: target.offsetTop, ease: "power4.inOut" }); };
    });

    const logoHeader = document.querySelector('header a[href="index.html"]');
    if (logoHeader) logoHeader.onclick = (e) => { e.preventDefault(); gsap.to(window, { duration: 1.5, scrollTo: 0, ease: "power4.inOut" }); };

    /* --- GESTÃO DINÂMICA DE INVENTÁRIO (ADMIN) --- */
    const { doc, getDoc, updateDoc, setDoc, onSnapshot } = window.qbDBMethods || {};
    const db = window.qbDB;

    if (db) {
        // Observador Geral do Catálogo (Firestore -> Site)
        onSnapshot(doc(db, "settings", "catalog"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                Object.keys(data).forEach(key => {
                    // Mapeia chaves como "p1" ou "1" para o ID do produto
                    const prodId = key.startsWith('p') ? key.substring(1) : key;
                    const rawValue = data[key];
                    // Aceita tanto {price: 1200} quanto o valor direto 1200
                    const price = (typeof rawValue === 'object') ? rawValue.price : rawValue;
                    const name = (typeof rawValue === 'object') ? rawValue.name : null;

                    const cards = document.querySelectorAll(`article.product-card`);
                    cards.forEach(card => {
                        const addToCartBtn = card.querySelector(`[data-id="${prodId}"]`);
                        if(addToCartBtn) {
                            // 1. Atualiza o valor do Carrinho (Data Attributes)
                            if(price) addToCartBtn.setAttribute('data-price', price);
                            if(name) addToCartBtn.setAttribute('data-name', name);
                            
                            // 2. Atualiza o Preço Visual na Tela (Texto)
                            const priceElem = card.querySelector('.text-stone-400.font-medium, .text-stone-900.font-bold');
                            // Procura o elemento que contém o "R$"
                            const allTexts = card.querySelectorAll('p, span');
                            allTexts.forEach(txt => {
                                if(txt.innerText.includes('R$') && price) {
                                    txt.innerText = `R$ ${parseInt(price).toLocaleString('pt-BR')},00`;
                                }
                            });

                            // 3. Atualiza o Nome Visual
                            const titleElem = card.querySelector('.product-title-reveal');
                            if(titleElem && name) titleElem.innerText = name;
                            
                            // 4. Atualiza o Drawer (Se estiver aberto)
                            const drawerName = document.getElementById('drawer-p-name');
                            const currentBtnName = addToCartBtn.getAttribute('data-name');
                            if(drawerName && drawerName.innerText.trim() === currentBtnName) {
                                const drawerPrice = document.getElementById('drawer-p-price');
                                if(drawerPrice && price) {
                                    drawerPrice.innerText = `R$ ${parseInt(price).toLocaleString('pt-BR')},00`;
                                }
                            }
                        }
                    });
                });
            }
        });
    }

    // Função para você usar no console ou em um painel futuro: 
    // updateProductPrice('1', 1500)
    window.updateProductPrice = async (id, newPrice) => {
        if (!db) return;
        try {
            const catalogRef = doc(db, "settings", "catalog");
            const snapshot = await getDoc(catalogRef);
            
            if(!snapshot.exists()) {
                // Se for a primeira vez, cria a base do catálogo
                await setDoc(catalogRef, { [id]: { price: newPrice, name: "Produto Novo" } });
            } else {
                await updateDoc(catalogRef, { [`${id}.price`]: newPrice });
            }
            console.log(`Preço de ID ${id} atualizado para R$ ${newPrice}`);
        } catch (error) {
            console.error("Erro ao atualizar catálogo:", error);
        }
    };
});
