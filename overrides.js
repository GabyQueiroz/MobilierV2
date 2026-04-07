(function () {
    const originalAddToBudget = typeof addToBudget === 'function' ? addToBudget : null;
    const originalHandleLogin = typeof handleLogin === 'function' ? handleLogin : null;
    const originalSaveRegistrationForm = typeof saveRegistrationForm === 'function' ? saveRegistrationForm : null;
    const originalOpenRegistrationModal = typeof openRegistrationModal === 'function' ? openRegistrationModal : null;
    const originalLogout = typeof logout === 'function' ? logout : null;
    let isSavingBudgetNow = false;
    let appDataSyncTimer = null;
    let protectLocalStateUntil = 0;
    let activeOrderCancelDraftId = null;
    const adminProductFilters = {
        name: '',
        category: '',
        quantity: ''
    };

    function setPendingBudgetIntent(intent) {
        const normalized = intent && intent.productId ? {
            productId: Number(intent.productId),
            quantity: Math.max(1, Number(intent.quantity || 1))
        } : null;

        window.pendingBudgetIntent = normalized;
        if (normalized) {
            sessionStorage.setItem('pendingBudgetIntent', JSON.stringify(normalized));
        } else {
            sessionStorage.removeItem('pendingBudgetIntent');
        }
    }

    function getPendingBudgetIntent() {
        if (window.pendingBudgetIntent?.productId) return window.pendingBudgetIntent;
        try {
            const saved = JSON.parse(sessionStorage.getItem('pendingBudgetIntent') || 'null');
            if (saved?.productId) {
                window.pendingBudgetIntent = saved;
                return saved;
            }
        } catch (error) {
            console.error('Erro ao ler item pendente:', error);
        }
        return null;
    }

    function setPendingAISuggestionIntents(intents) {
        const normalized = Array.isArray(intents)
            ? intents
                .map(intent => ({
                    productId: Number(intent?.productId || 0),
                    quantity: Math.max(1, Number(intent?.quantity || 1))
                }))
                .filter(intent => intent.productId)
            : [];

        window.pendingAISuggestionIntents = normalized;
        if (normalized.length) {
            sessionStorage.setItem('pendingAISuggestionIntents', JSON.stringify(normalized));
        } else {
            sessionStorage.removeItem('pendingAISuggestionIntents');
        }
    }

    function getPendingAISuggestionIntents() {
        if (Array.isArray(window.pendingAISuggestionIntents) && window.pendingAISuggestionIntents.length) {
            return window.pendingAISuggestionIntents;
        }
        try {
            const saved = JSON.parse(sessionStorage.getItem('pendingAISuggestionIntents') || '[]');
            if (Array.isArray(saved) && saved.length) {
                window.pendingAISuggestionIntents = saved;
                return saved;
            }
        } catch (error) {
            console.error('Erro ao ler sugestoes pendentes da IA:', error);
        }
        return [];
    }

    function getPasswordValidationMessage(password) {
        const value = String(password || '').trim();
        const normalized = value.toLowerCase();
        const forbidden = new Set([
            '123456',
            '12345678',
            '123456789',
            'senha123',
            'senha1234',
            'qwerty123',
            'password',
            'admin123',
            'abcdef',
            'abc12345'
        ]);

        if (value.length < 8) return 'Use pelo menos 8 caracteres.';
        if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) return 'Use pelo menos uma letra e um numero.';
        if (forbidden.has(normalized)) return 'Escolha uma senha menos previsivel.';
        if (/^(\d)\1+$/.test(value)) return 'Nao use apenas numeros repetidos.';
        if (/0123|1234|2345|3456|4567|5678|6789/.test(value)) return 'Nao use sequencias numericas simples.';
        return '';
    }

    function performAddToBudget(productId, requestedQuantity = 1) {
        const product = products.find(item => item.id === productId);
        if (!product) return false;

        if (product.stock === 0) {
            showMessage('Este produto esta esgotado.', 'error');
            return false;
        }

        const quantityToAdd = Math.max(1, parseInt(requestedQuantity || '1', 10));
        let cartItem = cart.find(item => item.id === productId);

        if (!cartItem) {
            cartItem = {
                id: productId,
                name: product.name,
                price: product.price,
                quantity: 0,
                bulkDiscount: product.bulkDiscount
            };
            cart.push(cartItem);
        }

        if (cartItem.quantity + quantityToAdd > product.stock) {
            showMessage(`Estoque insuficiente. Maximo: ${product.stock} unidades.`, 'error');
            return false;
        }

        cartItem.quantity += quantityToAdd;
        if (typeof updateCartDisplay === 'function') updateCartDisplay();
        if (typeof updateBudgetSummary === 'function') updateBudgetSummary();
        if (typeof renderBudgetItems === 'function') renderBudgetItems();
        if (typeof renderProducts === 'function') renderProducts();
        showMessage(`${quantityToAdd} unidade(s) de ${product.name} adicionadas ao orcamento.`, 'success');
        return true;
    }

    function getCartQuantityForProduct(productId) {
        return cart.find(item => Number(item.id) === Number(productId))?.quantity || 0;
    }

    function getAvailableProductStock(productId) {
        const product = products.find(item => Number(item.id) === Number(productId));
        if (!product) return 0;
        return Math.max(0, Number(product.stock || 0) - getCartQuantityForProduct(productId));
    }

    function applyPendingBudgetIntent() {
        const pending = getPendingBudgetIntent();
        if (!pending) return false;
        setPendingBudgetIntent(null);
        const added = performAddToBudget(pending.productId, pending.quantity);
        if (added) {
            unlockBudgetSection(true);
        }
        return added;
    }

    function buildAISuggestionIntents(suggestions = []) {
        const productNameToId = {
            'Cadeira de Madeira Macica': 1,
            'Mesa Redonda 1,5m': 2,
            'Puff de Couro Sintetico': 3,
            'Biombo Decorativo': 4,
            'Cadeira Dobravel Plastico': 5,
            'Mesa Retangular 2m': 6,
            'Sofa de Canto': 7,
            'Barril de Cerveja Decorativo': 8
        };

        const normalizeText = value => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        const primarySuggestion = Array.isArray(suggestions) ? suggestions[0] : null;
        if (!primarySuggestion?.items?.length) return [];

        return primarySuggestion.items.map(itemText => {
            const productName = normalizeText(String(itemText || '').split(':')[0]);
            const productId = productNameToId[productName];
            if (!productId) return null;

            const product = products.find(item => Number(item.id) === Number(productId));
            if (!product || Number(product.stock || 0) <= 0) return null;

            let quantity = 1;
            const match = String(itemText || '').match(/\d+/g);
            if (match?.length) quantity = parseInt(match[0], 10) || 1;

            if (primarySuggestion.totalGuests) {
                if (productName.includes('Cadeira')) {
                    quantity = Math.ceil(Number(primarySuggestion.totalGuests) * 1.1);
                } else if (productName.includes('Mesa')) {
                    const guestsPerTable = productName.includes('Redonda') ? 8 : 10;
                    quantity = Math.ceil(Number(primarySuggestion.totalGuests) / guestsPerTable);
                }
            }

            return {
                productId,
                quantity: Math.min(Math.max(1, quantity), Number(product.stock || 0))
            };
        }).filter(Boolean);
    }

    function applyAISuggestionIntents(intents = []) {
        let addedItems = 0;
        intents.forEach(intent => {
            const added = performAddToBudget(Number(intent.productId), Number(intent.quantity || 1));
            if (added) addedItems += 1;
        });
        return addedItems;
    }

    function applyPendingAISuggestions() {
        const intents = getPendingAISuggestionIntents();
        if (!intents.length) return false;
        setPendingAISuggestionIntents([]);
        const addedItems = applyAISuggestionIntents(intents);
        if (addedItems > 0) {
            unlockBudgetSection(false);
            showMessage('Sugestoes da IA adicionadas ao seu orcamento.', 'success');
            return true;
        }
        return false;
    }

    async function ensureJsPdfReady() {
        if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
        if (window.__mobilierJsPdfPromise) return window.__mobilierJsPdfPromise;

        window.__mobilierJsPdfPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
            script.onload = () => resolve(window.jspdf?.jsPDF || null);
            script.onerror = () => reject(new Error('Nao foi possivel carregar a biblioteca de PDF.'));
            document.head.appendChild(script);
        });

        const jsPDF = await window.__mobilierJsPdfPromise;
        if (!jsPDF) throw new Error('Biblioteca de PDF indisponivel.');
        return jsPDF;
    }

    function getBudgetFreightValue(budget) {
        const itemsTotal = (budget.items || []).reduce((sum, item) => {
            const itemTotal = Number(item.total || (Number(item.price || 0) * Number(item.quantity || 0)));
            return sum + itemTotal;
        }, 0);
        return Math.max(0, Number(budget.total || 0) - itemsTotal);
    }

    function getContractEventTitle(budget) {
        return budget.eventDetails?.eventName
            || budget.eventDetails?.type
            || 'Evento personalizado';
    }

    function addContractSection(doc, title, startY, pageWidth, colors) {
        doc.setFillColor(...colors.accentSoft);
        doc.roundedRect(18, startY, pageWidth - 36, 10, 3, 3, 'F');
        doc.setTextColor(...colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(title.toUpperCase(), 24, startY + 6.8);
        return startY + 16;
    }

    function getServerBaseUrl() {
        if (window.MOBILIER_API_URL) return String(window.MOBILIER_API_URL).replace(/\/$/, '');
        if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) return window.location.origin;
        return 'http://localhost:3001';
    }

    function composeDeliveryAddress() {
        const street = document.getElementById('deliveryStreet')?.value.trim() || '';
        const number = document.getElementById('deliveryNumber')?.value.trim() || '';
        const complement = document.getElementById('deliveryComplement')?.value.trim() || '';
        const neighborhood = document.getElementById('deliveryNeighborhood')?.value.trim() || '';
        const city = document.getElementById('deliveryCity')?.value.trim() || '';
        const state = document.getElementById('deliveryState')?.value.trim() || '';
        return [street, number, complement, neighborhood, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
    }

    function parseScheduleTimestamp(date, time) {
        if (!date || !time) return null;
        const stamp = new Date(`${date}T${time}:00`);
        return Number.isNaN(stamp.getTime()) ? null : stamp;
    }

    function getBudgetLogisticsConflict({ budgetId = 0, eventDetails = {} } = {}) {
        const date = String(eventDetails.deliveryDate || '').trim();
        const time = String(eventDetails.deliveryTime || '').trim();
        if (!date || !time) return null;

        const targetStamp = parseScheduleTimestamp(date, time);
        if (!targetStamp) return null;

        const entries = normalizeLogisticsEntries(false).filter(entry => {
            if (Number(entry.budgetId || 0) === Number(budgetId || 0)) return false;
            if (String(entry.status || '').toLowerCase() === 'cancelado') return false;
            if (String(entry.date || '') !== date) return false;
            const entryStamp = parseScheduleTimestamp(entry.date, entry.time || '00:00');
            if (!entryStamp) return false;
        return Math.abs(entryStamp.getTime() - targetStamp.getTime()) <= 60 * 60 * 1000;
        });

        return entries[0] || null;
    }

    function findSuggestedScheduleSlot(preferredDate, preferredTime, excludeBudgetId = 0) {
        const baseTime = preferredTime || '09:00';
        let probe = parseScheduleTimestamp(preferredDate, baseTime) || parseScheduleTimestamp(preferredDate, '09:00');
        if (!probe) return { date: preferredDate || '', time: baseTime };

        for (let step = 0; step < 48; step += 1) {
            const probeDate = probe.toISOString().slice(0, 10);
            const probeTime = probe.toTimeString().slice(0, 5);
            const conflict = getBudgetLogisticsConflict({
                budgetId: excludeBudgetId,
                eventDetails: { deliveryDate: probeDate, deliveryTime: probeTime }
            });
            if (!conflict) {
                return { date: probeDate, time: probeTime };
            }
            probe = new Date(probe.getTime() + 60 * 60 * 1000);
        }

        return {
            date: preferredDate || '',
            time: baseTime
        };
    }

    function buildConflictMessage(conflict, suggestion) {
        const eventLabel = conflict?.eventName || 'outra programacao';
        const slot = conflict?.time ? `${formatDateBR(conflict.date)} as ${conflict.time}` : formatDateBR(conflict.date);
        const suggestedLabel = suggestion?.date && suggestion?.time ? ` Sugestao: ${formatDateBR(suggestion.date)} as ${suggestion.time}.` : '';
        return `Ja existe uma programacao muito proxima para ${eventLabel} em ${slot}.${suggestedLabel}`;
    }

    function setSaveBudgetButtonState(isLoading) {
        const button = document.getElementById('saveBudget');
        if (!button) return;
        button.disabled = isLoading;
        button.classList.toggle('is-loading', isLoading);
        button.innerHTML = isLoading
            ? '<i class="fas fa-spinner fa-spin"></i> Salvando...'
            : '<i class="fas fa-save"></i> Salvar OrÃ§amento';
    }

    function getBudgetFingerprint(payload) {
        return JSON.stringify({
            userId: payload.userId || 0,
            cep: payload.cep || '',
            total: Number(payload.total || 0),
            eventName: payload.eventDetails?.eventName || '',
            eventDate: payload.eventDetails?.date || '',
            deliveryDate: payload.eventDetails?.deliveryDate || '',
            items: (payload.items || []).map(item => ({
                id: Number(item.id || 0),
                quantity: Number(item.quantity || 0),
                price: Number(item.price || 0)
            }))
        });
    }

    function normalizeLogisticsEntries(shouldPersist = false) {
        const latestByKey = new Map();

        logisticsEntries.forEach(entry => {
            const normalizedBudgetId = Number(entry.budgetId || 0);
            const compositeKey = normalizedBudgetId > 0
                ? `budget:${normalizedBudgetId}`
                : [
                    String(entry.eventName || '').trim().toLowerCase(),
                    String(entry.date || '').trim(),
                    String(entry.time || '').trim(),
                    String(entry.location || '').trim().toLowerCase(),
                    String(entry.contactPhone || entry.receiverPhone || '').trim()
                ].join('|');

            if (!compositeKey.replace(/\|/g, '').trim()) return;

            const previous = latestByKey.get(compositeKey);
            const previousStamp = new Date(previous?.updatedAt || previous?.createdAt || 0).getTime();
            const currentStamp = new Date(entry.updatedAt || entry.createdAt || 0).getTime();
            if (!previous || currentStamp >= previousStamp) {
                latestByKey.set(compositeKey, entry);
            }
        });

        const normalized = Array.from(latestByKey.values()).sort((a, b) => {
            const left = `${a.date || ''} ${a.time || ''} ${a.eventName || ''}`;
            const right = `${b.date || ''} ${b.time || ''} ${b.eventName || ''}`;
            return left.localeCompare(right);
        });

        const changed = normalized.length !== logisticsEntries.length ||
            normalized.some((entry, index) => logisticsEntries[index]?.id !== entry.id);

        if (changed) {
            logisticsEntries = normalized;
            if (shouldPersist) saveToLocalStorage();
        }

        return logisticsEntries;
    }

    function getSelectedLogisticsDate() {
        if (window.logisticsSelectedDate) return window.logisticsSelectedDate;
        const normalized = normalizeLogisticsEntries(false);
        const currentMonthPrefix = `${logisticsViewDate.getFullYear()}-${String(logisticsViewDate.getMonth() + 1).padStart(2, '0')}`;
        const firstCurrentMonthEntry = normalized.find(entry => String(entry.date || '').startsWith(currentMonthPrefix));
        return firstCurrentMonthEntry?.date || '';
    }

    function resetFreightFields() {
        window.currentFreightResult = null;
        freightValue = 0;
        ['cep', 'deliveryStreet', 'deliveryNumber', 'deliveryComplement', 'deliveryNeighborhood', 'deliveryCity', 'deliveryState'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
        const cepMessage = document.getElementById('cepMessage');
        if (cepMessage) {
            cepMessage.className = '';
            cepMessage.innerHTML = '';
        }
    }

    function getCurrentCustomerBudgets() {
        if (!currentUser || currentUser.isAdmin) return [];
        const currentEmail = String(currentUser.email || '').trim().toLowerCase();
        const currentPhone = String(currentUser.phone || '').trim();
        return savedBudgets
            .filter(budget => {
                const budgetEmail = String(budget.userEmail || '').trim().toLowerCase();
                const budgetPhone = String(budget.userPhone || '').trim();
                return budget.userId === currentUser.id || (!!currentEmail && budgetEmail === currentEmail) || (!!currentPhone && budgetPhone === currentPhone);
            })
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    }

    function getFilteredAdminProducts() {
        const name = String(adminProductFilters.name || '').trim().toLowerCase();
        const category = String(adminProductFilters.category || '').trim();
        const quantity = String(adminProductFilters.quantity || '').trim();

        return products.filter(product => {
            const matchesName = !name || String(product.name || '').toLowerCase().includes(name);
            const matchesCategory = !category || String(product.category || '') === category;
            const stock = Number(product.stock || 0);
            const matchesQuantity = !quantity
                || (quantity === 'available' && stock >= 20)
                || (quantity === 'low' && stock > 0 && stock < 20)
                || (quantity === 'out' && stock === 0);

            return matchesName && matchesCategory && matchesQuantity;
        });
    }

    function filterAdminProductsTableInPlace() {
        const name = String(document.getElementById('stockFilterName')?.value || '').trim().toLowerCase();
        const category = String(document.getElementById('stockFilterCategory')?.value || '').trim();
        const quantity = String(document.getElementById('stockFilterQuantity')?.value || '').trim();
        const rows = document.querySelectorAll('#adminProductsContainer .table-row');

        rows.forEach(row => {
            const rowName = String(row.getAttribute('data-product-name') || '').toLowerCase();
            const rowCategory = String(row.getAttribute('data-product-category') || '');
            const rowStock = Number(row.getAttribute('data-product-stock') || 0);
            const matchesName = !name || rowName.includes(name);
            const matchesCategory = !category || rowCategory === category;
            const matchesQuantity = !quantity
                || (quantity === 'available' && rowStock >= 20)
                || (quantity === 'low' && rowStock > 0 && rowStock < 20)
                || (quantity === 'out' && rowStock === 0);

            row.style.display = matchesName && matchesCategory && matchesQuantity ? '' : 'none';
        });
    }

    function applyAdminProductFilters() {
        const container = document.getElementById('adminProductsContainer');
        if (!container) return;
        container.innerHTML = renderAdminProductsTable(getFilteredAdminProducts());
        filterAdminProductsTableInPlace();
    }

    function forceCloseLoginModal() {
        const loginModal = document.getElementById('loginModal');
        if (!loginModal) return;
        loginModal.style.display = 'none';
        loginModal.classList.remove('active', 'show');
        loginModal.setAttribute('aria-hidden', 'true');
        const loginMessage = document.getElementById('loginMessage');
        if (loginMessage) loginMessage.textContent = '';
    }

    async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function postJson(path, payload, timeoutMs = 15000) {
        const response = await fetchWithTimeout(`${getServerBaseUrl()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, timeoutMs);
        return response.ok;
    }

    async function postJsonWithResponse(path, payload, timeoutMs = 15000) {
        const response = await fetchWithTimeout(`${getServerBaseUrl()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, timeoutMs);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.message || `Falha ao salvar em ${path}.`);
        }
        return data;
    }

    function buildAppSnapshot() {
        if (typeof normalizeAppData === 'function') normalizeAppData();
        return {
            updatedAt: new Date().toISOString(),
            products,
            users,
            savedBudgets,
            companyData,
            stockMovements,
            financialEntries,
            accessHistory,
            leadContacts,
            logisticsEntries
        };
    }

    async function persistDataToServer() {
        if (!window.location?.protocol?.startsWith('http')) return false;
        try {
            const response = await fetch(`${getServerBaseUrl()}/api/app-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify(buildAppSnapshot())
            });
            if (!response.ok) {
                throw new Error(`Falha ao salvar no servidor (${response.status}).`);
            }
            return true;
        } catch (error) {
            console.warn('Nao foi possivel sincronizar com o servidor:', error);
            throw error;
        }
    }

    function queueServerSync() {
        clearTimeout(appDataSyncTimer);
        appDataSyncTimer = setTimeout(() => {
            persistDataToServer();
        }, 350);
    }

    function applyAppSnapshot(snapshot = {}) {
        if (snapshot.products) products = snapshot.products;
        if (snapshot.users) users = snapshot.users;
        if (snapshot.savedBudgets) savedBudgets = snapshot.savedBudgets;
        if (snapshot.companyData) Object.assign(companyData, snapshot.companyData);
        if (snapshot.stockMovements) stockMovements = snapshot.stockMovements;
        if (snapshot.financialEntries) financialEntries = snapshot.financialEntries;
        accessHistory = Array.isArray(snapshot.accessHistory) ? snapshot.accessHistory : accessHistory;
        leadContacts = Array.isArray(snapshot.leadContacts) ? snapshot.leadContacts : leadContacts;
        logisticsEntries = Array.isArray(snapshot.logisticsEntries) ? snapshot.logisticsEntries : logisticsEntries;
        if (typeof normalizeAppData === 'function') normalizeAppData();
    }

    function getLocalSnapshot() {
        try {
            const primarySnapshot = JSON.parse(
                localStorage.getItem('mobilierShadowData')
                || localStorage.getItem('mobilierData')
                || 'null'
            );
            const criticalSnapshot = JSON.parse(localStorage.getItem('mobilierCriticalShadowData') || 'null');
            const primaryTime = new Date(primarySnapshot?.updatedAt || 0).getTime();
            const criticalTime = new Date(criticalSnapshot?.updatedAt || 0).getTime();
            return criticalTime > primaryTime ? criticalSnapshot : primarySnapshot;
        } catch (error) {
            console.warn('Nao foi possivel ler o snapshot local:', error);
            return null;
        }
    }

    async function reconcileAppPersistence() {
        if (!window.location?.protocol?.startsWith('http')) return;

        const localSnapshot = getLocalSnapshot();
        let remoteSnapshot = null;

        try {
            const response = await fetch(`${getServerBaseUrl()}/api/app-data`, {
                headers: { Accept: 'application/json' }
            });
            if (response.ok) {
                const payload = await response.json().catch(() => ({}));
                remoteSnapshot = payload?.data || null;
            }
        } catch (error) {
            console.warn('Nao foi possivel carregar o snapshot remoto:', error);
        }

        const localTime = new Date(localSnapshot?.updatedAt || 0).getTime();
        const remoteTime = new Date(remoteSnapshot?.updatedAt || 0).getTime();
        const now = Date.now();

        if (localSnapshot && protectLocalStateUntil > now) {
            applyAppSnapshot(localSnapshot);
            renderProducts();
            renderBudgetItems();
            updateBudgetSummary();
            if (document.getElementById('adminPanel')) refreshAdminViews();
            return;
        }

        if (localSnapshot && localTime >= remoteTime) {
            applyAppSnapshot(localSnapshot);
            try {
                localStorage.setItem('mobilierData', JSON.stringify(localSnapshot));
                localStorage.setItem('mobilierShadowData', JSON.stringify(localSnapshot));
                localStorage.setItem('mobilierCriticalShadowData', JSON.stringify(localSnapshot));
            } catch (error) {
                console.warn('Nao foi possivel restaurar o snapshot local:', error);
            }
            renderProducts();
            renderBudgetItems();
            updateBudgetSummary();
            if (document.getElementById('adminPanel')) refreshAdminViews();
            await persistDataToServer();
            return;
        }

        if (remoteSnapshot) {
            applyAppSnapshot(remoteSnapshot);
            try {
                const normalizedRemoteSnapshot = {
                    ...remoteSnapshot,
                    updatedAt: remoteSnapshot.updatedAt || new Date().toISOString()
                };
                localStorage.setItem('mobilierData', JSON.stringify(normalizedRemoteSnapshot));
                localStorage.setItem('mobilierShadowData', JSON.stringify(normalizedRemoteSnapshot));
                localStorage.setItem('mobilierCriticalShadowData', JSON.stringify(normalizedRemoteSnapshot));
            } catch (error) {
                console.warn('Nao foi possivel salvar o snapshot remoto localmente:', error);
            }
            renderProducts();
            renderBudgetItems();
            updateBudgetSummary();
            if (document.getElementById('adminPanel')) refreshAdminViews();
        }
    }

    saveToLocalStorage = function () {
        try {
            const snapshot = buildAppSnapshot();
            protectLocalStateUntil = Date.now() + 15000;
            localStorage.setItem('mobilierData', JSON.stringify(snapshot));
            localStorage.setItem('mobilierShadowData', JSON.stringify(snapshot));
            localStorage.setItem('mobilierCriticalShadowData', JSON.stringify(snapshot));
            queueServerSync();
        } catch (error) {
            console.error('Erro ao salvar dados localmente:', error);
        }
    };
    window.__mobilierFinalSaveToLocalStorage = saveToLocalStorage;

    updateBudgetSummary = function () {
        const subtotalElement = document.getElementById('subtotal');
        const freightElement = document.getElementById('freight');
        const totalElement = document.getElementById('total');
        if (!subtotalElement || !freightElement || !totalElement) return;

        const canShowSummaryValues = Boolean(currentUser || hasUnlockedPrices());
        if (!canShowSummaryValues) {
            subtotalElement.textContent = 'Liberar valores';
            freightElement.textContent = 'Preencha seus dados';
            totalElement.textContent = 'Nome, email e telefone';
            return;
        }

        let subtotal = 0;
        cart.forEach(item => {
            let itemPrice = item.price;
            if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) itemPrice = item.bulkDiscount.price;
            subtotal += itemPrice * item.quantity;
        });

        const total = subtotal + freightValue;
        subtotalElement.textContent = formatCurrencyBRL(subtotal);
        freightElement.textContent = formatCurrencyBRL(freightValue);
        totalElement.textContent = formatCurrencyBRL(total);
    };

    window.renderProducts = renderProducts = function () {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        const canShowPrices = Boolean(currentUser || hasUnlockedPrices());
        productsGrid.innerHTML = '';

        products.forEach(product => {
            const reserved = getCartQuantityForProduct(product.id);
            const available = getAvailableProductStock(product.id);
            const stockClass = available === 0 ? 'out' : available < 20 ? 'low' : 'available';
            const stockIcon = stockClass === 'available' ? 'check' : stockClass === 'low' ? 'exclamation' : 'times';
            const stockText = available === 0
                ? `Sem saldo disponivel no momento${reserved ? ` â€¢ ${reserved} reservado(s) no orcamento` : ''}`
                : available < 20
                    ? `${available} unidade(s) disponiveis${reserved ? ` â€¢ ${reserved} no carrinho` : ' â€¢ estoque baixo'}`
                    : `${available} unidade(s) disponiveis${reserved ? ` â€¢ ${reserved} no carrinho` : ''}`;

            const maxSelectable = Math.max(1, available || 1);
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-image">
                    ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="hero-product-image">` : `<i class="${product.image || 'fas fa-box'}"></i>`}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description || 'Item disponivel para compor o evento.'}</p>
                    <p class="product-price ${canShowPrices ? '' : 'price-locked'}">
                        ${canShowPrices ? `${formatCurrencyBRL(product.price || 0)} <small>valor unitario</small>` : 'Atendimento sob consulta'}
                    </p>
                    <p class="product-stock ${stockClass}">
                        <i class="fas fa-${stockIcon}-circle"></i> ${stockText}
                    </p>
                    <div class="catalog-quantity">
                        <label for="catalogQty${product.id}">Quantidade</label>
                        <input type="number" id="catalogQty${product.id}" min="1" max="${maxSelectable}" value="${available > 0 ? 1 : 0}" ${available === 0 ? 'disabled' : ''}>
                    </div>
                    <div class="product-actions">
                        <button class="btn-secondary add-to-budget" data-id="${product.id}" ${available === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Adicionar
                        </button>
                        <button class="btn-outline view-details" data-id="${product.id}">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                    </div>
                </div>
            `;

            productsGrid.appendChild(productCard);
        });

        productsGrid.querySelectorAll('.add-to-budget').forEach(button => {
            button.addEventListener('click', function () {
                const productId = parseInt(this.getAttribute('data-id') || '0', 10);
                const qtyField = document.getElementById(`catalogQty${productId}`);
                const quantity = Math.max(1, parseInt(qtyField?.value || '1', 10));
                addToBudget(productId, quantity);
            });
        });

        productsGrid.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function () {
                const productId = parseInt(this.getAttribute('data-id') || '0', 10);
                showProductDetails(productId);
            });
        });
    };

    window.showProductDetails = showProductDetails = function (productId) {
        const product = products.find(item => Number(item.id) === Number(productId));
        if (!product) return;

        const available = getAvailableProductStock(productId);
        const canShowPrices = Boolean(currentUser || hasUnlockedPrices());
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 680px;">
                <div class="modal-header">
                    <h2>${product.name}</h2>
                    <span class="close-product-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="display:grid; grid-template-columns: 180px minmax(0,1fr); gap:20px; align-items:center;">
                        <div class="product-image" style="height:180px; border-radius:18px;">
                            ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="hero-product-image">` : `<i class="${product.image || 'fas fa-box'}"></i>`}
                        </div>
                        <div>
                            <p><strong>Categoria:</strong> ${product.category || 'Outros'}</p>
                            <p><strong>Disponivel agora:</strong> ${available} unidade(s)</p>
                            ${canShowPrices ? `<p><strong>Valor unitario:</strong> ${formatCurrencyBRL(product.price || 0)}</p>` : ''}
                            ${product.bulkDiscount ? `<p><strong>Desconto:</strong> ${product.bulkDiscount.quantity}+ unidades por ${formatCurrencyBRL(product.bulkDiscount.price || 0)} cada</p>` : ''}
                        </div>
                    </div>
                    <p style="margin-top:20px;"><strong>Descricao:</strong> ${product.description || 'Sem descricao adicional.'}</p>
                    <div class="catalog-quantity" style="margin-top:20px;">
                        <label for="detailQty${product.id}">Quantidade</label>
                        <input type="number" id="detailQty${product.id}" min="1" max="${Math.max(1, available || 1)}" value="${available > 0 ? 1 : 0}" ${available === 0 ? 'disabled' : ''}>
                    </div>
                    <div style="text-align:center; margin-top:24px;">
                        <button class="cta-button add-from-details" data-id="${product.id}" ${available === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Adicionar ao orÃ§amento
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.close-product-modal')?.addEventListener('click', () => modal.remove());
        modal.querySelector('.add-from-details')?.addEventListener('click', function () {
            const quantity = Math.max(1, parseInt(document.getElementById(`detailQty${product.id}`)?.value || '1', 10));
            addToBudget(product.id, quantity);
            modal.remove();
        });
        modal.addEventListener('click', function (event) {
            if (event.target === modal) modal.remove();
        });
    };

    window.updateCartQuantity = updateCartQuantity = function (productId, change, setAbsolute = false) {
        const product = products.find(item => Number(item.id) === Number(productId));
        if (!product) return;

        let cartItem = cart.find(item => Number(item.id) === Number(productId));
        const currentQuantity = cartItem?.quantity || 0;
        let newQuantity = setAbsolute ? Number(change || 0) : currentQuantity + Number(change || 0);
        newQuantity = Math.max(0, Math.min(newQuantity, Number(product.stock || 0)));

        if (newQuantity === 0) {
            cart = cart.filter(item => Number(item.id) !== Number(productId));
        } else if (cartItem) {
            cartItem.quantity = newQuantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: newQuantity,
                bulkDiscount: product.bulkDiscount
            });
        }

        if (typeof updateCartDisplay === 'function') updateCartDisplay();
        if (typeof updateBudgetSummary === 'function') updateBudgetSummary();
        if (typeof renderBudgetItems === 'function') renderBudgetItems();
        if (typeof renderProducts === 'function') renderProducts();
    };

    addToBudget = function (productId, requestedQuantity = 1) {
        if (currentUser) {
            unlockBudgetSection(false);
            performAddToBudget(productId, requestedQuantity);
            return;
        }

        if (!hasUnlockedPrices()) {
            setPendingBudgetIntent({ productId, quantity: requestedQuantity });
            openLeadCaptureModal({
                source: 'catalogo',
                productId,
                productName: products.find(item => item.id === productId)?.name || '',
                quantity: requestedQuantity
            });
            return;
        }

        performAddToBudget(productId, requestedQuantity);
    };

    openLeadCaptureModal = function (context = {}) {
        if (currentUser) {
            unlockBudgetSection(true);
            applyPendingBudgetIntent();
            return;
        }

        const session = ensureAccessSession();
        if (session.leadUnlocked) {
            applyPendingBudgetIntent();
            return;
        }

        document.getElementById('leadCaptureModal')?.remove();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal" id="leadCaptureModal" style="display:block; background: rgba(3,7,18,0.82);">
                <div class="modal-content" style="max-width: 640px;">
                    <div class="modal-header">
                        <div class="lead-modal-title">
                            <span class="lead-modal-kicker">Atendimento personalizado</span>
                            <h2>Continue seu atendimento</h2>
                        </div>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="lead-modal-intro">
                            <p>Preencha seus dados para seguir com a montagem do pedido e receber um atendimento mais rapido.</p>
                        </div>
                        <div class="lead-modal-grid">
                            <div class="settings-form-group">
                                <label for="leadName">Nome</label>
                                <input type="text" id="leadName" placeholder="Seu nome completo">
                            </div>
                            <div class="settings-form-group">
                                <label for="leadEmail">Email</label>
                                <input type="email" id="leadEmail" placeholder="voce@empresa.com">
                            </div>
                            <div class="settings-form-group lead-full">
                                <label for="leadPhone">Telefone</label>
                                <input type="text" id="leadPhone" placeholder="(00) 00000-0000">
                            </div>
                        </div>
                        <div class="lead-modal-footer">
                            <div class="lead-modal-note">Atendimento comercial e proposta sob medida.</div>
                        </div>
                        <div class="form-actions lead-actions">
                            <button type="button" id="saveLeadCapture">Prosseguir</button>
                            <button type="button" class="cancel-btn">Fechar</button>
                        </div>
                        <div class="lead-login-entry">
                            <span>Ja tem cadastro?</span>
                            <button type="button" id="openLeadLogin">Entrar na minha conta</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);
        wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('#openLeadLogin')?.addEventListener('click', () => {
            const currentLeadEmail = wrapper.querySelector('#leadEmail')?.value.trim().toLowerCase();
            wrapper.remove();
            openLoginModal();
            const loginEmailField = document.getElementById('loginEmail');
            if (loginEmailField && currentLeadEmail) loginEmailField.value = currentLeadEmail;
        });
        wrapper.querySelector('#saveLeadCapture')?.addEventListener('click', function () {
            const name = wrapper.querySelector('#leadName')?.value.trim();
            const email = wrapper.querySelector('#leadEmail')?.value.trim().toLowerCase();
            const phone = wrapper.querySelector('#leadPhone')?.value.trim();
            if (!name || !email || !phone) {
                alert('Preencha nome, email e telefone.');
                return;
            }

            session.userName = name;
            session.leadUnlocked = true;
            session.lead = { name, email, phone, capturedAt: new Date().toISOString(), context };

            leadContacts.unshift({
                id: Date.now(),
                name,
                email,
                phone,
                capturedAt: new Date().toISOString(),
                source: context.source || 'site',
                productName: context.productName || '',
                quantity: context.quantity || 0
            });
            leadContacts = leadContacts.slice(0, 500);
            trackAccess('lead_unlocked', { email, source: context.source || 'site' });
            saveToLocalStorage();
            renderProducts();
            updateBudgetSummary();
            unlockBudgetSection(true);
            wrapper.remove();
            applyPendingBudgetIntent();
        });
    };

    getEventBriefFromForm = function () {
        const city = document.getElementById('deliveryCity')?.value.trim() || '';
        return {
            type: document.getElementById('eventType')?.value || '',
            guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
            date: document.getElementById('eventDate')?.value || '',
            city: document.getElementById('eventCity')?.value.trim() || city,
            venueType: document.getElementById('venueType')?.value || '',
            notes: document.getElementById('eventNotes')?.value.trim() || '',
            eventName: document.getElementById('eventName')?.value.trim() || '',
            deliveryDate: document.getElementById('deliveryDate')?.value || '',
            deliveryTime: document.getElementById('deliveryTime')?.value || '',
            responsible: document.getElementById('eventResponsible')?.value.trim() || '',
            responsiblePhone: document.getElementById('eventResponsiblePhone')?.value.trim() || '',
            deliveryAddress: composeDeliveryAddress()
        };
    };

    clearEventBriefForm = function () {
        ['eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes', 'eventName', 'deliveryDate', 'deliveryTime', 'eventResponsible', 'eventResponsiblePhone', 'deliveryStreet', 'deliveryNumber', 'deliveryComplement', 'deliveryNeighborhood', 'deliveryCity', 'deliveryState'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
    };

    checkCep = async function () {
        const cepInput = document.getElementById('cep');
        if (!cepInput) return;

        const rawCep = cepInput.value.replace(/\D/g, '');
        if (rawCep.length !== 8) {
            window.currentFreightResult = null;
            freightValue = 0;
            showCepMessage('Digite um CEP valido com 8 numeros.', 'error');
            updateBudgetSummary();
            return;
        }

        const maskedCep = `${rawCep.slice(0, 5)}-${rawCep.slice(5)}`;
        cepInput.value = maskedCep;
        showCepMessage('Consultando CEP e disponibilidade de entrega...', 'info');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
            const data = await response.json();

            if (!response.ok || data?.erro) {
                window.currentFreightResult = null;
                freightValue = 0;
                showCepMessage('CEP nao encontrado. Confira o numero digitado.', 'error');
                updateBudgetSummary();
                return;
            }

            const state = String(data.uf || '').trim().toUpperCase();
            const city = String(data.localidade || '').trim();
            const street = String(data.logradouro || '').trim();
            const neighborhood = String(data.bairro || '').trim();

            if (street) document.getElementById('deliveryStreet').value = street;
            if (neighborhood) document.getElementById('deliveryNeighborhood').value = neighborhood;
            if (city) document.getElementById('deliveryCity').value = city;
            if (state) document.getElementById('deliveryState').value = state;

            window.currentFreightResult = { cep: maskedCep, city, state, street, neighborhood };

            if (!['PR', 'SC'].includes(state)) {
                freightValue = 0;
                showCepMessage(`No momento atendemos entregas apenas em Parana e Santa Catarina. CEP consultado: ${maskedCep}.`, 'error');
                updateBudgetSummary();
                return;
            }

            let subtotal = 0;
            cart.forEach(item => {
                let itemPrice = item.price;
                if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) itemPrice = item.bulkDiscount.price;
                subtotal += itemPrice * item.quantity;
            });

            freightValue = subtotal >= 1000 ? 0 : state === 'PR' ? 80 : 90;
            const freightLabel = freightValue === 0 ? 'Frete cortesia para esse pedido.' : `Frete para ${state}: ${formatCurrencyBRL(freightValue)}.`;
            showCepMessage(`${freightLabel} Entrega em ${city || 'cidade informada'} com CEP ${maskedCep}.`, 'success');
            updateBudgetSummary();
        } catch (error) {
            console.error('Erro ao consultar CEP:', error);
            window.currentFreightResult = null;
            freightValue = 0;
            showCepMessage('Nao foi possivel consultar o CEP agora. Tente novamente em instantes.', 'error');
            updateBudgetSummary();
        }
    };

    createLogisticsFromBudget = function (budget, responsibleFallback = '') {
        const event = budget.eventDetails || {};
        const deliveryDate = event.deliveryDate || event.date || '';
        const location = event.deliveryAddress || `${event.city || ''} ${budget.cep || ''}`.trim();
        if (!deliveryDate || !location) return;

        const statusMap = {
            Pendente: 'Aguardando confirmacao',
            Aprovado: 'Confirmado',
            Finalizado: 'Entregue',
            Cancelado: 'Cancelado'
        };

        const payload = {
            budgetId: budget.id,
            eventName: event.eventName || event.type || `Evento ${budget.id}`,
            clientName: budget.userName || '',
            contactName: event.responsible || responsibleFallback || budget.userName || '',
            contactPhone: event.responsiblePhone || budget.userPhone || '',
            receiverName: event.responsible || responsibleFallback || budget.userName || '',
            receiverPhone: event.responsiblePhone || budget.userPhone || '',
            owner: event.responsible || responsibleFallback || budget.userName || '',
            date: deliveryDate,
            time: event.deliveryTime || '09:00',
            location,
            notes: event.notes || '',
            status: statusMap[budget.status] || 'Programado',
            updatedAt: new Date().toISOString()
        };

        const existingIndex = logisticsEntries.findIndex(entry => entry.budgetId === budget.id);
        if (existingIndex >= 0) {
            logisticsEntries[existingIndex] = { ...logisticsEntries[existingIndex], ...payload };
        } else {
            logisticsEntries.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), createdAt: new Date().toISOString(), ...payload });
        }
        normalizeLogisticsEntries(false);
    };

    openCustomerArea = function (defaultTab = 'budgets') {
        if (!currentUser || currentUser.isAdmin) return;

        document.getElementById('customerAreaModal')?.remove();
        const userBudgets = getCurrentCustomerBudgets();

        const wrapper = document.createElement('div');
        wrapper.id = 'customerAreaModal';
        wrapper.innerHTML = `
            <div class="modal" style="display:block; background: rgba(3,7,18,0.72);">
                <div class="modal-content" style="max-width: 1120px;">
                    <div class="modal-header">
                        <h2>Minha area</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body" style="padding:0;">
                        <div class="customer-area-layout">
                            <aside class="customer-area-sidebar">
                                <button class="customer-area-tab ${defaultTab === 'budgets' ? 'active' : ''}" data-tab="budgets">Meus orcamentos</button>
                                <button class="customer-area-tab ${defaultTab === 'profile' ? 'active' : ''}" data-tab="profile">Meu perfil</button>
                            </aside>
                            <div class="customer-area-content">
                                <div class="customer-tab ${defaultTab === 'budgets' ? 'active' : ''}" id="customerBudgetsTab">
                                    <h3>Meus orcamentos</h3>
                                    ${userBudgets.length ? userBudgets.map(budget => `
                                        <div class="customer-budget-card">
                                            <div>
                                                <strong>Orcamento #${budget.id}</strong>
                                                <p>${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}${budget.eventDetails?.date ? ` - ${formatDateBR(budget.eventDetails.date)}` : ''}</p>
                                                <small>Status: ${budget.status}</small>
                                            </div>
                                            <div class="customer-budget-right">
                                                <strong>${formatCurrencyBRL(budget.total)}</strong>
                                                <div class="order-actions">
                                                    <button class="btn-small customer-view-budget" data-id="${budget.id}">Ver detalhes</button>
                                                    <button class="btn-small action-btn action-delete customer-delete-budget" data-id="${budget.id}">Excluir</button>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('') : `<div class="customer-empty-state"><h4>Nenhum orcamento salvo ainda</h4><p>Assim que voce salvar um pedido com este cadastro, ele aparecera aqui com status, valor e detalhes do evento.</p></div>`}
                                </div>
                                <div class="customer-tab ${defaultTab === 'profile' ? 'active' : ''}" id="customerProfileTab">
                                    <h3>Meu perfil</h3>
                                    <div class="customer-profile-grid">
                                        <div><span>Nome</span><strong>${currentUser.name || '-'}</strong></div>
                                        <div><span>E-mail</span><strong>${currentUser.email || '-'}</strong></div>
                                        <div><span>Telefone</span><strong>${currentUser.phone || '-'}</strong></div>
                                        <div><span>CPF</span><strong>${currentUser.cpf || '-'}</strong></div>
                                        <div><span>Endereco</span><strong>${currentUser.address || '-'}</strong></div>
                                        <div><span>Informacoes</span><strong>${currentUser.notes || '-'}</strong></div>
                                    </div>
                                    <div style="margin-top:20px;"><button id="editCustomerProfileBtn" class="cta-button">Editar cadastro</button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);
        wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelectorAll('.customer-area-tab').forEach(button => {
            button.addEventListener('click', function () {
                wrapper.querySelectorAll('.customer-area-tab').forEach(item => item.classList.remove('active'));
                wrapper.querySelectorAll('.customer-tab').forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                wrapper.querySelector(`#customer${capitalizeFirstLetter(this.dataset.tab)}Tab`)?.classList.add('active');
            });
        });
        wrapper.querySelectorAll('.customer-view-budget').forEach(button => button.addEventListener('click', function () {
            showBudgetDetails(parseInt(this.dataset.id, 10));
        }));
        wrapper.querySelectorAll('.customer-delete-budget').forEach(button => button.addEventListener('click', function () {
            const budgetId = parseInt(this.dataset.id, 10);
            if (!confirm('Deseja excluir este orcamento?')) return;
            deleteBudget(budgetId);
            openCustomerArea('budgets');
            showMessage('Orcamento excluido com sucesso.', 'success');
        }));
        wrapper.querySelector('#editCustomerProfileBtn')?.addEventListener('click', function () {
            openRegistrationModal(users.find(user => user.id === currentUser.id) || currentUser);
        });
    };

    renderAdminFinance = function () {
        const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
        const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
        const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
        const balance = received - expenses;
        const reviewBudgets = [...savedBudgets].filter(budget => ['Pendente', 'Aprovado'].includes(budget.status)).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 8);

        return `
            <div class="section-header">
                <div>
                    <h2>Financeiro</h2>
                    <p style="margin:8px 0 0; color: rgba(255,255,255,0.7);">Controle aprovacoes, acompanhe recebimentos e conecte cada evento ao seu resultado financeiro.</p>
                </div>
                <div class="admin-actions">
                    <button onclick="openSaleModal()"><i class="fas fa-cash-register"></i> Nova venda</button>
                    <button onclick="openFinancialEntryModal()"><i class="fas fa-receipt"></i> Nova despesa</button>
                </div>
            </div>
            <div class="inventory-summary-grid">
                <div class="report-card"><h3>${formatCurrencyBRL(received)}</h3><p>recebido</p></div>
                <div class="report-card"><h3>${formatCurrencyBRL(receivable)}</h3><p>previsto / a receber</p></div>
                <div class="report-card"><h3>${formatCurrencyBRL(expenses)}</h3><p>despesas</p></div>
                <div class="report-card"><h3>${formatCurrencyBRL(balance)}</h3><p>saldo operacional</p></div>
            </div>
            <div class="report-card finance-budget-review">
                <h3 style="margin-bottom:16px;">Aprovacao de orcamentos</h3>
                ${reviewBudgets.length ? `<div class="finance-budget-review-grid">${reviewBudgets.map(budget => `
                    <div class="finance-budget-card">
                        <h4>${budget.userName || 'Cliente'} â€¢ #${budget.id}</h4>
                        <p style="margin:0 0 6px;">${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}</p>
                        <small>${budget.eventDetails?.deliveryDate ? `Entrega em ${formatDateBR(budget.eventDetails.deliveryDate)}` : 'Sem data de entrega'}${budget.eventDetails?.deliveryTime ? ` â€¢ ${budget.eventDetails.deliveryTime}` : ''}</small>
                        <p style="margin:12px 0 0;"><strong style="color:#fff;">${formatCurrencyBRL(budget.total || 0)}</strong></p>
                        <div class="finance-budget-actions">
                            <button type="button" onclick="viewBudgetDetailsAdmin(${budget.id})"><i class="fas fa-eye"></i> Ver</button>
                            ${budget.status === 'Pendente' ? `<button type="button" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')"><i class="fas fa-check"></i> Aprovar</button>` : ''}
                            <button type="button" class="secondary-btn" onclick="handleOrderStatusChange(${budget.id}, 'Cancelado')"><i class="fas fa-ban"></i> Reprovar</button>
                        </div>
                    </div>
                `).join('')}</div>` : '<p style="color: rgba(255,255,255,0.72); margin:0;">Nenhum orcamento aguardando avaliacao no momento.</p>'}
            </div>
            <div class="report-card">
                <h3 style="margin-bottom: 16px;">Vendas, contratos e movimentacao financeira</h3>
                <div class="finance-table-wrapper">${renderFinancialEntriesTable()}</div>
            </div>
        `;
    };

    window.renderAdminOrdersTable = renderAdminOrdersTable = function () {
        const budgets = [...savedBudgets].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        if (!budgets.length) {
            return '<div class="customer-empty-state"><h4>Nenhum pedido encontrado</h4><p>Os orcamentos e vendas salvos aparecerao aqui com status, cliente, entrega e valor.</p></div>';
        }

        const pending = budgets.filter(item => item.status === 'Pendente').length;
        const approved = budgets.filter(item => item.status === 'Aprovado').length;
        const finalized = budgets.filter(item => item.status === 'Finalizado').length;
        const totalValue = budgets.reduce((sum, item) => sum + Number(item.total || 0), 0);

        return `
            <div class="orders-board">
                <div class="orders-toolbar">
                    <div class="orders-kpi"><span>Pendentes</span><strong>${pending}</strong></div>
                    <div class="orders-kpi"><span>Aprovados</span><strong>${approved}</strong></div>
                    <div class="orders-kpi"><span>Finalizados</span><strong>${finalized}</strong></div>
                    <div class="orders-kpi"><span>Volume total</span><strong>${formatCurrencyBRL(totalValue)}</strong></div>
                </div>
                <div class="orders-cards">
                    ${budgets.map(budget => {
                        const eventLabel = budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento nao informado';
                        const deliveryLabel = budget.eventDetails?.deliveryDate ? formatDateBR(budget.eventDetails.deliveryDate) : 'Sem data';
                        const deliveryTime = budget.eventDetails?.deliveryTime || '-';
                        const responsible = budget.eventDetails?.responsible || budget.userName || '-';
                        const phone = budget.eventDetails?.responsiblePhone || budget.userPhone || '-';
                        const address = budget.eventDetails?.deliveryAddress || 'Endereco nao informado';
                        const itemCount = (budget.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

                        const suggestion = findSuggestedScheduleSlot(
                            budget.eventDetails?.deliveryDate || budget.eventDetails?.date || '',
                            budget.eventDetails?.deliveryTime || '09:00',
                            budget.id
                        );
                        const showInlineCancelPanel = activeOrderCancelDraftId === Number(budget.id) && budget.status !== 'Cancelado';

                        return `
                            <article class="order-card">
                                <div class="order-card-head">
                                    <div>
                                        <span class="order-card-id"><i class="fas fa-file-invoice"></i> #${budget.id}</span>
                                        <h3>${budget.userName || 'Cliente nao identificado'}</h3>
                                        <p>${eventLabel}${budget.eventDetails?.guests ? ` - ${budget.eventDetails.guests} convidados` : ''}</p>
                                    </div>
                                    <div class="order-card-total">
                                        <strong>${formatCurrencyBRL(budget.total || 0)}</strong>
                                        <small>${itemCount} item(ns) - ${budget.origin === 'admin-direct-sale' ? 'Venda interna' : 'Site'}</small>
                                    </div>
                                </div>
                                <div class="order-card-grid">
                                    <div class="order-meta">
                                        <span>Data do evento</span>
                                        <strong>${budget.eventDetails?.date ? formatDateBR(budget.eventDetails.date) : budget.date || '-'}</strong>
                                    </div>
                                    <div class="order-meta">
                                        <span>Entrega</span>
                                        <strong>${deliveryLabel}</strong>
                                        <div>${deliveryTime}</div>
                                    </div>
                                    <div class="order-meta">
                                        <span>Responsavel</span>
                                        <strong>${responsible}</strong>
                                        <div>${phone}</div>
                                    </div>
                                    <div class="order-meta">
                                        <span>Endereco</span>
                                        <div>${address}</div>
                                    </div>
                                </div>
                                <div class="order-card-footer">
                                    <div class="order-status-wrap">
                                        <label for="orderStatus${budget.id}">Status</label>
                                        <select id="orderStatus${budget.id}" class="status-select" onchange="handleOrderStatusChange(${budget.id}, this.value)">
                                            <option value="Pendente" ${budget.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                            <option value="Aprovado" ${budget.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                                            <option value="Finalizado" ${budget.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                                            ${budget.status === 'Cancelado' ? '<option value="Cancelado" selected>Cancelado</option>' : ''}
                                        </select>
                                    </div>
                                    <div class="order-actions">
                                        <button class="action-btn action-edit" onclick="viewBudgetDetailsAdmin(${budget.id})" title="Ver detalhes"><i class="fas fa-eye"></i> Ver</button>
                                        ${budget.status === 'Pendente' ? `<button class="action-btn action-approve" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')" title="Aprovar"><i class="fas fa-check"></i> Aprovar</button>` : ''}
                                        ${budget.status === 'Aprovado' ? `<button type="button" class="action-btn action-edit" onclick="generateBudgetContractPdf(${budget.id})" title="Gerar contrato"><i class="fas fa-file-pdf"></i> Contrato</button>` : ''}
                                        ${budget.status !== 'Cancelado' ? `<button type="button" class="action-btn action-delete" data-cancel-budget-id="${budget.id}" onclick="openBudgetCancellationModal(${budget.id})" title="Cancelar"><i class="fas fa-ban"></i> Cancelar</button>` : ''}
                                        <button class="action-btn action-delete" onclick="deleteBudgetAdmin(${budget.id})" title="Excluir"><i class="fas fa-trash"></i> Excluir</button>
                                    </div>
                                </div>
                                ${showInlineCancelPanel ? `
                                    <section class="order-cancel-panel" id="orderCancelPanel${budget.id}">
                                        <div class="order-cancel-panel-head">
                                            <div>
                                                <span class="budget-cancel-kicker">Atendimento ao cliente</span>
                                                <h4>Cancelar pedido com justificativa</h4>
                                                <p>Explique o motivo e, se quiser, ja sugira uma nova data ou horario para o cliente.</p>
                                            </div>
                                            <span class="budget-cancel-badge subtle"><i class="fas fa-envelope-open-text"></i> E-mail opcional ao cliente</span>
                                        </div>
                                        <div class="order-cancel-summary">
                                            <div class="budget-cancel-summary-item">
                                                <span>Data original</span>
                                                <strong>${budget.eventDetails?.deliveryDate ? formatDateBR(budget.eventDetails.deliveryDate) : '-'}</strong>
                                            </div>
                                            <div class="budget-cancel-summary-item">
                                                <span>Horario original</span>
                                                <strong>${budget.eventDetails?.deliveryTime || '-'}</strong>
                                            </div>
                                            <div class="budget-cancel-summary-item">
                                                <span>Sugestao automatica</span>
                                                <strong>${suggestion.date ? `${formatDateBR(suggestion.date)} as ${suggestion.time || '--:--'}` : 'Sem sugestao'}</strong>
                                            </div>
                                        </div>
                                        <div class="order-cancel-grid">
                                            <div class="settings-form-group order-cancel-reason">
                                                <label for="cancelReasonInline${budget.id}">Justificativa</label>
                                                <textarea id="cancelReasonInline${budget.id}" rows="4" placeholder="Ex: nesse horario ja temos outra entrega muito proxima, houve um imprevisto operacional ou precisamos reorganizar a rota."></textarea>
                                            </div>
                                            <div class="order-cancel-side">
                                                <div class="order-cancel-date-grid">
                                                    <div class="settings-form-group">
                                                        <label for="cancelSuggestedDateInline${budget.id}">Nova data sugerida</label>
                                                        <input type="date" id="cancelSuggestedDateInline${budget.id}" value="${suggestion.date || ''}">
                                                    </div>
                                                    <div class="settings-form-group">
                                                        <label for="cancelSuggestedTimeInline${budget.id}">Novo horario sugerido</label>
                                                        <input type="time" id="cancelSuggestedTimeInline${budget.id}" value="${suggestion.time || ''}">
                                                    </div>
                                                </div>
                                                <label class="finance-entry-checkbox">
                                                    <input type="checkbox" id="cancelSendEmailInline${budget.id}" checked>
                                                    <span>Enviar e-mail ao cliente com a justificativa e a sugestao</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div class="order-cancel-actions">
                                            <button type="button" class="cta-button" onclick="confirmBudgetCancellation(${budget.id})"><i class="fas fa-ban"></i> Confirmar cancelamento</button>
                                            <button type="button" class="secondary-btn" onclick="closeBudgetCancellationPanel()"><i class="fas fa-times"></i> Fechar</button>
                                        </div>
                                    </section>
                                ` : ''}
                            </article>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };

    window.generateBudgetContractPdf = async function (budgetId) {
        const budget = savedBudgets.find(item => Number(item.id) === Number(budgetId));
        if (!budget) {
            showAdminMessage('Pedido nao encontrado para gerar o contrato.', 'error');
            return;
        }

        if (!['Aprovado', 'Finalizado'].includes(String(budget.status || ''))) {
            showAdminMessage('Gere contrato apenas para pedidos aprovados ou finalizados.', 'error');
            return;
        }

        try {
            const jsPDF = await ensureJsPdfReady();
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const marginX = 18;
            const maxWidth = pageWidth - (marginX * 2);

            const customerName = budget.userName || 'Nao informado';
            const customerCpf = budget.userCpf || users.find(item => Number(item.id) === Number(budget.userId || 0))?.cpf || 'Nao informado';
            const customerPhone = budget.userPhone || users.find(item => Number(item.id) === Number(budget.userId || 0))?.phone || 'Nao informado';
            const customerEmail = budget.userEmail || users.find(item => Number(item.id) === Number(budget.userId || 0))?.email || 'Nao informado';
            const customerAddress = budget.userAddress || users.find(item => Number(item.id) === Number(budget.userId || 0))?.address || 'Nao informado';
            const eventDate = budget.eventDetails?.date ? formatDateBR(budget.eventDetails.date) : '-';
            const eventLocation = budget.eventDetails?.venueType || budget.eventDetails?.city || 'Nao informado';
            const eventAddress = budget.eventDetails?.deliveryAddress || 'Nao informado';
            const eventResponsible = budget.eventDetails?.responsible || budget.userName || 'Nao informado';
            const deliveryReferenceDate = budget.eventDetails?.deliveryDate ? formatDateBR(budget.eventDetails.deliveryDate) : eventDate;
            const companyAddress = companyData?.address || companyData?.fullAddress || '____________________________';
            const itemsSubtotal = Number((budget.items || []).reduce((sum, item) => sum + Number(item.total || (Number(item.price || 0) * Number(item.quantity || 0))), 0));
            const freightValue = getBudgetFreightValue(budget);
            const totalValue = Number(budget.total || 0);
            const contractNumber = `${new Date().getFullYear()}-${budget.id}`;

            let y = 18;

            const ensurePage = spaceNeeded => {
                if (y + spaceNeeded <= pageHeight - 18) return;
                doc.addPage();
                y = 18;
            };

            const writeParagraph = (text, options = {}) => {
                const fontSize = options.fontSize || 10;
                const bold = Boolean(options.bold);
                const indent = options.indent || 0;
                const lineGap = options.lineGap || 4.7;
                const topGap = options.topGap || 0;
                const usableWidth = options.width || (maxWidth - indent);
                const lines = doc.splitTextToSize(String(text || ''), usableWidth);
                ensurePage(topGap + (lines.length * lineGap) + 2);
                y += topGap;
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(33, 37, 41);
                doc.text(lines, marginX + indent, y);
                y += lines.length * lineGap;
            };

            const writeLabel = label => {
                ensurePage(8);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(label, marginX, y);
                y += 7;
            };

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(`Contrato Nº ${contractNumber}`, marginX, y);
            y += 12;

            writeLabel('DADOS DO CONTRATANTE');
            writeParagraph(`Nome: ${customerName}`);
            writeParagraph(`CPF/CNPJ: ${customerCpf}`);
            writeParagraph(`Telefone: ${customerPhone}`);
            writeParagraph(`E-mail: ${customerEmail}`);
            writeParagraph(`Endereco: ${customerAddress}`, { topGap: 1 });
            y += 4;

            writeLabel('DADOS DO CONTRATADO');
            writeParagraph('Empresa: Mobilier – Mobiliario para Eventos');
            writeParagraph('Razao Social: Goes e Lara Ltda');
            writeParagraph('CNPJ: 63.590.770/0001-51.');
            writeParagraph(`Endereco: ${companyAddress}`, { topGap: 1 });
            y += 4;

            writeLabel('DADOS DO EVENTO:');
            writeParagraph(`Data: ${eventDate}`);
            writeParagraph(`Local: ${eventLocation}`);
            writeParagraph(`Endereco: ${eventAddress}`);
            writeParagraph(`Responsavel: ${eventResponsible}`, { topGap: 1 });
            y += 4;

            writeLabel('DESCRICAO DO OBJETO:');
            writeParagraph('1- A Contratada se compromete fornecer os seguintes itens descritos abaixo:', { topGap: 1 });
            y += 5;

            const tableX = marginX;
            const tableWidth = maxWidth;
            const cols = [78, 18, 16, 28, 28];
            const headerLabels = ['ITEM', 'QTD', 'UN.', 'VALOR UNIT.', 'VALOR TOTAL'];

            ensurePage(18);
            doc.setFillColor(31, 58, 95);
            doc.rect(tableX, y, tableWidth, 9, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            let x = tableX + 3;
            headerLabels.forEach((label, index) => {
                const width = cols[index];
                const align = index === 0 ? 'left' : 'center';
                doc.text(label, index === 0 ? x : x + (width / 2), y + 5.9, { align });
                x += width;
            });
            y += 12;

            doc.setTextColor(33, 37, 41);
            doc.setFontSize(9.2);
            (budget.items || []).forEach((item, index) => {
                const itemTotal = Number(item.total || (Number(item.price || 0) * Number(item.quantity || 0)));
                const description = String(item.description || item.notes || 'Descricao do item conforme cadastro.');
                const nameLines = doc.splitTextToSize(String(item.name || 'Item'), cols[0] - 6);
                const descriptionLines = doc.splitTextToSize(description, cols[0] - 6);
                const rowHeight = Math.max(12, ((nameLines.length + descriptionLines.length) * 4.2) + 6);
                ensurePage(rowHeight + 4);

                if (index % 2 === 0) {
                    doc.setFillColor(246, 248, 251);
                    doc.rect(tableX, y - 3.5, tableWidth, rowHeight, 'F');
                }

                doc.setFont('helvetica', 'bold');
                doc.text(nameLines, tableX + 3, y + 1);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.text(descriptionLines, tableX + 3, y + 1 + (nameLines.length * 4.2) + 1.5);
                doc.setFontSize(9.2);

                const centerY = y + 1;
                doc.text(String(item.quantity || 0), tableX + cols[0] + (cols[1] / 2), centerY, { align: 'center' });
                doc.text('1', tableX + cols[0] + cols[1] + (cols[2] / 2), centerY, { align: 'center' });
                doc.text(formatCurrencyBRL(Number(item.price || 0)), tableX + cols[0] + cols[1] + cols[2] + (cols[3] / 2), centerY, { align: 'center' });
                doc.text(formatCurrencyBRL(itemTotal), tableX + cols[0] + cols[1] + cols[2] + cols[3] + (cols[4] / 2), centerY, { align: 'center' });

                y += rowHeight;
            });

            y += 2;
            writeParagraph('Descricao dos itens', { bold: true, topGap: 2 });
            y += 3;

            const paymentText = `2 - O Valor acordado entre as partes sera de ${formatCurrencyBRL(totalValue)}. A Forma de pagamento sera efetuada atraves de deposito bancario ou via PIX 63590770000151 sendo 30% do valor no ato de assinatura deste contrato e os 70% restante com vencimento 10 dias antes do evento Banco Sicredi Agencia 0730 Conta Corrente 43297-9 Goes e Lara Ltda CNPJ: 63.590.770/0001-51. §1º. Apos efetuado o pagamento o contratante deve enviar o comprovante de deposito a contratada. No contrario o pagamento ficara em aberto. §2º. O preco estabelecido nesta clausula nao sofrera nenhum reajuste, caso nao tenha alteracao no orcamento em anexo.`;
            const clause3 = '3 - Constitui objeto do presente Contrato de Locacao de Mobiliario, por parte da CONTRATADA, da locacao do mobiliario para decoracao. Descricao acima. §1º. Todo material e equipamento necessario a execucao do objeto deste contrato sera fornecido pela CONTRATADA, salvo se antecipadamente ajustado em contrato com o CONTRATANTE com um periodo de antecedencia de 10 dias uteis.';
            const clause4 = '4 - A vigencia deste contrato encerra-se logo apos o termino do evento, com a conclusao da retirada do mobiliario locado.';
            const clause5 = `5 - I - Sao obrigacoes da CONTRATANTE:
a) Cumprir o prazo de pagamento estipulado na Clausula Segunda deste contrato;
b) Fornecer as condicoes necessarias a CONTRATADA, conforme avancado neste pacto, objetivando a consecucao do estabelecido na Clausula Terceira do presente termo;
c) Permitir o acesso dos empregados/entregadores da CONTRATADA aos locais necessarios, desde que devidamente identificados atraves de listagem a ser recebida, que devera conter nomes e RG, e mediante a apresentacao de documento com foto.
d) Fornecer local para o armazenamento dos materiais e equipamentos a serem utilizados pela CONTRATADA se for o caso;
e) Indicar a pessoa responsavel para a fiscalizacao e acompanhamento dos servicos.
II – Sao obrigacoes da CONTRATADA:
a) Atender, na integra, ao escopo declinado na Clausula Primeira, fornecendo todo o material necessario a consecucao do objeto ora contratado;
b) Locacao do mobiliario em excelente estado de conservacao no dia ${deliveryReferenceDate}, conforme mobiliario descrito no contrato;
c) Utilizar materiais de qualidade, e na quantidade necessaria a plena execucao dos servicos;
d) Fornecer os equipamentos necessarios ao atendimento do objeto deste contrato;
e) Promover o transporte dos materiais e equipamentos, bem como da equipe de montagem;
f) Fornecer e utilizar, sob sua inteira responsabilidade, competente e indispensavel mao-de-obra, habilitada e treinada para execucao dos servicos contratados atendidas sempre e, regularmente todas as exigencias legais pertinentes;
g) Fornecer, antecipadamente, relacao identificando os empregados/prepostos autorizados a prestar servicos nas dependencias do evento, com nome e RG;
h) Cumprir as exigencias dos poderes publicos e satisfazer por sua conta, na forma e prazos devidos, todas as despesas administrativas, impostos, emolumentos, taxas previdenciarias, e encargos sociais, trabalhistas e comercias resultantes da execucao deste contrato;
i) Responsabilizar-se pelos atos e/ou omissoes praticadas por seus empregados/prepostos, bem como pelos danos de qualquer natureza que os mesmos venham sofrer ou causar para o CONTRATANTE, ou a terceiros em geral, por culpa ou dolo, em decorrencia do contrato, os quais serao integralmente ressarcidos ao CONTRATANTE;
j) Informar ao CONTRATANTE, no prazo de 10 (dez) dias, quaisquer alteracoes posteriores a assinatura do presente instrumento efetuadas no seu Contrato Social.
O descumprimento do presente contrato sujeitara a parte infratora a multa equivalente a 30% (trinta por cento) do valor do contrato, alem de responder por perdas e danos.
Paragrafo unico. O CONTRATANTE, para garantir o fiel pagamento da multa, reserva-se o direito de reter o valor contra qualquer credito gerado pela CONTRATADA, independentemente de qualquer notificacao judicial ou extrajudicial.`;
            const clause6 = '6 - O presente contrato podera se extinguir nas seguintes hipoteses:\na) Caso sobrevenha motivo de forca maior, alheio a vontade das partes, que inviabilize a sua continuidade;\nb) De comum acordo, por instrumento particular, no qual serao fixadas as condicoes da rescisao;\nc) No caso de falencia ou extincao da CONTRATADA;\nd) Por rescisao imediata, mediante simples comunicacao escrita, nas seguintes hipoteses:\n1. Inadimplemento contratual;\n2. Cessacao injustificada dos servicos;\n3. Quando, apos reiteradas solicitacoes feitas pelo CONTRATANTE a CONTRATADA, ficar evidente a incapacidade ou a ma-fe desta ultima;\n4. Quando qualquer das partes omitirem informacoes ou tentar, por qualquer meio, obter vantagens ilicitas dos servicos prestados;\nAdendo: Nao nos responsabilizamos por quaisquer penalidades impostas a contratada por tempo excedido na entrega ou retirada de mobiliario, quando o mesmo nao for compativel com a necessidade.\nA vigencia do presente contrato inicia-se com a assinatura do mesmo pelas partes e encerra-se apos o cumprimento de todas as obrigacoes firmadas.';
            const clause7 = '7 - E, por estarem assim ajustadas e contratadas, assinam, as partes, o presente contrato em 2 (duas) vias de igual teor, que distribuidas entre as partes produzirao os seu efeitos legais, ficando eleito o foro da Comarca de Ponta Grossa - PR, para dirimir duvidas relacionadas com o presente contrato.';

            [paymentText, clause3, clause4, clause5, clause6, clause7].forEach(text => {
                y += 3;
                writeParagraph(text, { topGap: 0, lineGap: 4.6 });
            });

            y += 18;
            ensurePage(30);
            doc.setDrawColor(90, 98, 108);
            doc.line(marginX + 4, y, marginX + 68, y);
            doc.line(pageWidth - marginX - 68, y, pageWidth - marginX - 4, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('Contratante', marginX + 36, y + 6, { align: 'center' });
            doc.text('Mobilier – Mobiliario para Eventos', pageWidth - marginX - 36, y + 6, { align: 'center' });
            doc.text('Goes e Lara Ltda', pageWidth - marginX - 36, y + 11, { align: 'center' });

            doc.save(`contrato-mobilier-${budget.id}.pdf`);
            showAdminMessage('Contrato em PDF gerado com sucesso.', 'success');
        } catch (error) {
            console.error('Erro ao gerar contrato em PDF:', error);
            showAdminMessage(error.message || 'Nao foi possivel gerar o contrato em PDF.', 'error');
        }
    };
    globalThis.generateBudgetContractPdf = window.generateBudgetContractPdf;

    window.renderAdminUsers = renderAdminUsers = function () {
        const customerCount = users.filter(user => !user.isAdmin).length;
        const adminCount = users.filter(user => user.isAdmin).length;
        const activeBudgetUsers = new Set(savedBudgets.map(budget => Number(budget.userId || 0)).filter(Boolean)).size;

        return `
            <div class="customers-shell">
                <div class="section-header customers-header">
                    <div>
                        <h2>Cadastros</h2>
                        <p>Central de clientes e contas internas para acompanhar relacionamento e pedidos.</p>
                    </div>
                    <div class="admin-actions">
                        <button type="button" onclick="openAdminUserModal()"><i class="fas fa-user-plus"></i> Novo cadastro</button>
                    </div>
                </div>
                <div class="customers-kpis">
                    <article class="customers-kpi-card">
                        <span>Clientes ativos</span>
                        <strong>${customerCount}</strong>
                        <small>Contas de clientes cadastradas no site e no admin.</small>
                    </article>
                    <article class="customers-kpi-card">
                        <span>Administradores</span>
                        <strong>${adminCount}</strong>
                        <small>Perfis internos com acesso ao painel administrativo.</small>
                    </article>
                    <article class="customers-kpi-card">
                        <span>Com pedidos</span>
                        <strong>${activeBudgetUsers}</strong>
                        <small>Cadastros que ja possuem orcamentos ou vendas vinculadas.</small>
                    </article>
                </div>
                <div id="adminUsersContainer">${renderAdminUsersTable()}</div>
            </div>
        `;
    };

    window.renderAdminUsersTable = renderAdminUsersTable = function () {
        if (!users.length) {
            return '<div class="customer-empty-state"><h4>Nenhum cadastro ainda</h4><p>Os clientes e administradores cadastrados aparecerao aqui com dados principais e historico de pedidos.</p></div>';
        }

        const sortedUsers = [...users].sort((a, b) => {
            if (Boolean(b.isAdmin) !== Boolean(a.isAdmin)) return Number(Boolean(b.isAdmin)) - Number(Boolean(a.isAdmin));
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        return `
            <div class="customers-list">
                ${sortedUsers.map(user => {
                    const budgetsByUser = savedBudgets.filter(budget => Number(budget.userId) === Number(user.id));
                    const totalBudgets = budgetsByUser.length;
                    const approvedBudgets = budgetsByUser.filter(budget => budget.status === 'Aprovado' || budget.status === 'Finalizado').length;
                    const lastBudget = budgetsByUser
                        .slice()
                        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];

                    return `
                        <article class="customer-card ${user.isAdmin ? 'is-admin' : ''}">
                            <div class="customer-card-main">
                                <div class="customer-card-identity">
                                    <div class="customer-card-avatar">
                                        <span>${String(user.name || 'C').trim().charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <div class="customer-card-name-row">
                                            <h3>${user.name || 'Cadastro sem nome'}</h3>
                                            <span class="customer-role-badge ${user.isAdmin ? 'is-admin' : ''}">${user.isAdmin ? 'Administrador' : 'Cliente'}</span>
                                        </div>
                                        <p>${user.email || 'E-mail nao informado'}</p>
                                        <small>${user.phone || 'Telefone nao informado'}${user.cpf ? ` - CPF ${user.cpf}` : ''}</small>
                                    </div>
                                </div>
                            </div>
                            <div class="customer-card-stats">
                                <div>
                                    <span>Pedidos</span>
                                    <strong>${totalBudgets}</strong>
                                </div>
                                <div>
                                    <span>Aprovados</span>
                                    <strong>${approvedBudgets}</strong>
                                </div>
                                <div>
                                    <span>Ultimo movimento</span>
                                    <strong>${lastBudget ? formatDateBR((lastBudget.updatedAt || lastBudget.createdAt || '').slice(0, 10)) : 'Sem pedidos'}</strong>
                                </div>
                            </div>
                            <div class="customer-card-footer">
                                <div class="customer-card-meta">
                                    <span>Endereco</span>
                                    <strong>${user.address || 'Nao informado'}</strong>
                                </div>
                                <div class="customer-card-actions">
                                    ${!user.isAdmin ? `<button class="action-btn action-edit" onclick="makeAdmin(${user.id})"><i class="fas fa-user-shield"></i> Tornar admin</button>` : ''}
                                    ${user.id !== 1 ? `<button class="action-btn action-delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i> Excluir</button>` : ''}
                                </div>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.openAdminUserModal = function () {
        document.getElementById('adminUserModal')?.parentElement?.remove();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal" id="adminUserModal" style="display:block; background: rgba(3,7,18,0.82);">
                <div class="modal-content admin-user-shell">
                    <div class="modal-header">
                        <div>
                            <span class="budget-cancel-kicker">Equipe e relacionamento</span>
                            <h2>Novo cadastro</h2>
                        </div>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="finance-entry-shell">
                            <section class="finance-entry-hero">
                                <div>
                                    <h3>Crie um cadastro completo</h3>
                                    <p>Registre clientes e contas internas com os dados essenciais para atendimento, vendas e administracao.</p>
                                </div>
                                <div class="finance-entry-chips">
                                    <span class="finance-entry-chip"><i class="fas fa-user-plus"></i> Novo contato</span>
                                    <span class="finance-entry-chip"><i class="fas fa-address-book"></i> Dados organizados</span>
                                </div>
                            </section>

                            <div id="adminUserModalFeedback" class="admin-user-modal-feedback" style="display:none;"></div>

                            <section class="finance-entry-card">
                                <div class="finance-entry-card-head">
                                    <div>
                                        <h3>Dados principais</h3>
                                        <p>Preencha as informacoes basicas do cadastro.</p>
                                    </div>
                                </div>
                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="adminUserName">Nome completo</label>
                                        <input type="text" id="adminUserName" placeholder="Ex: Ana Paula Ferreira">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="adminUserEmail">E-mail</label>
                                        <input type="email" id="adminUserEmail" placeholder="cliente@email.com">
                                    </div>
                                </div>
                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="adminUserPhone">Telefone</label>
                                        <input type="text" id="adminUserPhone" placeholder="(00) 00000-0000">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="adminUserPassword">Senha</label>
                                        <input type="password" id="adminUserPassword" placeholder="Crie uma senha de acesso">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="adminUserType">Perfil</label>
                                        <select id="adminUserType">
                                            <option value="client">Cliente</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="settings-form-group">
                                    <label for="adminUserAddress">Endereco</label>
                                    <input type="text" id="adminUserAddress" placeholder="Rua, numero, bairro, cidade e estado">
                                </div>
                            </section>

                            <div class="finance-entry-actions">
                                <button type="button" class="cta-button" data-save-admin-user="true" onclick="createAdminUser()"><i class="fas fa-save"></i> Salvar cadastro</button>
                                <button type="button" class="secondary-btn admin-user-close-btn cancel-btn"><i class="fas fa-times"></i> Fechar painel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);
        wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('#adminUserModal')?.addEventListener('click', event => {
            if (event.target?.id === 'adminUserModal') wrapper.remove();
        });
        setTimeout(() => {
            document.getElementById('adminUserName')?.focus();
        }, 40);
    };

    function setAdminUserModalFeedback(message = '', tone = 'info') {
        const feedback = document.getElementById('adminUserModalFeedback');
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `admin-user-modal-feedback ${message ? `is-${tone}` : ''}`;
        feedback.style.display = message ? 'block' : 'none';
    }

    window.createAdminUser = async function () {
        const saveButton = document.querySelector('#adminUserModal [data-save-admin-user]');
        const name = document.getElementById('adminUserName')?.value.trim();
        const email = document.getElementById('adminUserEmail')?.value.trim().toLowerCase();
        const phone = document.getElementById('adminUserPhone')?.value.trim() || '';
        const password = document.getElementById('adminUserPassword')?.value.trim();
        const userType = document.getElementById('adminUserType')?.value;
        const address = document.getElementById('adminUserAddress')?.value.trim() || '';

        if (!name || !email || !password) {
            setAdminUserModalFeedback('Preencha nome, e-mail e senha para criar o cadastro.', 'error');
            showAdminMessage('Preencha nome, e-mail e senha para criar o cadastro.', 'error');
            return;
        }

        const passwordValidationMessage = getPasswordValidationMessage(password);
        if (passwordValidationMessage) {
            setAdminUserModalFeedback(passwordValidationMessage, 'error');
            showAdminMessage(passwordValidationMessage, 'error');
            return;
        }

        if (users.some(user => String(user.email || '').trim().toLowerCase() === email)) {
            setAdminUserModalFeedback('Ja existe um usuario com este e-mail.', 'error');
            showAdminMessage('Ja existe um usuario com este e-mail.', 'error');
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }

        try {
            users.push({
                id: users.length ? Math.max(...users.map(user => Number(user.id) || 0)) + 1 : 1,
                name,
                email,
                phone,
                password,
                address,
                isAdmin: userType === 'admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            saveToLocalStorage();
            await persistDataToServer();

            let emailFailed = false;
            try {
                await postJsonWithResponse('/api/admin-user-created-email', { name, email });
            } catch (error) {
                emailFailed = true;
                console.error('Erro ao enviar e-mail de primeiro acesso:', error);
            }

            refreshAdminViews();
            document.getElementById('adminUserModal')?.parentElement?.remove();
            if (emailFailed) {
                showAdminMessage('Cadastro criado, mas o e-mail de primeiro acesso nao foi enviado.', 'error');
            } else {
                showAdminMessage('Cadastro criado e e-mail de primeiro acesso enviado com sucesso.', 'success');
            }
        } catch (error) {
            console.error('Erro ao criar cadastro no admin:', error);
            setAdminUserModalFeedback('Nao foi possivel salvar agora. Tente novamente.', 'error');
            showAdminMessage('Nao foi possivel salvar agora. Tente novamente.', 'error');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="fas fa-save"></i> Salvar cadastro';
            }
        }
    };
    globalThis.createAdminUser = window.createAdminUser;

    window.handleOrderStatusChange = function (budgetId, newStatus) {
        const budget = savedBudgets.find(item => Number(item.id) === Number(budgetId));
        const statusSelect = document.getElementById(`orderStatus${budgetId}`);
        if (!budget) return;

        if (newStatus === 'Cancelado') {
            if (statusSelect) statusSelect.value = budget.status;
            openBudgetCancellationModal(budgetId);
            return;
        }

        updateBudgetStatus(budgetId, newStatus);
    };

    saveBudget = async function () {
        if (isSavingBudgetNow) {
            showMessage('Seu orÃ§amento jÃ¡ estÃ¡ sendo salvo. Aguarde um instante.', 'info');
            return;
        }

        if (!cart.length) return showMessage('Adicione itens ao orcamento antes de salvar.', 'error');

        const cepInput = document.getElementById('cep');
        if (!cepInput?.value) return showMessage('Informe um CEP para calcular o frete.', 'error');

        if (!currentUser) {
            showMessage('Faca login para salvar seu orcamento.', 'error');
            return openLoginModal();
        }

        const eventDetails = getEventBriefFromForm();
        const validation = validateEventDetails(eventDetails);
        if (!validation.ok) return showMessage(`Preencha os dados da festa: ${validation.missing.join(', ')}.`, 'error');

        const logisticsConflict = getBudgetLogisticsConflict({ eventDetails });
        if (logisticsConflict) {
            const suggestion = findSuggestedScheduleSlot(eventDetails.deliveryDate, eventDetails.deliveryTime);
            return showMessage(buildConflictMessage(logisticsConflict, suggestion), 'error');
        }

        let subtotal = 0;
        const items = cart.map(item => {
            let unitPrice = item.price;
            if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) unitPrice = item.bulkDiscount.price;
            const total = unitPrice * item.quantity;
            subtotal += total;
            return { id: item.id, name: item.name, quantity: item.quantity, price: unitPrice, total };
        });

        const budget = {
            id: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            userEmail: currentUser.email || '',
            userPhone: currentUser.phone || '',
            date: new Date().toLocaleDateString('pt-BR'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items,
            subtotal,
            freight: freightValue,
            total: subtotal + freightValue,
            cep: cepInput.value,
            city: window.currentFreightResult?.city || eventDetails.city || '',
            state: window.currentFreightResult?.state || document.getElementById('deliveryState')?.value.trim() || '',
            status: 'Pendente',
            eventDetails,
            notes: eventDetails.notes,
            inventoryCommitted: false,
            origin: 'site-user'
        };

        const budgetFingerprint = getBudgetFingerprint(budget);
        const duplicateBudget = savedBudgets.find(item => {
            const itemStamp = new Date(item.createdAt || item.updatedAt || 0).getTime();
            const nowStamp = Date.now();
            return nowStamp - itemStamp <= 30000 && getBudgetFingerprint(item) === budgetFingerprint;
        });

        if (duplicateBudget) {
            openCustomerArea('budgets');
            showMessage('Esse orÃ§amento jÃ¡ foi salvo hÃ¡ instantes. Mantive apenas um registro.', 'info');
            return;
        }

        isSavingBudgetNow = true;
        setSaveBudgetButtonState(true);

        try {
            savedBudgets.unshift(budget);
            createLogisticsFromBudget(budget, eventDetails.responsible);
            syncFinancialEntriesFromBudgets();
            saveToLocalStorage();
            await persistDataToServer();

            cart = [];
            clearEventBriefForm();
            resetFreightFields();
            renderProducts();
            renderBudgetItems();
            updateBudgetSummary();
            openCustomerArea('budgets');
            showMessage('Orcamento salvo com sucesso. Ele ja esta na sua area e no painel administrativo.', 'success');

            postJson('/api/budget-email', {
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento',
                deliveryDate: budget.eventDetails?.deliveryDate || '',
                deliveryTime: budget.eventDetails?.deliveryTime || '',
                address: budget.eventDetails?.deliveryAddress || '',
                items: budget.items || []
            }, 10000).catch(error => {
                console.error('Erro ao enviar e-mail do orcamento:', error);
            });
        } finally {
            isSavingBudgetNow = false;
            setSaveBudgetButtonState(false);
        }
    };

    async function findAuthenticatedUser(email, password) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedPassword = String(password || '');
        const localUser = users.find(item =>
            String(item.email || '').trim().toLowerCase() === normalizedEmail
            && String(item.password || '') === normalizedPassword
        );
        if (localUser) return { ...localUser };

        if (!window.location?.protocol?.startsWith('http')) return null;

        try {
            const response = await fetch(`${getServerBaseUrl()}/api/app-data`, {
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) return null;
            const payload = await response.json().catch(() => ({}));
            const remoteSnapshot = payload?.data || null;
            const remoteUsers = Array.isArray(remoteSnapshot?.users) ? remoteSnapshot.users : [];
            const remoteUser = remoteUsers.find(item =>
                String(item.email || '').trim().toLowerCase() === normalizedEmail
                && String(item.password || '') === normalizedPassword
            );

            if (!remoteUser) return null;

            if (remoteSnapshot) {
                applyAppSnapshot(remoteSnapshot);
                saveToLocalStorage();
            }

            return { ...remoteUser };
        } catch (error) {
            console.warn('Falha ao consultar usuarios atualizados para login:', error);
            return null;
        }
    }

    handleLogin = async function () {
        const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
        const password = document.getElementById('loginPassword')?.value || '';
        const loginButton = document.getElementById('loginButton');

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = 'Entrando...';
        }
        try {
            if (!email || !password) {
                showLoginMessage('Preencha e-mail e senha.', 'error');
                return;
            }

            let authenticatedUser = null;
            if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
                authenticatedUser = {
                    id: 0,
                    email: ADMIN_CREDENTIALS.email,
                    name: ADMIN_CREDENTIALS.name,
                    isAdmin: true
                };
            } else {
                const user = await findAuthenticatedUser(email, password);
                if (!user) {
                    showLoginMessage('E-mail ou senha incorretos.', 'error');
                    return;
                }
                authenticatedUser = { ...user };
            }

            currentUser = authenticatedUser;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            forceCloseLoginModal();
            updateUserState();
            showLoginMessage('');

            try {
                updateSessionIdentity?.();
            } catch (error) {
                console.warn('Falha ao atualizar identidade da sessao:', error);
            }

            try {
                unlockBudgetSection(false);
            } catch (error) {
                console.warn('Falha ao liberar area de orcamento:', error);
            }

            try {
                showMessage(`Bem-vindo(a), ${currentUser.name}!`, 'success');
            } catch (error) {
                console.warn('Falha ao exibir mensagem de boas-vindas:', error);
            }

            try {
                const appliedIntent = applyPendingBudgetIntent();
                const appliedAISuggestions = applyPendingAISuggestions();
                const userBudgets = getCurrentCustomerBudgets();
                if (!appliedIntent && !appliedAISuggestions && userBudgets.length) {
                    openCustomerArea('budgets');
                }
            } catch (error) {
                console.warn('Falha ao abrir a area do cliente apos login:', error);
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            showLoginMessage('Nao foi possivel entrar agora. Tente novamente.', 'error');
        } finally {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'Entrar';
            }
        }
    };

    saveRegistrationForm = function (userId = null) {
        if (originalSaveRegistrationForm) {
            originalSaveRegistrationForm(userId);
            setTimeout(() => {
                if (currentUser) applyPendingBudgetIntent();
            }, 120);
        }
    };

    openRegistrationModal = function (user = null) {
        if (!originalOpenRegistrationModal) return;
        originalOpenRegistrationModal(user);
        if (!user) {
            setTimeout(() => {
                const cepField = document.getElementById('regCep');
                if (cepField) cepField.value = '';
            }, 0);
        }
    };

    logout = function () {
        if (typeof currentAccessSession !== 'undefined') {
            currentAccessSession = null;
        }
        document.getElementById('leadCaptureModal')?.remove();
        if (originalLogout) {
            originalLogout();
        }
    };

    window.openBudgetCancellationModal = function (budgetId) {
        const budget = savedBudgets.find(item => Number(item.id) === Number(budgetId));
        if (!budget) return;
        activeOrderCancelDraftId = Number(budgetId);
        refreshAdminViews();
        setTimeout(() => {
            const panel = document.getElementById(`orderCancelPanel${budgetId}`);
            panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById(`cancelReasonInline${budgetId}`)?.focus();
        }, 40);
    };

    window.closeBudgetCancellationPanel = function () {
        activeOrderCancelDraftId = null;
        refreshAdminViews();
    };

    window.confirmBudgetCancellation = function (budgetId) {
        const cancelReason = document.getElementById(`cancelReasonInline${budgetId}`)?.value.trim() || '';
        const suggestedDate = document.getElementById(`cancelSuggestedDateInline${budgetId}`)?.value || '';
        const suggestedTime = document.getElementById(`cancelSuggestedTimeInline${budgetId}`)?.value || '';
        const sendEmail = Boolean(document.getElementById(`cancelSendEmailInline${budgetId}`)?.checked);

        if (!cancelReason) {
            showAdminMessage('Informe uma justificativa para o cancelamento.', 'error');
            return;
        }

        activeOrderCancelDraftId = null;
        updateBudgetStatus(budgetId, 'Cancelado', { cancelReason, suggestedDate, suggestedTime, sendEmail, bypassCancelModal: true });
    };

    window.updateBudgetStatus = updateBudgetStatus = async function (budgetId, newStatus, options = {}) {
        const budget = savedBudgets.find(item => item.id === budgetId);
        if (!budget) return;

        if (newStatus === 'Cancelado' && !options.bypassCancelModal) {
            const statusSelect = document.getElementById(`orderStatus${budgetId}`);
            if (statusSelect) statusSelect.value = budget.status;
            openBudgetCancellationModal(budgetId);
            return;
        }

        const previousStatus = budget.status;
        const previousInventoryCommitted = budget.inventoryCommitted;

        if (['Aprovado', 'Finalizado'].includes(newStatus)) {
            const logisticsConflict = getBudgetLogisticsConflict({ budgetId: budget.id, eventDetails: budget.eventDetails || {} });
            if (logisticsConflict) {
                const suggestion = findSuggestedScheduleSlot(
                    budget.eventDetails?.deliveryDate || budget.eventDetails?.date || '',
                    budget.eventDetails?.deliveryTime || '09:00',
                    budget.id
                );
                refreshAdminViews();
                return showAdminMessage(buildConflictMessage(logisticsConflict, suggestion), 'error');
            }
        }

        if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
            const inventoryResult = applyInventoryForBudget(budget, 'out');
            if (!inventoryResult.ok) {
                refreshAdminViews();
                return showAdminMessage(inventoryResult.message, 'error');
            }
        }

        if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
            applyInventoryForBudget(budget, 'in');
        }

        budget.status = newStatus;
        budget.updatedAt = new Date().toISOString();
        createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
        syncFinancialEntriesFromBudgets();
        try {
            saveToLocalStorage();
            await persistDataToServer();
            renderProducts();
            renderBudgetItems();
            refreshAdminViews();

            const recipientEmail = String(
                budget.userEmail
                || users.find(user => Number(user.id) === Number(budget.userId))?.email
                || ''
            ).trim().toLowerCase();

            let emailFailed = false;
            if (previousStatus !== newStatus && recipientEmail && ['Aprovado', 'Cancelado'].includes(newStatus) && (newStatus !== 'Cancelado' || options.sendEmail !== false)) {
                try {
                    await postJsonWithResponse('/api/budget-status-email', {
                        email: recipientEmail,
                        customerName: budget.userName,
                        budgetId: budget.id,
                        status: newStatus,
                        total: formatCurrencyBRL(budget.total || 0),
                        eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento',
                        cancelReason: options.cancelReason || '',
                        suggestedDate: options.suggestedDate || '',
                        suggestedTime: options.suggestedTime || '',
                        originalDate: budget.eventDetails?.deliveryDate || '',
                        originalTime: budget.eventDetails?.deliveryTime || ''
                    });
                } catch (emailError) {
                    emailFailed = true;
                    console.error('Erro ao enviar e-mail de status:', emailError);
                }
            }

            if (emailFailed) {
                showAdminMessage(`Pedido #${budgetId} salvo como ${newStatus}, mas o e-mail ao cliente falhou.`, 'error');
            } else {
                showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
            }
        } catch (error) {
            console.error('Erro ao atualizar status do pedido:', error);
            budget.status = previousStatus;
            budget.inventoryCommitted = previousInventoryCommitted;
            syncFinancialEntriesFromBudgets();
            saveToLocalStorage();
            renderProducts();
            renderBudgetItems();
            refreshAdminViews();
            showAdminMessage('Nao foi possivel salvar a alteracao do status ou enviar o e-mail.', 'error');
        }
    };
    window.__mobilierFinalUpdateBudgetStatus = updateBudgetStatus;

    window.selectLogisticsDate = function (date) {
        window.logisticsSelectedDate = date || '';
        const logisticsTab = document.getElementById('adminLogisticsTab');
        if (logisticsTab) logisticsTab.innerHTML = renderAdminLogistics();
        setTimeout(() => {
            const detailPanel = document.getElementById('logisticsDetailPanel');
            if (!detailPanel) return;
            const isDesktop = window.matchMedia('(min-width: 1101px)').matches;
            detailPanel.scrollIntoView({
                behavior: 'smooth',
                block: isDesktop ? 'nearest' : 'start'
            });
        }, 60);
    };

    window.changeLogisticsMonth = function (offset) {
        logisticsViewDate = new Date(logisticsViewDate.getFullYear(), logisticsViewDate.getMonth() + offset, 1);
        const normalized = normalizeLogisticsEntries(false);
        const monthPrefix = `${logisticsViewDate.getFullYear()}-${String(logisticsViewDate.getMonth() + 1).padStart(2, '0')}`;
        const firstEntry = normalized.find(entry => String(entry.date || '').startsWith(monthPrefix));
        window.logisticsSelectedDate = firstEntry?.date || '';
        refreshAdminViews();
    };

    window.removeLogisticsEntry = function (entryId) {
        logisticsEntries = normalizeLogisticsEntries(false).filter(entry => entry.id !== entryId);
        if (window.logisticsSelectedDate && !logisticsEntries.some(entry => entry.date === window.logisticsSelectedDate)) {
            window.logisticsSelectedDate = '';
        }
        saveToLocalStorage();
        refreshAdminViews();
        showAdminMessage('Entrega removida com sucesso.', 'success');
    };

    function setLogisticsModalFeedback(message = '', tone = 'info') {
        const feedback = document.getElementById('logisticsModalFeedback');
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `logistics-modal-feedback ${message ? `is-${tone}` : ''}`;
        feedback.style.display = message ? 'block' : 'none';
    }

    function getNearbyLogisticsEntries(date, time) {
        if (!date) return [];
        const selectedStamp = time ? parseScheduleTimestamp(date, time) : null;
        return normalizeLogisticsEntries(false)
            .filter(entry => String(entry.date || '') === String(date))
            .map(entry => {
                const entryStamp = entry.time ? parseScheduleTimestamp(entry.date, entry.time) : null;
                const diffMinutes = selectedStamp && entryStamp ? Math.round(Math.abs(entryStamp - selectedStamp) / 60000) : null;
                return { ...entry, diffMinutes };
            })
            .sort((a, b) => {
                const aValue = a.diffMinutes ?? 99999;
                const bValue = b.diffMinutes ?? 99999;
                return aValue - bValue || String(a.time || '').localeCompare(String(b.time || ''));
            });
    }

    function renderLogisticsInsights(date, time) {
        const container = document.getElementById('logisticsInsights');
        if (!container) return;
        if (!date) {
            container.innerHTML = '<div class="finance-entry-helper-card"><span>Agenda do dia</span><strong>Escolha uma data para analisar a programacao.</strong></div>';
            return;
        }

        const entries = getNearbyLogisticsEntries(date, time);
        const criticalEntries = entries.filter(entry => entry.diffMinutes !== null && entry.diffMinutes <= 60);

        container.innerHTML = `
            <div class="finance-entry-helper-card ${criticalEntries.length ? 'is-critical' : ''}">
                <span>Conflito de agenda</span>
                <strong>${criticalEntries.length ? `${criticalEntries.length} entrega(s) no mesmo horario ou ate 1 hora de diferenca.` : 'Nenhum conflito encontrado para esse horario.'}</strong>
            </div>
            <div class="finance-entry-helper-card">
                <span>Agenda do dia</span>
                <strong>${entries.length ? `${entries.length} entrega(s) cadastradas nessa data.` : 'Dia ainda sem programacao registrada.'}</strong>
            </div>
            ${entries.length ? `
                <div class="logistics-insights-list">
                    ${entries.slice(0, 6).map(entry => `
                        <article class="logistics-insight-item ${entry.diffMinutes !== null && entry.diffMinutes <= 60 ? 'is-critical' : ''}">
                            <div>
                                <strong>${entry.time || '--:--'} - ${entry.eventName || 'Entrega'}</strong>
                                <p>${entry.location || 'Local nao informado'}</p>
                            </div>
                            <span>${entry.diffMinutes === null ? 'Mesmo dia' : entry.diffMinutes === 0 ? 'Mesmo horario' : `${entry.diffMinutes} min de diferenca`}</span>
                        </article>
                    `).join('')}
                </div>
            ` : ''}
            ${criticalEntries.length ? `<p class="logistics-insights-note">Evite salvar entregas no mesmo horario ou com ate 1 hora de diferenca para a mesma janela operacional.</p>` : ''}
        `;
    }

    window.openLogisticsModal = function () {
        document.getElementById('logisticsModal')?.parentElement?.remove();

        const selectedDate = window.logisticsSelectedDate || '';
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal" id="logisticsModal" style="display:block; background: rgba(3,7,18,0.82);">
                <div class="modal-content logistics-entry-modal">
                    <div class="modal-header">
                        <div>
                            <span class="budget-cancel-kicker">Operacao e entrega</span>
                            <h2>Nova entrega</h2>
                        </div>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="finance-entry-shell">
                            <section class="finance-entry-hero">
                                <div>
                                    <h3>Programe a logistica do evento</h3>
                                    <p>Cadastre festa, responsavel, contato, local e horario para a equipe visualizar com clareza.</p>
                                </div>
                                <div class="finance-entry-chips">
                                    <span class="finance-entry-chip"><i class="fas fa-truck"></i> Agenda mensal</span>
                                    <span class="finance-entry-chip"><i class="fas fa-map-marker-alt"></i> Entrega assistida</span>
                                </div>
                            </section>

                            <div id="logisticsModalFeedback" class="logistics-modal-feedback" style="display:none;"></div>

                            <section class="finance-entry-card">
                                <div class="finance-entry-card-head">
                                    <div>
                                        <h3>Dados da entrega</h3>
                                        <p>Preencha as informacoes principais para registrar a programacao.</p>
                                    </div>
                                </div>

                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="logisticsEventName">Festa / evento</label>
                                        <input type="text" id="logisticsEventName" placeholder="Ex: Casamento Ana e Pedro">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="logisticsResponsible">Responsavel</label>
                                        <input type="text" id="logisticsResponsible" placeholder="Motorista ou equipe">
                                    </div>
                                </div>

                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="logisticsDate">Data</label>
                                        <input type="date" id="logisticsDate" value="${selectedDate}">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="logisticsTime">Horario</label>
                                        <input type="time" id="logisticsTime">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="logisticsStatus">Status</label>
                                        <select id="logisticsStatus">
                                            <option value="Planejado">Planejado</option>
                                            <option value="Confirmado">Confirmado</option>
                                            <option value="Em rota">Em rota</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="logisticsContactName">Quem recebe</label>
                                        <input type="text" id="logisticsContactName" placeholder="Nome do contato no local">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="logisticsContactPhone">Telefone</label>
                                        <input type="text" id="logisticsContactPhone" placeholder="(00) 00000-0000">
                                    </div>
                                </div>

                                <div class="settings-form-group">
                                    <label for="logisticsLocation">Endereco / local</label>
                                    <input type="text" id="logisticsLocation" placeholder="Endereco completo da entrega">
                                </div>

                                <div class="settings-form-group">
                                    <label for="logisticsNotes">Observacoes</label>
                                    <textarea id="logisticsNotes" rows="4" placeholder="Acesso, referencia, montagem, antecedencia e instrucoes"></textarea>
                                </div>
                            </section>

                            <section class="finance-entry-card">
                                <div class="finance-entry-card-head">
                                    <div>
                                        <h3>Analise da agenda</h3>
                                        <p>Veja entregas do mesmo dia e horarios muito proximos antes de salvar.</p>
                                    </div>
                                </div>
                                <div id="logisticsInsights" class="finance-entry-helper-grid">
                                    <div class="finance-entry-helper-card">
                                        <span>Agenda do dia</span>
                                        <strong>Escolha uma data para analisar a programacao.</strong>
                                    </div>
                                </div>
                            </section>

                            <div class="finance-entry-actions">
                                <button type="button" class="cta-button" data-save-logistics-entry="true" onclick="createLogisticsEntry()"><i class="fas fa-save"></i> Salvar entrega</button>
                                <button type="button" class="secondary-btn logistics-close-btn cancel-btn"><i class="fas fa-times"></i> Fechar painel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);
        wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('#logisticsModal')?.addEventListener('click', event => {
            if (event.target?.id === 'logisticsModal') wrapper.remove();
        });
        ['logisticsDate', 'logisticsTime'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                renderLogisticsInsights(
                    document.getElementById('logisticsDate')?.value || '',
                    document.getElementById('logisticsTime')?.value || ''
                );
                setLogisticsModalFeedback('', 'info');
            });
        });
        renderLogisticsInsights(selectedDate, '');
        setTimeout(() => {
            document.getElementById('logisticsEventName')?.focus();
        }, 40);
    };
    globalThis.openLogisticsModal = window.openLogisticsModal;

    window.createLogisticsEntry = function () {
        const saveButton = document.querySelector('#logisticsModal [data-save-logistics-entry]');
        const eventName = document.getElementById('logisticsEventName')?.value.trim();
        const responsible = document.getElementById('logisticsResponsible')?.value.trim();
        const date = document.getElementById('logisticsDate')?.value;
        const time = document.getElementById('logisticsTime')?.value;
        const status = document.getElementById('logisticsStatus')?.value;
        const contactName = document.getElementById('logisticsContactName')?.value.trim();
        const contactPhone = document.getElementById('logisticsContactPhone')?.value.trim();
        const location = document.getElementById('logisticsLocation')?.value.trim();
        const notes = document.getElementById('logisticsNotes')?.value.trim();

        if (!eventName || !responsible || !date || !time || !contactName || !location) {
            setLogisticsModalFeedback('Preencha os campos principais da entrega para salvar.', 'error');
            showAdminMessage('Preencha os campos principais da entrega.', 'error');
            return;
        }

        const manualConflict = getBudgetLogisticsConflict({
            eventDetails: {
                deliveryDate: date,
                deliveryTime: time
            }
        });
        if (manualConflict) {
            const suggestion = findSuggestedScheduleSlot(date, time);
            setLogisticsModalFeedback(buildConflictMessage(manualConflict, suggestion), 'error');
            renderLogisticsInsights(date, time);
            showAdminMessage(buildConflictMessage(manualConflict, suggestion), 'error');
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }

        const entryPayload = {
            id: Date.now(),
            eventName,
            responsible,
            owner: responsible,
            date,
            time,
            status,
            contactName,
            receiverName: contactName,
            contactPhone,
            receiverPhone: contactPhone,
            location,
            notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const duplicateIndex = normalizeLogisticsEntries(false).findIndex(entry =>
            !entry.budgetId &&
            String(entry.eventName || '').trim().toLowerCase() === eventName.toLowerCase() &&
            String(entry.date || '') === date &&
            String(entry.time || '') === time &&
            String(entry.location || '').trim().toLowerCase() === location.toLowerCase()
        );

        if (duplicateIndex >= 0) {
            logisticsEntries[duplicateIndex] = { ...logisticsEntries[duplicateIndex], ...entryPayload };
        } else {
            logisticsEntries.unshift(entryPayload);
        }

        normalizeLogisticsEntries(true);
        window.logisticsSelectedDate = date;
        refreshAdminViews();
        document.getElementById('logisticsModal')?.parentElement?.remove();
        showAdminMessage('Entrega programada com sucesso.', 'success');
    };
    globalThis.createLogisticsEntry = window.createLogisticsEntry;

    window.renderAdminLogistics = renderAdminLogistics = function () {
        const normalized = normalizeLogisticsEntries(false);
        const month = logisticsViewDate.getMonth();
        const year = logisticsViewDate.getFullYear();
        const monthEntries = normalized
            .filter(entry => {
                const date = new Date(entry.date);
                return date.getMonth() === month && date.getFullYear() === year;
            })
            .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));

        const selectedDate = getSelectedLogisticsDate();
        const selectedEntries = monthEntries.filter(entry => entry.date === selectedDate);
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startWeekday = (firstDay.getDay() + 6) % 7;
        const totalCells = Math.ceil((startWeekday + lastDay.getDate()) / 7) * 7;

        let calendarHtml = '<div class="logistics-calendar-grid">';
        ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].forEach(day => {
            calendarHtml += `<div class="logistics-calendar-head">${day}</div>`;
        });

        for (let i = 0; i < totalCells; i++) {
            const dayNumber = i - startWeekday + 1;
            const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
            const isoDate = inMonth ? new Date(year, month, dayNumber).toISOString().slice(0, 10) : '';
            const dayEntries = inMonth ? monthEntries.filter(entry => entry.date === isoDate) : [];
            const isSelected = inMonth && isoDate === selectedDate;
            const conflictCount = dayEntries.filter(entry => {
                const compareTime = entry.time || '';
                return dayEntries.some(other => other.id !== entry.id && compareTime && other.time && Math.abs(parseScheduleTimestamp(entry.date, compareTime) - parseScheduleTimestamp(other.date, other.time)) <= 60 * 60 * 1000);
            }).length;

            calendarHtml += `
                <button type="button" class="logistics-calendar-day ${inMonth ? '' : 'is-empty'} ${isSelected ? 'is-selected' : ''}" ${inMonth ? `onclick="selectLogisticsDate('${isoDate}')"` : 'disabled'}>
                    ${inMonth ? `
                        <div class="logistics-day-top">
                            <div class="logistics-day-number">${dayNumber}</div>
                            ${dayEntries.length ? `<span class="logistics-day-count">${dayEntries.length}</span>` : ''}
                        </div>
                        <div class="logistics-day-events">
                            <div class="logistics-day-dots">
                                ${dayEntries.slice(0, 4).map((entry, index) => `<span class="logistics-day-dot ${conflictCount && index === 0 ? 'is-conflict' : ''}"></span>`).join('')}
                            </div>
                            ${dayEntries.length ? `<span class="logistics-day-preview">${dayEntries[0].time || '--:--'} ${dayEntries[0].eventName || 'Entrega'}</span>` : '<span class="logistics-day-preview is-empty">Disponivel</span>'}
                        </div>
                    ` : ''}
                </button>
            `;
        }

        calendarHtml += '</div>';

        const detailsHtml = selectedEntries.length ? `
            <div class="logistics-day-detail-list">
                ${selectedEntries.map(entry => `
                    <article class="logistics-detail-card">
                        <div class="logistics-detail-head">
                            <div>
                                <h4>${entry.eventName || 'Evento'}</h4>
                                <p>${formatDateBR(entry.date)} as ${entry.time || '--:--'}</p>
                            </div>
                            <span class="status-badge ${entry.status === 'Confirmado' ? 'status-available' : entry.status === 'Em rota' ? 'status-low' : entry.status === 'Entregue' ? 'status-available' : 'status-pending'}">${entry.status || 'Planejado'}</span>
                        </div>
                        <div class="logistics-detail-grid">
                            <div><span>Recebedor</span><strong>${entry.contactName || entry.receiverName || '-'}</strong></div>
                            <div><span>Telefone</span><strong>${entry.contactPhone || entry.receiverPhone || '-'}</strong></div>
                            <div><span>Responsavel</span><strong>${entry.owner || entry.responsible || '-'}</strong></div>
                            <div><span>Local</span><strong>${entry.location || '-'}</strong></div>
                        </div>
                        ${entry.notes ? `<p class="logistics-detail-notes">${entry.notes}</p>` : ''}
                        <div class="order-actions">
                            <button class="action-btn action-edit" onclick="viewBudgetDetailsAdmin(${Number(entry.budgetId || 0)})" ${entry.budgetId ? '' : 'disabled'}><i class="fas fa-eye"></i> Ver pedido</button>
                            <button class="action-btn action-delete" onclick="removeLogisticsEntry(${entry.id})"><i class="fas fa-trash"></i> Excluir</button>
                        </div>
                    </article>
                `).join('')}
            </div>
        ` : '<div class="customer-empty-state"><h4>Nenhuma programacao nesse dia</h4><p>Clique em um dia com agenda para ver entrega, responsavel, endereco e observacoes.</p></div>';

        return `
            <div class="section-header">
                <h2>Logistica</h2>
                <div class="admin-actions">
                    <button type="button" onclick="changeLogisticsMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                    <button type="button" onclick="changeLogisticsMonth(1)"><i class="fas fa-chevron-right"></i></button>
                    <button type="button" data-open-logistics-modal="true" onclick="openLogisticsModal()"><i class="fas fa-plus"></i> Nova entrega</button>
                </div>
            </div>
            <div class="logistics-board">
                <div class="report-card logistics-calendar-card">
                    <div class="section-header">
                        <div>
                            <h3 style="margin:0;">Agenda de ${getLogisticsMonthLabel(logisticsViewDate)}</h3>
                            <p style="margin:8px 0 0; color:rgba(255,255,255,0.72);">Clique no dia para ver os detalhes das entregas e retiradas programadas.</p>
                        </div>
                    </div>
                    ${calendarHtml}
                </div>
                <div class="report-card logistics-detail-panel" id="logisticsDetailPanel">
                    <div class="section-header">
                        <div>
                            <h3 style="margin:0;">${selectedDate ? `Programacao de ${formatDateBR(selectedDate)}` : 'Detalhes da programacao'}</h3>
                            <p style="margin:8px 0 0; color:rgba(255,255,255,0.72);">${selectedEntries.length ? `${selectedEntries.length} agendamento(s) nesse dia.` : 'Selecione um dia do calendario para visualizar a agenda.'}</p>
                        </div>
                    </div>
                    ${detailsHtml}
                </div>
            </div>
        `;
    };

    window.renderAdminProducts = renderAdminProducts = function () {
        const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
        const filteredProducts = getFilteredAdminProducts();
        const lowStock = products.filter(item => Number(item.stock || 0) > 0 && Number(item.stock || 0) < 20).length;
        const noStock = products.filter(item => Number(item.stock || 0) === 0).length;

        return `
            <div class="section-header">
                <h2>Cadastro e Estoque</h2>
                <div class="admin-actions">
                    <button id="addNewProduct"><i class="fas fa-plus"></i> Novo produto</button>
                </div>
            </div>
            <div class="inventory-summary-grid">
                <div class="report-card"><h3>${products.length}</h3><p>produtos cadastrados</p></div>
                <div class="report-card"><h3>${lowStock}</h3><p>com estoque baixo</p></div>
                <div class="report-card"><h3>${noStock}</h3><p>esgotados</p></div>
            </div>
            <div class="report-card" style="margin-bottom:20px;">
                <div class="form-row-3">
                    <div class="settings-form-group">
                        <label for="stockFilterName">Produto</label>
                        <input type="text" id="stockFilterName" placeholder="Buscar por nome" value="${adminProductFilters.name || ''}">
                    </div>
                    <div class="settings-form-group">
                        <label for="stockFilterCategory">Categoria</label>
                        <select id="stockFilterCategory">
                            <option value="">Todas</option>
                            ${categories.map(category => `<option value="${category}" ${adminProductFilters.category === category ? 'selected' : ''}>${category}</option>`).join('')}
                        </select>
                    </div>
                    <div class="settings-form-group">
                        <label for="stockFilterQuantity">Quantidade</label>
                        <select id="stockFilterQuantity">
                            <option value="" ${!adminProductFilters.quantity ? 'selected' : ''}>Todas</option>
                            <option value="available" ${adminProductFilters.quantity === 'available' ? 'selected' : ''}>Saudavel</option>
                            <option value="low" ${adminProductFilters.quantity === 'low' ? 'selected' : ''}>Estoque baixo</option>
                            <option value="out" ${adminProductFilters.quantity === 'out' ? 'selected' : ''}>Esgotado</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="adminProductsContainer">${renderAdminProductsTable(filteredProducts)}</div>
            <div class="report-card stock-log-card">
                <div class="section-header"><h2>Movimentacoes de estoque</h2></div>
                <div id="stockMovementsContainer">${renderStockMovementsTable()}</div>
            </div>
        `;
    };

    window.renderAdminProductsTable = renderAdminProductsTable = function (items = products) {
        if (!items.length) {
            return '<div class="empty-state"><i class="fas fa-box-open"></i><h3>Nenhum produto encontrado</h3><p>Ajuste os filtros ou cadastre novos itens.</p></div>';
        }

        return `
            <div class="products-table">
                <div class="table-header">
                    <div>ID</div>
                    <div>Midia</div>
                    <div>Produto</div>
                    <div>Categoria</div>
                    <div>Preco</div>
                    <div>Estoque</div>
                    <div>Status</div>
                    <div>Acoes</div>
                </div>
                ${items.map(product => {
                    const stock = Number(product.stock || 0);
                    const stockStatus = stock === 0 ? 'status-out' : (stock < 20 ? 'status-low' : 'status-available');
                    const statusText = stock === 0 ? 'Esgotado' : (stock < 20 ? 'Baixo' : 'Saudavel');
                    return `
                        <div class="table-row" data-product-name="${String(product.name || '').replace(/"/g, '&quot;')}" data-product-category="${String(product.category || '').replace(/"/g, '&quot;')}" data-product-stock="${stock}">
                            <div data-label="ID">${product.id}</div>
                            <div data-label="Midia">${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-thumb">` : `<i class="${product.image} product-icon"></i>`}</div>
                            <div data-label="Produto">${product.name}</div>
                            <div data-label="Categoria">${product.category}</div>
                            <div data-label="Preco">${formatCurrencyBRL(product.price)}</div>
                            <div data-label="Estoque">${stock}</div>
                            <div data-label="Status"><span class="status-badge ${stockStatus}">${statusText}</span></div>
                            <div data-label="Acoes">
                                <div class="action-buttons">
                                    <button class="action-btn action-edit" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                                    <button class="action-btn" onclick="openStockAdjustmentModal(${product.id}, 'entrada')"><i class="fas fa-arrow-down"></i></button>
                                    <button class="action-btn" onclick="openStockAdjustmentModal(${product.id}, 'saida')"><i class="fas fa-arrow-up"></i></button>
                                    <button class="action-btn action-delete" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.saveProductChanges = saveProductChanges = async function (productId) {
        const productIndex = products.findIndex(product => product.id === productId);
        if (productIndex === -1) return;

        const previousProduct = products[productIndex];
        const previousStock = Number(previousProduct.stock || 0);
        const productName = document.getElementById('editProductName')?.value.trim() || '';
        const productCategory = document.getElementById('editProductCategory')?.value || 'Outros';
        const rawDescription = document.getElementById('editProductDescription')?.value.trim() || '';
        const productDescription = rawDescription || `Produto ${productName || 'sem descricao'}`;
        const productPrice = parseFloat(document.getElementById('editProductPrice')?.value || '0');
        const productStock = parseInt(document.getElementById('editProductStock')?.value || '0', 10);
        const productIcon = document.getElementById('editProductIcon')?.value || previousProduct.image || 'fas fa-box';
        let productImageUrl = document.getElementById('editProductImageUrl')?.value.trim() || '';
        const bulkQuantity = parseInt(document.getElementById('editBulkQuantity')?.value || '0', 10);
        const bulkPrice = parseFloat(document.getElementById('editBulkPrice')?.value || '0');

        if (!productName || Number.isNaN(productPrice) || Number.isNaN(productStock)) {
            showAdminMessage('Preencha nome, preco e estoque do produto.', 'error');
            return;
        }

        let bulkDiscount = null;
        if (bulkQuantity > 0 && bulkPrice > 0 && bulkPrice < productPrice) {
            bulkDiscount = { quantity: bulkQuantity, price: bulkPrice };
        }

        const saveButton = document.querySelector('#productEditModal button[type="submit"]');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando produto...';
        }

        try {
            if (productImageUrl.startsWith('data:image/')) {
                const uploadResponse = await postJsonWithResponse('/api/product-image', { dataUrl: productImageUrl });
                if (uploadResponse?.imageUrl) {
                    productImageUrl = uploadResponse.imageUrl;
                }
            }

            products[productIndex] = {
                ...previousProduct,
                name: productName,
                category: productCategory,
                description: productDescription,
                price: productPrice,
                stock: productStock,
                image: productIcon,
                imageUrl: productImageUrl,
                bulkDiscount
            };

            const stockDifference = productStock - previousStock;
            if (stockDifference > 0) registerStockMovement(productId, 'entrada', stockDifference, 'Ajuste pelo cadastro do produto');
            if (stockDifference < 0) registerStockMovement(productId, 'saida', Math.abs(stockDifference), 'Ajuste pelo cadastro do produto');

            saveToLocalStorage();
            renderProducts();
            renderBudgetItems();
            refreshAdminViews();
            document.querySelector('#productEditModal')?.parentElement?.remove();
            showAdminMessage('Produto atualizado e refletido na vitrine inicial.', 'success');
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showAdminMessage(error.message || 'Nao foi possivel salvar o produto.', 'error');
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Salvar produto';
            }
        }
    };

    window.addNewProduct = addNewProduct = function () {
        const nextId = products.length ? Math.max(...products.map(product => Number(product.id || 0))) + 1 : 1;
        products.push({
            id: nextId,
            name: 'Novo produto',
            description: '',
            price: 0,
            stock: 0,
            bulkDiscount: null,
            image: 'fas fa-box',
            imageUrl: '',
            category: 'Outros'
        });
        saveToLocalStorage();
        refreshAdminViews();
        if (typeof editProduct === 'function') editProduct(nextId);
    };

    window.openStockAdjustmentModal = function (productId, movementType) {
        const product = products.find(item => item.id === productId);
        if (!product) return;

        const isEntry = movementType === 'entrada';
        const currentStock = Number(product.stock || 0);
        const presetReasons = isEntry
            ? ['Compra de reposicao', 'Devolucao de evento', 'Ajuste de inventario', 'Transferencia recebida']
            : ['Locacao aprovada', 'Perda ou avaria', 'Manutencao', 'Transferencia enviada'];

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal" id="stockAdjustmentModal" style="display:block; background: rgba(3,7,18,0.82);">
                <div class="modal-content stock-adjustment-modal">
                    <div class="modal-header">
                        <div class="stock-adjustment-title">
                            <span class="stock-adjustment-kicker">${isEntry ? 'Movimentacao de entrada' : 'Movimentacao de saida'}</span>
                            <h2>${isEntry ? 'Entrada de estoque' : 'Saida de estoque'}</h2>
                        </div>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="stock-adjustment-product-card">
                            <div class="stock-adjustment-product-visual">
                                ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : `<i class="${product.image || 'fas fa-box'}"></i>`}
                            </div>
                            <div class="stock-adjustment-product-copy">
                                <h3>${product.name}</h3>
                                <p>${product.description || 'Item do estoque operacional.'}</p>
                                <div class="stock-adjustment-pills">
                                    <span class="stock-adjustment-pill">Estoque atual: <strong>${currentStock}</strong></span>
                                    <span class="stock-adjustment-pill">Categoria: <strong>${product.category || 'Outros'}</strong></span>
                                    <span class="stock-adjustment-pill ${isEntry ? 'is-entry' : 'is-exit'}">${isEntry ? 'Entrada' : 'Saida'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="stock-adjustment-grid">
                            <div class="settings-form-group">
                                <label for="stockAdjustmentQty">Quantidade</label>
                                <input type="number" id="stockAdjustmentQty" min="1" value="1">
                            </div>
                            <div class="settings-form-group">
                                <label for="stockAdjustmentReason">Motivo principal</label>
                                <select id="stockAdjustmentReason">
                                    ${presetReasons.map(reason => `<option value="${reason}">${reason}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="stock-adjustment-metrics">
                            <div class="stock-adjustment-metric">
                                <span>Saldo atual</span>
                                <strong id="stockCurrentValue">${currentStock} un.</strong>
                            </div>
                            <div class="stock-adjustment-metric">
                                <span>Saldo projetado</span>
                                <strong id="stockProjectedValue">${isEntry ? currentStock + 1 : Math.max(currentStock - 1, 0)} un.</strong>
                            </div>
                        </div>

                        <div class="settings-form-group">
                            <label for="stockAdjustmentNote">Observacao</label>
                            <textarea id="stockAdjustmentNote" rows="3" placeholder="Detalhe o motivo da movimentacao para manter o historico mais claro."></textarea>
                        </div>

                        <div class="form-actions stock-adjustment-actions">
                            <button type="button" class="cta-button" onclick="applyStockAdjustment(${productId}, '${movementType}')">
                                <i class="fas ${isEntry ? 'fa-arrow-down' : 'fa-arrow-up'}"></i> ${isEntry ? 'Registrar entrada' : 'Registrar saida'}
                            </button>
                            <button type="button" class="cancel-btn">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        const qtyField = wrapper.querySelector('#stockAdjustmentQty');
        const projectedField = wrapper.querySelector('#stockProjectedValue');
        const updateProjectedValue = () => {
            const qty = Math.max(1, parseInt(qtyField?.value || '1', 10));
            const projected = isEntry ? currentStock + qty : Math.max(currentStock - qty, 0);
            if (projectedField) projectedField.textContent = `${projected} un.`;
        };

        qtyField?.addEventListener('input', updateProjectedValue);
        updateProjectedValue();

        wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('#stockAdjustmentModal')?.addEventListener('click', event => {
            if (event.target.id === 'stockAdjustmentModal') wrapper.remove();
        });
    };

    window.applyStockAdjustment = function (productId, movementType) {
        const product = products.find(item => item.id === productId);
        const quantity = parseInt(document.getElementById('stockAdjustmentQty')?.value || '0', 10);
        const reasonBase = document.getElementById('stockAdjustmentReason')?.value.trim() || 'Ajuste manual';
        const note = document.getElementById('stockAdjustmentNote')?.value.trim() || '';
        const reason = note ? `${reasonBase} - ${note}` : reasonBase;

        if (!product || quantity <= 0) {
            showAdminMessage('Informe uma quantidade valida.', 'error');
            return;
        }

        if (movementType === 'saida' && Number(product.stock || 0) < quantity) {
            showAdminMessage('Saida maior que o saldo atual.', 'error');
            return;
        }

        product.stock += movementType === 'entrada' ? quantity : -quantity;
        registerStockMovement(productId, movementType, quantity, reason);
        saveToLocalStorage();
        renderProducts();
        renderBudgetItems();
        refreshAdminViews();
        document.getElementById('stockAdjustmentModal')?.parentElement?.remove();
        showAdminMessage('Movimentacao registrada com sucesso.', 'success');
    };

    if (!window.__mobilierGlobalEscapeHandler) {
        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') return;
            const modal = Array.from(document.querySelectorAll('.modal')).filter(item => item.style.display !== 'none').pop();
            if (!modal) return;
            const wrapper = modal.parentElement;
            if (wrapper?.id === 'passwordResetTokenModal' || wrapper?.id === 'passwordRecoveryModal' || wrapper?.id === 'customerAreaModal') {
                wrapper.remove();
                return;
            }
            if (wrapper && wrapper !== document.body) {
                wrapper.remove();
            } else {
                modal.remove();
            }
        });
        window.__mobilierGlobalEscapeHandler = true;
    }

    if (!window.__mobilierLoginClickBridge) {
        document.addEventListener('click', function (event) {
            const loginButton = event.target.closest('#loginButton');
            if (!loginButton) return;
            event.preventDefault();
            handleLogin();
        });
        window.__mobilierLoginClickBridge = true;
    }

    if (!window.__mobilierCancelBudgetBridge) {
        const openCancelFromElement = function (element, event) {
            const cancelButton = element?.closest?.('[data-cancel-budget-id]');
            if (!cancelButton) return;
            event?.preventDefault?.();
            event?.stopPropagation?.();
            event?.stopImmediatePropagation?.();
            const budgetId = parseInt(cancelButton.getAttribute('data-cancel-budget-id') || '0', 10);
            if (!budgetId) return;
            openBudgetCancellationModal(budgetId);
        };

        document.addEventListener('pointerdown', function (event) {
            openCancelFromElement(event.target, event);
        }, true);

        document.addEventListener('click', function (event) {
            openCancelFromElement(event.target, event);
        }, true);

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            openCancelFromElement(event.target, event);
        }, true);

        document.addEventListener('change', function (event) {
            const select = event.target?.closest?.('.status-select');
            if (!select) return;
            const budgetIdMatch = String(select.id || '').match(/^orderStatus(\d+)$/);
            if (!budgetIdMatch) return;
            if (select.value !== 'Cancelado') return;
            event.preventDefault?.();
            event.stopPropagation?.();
            event.stopImmediatePropagation?.();
            const budgetId = parseInt(budgetIdMatch[1], 10);
            const budget = savedBudgets.find(item => Number(item.id) === budgetId);
            if (budget) select.value = budget.status;
            openBudgetCancellationModal(budgetId);
        }, true);

        window.__mobilierCancelBudgetBridge = true;
    }

    if (!window.__mobilierLogisticsModalBridge) {
        const openLogisticsFromElement = function (element, event) {
            const trigger = element?.closest?.('[data-open-logistics-modal], #adminLogisticsTab .admin-actions button, #adminPanel .admin-actions button');
            if (!trigger) return;
            const triggerText = (trigger.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const looksLikeLogisticsButton = trigger.hasAttribute('data-open-logistics-modal')
                || triggerText.includes('nova entrega');
            if (!looksLikeLogisticsButton) return;
            event?.preventDefault?.();
            event?.stopPropagation?.();
            event?.stopImmediatePropagation?.();
            window.openLogisticsModal?.();
        };

        document.addEventListener('pointerdown', function (event) {
            openLogisticsFromElement(event.target, event);
        }, true);

        document.addEventListener('click', function (event) {
            openLogisticsFromElement(event.target, event);
        }, true);

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            openLogisticsFromElement(event.target, event);
        }, true);

        document.addEventListener('click', function (event) {
            const saveButton = event.target?.closest?.('[data-save-logistics-entry]');
            if (!saveButton) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            event.stopImmediatePropagation?.();
            window.createLogisticsEntry?.();
        }, true);

        window.__mobilierLogisticsModalBridge = true;
    }

    if (!window.__mobilierAdminUserBridge) {
        document.addEventListener('click', function (event) {
            const saveButton = event.target?.closest?.('[data-save-admin-user]');
            if (!saveButton) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            event.stopImmediatePropagation?.();
            window.createAdminUser?.();
        }, true);

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' || !document.getElementById('adminUserModal')) return;
            const field = event.target;
            if (field?.tagName === 'TEXTAREA') return;
            event.preventDefault?.();
            window.createAdminUser?.();
        }, true);

        window.__mobilierAdminUserBridge = true;
    }

    if (typeof requestPasswordReset === 'function') {
        const originalRequestPasswordReset = requestPasswordReset;
        requestPasswordReset = async function () {
            const actionButton = document.getElementById('sendRecoveryEmailBtn');
            const messageBox = document.getElementById('recoveryMessage');

            if (actionButton) {
                actionButton.disabled = true;
                actionButton.classList.add('loading');
                actionButton.textContent = 'Enviando link';
            }

            if (messageBox) {
                messageBox.style.display = 'none';
                messageBox.textContent = '';
            }

            try {
                await originalRequestPasswordReset();
            } finally {
                if (actionButton) {
                    actionButton.disabled = false;
                    actionButton.classList.remove('loading');
                    actionButton.textContent = 'Enviar link';
                }
            }
        };
        window.requestPasswordReset = requestPasswordReset;
        globalThis.requestPasswordReset = requestPasswordReset;
    }

    if (typeof openPasswordResetFlowFromUrl === 'function') {
        openPasswordResetFlowFromUrl = function () {
            const params = new URLSearchParams(window.location.search);
            const email = params.get('email') || '';
            const token = params.get('resetToken') || '';
            if (!email || !token) return;

            document.getElementById('passwordResetTokenModal')?.remove();
            const wrapper = document.createElement('div');
            wrapper.id = 'passwordResetTokenModal';
            wrapper.innerHTML = `
                <div class="modal" style="display:block; background: rgba(3,7,18,0.78);">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div>
                                <span class="budget-cancel-kicker">Acesso seguro</span>
                                <h2>Criar nova senha</h2>
                            </div>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <p class="recovery-copy">Defina uma senha forte para voltar a acessar sua conta com seguranca.</p>
                            <div class="form-group">
                                <label for="resetPasswordNew">Nova senha</label>
                                <input type="password" id="resetPasswordNew" placeholder="Use letras e numeros, com pelo menos 8 caracteres">
                            </div>
                            <div class="form-group">
                                <label for="resetPasswordConfirm">Confirmar nova senha</label>
                                <input type="password" id="resetPasswordConfirm" placeholder="Repita a senha escolhida">
                            </div>
                            <div class="recovery-password-hint">
                                <span>Evite senhas faceis como 123456. Use uma combinacao mais forte.</span>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="confirmPasswordResetBtn" class="cta-button">Salvar nova senha</button>
                                <button type="button" class="btn-outline cancel-password-reset-btn">Fechar</button>
                            </div>
                            <div id="passwordResetMessage" class="login-message" style="display:none;"></div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(wrapper);
            const closeHandler = () => {
                wrapper.remove();
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('email');
                cleanUrl.searchParams.delete('resetToken');
                window.history.replaceState({}, document.title, cleanUrl.toString());
            };

            wrapper.querySelector('.close-modal')?.addEventListener('click', closeHandler);
            wrapper.querySelector('.cancel-password-reset-btn')?.addEventListener('click', closeHandler);
            wrapper.querySelector('.modal')?.addEventListener('click', event => {
                if (event.target === wrapper.querySelector('.modal')) closeHandler();
            });
            wrapper.querySelector('#confirmPasswordResetBtn')?.addEventListener('click', async () => {
                const actionButton = document.getElementById('confirmPasswordResetBtn');
                const newPassword = document.getElementById('resetPasswordNew')?.value || '';
                const confirmPassword = document.getElementById('resetPasswordConfirm')?.value || '';
                const messageBox = document.getElementById('passwordResetMessage');

                const showResetMessage = function (message, tone) {
                    if (!messageBox) return;
                    messageBox.style.display = 'block';
                    messageBox.className = `login-message ${tone}`;
                    messageBox.textContent = message;
                };

                const passwordValidationMessage = getPasswordValidationMessage(newPassword);
                if (passwordValidationMessage) {
                    showResetMessage(passwordValidationMessage, 'error');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showResetMessage('As senhas nao conferem.', 'error');
                    return;
                }

                if (actionButton) {
                    actionButton.disabled = true;
                    actionButton.classList.add('loading');
                    actionButton.textContent = 'Salvando';
                }

                try {
                    const response = await fetch(`${getMobilierApiBaseUrl()}/api/password-reset/confirm`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, token, newPassword })
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(data?.message || 'Nao foi possivel salvar a nova senha.');

                    const normalizedEmail = String(email || '').trim().toLowerCase();
                    const userIndex = users.findIndex(item => String(item.email || '').trim().toLowerCase() === normalizedEmail);
                    if (userIndex >= 0) {
                        users[userIndex] = {
                            ...users[userIndex],
                            password: newPassword,
                            updatedAt: new Date().toISOString()
                        };
                        saveToLocalStorage();
                    }

                    try {
                        await reconcileAppPersistence();
                    } catch (error) {
                        console.warn('Falha ao reconciliar dados apos redefinir senha:', error);
                    }

                    try {
                        const response = await fetch(`${getServerBaseUrl()}/api/app-data`, {
                            headers: { Accept: 'application/json' }
                        });
                        if (response.ok) {
                            const payload = await response.json().catch(() => ({}));
                            if (payload?.data) {
                                applyAppSnapshot(payload.data);
                                saveToLocalStorage();
                            }
                        }
                    } catch (error) {
                        console.warn('Falha ao atualizar dados locais apos redefinir senha:', error);
                    }

                    showResetMessage('Senha atualizada com sucesso. Agora voce ja pode entrar.', 'success');

                    setTimeout(() => {
                        closeHandler();
                        openLoginModal();
                        const loginEmail = document.getElementById('loginEmail');
                        if (loginEmail) loginEmail.value = email;
                        showLoginMessage('Sua senha foi redefinida. Entre com a nova senha.', 'success');
                    }, 900);
                } catch (error) {
                    showResetMessage(error.message || 'Nao foi possivel redefinir a senha.', 'error');
                } finally {
                    if (actionButton) {
                        actionButton.disabled = false;
                        actionButton.classList.remove('loading');
                        actionButton.textContent = 'Salvar nova senha';
                    }
                }
            });
        };
        window.openPasswordResetFlowFromUrl = openPasswordResetFlowFromUrl;
        globalThis.openPasswordResetFlowFromUrl = openPasswordResetFlowFromUrl;
    }

    if (!window.__mobilierPasswordRecoveryBridge) {
        document.addEventListener('click', function (event) {
            const trigger = event.target?.closest?.('#sendRecoveryEmailBtn');
            if (!trigger) return;
            event.preventDefault?.();
            event.stopPropagation?.();
            event.stopImmediatePropagation?.();
            window.requestPasswordReset?.();
        }, true);

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' || !document.getElementById('passwordRecoveryModal')) return;
            const field = event.target;
            if (field?.id !== 'recoveryEmail') return;
            event.preventDefault?.();
            window.requestPasswordReset?.();
        }, true);

        window.__mobilierPasswordRecoveryBridge = true;
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('budgetEntryCard')?.remove();
        normalizeLogisticsEntries(false);
        resetFreightFields();
        updateBudgetSummary();
        getPendingBudgetIntent();
        reconcileAppPersistence();
        setTimeout(() => {
            if (window.__mobilierFinalSaveToLocalStorage) saveToLocalStorage = window.__mobilierFinalSaveToLocalStorage;
            if (window.__mobilierFinalUpdateBudgetStatus) updateBudgetStatus = window.__mobilierFinalUpdateBudgetStatus;
            reconcileAppPersistence();
        }, 700);

        document.querySelectorAll('a[href="#budget"]').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                if (currentUser || hasUnlockedPrices()) {
                    unlockBudgetSection(true);
                    return;
                }
                openLeadCaptureModal({ source: 'budget_entry' });
            });
        });

        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.onclick = function (event) {
                event.preventDefault();
                handleLogin();
            };
        }

        document.addEventListener('input', function (event) {
            if (event.target?.id === 'stockFilterName') {
                event.stopImmediatePropagation();
                adminProductFilters.name = event.target.value || '';
                filterAdminProductsTableInPlace();
            }
        }, true);

        document.addEventListener('change', function (event) {
            if (event.target?.id === 'stockFilterCategory') {
                event.stopImmediatePropagation();
                adminProductFilters.category = event.target.value || '';
                filterAdminProductsTableInPlace();
            }

            if (event.target?.id === 'stockFilterQuantity') {
                event.stopImmediatePropagation();
                adminProductFilters.quantity = event.target.value || '';
                filterAdminProductsTableInPlace();
            }
        }, true);

        const loginPassword = document.getElementById('loginPassword');
        const loginEmail = document.getElementById('loginEmail');
        [loginPassword, loginEmail].forEach(field => {
            field?.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleLogin();
                }
            });
        });
    });

    window.openSaleModal = function () {
        const customers = users.filter(user => !user.isAdmin);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal" id="saleModal" style="display:block; background: rgba(3,7,18,0.78);">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Nova venda / locacao</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="sale-shell">
                            <div class="sale-intro-card">
                                <p>Cadastre o cliente, monte a festa, reserve o estoque e deixe entrega e financeiro prontos em um unico fluxo.</p>
                            </div>

                            <section class="sale-section-card">
                                <div class="sale-section-head">
                                    <div>
                                        <h3>Cliente e status</h3>
                                        <p>Escolha um cadastro existente ou preencha um novo cliente.</p>
                                    </div>
                                    <span class="sale-pill"><i class="fas fa-user"></i> Atendimento</span>
                                </div>
                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="saleCustomer">Cliente ja cadastrado</label>
                                        <select id="saleCustomer" onchange="prefillSaleCustomer()">
                                            <option value="">Novo cliente / preencher abaixo</option>
                                            ${customers.map(customer => `<option value="${customer.id}">${customer.name} â€¢ ${customer.email || customer.phone || 'sem contato'}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleStatus">Status inicial</label>
                                        <select id="saleStatus">
                                            <option value="Aprovado">Aprovado</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="Pendente">Pendente</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="saleCustomerName">Nome</label>
                                        <input type="text" id="saleCustomerName" placeholder="Nome do cliente">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleCustomerEmail">Email</label>
                                        <input type="email" id="saleCustomerEmail" placeholder="cliente@email.com">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleCustomerPhone">Telefone</label>
                                        <input type="text" id="saleCustomerPhone" placeholder="(00) 00000-0000">
                                    </div>
                                </div>
                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="saleCustomerAddress">Endereco</label>
                                        <input type="text" id="saleCustomerAddress" placeholder="Rua, numero, bairro, cidade">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleCustomerCpf">CPF</label>
                                        <input type="text" id="saleCustomerCpf" placeholder="000.000.000-00">
                                    </div>
                                </div>
                                <div class="settings-form-group">
                                    <label for="saleCustomerNotes">Informacoes importantes do cliente</label>
                                    <textarea id="saleCustomerNotes" rows="2" placeholder="Acessos, observacoes, preferencias, restricoes."></textarea>
                                </div>
                            </section>

                            <section class="sale-section-card">
                                <div class="sale-section-head">
                                    <div>
                                        <h3>Evento e operacao</h3>
                                        <p>Defina a festa, escolha entre entrega ou retirada e monte a agenda sem duplicar campos.</p>
                                    </div>
                                    <span class="sale-pill"><i class="fas fa-calendar-check"></i> Agenda</span>
                                </div>
                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="saleEventName">Nome da festa</label>
                                        <input type="text" id="saleEventName" placeholder="Ex: Casamento Ana e Pedro">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleEventType">Tipo do evento</label>
                                        <input type="text" id="saleEventType" placeholder="Casamento, corporativo, aniversario">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleEventDate">Data da festa</label>
                                        <input type="date" id="saleEventDate">
                                    </div>
                                </div>
                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="saleGuests">Convidados</label>
                                        <input type="number" id="saleGuests" min="0" value="0">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleCity">Cidade</label>
                                        <input type="text" id="saleCity" placeholder="Cidade do evento">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleVenueType">Ambiente</label>
                                        <input type="text" id="saleVenueType" placeholder="Interno, externo, salao, chacara">
                                    </div>
                                </div>
                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="saleFulfillmentType">Operacao</label>
                                        <select id="saleFulfillmentType">
                                            <option value="delivery">Entrega</option>
                                            <option value="pickup">Retirada</option>
                                        </select>
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleResponsible">Responsavel no local</label>
                                        <input type="text" id="saleResponsible" placeholder="Quem recebe ou retira">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleResponsiblePhone">Telefone do responsavel</label>
                                        <input type="text" id="saleResponsiblePhone" placeholder="(00) 00000-0000">
                                    </div>
                                </div>

                                <div id="saleDeliverySchedule" class="sale-fulfillment-panel is-active">
                                    <div class="form-row-2">
                                        <div class="settings-form-group">
                                            <label for="saleDeliveryDate">Data da entrega</label>
                                            <input type="date" id="saleDeliveryDate">
                                        </div>
                                        <div class="settings-form-group">
                                            <label for="saleDeliveryTime">Horario da entrega</label>
                                            <input type="time" id="saleDeliveryTime">
                                        </div>
                                    </div>
                                </div>

                                <div id="salePickupSchedule" class="sale-fulfillment-panel">
                                    <div class="form-row-2">
                                        <div class="settings-form-group">
                                            <label for="salePickupDate">Data da retirada</label>
                                            <input type="date" id="salePickupDate">
                                        </div>
                                        <div class="settings-form-group">
                                            <label for="salePickupTime">Horario da retirada</label>
                                            <input type="time" id="salePickupTime">
                                        </div>
                                    </div>
                                </div>

                                <div id="saleDeliveryAddressPanel" class="sale-fulfillment-panel is-active">
                                    <div class="sale-address-shell">
                                        <div class="form-row-2">
                                            <div class="settings-form-group">
                                                <label for="saleDeliveryCep">CEP da entrega</label>
                                                <div class="sale-cep-inline">
                                                    <input type="text" id="saleDeliveryCep" placeholder="00000-000">
                                                    <button type="button" class="secondary-btn" onclick="lookupSaleCep()">Buscar CEP</button>
                                                </div>
                                            </div>
                                            <div class="settings-form-group">
                                                <label for="saleDeliveryReference">Referencia</label>
                                                <input type="text" id="saleDeliveryReference" placeholder="Ponto de referencia, portao, salao, chacara">
                                            </div>
                                        </div>
                                        <div class="sale-address-grid">
                                            <div class="settings-form-group sale-address-street">
                                                <label for="saleDeliveryStreet">Rua / logradouro</label>
                                                <input type="text" id="saleDeliveryStreet" placeholder="Rua, avenida, estrada">
                                            </div>
                                            <div class="settings-form-group sale-address-number">
                                                <label for="saleDeliveryNumber">Numero</label>
                                                <input type="text" id="saleDeliveryNumber" placeholder="123">
                                            </div>
                                            <div class="settings-form-group">
                                                <label for="saleDeliveryComplement">Complemento</label>
                                                <input type="text" id="saleDeliveryComplement" placeholder="Casa, apto, bloco">
                                            </div>
                                            <div class="settings-form-group">
                                                <label for="saleDeliveryNeighborhood">Bairro</label>
                                                <input type="text" id="saleDeliveryNeighborhood" placeholder="Bairro">
                                            </div>
                                            <div class="settings-form-group sale-address-city">
                                                <label for="saleDeliveryCityState">Cidade / UF</label>
                                                <input type="text" id="saleDeliveryCityState" placeholder="Cidade / UF">
                                            </div>
                                        </div>
                                        <div id="saleCepMessage" class="sale-cep-feedback"></div>
                                    </div>
                                </div>

                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="saleDescription">Observacoes da festa / venda</label>
                                        <input type="text" id="saleDescription" placeholder="Montagem, acesso, observacoes comerciais">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="saleInternalAddressPreview">Endereco final</label>
                                        <input type="text" id="saleInternalAddressPreview" placeholder="Endereco montado automaticamente" readonly>
                                    </div>
                                </div>
                            </section>

                            <section class="sale-section-card">
                                <div class="sale-section-head">
                                    <div>
                                        <h3>Itens da venda</h3>
                                        <p>Informe quantidade e valor praticado em cada item.</p>
                                    </div>
                                    <span class="sale-pill"><i class="fas fa-box-open"></i> Estoque</span>
                                </div>
                                <div class="sale-items-grid">
                                    ${products.map(product => `
                                        <div class="sale-item-row">
                                            <div class="sale-item-name">
                                                <strong>${product.name}</strong>
                                                <span>${product.category || 'Categoria geral'} â€¢ estoque ${product.stock}</span>
                                            </div>
                                            <input type="number" id="saleQty${product.id}" min="0" max="${product.stock}" value="0" placeholder="Qtd">
                                            <input type="number" id="salePrice${product.id}" min="0" step="0.01" value="${Number(product.price || 0).toFixed(2)}" onfocus="updateSalePrice(${product.id})" placeholder="Preco">
                                            <div style="color: rgba(255,255,255,0.72); font-size: 0.92rem;">${formatCurrencyBRL(product.price || 0)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="sale-summary-bar">
                                    <div>
                                        <strong>Fluxo automatico</strong>
                                        <span>Pedido, financeiro, estoque e logistica serao atualizados juntos.</span>
                                    </div>
                                    <div class="form-actions" style="margin:0;">
                                        <button type="button" onclick="createDirectSale()">Salvar venda</button>
                                        <button type="button" class="secondary-btn" onclick="document.getElementById('saleModal')?.parentElement?.remove()">Cancelar</button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);
        wrapper.querySelector('#saleFulfillmentType')?.addEventListener('change', toggleSaleFulfillmentMode);
        ['saleDeliveryStreet', 'saleDeliveryNumber', 'saleDeliveryComplement', 'saleDeliveryNeighborhood', 'saleDeliveryCityState', 'saleDeliveryReference'].forEach(id => {
            wrapper.querySelector(`#${id}`)?.addEventListener('input', syncSaleAddressPreview);
        });
        wrapper.querySelector('#saleDeliveryCep')?.addEventListener('blur', () => {
            const cep = wrapper.querySelector('#saleDeliveryCep')?.value.trim() || '';
            if (cep.replace(/\D/g, '').length === 8) lookupSaleCep();
        });
        toggleSaleFulfillmentMode();
        syncSaleAddressPreview();
        wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
        wrapper.querySelector('#saleModal')?.addEventListener('click', event => {
            if (event.target?.id === 'saleModal') wrapper.remove();
        });
    };

    window.toggleSaleFulfillmentMode = function () {
        const mode = document.getElementById('saleFulfillmentType')?.value || 'delivery';
        const deliverySchedule = document.getElementById('saleDeliverySchedule');
        const pickupSchedule = document.getElementById('salePickupSchedule');
        const addressPanel = document.getElementById('saleDeliveryAddressPanel');
        const addressPreview = document.getElementById('saleInternalAddressPreview');

        deliverySchedule?.classList.toggle('is-active', mode === 'delivery');
        pickupSchedule?.classList.toggle('is-active', mode === 'pickup');
        addressPanel?.classList.toggle('is-active', mode === 'delivery');

        if (mode === 'pickup') {
            if (addressPreview) addressPreview.value = 'Retirada no local / balcÃ£o da Mobilier';
        } else {
            syncSaleAddressPreview();
        }
    };

    window.syncSaleAddressPreview = function () {
        const mode = document.getElementById('saleFulfillmentType')?.value || 'delivery';
        const addressPreview = document.getElementById('saleInternalAddressPreview');
        if (!addressPreview) return;
        if (mode === 'pickup') {
            addressPreview.value = 'Retirada no local / balcÃ£o da Mobilier';
            return;
        }

        const street = document.getElementById('saleDeliveryStreet')?.value.trim() || '';
        const number = document.getElementById('saleDeliveryNumber')?.value.trim() || '';
        const complement = document.getElementById('saleDeliveryComplement')?.value.trim() || '';
        const neighborhood = document.getElementById('saleDeliveryNeighborhood')?.value.trim() || '';
        const cityState = document.getElementById('saleDeliveryCityState')?.value.trim() || '';
        const reference = document.getElementById('saleDeliveryReference')?.value.trim() || '';

        addressPreview.value = [street, number, complement, neighborhood, cityState, reference ? `Ref. ${reference}` : '']
            .filter(Boolean)
            .join(', ');
    };

    window.lookupSaleCep = async function () {
        const cepField = document.getElementById('saleDeliveryCep');
        const cepMessage = document.getElementById('saleCepMessage');
        const rawCep = cepField?.value || '';
        const cep = rawCep.replace(/\D/g, '');

        if (!cepField || cep.length !== 8) {
            if (cepMessage) {
                cepMessage.className = 'sale-cep-feedback is-error';
                cepMessage.textContent = 'Informe um CEP valido com 8 numeros.';
            }
            return;
        }

        try {
            if (cepMessage) {
                cepMessage.className = 'sale-cep-feedback is-info';
                cepMessage.textContent = 'Buscando endereco...';
            }

            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!response.ok || data?.erro) throw new Error('CEP nao encontrado');

            document.getElementById('saleDeliveryStreet').value = data.logradouro || '';
            document.getElementById('saleDeliveryNeighborhood').value = data.bairro || '';
            document.getElementById('saleDeliveryCityState').value = [data.localidade || '', data.uf || ''].filter(Boolean).join(' / ');
            syncSaleAddressPreview();

            if (cepMessage) {
                cepMessage.className = 'sale-cep-feedback is-success';
                cepMessage.textContent = 'Endereco preenchido pelo CEP. Complete numero e complemento se precisar.';
            }
        } catch (error) {
            if (cepMessage) {
                cepMessage.className = 'sale-cep-feedback is-error';
                cepMessage.textContent = 'Nao foi possivel localizar esse CEP agora.';
            }
        }
    };

    window.createDirectSale = function () {
        const customer = ensureSaleCustomer();
        if (!customer) return;

        const mode = document.getElementById('saleFulfillmentType')?.value || 'delivery';
        const deliveryAddress = mode === 'pickup'
            ? 'Retirada no local / balcÃ£o da Mobilier'
            : (document.getElementById('saleInternalAddressPreview')?.value.trim() || '');

        const scheduleDate = mode === 'pickup'
            ? (document.getElementById('salePickupDate')?.value || '')
            : (document.getElementById('saleDeliveryDate')?.value || '');
        const scheduleTime = mode === 'pickup'
            ? (document.getElementById('salePickupTime')?.value || '')
            : (document.getElementById('saleDeliveryTime')?.value || '');

        const eventDetails = {
            eventName: document.getElementById('saleEventName')?.value.trim() || '',
            type: document.getElementById('saleEventType')?.value.trim() || '',
            date: document.getElementById('saleEventDate')?.value || '',
            guests: parseInt(document.getElementById('saleGuests')?.value || '0', 10) || 0,
            city: document.getElementById('saleCity')?.value.trim() || '',
            venueType: document.getElementById('saleVenueType')?.value.trim() || '',
            fulfillmentType: mode,
            deliveryDate: scheduleDate,
            deliveryTime: scheduleTime,
            returnDate: '',
            returnTime: '',
            responsible: document.getElementById('saleResponsible')?.value.trim() || '',
            responsiblePhone: document.getElementById('saleResponsiblePhone')?.value.trim() || '',
            deliveryAddress,
            deliveryCep: document.getElementById('saleDeliveryCep')?.value.trim() || '',
            notes: document.getElementById('saleDescription')?.value.trim() || ''
        };

        const missing = [];
        if (!eventDetails.eventName) missing.push('nome da festa');
        if (!eventDetails.type) missing.push('tipo do evento');
        if (!eventDetails.date) missing.push('data da festa');
        if (!eventDetails.city) missing.push('cidade');
        if (!eventDetails.deliveryDate) missing.push(mode === 'pickup' ? 'data da retirada' : 'data da entrega');
        if (!eventDetails.deliveryTime) missing.push(mode === 'pickup' ? 'horario da retirada' : 'horario da entrega');
        if (!eventDetails.responsible) missing.push('responsavel no local');
        if (!eventDetails.responsiblePhone) missing.push('telefone do responsavel');
        if (mode === 'delivery' && !eventDetails.deliveryAddress) missing.push('endereco da entrega');

        if (missing.length) {
            showAdminMessage(`Preencha os dados da festa: ${missing.join(', ')}.`, 'error');
            return;
        }

        const logisticsConflict = getBudgetLogisticsConflict({ eventDetails });
        if (logisticsConflict) {
            const suggestion = findSuggestedScheduleSlot(eventDetails.deliveryDate, eventDetails.deliveryTime);
            showAdminMessage(buildConflictMessage(logisticsConflict, suggestion), 'error');
            return;
        }

        const items = [];
        let subtotal = 0;
        for (const product of products) {
            const quantity = parseInt(document.getElementById(`saleQty${product.id}`)?.value || '0', 10);
            const price = parseFloat(document.getElementById(`salePrice${product.id}`)?.value || '0');
            if (quantity > 0) {
                if (quantity > product.stock) {
                    showAdminMessage(`Estoque insuficiente para ${product.name}.`, 'error');
                    return;
                }
                const total = quantity * price;
                subtotal += total;
                items.push({ id: product.id, name: product.name, quantity, price, total });
            }
        }

        if (!items.length) {
            showAdminMessage('Selecione ao menos um item para a venda.', 'error');
            return;
        }

        const budget = {
            id: Date.now(),
            userId: customer.id,
            userName: customer.name,
            userEmail: customer.email || '',
            userPhone: customer.phone || '',
            date: new Date().toLocaleDateString('pt-BR'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items,
            subtotal,
            freight: 0,
            total: subtotal,
            cep: eventDetails.deliveryCep || '',
            city: eventDetails.city,
            state: (document.getElementById('saleDeliveryCityState')?.value.split('/')[1] || '').trim(),
            status: document.getElementById('saleStatus')?.value || 'Aprovado',
            eventDetails,
            notes: eventDetails.notes,
            inventoryCommitted: false,
            origin: 'admin-direct-sale'
        };

        if (['Aprovado', 'Finalizado'].includes(budget.status)) {
            const inventoryResult = applyInventoryForBudget(budget, 'out');
            if (!inventoryResult.ok) {
                showAdminMessage(inventoryResult.message, 'error');
                return;
            }
            createLogisticsFromBudget(budget, eventDetails.responsible);
        }

        savedBudgets.unshift(budget);
        syncFinancialEntriesFromBudgets();
        saveToLocalStorage();
        renderProducts();
        renderBudgetItems();
        refreshAdminViews();
        document.getElementById('saleModal')?.parentElement?.remove();

        const summary = buildSaleItemsSummary(items);
        showAdminMessage(`Venda criada para ${customer.name}: ${summary.units} itens e total de ${formatCurrencyBRL(summary.subtotal)}.`, 'success');
    };

    window.openFinancialEntryModal = function () {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal" id="financialEntryModal" style="display:block; background: rgba(3,7,18,0.82);">
                <div class="modal-content finance-entry-modal">
                    <div class="modal-header">
                        <div class="finance-entry-title">
                            <span class="finance-entry-kicker">Lancamento operacional</span>
                            <h2>Nova despesa</h2>
                        </div>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="finance-entry-shell">
                            <section class="finance-entry-hero">
                                <div>
                                    <h3>Registre uma despesa com mais clareza</h3>
                                    <p>Centralize transporte, equipe, manutencao, marketing e custos gerais com uma ficha mais organizada para o financeiro.</p>
                                </div>
                                <div class="finance-entry-chips">
                                    <span class="finance-entry-chip"><i class="fas fa-wallet"></i> Sai no saldo</span>
                                    <span class="finance-entry-chip"><i class="fas fa-chart-line"></i> Entra nos indicadores</span>
                                </div>
                            </section>

                            <section class="finance-entry-card">
                                <div class="finance-entry-card-head">
                                    <div>
                                        <h3>Dados da despesa</h3>
                                        <p>Descreva o custo e classifique corretamente para manter os relatÃ³rios mais limpos.</p>
                                    </div>
                                    <span class="finance-entry-pill"><i class="fas fa-receipt"></i> Despesa</span>
                                </div>

                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="financialDescription">Descricao</label>
                                        <input type="text" id="financialDescription" placeholder="Ex: transporte para evento em Curitiba">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="financialCategory">Categoria</label>
                                        <select id="financialCategory">
                                            <option value="Operacional">Operacional</option>
                                            <option value="Transporte">Transporte</option>
                                            <option value="Equipe">Equipe</option>
                                            <option value="Manutencao">Manutencao</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Infraestrutura">Infraestrutura</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-row-3">
                                    <div class="settings-form-group">
                                        <label for="financialAmount">Valor</label>
                                        <input type="number" id="financialAmount" min="0" step="0.01" placeholder="0.00">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="financialDueDate">Vencimento</label>
                                        <input type="date" id="financialDueDate">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="financialStatus">Status inicial</label>
                                        <select id="financialStatus">
                                            <option value="Previsto">Previsto</option>
                                            <option value="Recebido">Pago</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="finance-entry-helper-grid">
                                    <div class="finance-entry-helper-card">
                                        <span>Categoria escolhida</span>
                                        <strong id="financialCategoryPreview">Operacional</strong>
                                    </div>
                                    <div class="finance-entry-helper-card">
                                        <span>Impacto no saldo</span>
                                        <strong id="financialAmountPreview">R$ 0,00</strong>
                                    </div>
                                </div>
                            </section>

                            <div class="finance-entry-actions">
                                <button type="button" class="cta-button" onclick="createFinancialEntry()">
                                    <i class="fas fa-save"></i> Salvar despesa
                                </button>
                                <button type="button" class="secondary-btn cancel-btn">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper);

        const modal = wrapper.querySelector('#financialEntryModal');
        const closeButton = wrapper.querySelector('.close-modal');
        const cancelButton = wrapper.querySelector('.cancel-btn');
        const categoryField = wrapper.querySelector('#financialCategory');
        const amountField = wrapper.querySelector('#financialAmount');
        const categoryPreview = wrapper.querySelector('#financialCategoryPreview');
        const amountPreview = wrapper.querySelector('#financialAmountPreview');

        const syncPreview = () => {
            if (categoryPreview) categoryPreview.textContent = categoryField?.value || 'Operacional';
            if (amountPreview) amountPreview.textContent = formatCurrencyBRL(parseFloat(amountField?.value || '0') || 0);
        };

        syncPreview();
        categoryField?.addEventListener('change', syncPreview);
        amountField?.addEventListener('input', syncPreview);

        closeButton?.addEventListener('click', () => wrapper.remove());
        cancelButton?.addEventListener('click', () => wrapper.remove());
        modal?.addEventListener('click', event => {
            if (event.target?.id === 'financialEntryModal') wrapper.remove();
        });
    };

    renderAdminFinance = function () {
        const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
        const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
        const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
        const balance = received - expenses;

        return `
            <div class="section-header">
                <div>
                    <h2>Financeiro</h2>
                    <p style="margin:8px 0 0; color: rgba(255,255,255,0.7);">Acompanhe recebido, previsto, despesas e saldo operacional. Use esta aba para lancamentos e para a venda manual feita pelo admin.</p>
                </div>
                <div class="admin-actions">
                    <button onclick="openSaleModal()"><i class="fas fa-cash-register"></i> Nova venda</button>
                    <button onclick="openFinancialEntryModal()"><i class="fas fa-receipt"></i> Nova despesa</button>
                </div>
            </div>
            <div class="inventory-summary-grid">
                <div class="report-card"><h3>${formatCurrencyBRL(received)}</h3><p>recebido</p></div>
                <div class="report-card"><h3>${formatCurrencyBRL(receivable)}</h3><p>previsto / a receber</p></div>
                <div class="report-card"><h3>${formatCurrencyBRL(expenses)}</h3><p>despesas</p></div>
                <div class="report-card"><h3>${formatCurrencyBRL(balance)}</h3><p>saldo operacional</p></div>
            </div>
            <div class="report-card">
                <h3 style="margin-bottom: 16px;">Vendas, contratos e movimentacao financeira</h3>
                <div class="finance-table-wrapper">${renderFinancialEntriesTable()}</div>
            </div>
        `;
    };

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            reconcileAppPersistence();
        }
    });

    window.renderAISuggestions = function (suggestions, container) {
        if (!container) return;
        window.lastAISuggestions = Array.isArray(suggestions) ? suggestions : [];

        const cards = window.lastAISuggestions.map(suggestion => `
            <div class="ai-suggestion-item">
                <h4><i class="${suggestion.icon}"></i> ${suggestion.title}</h4>
                <ul>
                    ${(suggestion.items || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                ${suggestion.totalGuests ? `<p><strong>Estimativa para ${suggestion.totalGuests} convidados</strong></p>` : ''}
                ${suggestion.note ? `<p><em>${suggestion.note}</em></p>` : ''}
            </div>
        `).join('');

        container.innerHTML = `
            ${cards}
            <div style="text-align:center; margin-top:20px;">
                <button id="applySuggestions" type="button" class="cta-button" data-apply-ai-suggestions="true">
                    <i class="fas fa-magic"></i> Aplicar sugestao
                </button>
            </div>
        `;

        container.querySelector('[data-apply-ai-suggestions]')?.addEventListener('click', () => {
            window.applyAISuggestions(window.lastAISuggestions || []);
        });
    };
    globalThis.renderAISuggestions = window.renderAISuggestions;

    window.applyAISuggestions = function (suggestions = []) {
        const intents = buildAISuggestionIntents(suggestions);
        if (!intents.length) {
            showMessage('Nao encontrei itens disponiveis para aplicar nessa sugestao.', 'error');
            return;
        }

        if (!currentUser) {
            setPendingAISuggestionIntents(intents);
            openLoginModal();
            showLoginMessage('Entre para aplicar essa sugestao da IA ao seu orcamento.', 'info');
            document.getElementById('loginEmail')?.focus();
            return;
        }

        const addedItems = applyAISuggestionIntents(intents);
        if (addedItems > 0) {
            unlockBudgetSection(false);
            showMessage('Sugestoes da IA aplicadas ao seu orcamento.', 'success');
        } else {
            showMessage('Nenhum item da sugestao foi adicionado.', 'error');
        }
    };
    globalThis.applyAISuggestions = window.applyAISuggestions;
})();

