// app.js - shadcn UI Controller
document.addEventListener("DOMContentLoaded", async () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.("#09090b");
        tg.setBackgroundColor?.("#09090b");
    }

    // Refresh icons
    if (window.lucide) {
        lucide.createIcons();
    }

    let currentUser = null;
    let currentFilter = "all";
    let searchQuery = "";

    // 1. Anti-Alt сбор отпечатка
    try {
        const fpData = await getDeviceFingerprint();
        api.registerFingerprint(fpData);
    } catch (e) {
        console.warn("FP error:", e);
    }

    // 2. Инициализация профиля и статуса
    try {
        currentUser = await api.getUser();
        const role = currentUser.role || "user";
        
        let statusTitle = "Пользователь";
        let dotColor = "bg-blue-500";

        if (role === "admin" || currentUser.is_admin) {
            statusTitle = "Администратор";
            dotColor = "bg-amber-400";
        } else if (role === "author") {
            statusTitle = "Автор";
            dotColor = "bg-emerald-400";
        } else {
            statusTitle = "Пользователь";
            dotColor = "bg-emerald-500";
        }

        const userNameEl = document.getElementById("user-name");
        if (userNameEl) {
            userNameEl.textContent = statusTitle;
        }

        const dotEl = document.getElementById("user-status-dot");
        if (dotEl) {
            dotEl.className = `h-1.5 w-1.5 rounded-full ${dotColor}`;
        }

        if (role === "author" || role === "admin" || currentUser.is_admin) {
            const authorTab = document.getElementById("nav-author-tab");
            const navContainer = document.getElementById("nav-container");
            authorTab?.classList.remove("hidden");
            navContainer?.classList.remove("grid-cols-3");
            navContainer?.classList.add("grid-cols-4");
        }
    } catch (e) {
        console.error("User init failed:", e);
    }

    // 3. Табы навигации
    const navTabs = document.querySelectorAll(".nav-tab");
    const views = {
        "catalog": document.getElementById("view-catalog"),
        "purchases": document.getElementById("view-purchases"),
        "orders": document.getElementById("view-orders"),
        "author": document.getElementById("view-author")
    };

    function switchView(tabName) {
        navTabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
        Object.keys(views).forEach(k => {
            if (views[k]) {
                views[k].classList.toggle("hidden", k !== tabName);
            }
        });

        if (tabName === "catalog") loadMods();
        if (tabName === "purchases") loadPurchases();
        if (tabName === "orders") loadOrders();
        if (tabName === "author") loadAuthorCabinet();

        tg?.HapticFeedback?.selectionChanged();
        lucide.createIcons();
    }

    navTabs.forEach(tab => {
        tab.addEventListener("click", () => switchView(tab.dataset.tab));
    });

    // 4. Фильтры каталога
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => {
                b.classList.remove("active", "bg-primary", "text-primary-foreground");
                b.classList.add("border", "border-border", "bg-secondary/40", "text-muted-foreground");
            });
            btn.classList.add("active", "bg-primary", "text-primary-foreground");
            btn.classList.remove("border", "border-border", "bg-secondary/40", "text-muted-foreground");
            currentFilter = btn.dataset.filter;
            loadMods();
            tg?.HapticFeedback?.selectionChanged();
        });
    });

    // 5. Поиск
    const searchInput = document.getElementById("search-input");
    let searchTimeout;
    searchInput?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            loadMods();
        }, 250);
    });

    // 6. Загрузка каталога (shadcn card style)
    async function loadMods() {
        const container = document.getElementById("mods-grid");
        container.innerHTML = `<div class="col-span-2 text-center py-12 text-sm text-muted-foreground">Загрузка каталога...</div>`;

        try {
            const data = await api.getMods(currentFilter, searchQuery);
            const mods = data.mods || [];

            if (mods.length === 0) {
                container.innerHTML = `
                    <div class="col-span-2 text-center py-12 space-y-2">
                        <i data-lucide="package-search" class="mx-auto h-8 w-8 text-muted-foreground"></i>
                        <div class="text-sm font-medium text-foreground">Ничего не найдено</div>
                        <div class="text-xs text-muted-foreground">Попробуйте изменить поисковый запрос</div>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            container.innerHTML = mods.map((m, idx) => {
                const isFree = m.is_free === 1;
                const priceHtml = isFree
                    ? `<span class="text-xs font-semibold text-emerald-400">Бесплатно</span>`
                    : (m.discount > 0 && m.original_price > m.price
                        ? `<div class="flex items-center gap-1.5"><span class="text-sm font-bold text-foreground">${m.price.toFixed(2)} $</span><span class="text-[11px] text-muted-foreground line-through">${m.original_price.toFixed(2)} $</span></div>`
                        : `<span class="text-sm font-bold text-foreground">${m.price.toFixed(2)} $</span>`);

                const discountBadge = m.discount > 0
                    ? `<div class="absolute top-2 right-2 rounded-md bg-rose-500/90 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">-${m.discount}%</div>`
                    : "";

                const animDelay = (idx * 0.05).toFixed(2);

                return `
                    <div class="mod-card-item group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-border/80 transition-all cursor-pointer animate-fade-in-up" style="animation-delay: ${animDelay}s" onclick="openModModal(${m.id})">
                        <div class="relative aspect-[16/10] w-full bg-secondary/60 overflow-hidden">
                            <img src="${m.photo_url}" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80'">
                            ${discountBadge}
                        </div>
                        <div class="flex flex-1 flex-col p-3 justify-between space-y-2">
                            <div>
                                <h3 class="font-semibold text-xs leading-snug line-clamp-2 text-foreground">${m.title}</h3>
                            </div>
                            <div class="flex items-center justify-between pt-1 border-t border-border/40">
                                ${priceHtml}
                                <div class="rounded-md bg-secondary p-1 text-muted-foreground group-hover:text-foreground transition-colors">
                                    <i data-lucide="arrow-right" class="h-3.5 w-3.5"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
            lucide.createIcons();
        } catch (e) {
            container.innerHTML = `<div class="col-span-2 text-center text-xs text-rose-400 py-8">Ошибка загрузки каталога</div>`;
        }
    }

    // 7. Модальное окно деталей (shadcn Sheet/Dialog)
    window.openModModal = async function(modId) {
        const modal = document.getElementById("mod-modal");
        const sheet = document.getElementById("modal-sheet-box");
        const body = document.getElementById("modal-body");

        document.body.classList.add("modal-open");
        modal.classList.remove("closing");
        modal.style.display = "flex";
        
        // Сброс положения перед анимацией вылета снизу
        if (sheet) {
            sheet.style.transform = "translateY(105%)";
            sheet.style.transition = "none";
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add("active");
                if (sheet) {
                    sheet.style.transform = "";
                    sheet.style.transition = "";
                }
            });
        });

        body.innerHTML = `<div class="text-center py-8 text-xs text-muted-foreground">Загрузка информации...</div>`;

        try {
            const m = await api.getMod(modId);
            const isFree = m.is_free === 1;

            body.innerHTML = `
                <div class="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-secondary modal-anim-item modal-anim-delay-1">
                    <img src="${m.photo_url}" class="h-full w-full object-cover modal-image-reveal">
                </div>
                <div class="modal-anim-item modal-anim-delay-2">
                    <h2 class="text-base font-bold text-foreground">${m.title}</h2>
                    <p class="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">${m.description || "Описание отсутствует."}</p>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3 modal-anim-item modal-anim-delay-3">
                    <span class="text-xs text-muted-foreground">Стоимость:</span>
                    <span class="text-base font-bold text-foreground">${isFree ? "Бесплатно" : m.price.toFixed(2) + " $"}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2 modal-anim-item modal-anim-delay-4">
                    <button onclick="closeModal()" class="w-full rounded-md border border-border bg-background py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">Закрыть</button>
                    <button onclick="${isFree ? `downloadMod(${m.id})` : `buyMod(${m.id})`}" class="w-full rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5">
                        <i data-lucide="${isFree ? 'download' : 'shopping-cart'}" class="h-3.5 w-3.5"></i>
                        ${isFree ? 'Скачать в чат' : 'Купить мод'}
                    </button>
                </div>
            `;
            lucide.createIcons();
            tg?.HapticFeedback?.impactOccurred("light");
        } catch (e) {
            body.innerHTML = `<div class="text-xs text-rose-400">Ошибка получения данных мода.</div>`;
        }
    };

    window.closeModal = function() {
        const modal = document.getElementById("mod-modal");
        const sheet = document.getElementById("modal-sheet-box");
        document.body.classList.remove("modal-open");
        
        if (modal) {
            modal.classList.add("closing");
            modal.classList.remove("active");
        }
        if (sheet) {
            sheet.style.transform = "translateY(105%)";
            sheet.style.transition = "transform 0.32s cubic-bezier(0.32, 0, 0.67, 0)";
        }
        
        setTimeout(() => {
            if (modal) {
                modal.classList.remove("closing");
                modal.style.display = "none";
            }
            if (sheet) {
                sheet.style.transform = "";
                sheet.style.transition = "";
            }
        }, 300);
    };

    // Жест смахивания вниз (Unified Touch & Mouse Swipe-to-dismiss)
    const modalSheet = document.getElementById("modal-sheet-box");
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    function handleDragStart(clientY) {
        if (modalSheet.scrollTop <= 0) {
            startY = clientY;
            currentY = clientY;
            isDragging = true;
            modalSheet.style.transition = "none";
        }
    }

    function handleDragMove(clientY) {
        if (!isDragging) return;
        currentY = clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            modalSheet.style.transform = `translateY(${deltaY}px)`;
            const opacity = Math.max(0.3, 1 - deltaY / 400);
            modalSheet.style.opacity = opacity;
        }
    }

    function handleDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        const deltaY = currentY - startY;

        if (deltaY > 80) {
            // Уверенно смахнули вниз — закрываем со спуском
            tg?.HapticFeedback?.impactOccurred("medium");
            closeModal();
        } else {
            // Возвращаем наверх
            modalSheet.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease";
            modalSheet.style.transform = "translateY(0)";
            modalSheet.style.opacity = "1";
        }
        startY = 0;
        currentY = 0;
    }

    // Touch события для мобилок / Telegram
    modalSheet?.addEventListener("touchstart", (e) => handleDragStart(e.touches[0].clientY), { passive: true });
    modalSheet?.addEventListener("touchmove", (e) => handleDragMove(e.touches[0].clientY), { passive: true });
    modalSheet?.addEventListener("touchend", handleDragEnd);

    // Mouse события для браузера на ПК
    modalSheet?.addEventListener("mousedown", (e) => {
        // Разрешаем перетаскивание при клике на верхнюю часть карточки или планку
        if (e.target.closest("button") || e.target.closest("input")) return;
        handleDragStart(e.clientY);
    });
    window.addEventListener("mousemove", (e) => {
        if (isDragging) handleDragMove(e.clientY);
    });
    window.addEventListener("mouseup", () => {
        if (isDragging) handleDragEnd();
    });

    window.downloadMod = function(modId) {
        tg?.HapticFeedback?.impactOccurred("medium");
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify({ action: "download_mod", mod_id: modId }));
            tg.close();
            return;
        }
        tg?.showAlert("Для скачивания перейдите в чат бота.");
        closeModal();
    };

    window.buyMod = function(modId) {
        tg?.HapticFeedback?.impactOccurred("heavy");
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify({ action: "buy_mod", mod_id: modId }));
            tg.close();
            return;
        }
        tg?.showAlert("Оформление покупки открыто в основном чате бота.");
        closeModal();
    };

    // 8. Загрузка покупок
    async function loadPurchases() {
        const container = document.getElementById("purchases-list");
        container.innerHTML = `
            <div class="text-center py-12 space-y-2">
                <i data-lucide="package-open" class="mx-auto h-8 w-8 text-muted-foreground"></i>
                <div class="text-sm font-medium text-foreground">Здесь будут ваши покупки</div>
                <div class="text-xs text-muted-foreground">Все оплаченные модификации доступны для скачивания 24/7</div>
            </div>
        `;
        lucide.createIcons();
    }

    // 9. Заказы (Офферы)
    async function loadOrders() {
        const container = document.getElementById("orders-list");
        container.innerHTML = `
            <div class="rounded-xl border border-border bg-card p-6 text-center space-y-3">
                <i data-lucide="shield-check" class="mx-auto h-8 w-8 text-emerald-400"></i>
                <div>
                    <h3 class="text-sm font-semibold">Безопасные сделки (Escrow)</h3>
                    <p class="text-xs text-muted-foreground mt-1">Оплата замораживается гарантом бота до полной проверки работы.</p>
                </div>
                <button onclick="switchView('catalog')" class="rounded-md border border-border bg-secondary/50 px-4 py-2 text-xs font-medium hover:bg-secondary">Перейти в каталог</button>
            </div>
        `;
        lucide.createIcons();
    }

    // 10. Кабинет автора
    async function loadAuthorCabinet() {
        document.getElementById("author-balance").textContent = "0.00";
        const container = document.getElementById("author-orders-list");
        container.innerHTML = `<div class="text-xs text-muted-foreground py-4 text-center">Нет активных заказов на выполнение.</div>`;
    }

    // Первичный запуск
    loadMods();
});
