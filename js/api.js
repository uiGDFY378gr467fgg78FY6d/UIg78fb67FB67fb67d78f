// api.js - Гибридный API-клиент с мгновенной синхронизацией данных от бота
const api = {
    _getSyncedData() {
        try {
            // 1. Проверяем URL hash / search параметры
            const urlParams = new URLSearchParams(window.location.search);
            const rawData = urlParams.get("data") || (window.location.hash.startsWith("#data=") ? window.location.hash.substring(6) : null);
            if (rawData) {
                const decoded = JSON.parse(decodeURIComponent(escape(atob(rawData))));
                if (decoded && decoded.catalog) {
                    window.CARMONE_CATALOG = decoded.catalog;
                }
                if (decoded && decoded.user) {
                    window.CARMONE_USER_STATE = decoded.user;
                }
                return decoded;
            }
        } catch (e) {
            console.warn("Sync parse error:", e);
        }
        return null;
    },

    async getUser() {
        this._getSyncedData();
        const tg = window.Telegram?.WebApp;
        if (window.CARMONE_USER_STATE) {
            return window.CARMONE_USER_STATE;
        }
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const u = tg.initDataUnsafe.user;
            return {
                user_id: u.id,
                username: u.username,
                first_name: u.first_name || "Пользователь",
                role: "user",
                balance: 0.00
            };
        }
        return {
            user_id: 12345678,
            username: "user",
            first_name: "Пользователь",
            role: "user",
            balance: 0.00
        };
    },

    async getMods(filter = "all", query = "") {
        this._getSyncedData();
        let list = window.CARMONE_CATALOG || [];
        if (filter === "free") list = list.filter(m => m.is_free === 1);
        if (filter === "paid") list = list.filter(m => m.is_free === 0);
        if (query) {
            const q = query.toLowerCase();
            list = list.filter(m => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
        }
        return { mods: list };
    },

    async getMod(modId) {
        const list = window.CARMONE_CATALOG || [];
        const m = list.find(x => x.id === parseInt(modId));
        return m || { title: "Мод", price: 0, is_free: 1 };
    },

    async getPurchases() {
        const saved = localStorage.getItem("_carmone_purchases");
        const list = saved ? JSON.parse(saved) : [];
        return { purchases: list };
    },

    async registerFingerprint(fpData) {
        return { success: true };
    }
};

window.api = api;
