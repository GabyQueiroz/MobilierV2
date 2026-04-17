// ============================================
// DADOS DO SISTEMA
// ============================================

const companyData = {
    name: "Mobilier - Mobiliário para Eventos",
    instagram: "@mobilier_mobiliario",
    phone: "(41) 99999-9999",
    email: "contato@mobilier.com.br",
    deliveryStates: ["PR", "SC"]
};

let products = [
    {
        id: 1,
        name: "Cadeira de Madeira Maciça",
        description: "Cadeira rústica em madeira maciça, ideal para casamentos e eventos rurais.",
        price: 15.00,
        stock: 250,
        bulkDiscount: { quantity: 200, price: 14.00 },
        image: "fas fa-chair",
        category: "Cadeiras"
    },
    {
        id: 2,
        name: "Mesa Redonda 1,5m",
        description: "Mesa redonda para 8 pessoas, estrutura em metal e tampo de MDF.",
        price: 120.00,
        stock: 50,
        bulkDiscount: { quantity: 10, price: 110.00 },
        image: "fas fa-table",
        category: "Mesas"
    },
    {
        id: 3,
        name: "Puff de Couro Sintético",
        description: "Puff moderno em couro sintético, disponível em várias cores.",
        price: 45.00,
        stock: 100,
        bulkDiscount: null,
        image: "fas fa-couch",
        category: "Assentos"
    },
    {
        id: 4,
        name: "Biombo Decorativo",
        description: "Biombo em madeira com detalhes em tecido para divisórias.",
        price: 180.00,
        stock: 20,
        bulkDiscount: null,
        image: "fas fa-border-none",
        category: "Decoração"
    },
    {
        id: 5,
        name: "Cadeira Dobrável Plástico",
        description: "Cadeira dobrável em plástico resistente, fácil transporte e armazenamento.",
        price: 12.00,
        stock: 300,
        bulkDiscount: { quantity: 100, price: 10.50 },
        image: "fas fa-chair",
        category: "Cadeiras"
    },
    {
        id: 6,
        name: "Mesa Retangular 2m",
        description: "Mesa retangular para banquetes e eventos corporativos.",
        price: 150.00,
        stock: 30,
        bulkDiscount: { quantity: 5, price: 140.00 },
        image: "fas fa-table",
        category: "Mesas"
    },
    {
        id: 7,
        name: "Sofá de Canto",
        description: "Sofá de canto em tecido resistente, ideal para área de descanso.",
        price: 350.00,
        stock: 10,
        bulkDiscount: null,
        image: "fas fa-couch",
        category: "Assentos"
    },
    {
        id: 8,
        name: "Barril de Cerveja Decorativo",
        description: "Barril decorativo para servir drinks ou como elemento cenográfico.",
        price: 220.00,
        stock: 15,
        bulkDiscount: null,
        image: "fas fa-wine-bottle",
        category: "Decoração"
    }
];

let cart = [];
let freightValue = 0;
let users = [];
let currentUser = null;
let savedBudgets = [];
let stockMovements = [];
let financialEntries = [];

const ADMIN_CREDENTIALS = {
    email: "mobiliermobiliario@gmail.com",
    password: "admin20262026",
    name: "Administrador",
    isAdmin: true
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema Mobilier iniciando...');
    
    loadFromLocalStorage();
    initializeUsers();
    initUI();
    setupEventListeners();
    
    console.log('Sistema pronto!');
});

function initUI() {
    renderProducts();
    renderBudgetItems();
    updateCartDisplay();
    updateBudgetSummary();
    updateUserState();
}

function setupEventListeners() {
    // Menu mobile
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('show');
            this.innerHTML = navMenu.classList.contains('show') ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        });
    }
    
    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (currentUser) {
                showUserMenu();
            } else {
                openLoginModal();
            }
        });
    }
    
    // Close menus when clicking outside
    document.addEventListener('click', function() {
        closeUserMenu();
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) navMenu.classList.remove('show');
    });
    
    // Login modal
    document.querySelector('.close-login-modal')?.addEventListener('click', closeLoginModal);
    document.getElementById('loginButton')?.addEventListener('click', handleLogin);
    document.getElementById('registerButton')?.addEventListener('click', handleRegister);
    
    // CEP
    document.getElementById('checkCep')?.addEventListener('click', checkCep);
    document.getElementById('saveBudget')?.addEventListener('click', saveBudget);
    document.getElementById('clearBudget')?.addEventListener('click', clearBudget);
    
    // AI Assistant
    document.getElementById('aiSuggest')?.addEventListener('click', getAISuggestions);
    
    // CEP formatting
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.substring(0, 5) + '-' + value.substring(5, 8);
            }
            e.target.value = value;
        });
        
        cepInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkCep();
            }
        });
    }
}

// ============================================
// SISTEMA DE USUÁRIOS
// ============================================

function initializeUsers() {
    if (users.length === 0) {
        users.push({
            id: 1,
            email: ADMIN_CREDENTIALS.email,
            password: ADMIN_CREDENTIALS.password,
            name: ADMIN_CREDENTIALS.name,
            isAdmin: true,
            createdAt: new Date().toISOString()
        });
        saveToLocalStorage();
    }
    
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            sessionStorage.removeItem('currentUser');
        }
    }
}

function showUserMenu() {
    const existingMenu = document.querySelector('.user-dropdown');
    if (existingMenu) existingMenu.remove();
    
    const userMenuBtn = document.querySelector('.user-menu');
    const rect = userMenuBtn.getBoundingClientRect();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown active';
    dropdown.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 5}px;
        right: ${window.innerWidth - rect.right}px;
        background: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        border-radius: 10px;
        min-width: 250px;
        z-index: 1000;
        overflow: hidden;
        border: 1px solid #eee;
    `;
    
    let menuHTML = '<ul style="list-style: none; padding: 0; margin: 0;">';
    
    if (currentUser) {
        if (currentUser.isAdmin) {
            menuHTML += `
                <li>
                    <a href="#" id="adminLink" style="display: flex; align-items: center; gap: 10px; padding: 15px 20px; text-decoration: none; color: #333; border-bottom: 1px solid #eee; transition: background 0.2s;">
                        <i class="fas fa-tools"></i> Painel Administrativo
                    </a>
                </li>
            `;
        }
        
        menuHTML += `
            <li>
                <a href="#" id="myBudgetsLink" style="display: flex; align-items: center; gap: 10px; padding: 15px 20px; text-decoration: none; color: #333; border-bottom: 1px solid #eee; transition: background 0.2s;">
                    <i class="fas fa-file-invoice-dollar"></i> Meus Orçamentos
                </a>
            </li>
            <li>
                <a href="#" id="myProfileLink" style="display: flex; align-items: center; gap: 10px; padding: 15px 20px; text-decoration: none; color: #333; border-bottom: 1px solid #eee; transition: background 0.2s;">
                    <i class="fas fa-user-cog"></i> Meu Perfil
                </a>
            </li>
            <li>
                <button id="logoutButton" style="display: flex; align-items: center; gap: 10px; padding: 15px 20px; width: 100%; border: none; background: none; cursor: pointer; color: #333; text-align: left; transition: background 0.2s;">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            </li>
        `;
    }
    
    menuHTML += '</ul>';
    dropdown.innerHTML = menuHTML;
    
    document.body.appendChild(dropdown);
    
    setTimeout(() => {
        document.getElementById('myBudgetsLink')?.addEventListener('click', function(e) {
            e.preventDefault();
            closeUserMenu();
            showMyBudgets();
        });
        
        document.getElementById('myProfileLink')?.addEventListener('click', function(e) {
            e.preventDefault();
            closeUserMenu();
            showMyProfile();
        });
        
        document.getElementById('adminLink')?.addEventListener('click', function(e) {
            e.preventDefault();
            closeUserMenu();
            openAdminPanel();
        });
        
        document.getElementById('logoutButton')?.addEventListener('click', function() {
            logout();
            closeUserMenu();
        });
        
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }, 10);
}

function closeUserMenu() {
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) dropdown.remove();
}

function updateUserState() {
    const userNameSpan = document.getElementById('userName');
    const userMenuBtn = document.querySelector('.user-menu-btn i');
    
    if (userNameSpan && userMenuBtn) {
        if (currentUser) {
            let userNameText = currentUser.name;
            if (currentUser.isAdmin) {
                userNameText += ' <span class="admin-badge">ADMIN</span>';
            }
            userNameSpan.innerHTML = userNameText;
            userMenuBtn.className = 'fas fa-user-check';
        } else {
            userNameSpan.textContent = 'Entrar';
            userMenuBtn.className = 'fas fa-user';
        }
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showLoginMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        currentUser = {
            id: 0,
            email: ADMIN_CREDENTIALS.email,
            name: ADMIN_CREDENTIALS.name,
            isAdmin: true
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeLoginModal();
        updateUserState();
        showMessage('Login como administrador realizado!', 'success');
        return;
    }
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin || false
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeLoginModal();
        updateUserState();
        showMessage(`Bem-vindo(a), ${user.name}!`, 'success');
    } else {
        showLoginMessage('E-mail ou senha incorretos.', 'error');
    }
}

function handleRegister() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showLoginMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showLoginMessage('Por favor, insira um e-mail válido.', 'error');
        return;
    }
    
    if (users.some(u => u.email === email)) {
        showLoginMessage('Este e-mail já está cadastrado.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showLoginMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }
    
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        email: email,
        password: password,
        name: email.split('@')[0],
        isAdmin: false,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveToLocalStorage();
    
    currentUser = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAdmin: false
    };
    
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    closeLoginModal();
    updateUserState();
    showMessage(`Conta criada com sucesso! Bem-vindo(a), ${newUser.name}!`, 'success');
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    updateUserState();
    updateBudgetGateState();
    showMessage('Logout realizado com sucesso.', 'success');
}

function showLoginMessage(message, type) {
    const loginMessage = document.getElementById('loginMessage');
    if (loginMessage) {
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
    }
}

// ============================================
// MODAIS
// ============================================

function openLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginMessage').textContent = '';
    }
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

// ============================================
// MEUS ORÇAMENTOS
// ============================================

function showMyBudgets() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    
    const userBudgets = savedBudgets.filter(budget => budget.userId === currentUser.id);
    
    if (userBudgets.length === 0) {
        showMessage('Você não tem orçamentos salvos.', 'info');
        return;
    }
    
    createBudgetModal(userBudgets, 'Meus Orçamentos');
}

function createBudgetModal(budgets, title) {
    const existingModal = document.getElementById('budgetsModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'budgetsModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    
    let modalHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>${title}</h2>
                <span class="close-budgets-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
    `;
    
    const sortedBudgets = budgets.sort((a, b) => b.id - a.id);
    
    if (sortedBudgets.length === 0) {
        modalHTML += '<p class="empty-message">Nenhum orçamento encontrado.</p>';
    } else {
        sortedBudgets.forEach(budget => {
            const itemsList = budget.items.map(item => 
                `${item.quantity}x ${item.name.substring(0, 30)}${item.name.length > 30 ? '...' : ''}`
            ).join(', ');
            
            modalHTML += `
                <div class="budget-item" style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <span style="color: #666; font-size: 0.9em;">${budget.date}</span>
                            ${budget.userName && budget.userName !== currentUser?.name ? `<p style="margin: 5px 0 0 0; font-size: 0.9em; color: #888;">Cliente: ${budget.userName}</p>` : ''}
                            <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #888;">Itens: ${itemsList}</p>
                            <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #888;">CEP: ${budget.cep}</p>
                        </div>
                        <span style="font-weight: bold; color: #d4af37; font-size: 1.2em;">R$ ${budget.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn-small view-budget-details" data-id="${budget.id}" style="padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-eye"></i> Ver Detalhes
                        </button>
                        <button class="btn-small duplicate-budget-btn" data-id="${budget.id}" style="padding: 8px 15px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-copy"></i> Reutilizar
                        </button>
                        ${currentUser?.isAdmin ? `
                        <button class="btn-small delete-budget-btn" data-id="${budget.id}" style="padding: 8px 15px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    modalHTML += `
            </div>
        </div>
    `;
    
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.querySelector('.close-budgets-modal').addEventListener('click', function() {
            modal.remove();
        });
        
        document.querySelectorAll('.view-budget-details').forEach(button => {
            button.addEventListener('click', function() {
                const budgetId = parseInt(this.getAttribute('data-id'));
                modal.remove();
                showBudgetDetails(budgetId);
            });
        });
        
        document.querySelectorAll('.duplicate-budget-btn').forEach(button => {
            button.addEventListener('click', function() {
                const budgetId = parseInt(this.getAttribute('data-id'));
                modal.remove();
                duplicateBudget(budgetId);
            });
        });
        
        document.querySelectorAll('.delete-budget-btn').forEach(button => {
            button.addEventListener('click', function() {
                const budgetId = parseInt(this.getAttribute('data-id'));
                if (confirm('Tem certeza que deseja excluir este orçamento?')) {
                    deleteBudget(budgetId);
                    modal.remove();
                }
            });
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                modal.remove();
            }
        });
        
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 10);
}

function showBudgetDetails(budgetId) {
    const budget = savedBudgets.find(b => b.id === budgetId);
    if (!budget) return;
    
    let itemsHTML = '';
    budget.items.forEach((item, index) => {
        itemsHTML += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.price.toFixed(2).replace('.', ',')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.total.toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
    });
    
    const detailsHTML = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <h3>Detalhes do Orçamento #${budget.id}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div>
                    <p><strong>Data:</strong> ${budget.date}</p>
                    <p><strong>Cliente:</strong> ${budget.userName}</p>
                    <p><strong>ID do Cliente:</strong> ${budget.userId}</p>
                </div>
                <div>
                    <p><strong>CEP:</strong> ${budget.cep}</p>
                    <p><strong>Status:</strong> <span style="padding: 4px 12px; background: #fff3cd; color: #856404; border-radius: 20px;">${budget.status}</span></p>
                </div>
            </div>
            
            <h4>Itens do Orçamento</h4>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left;">#</th>
                            <th style="padding: 10px; text-align: left;">Produto</th>
                            <th style="padding: 10px; text-align: center;">Quantidade</th>
                            <th style="padding: 10px; text-align: right;">Preço Unit.</th>
                            <th style="padding: 10px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>
            
            <div style="text-align: right; font-weight: bold; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p style="font-size: 1.1rem;">Subtotal: R$ ${budget.subtotal.toFixed(2).replace('.', ',')}</p>
                <p style="font-size: 1.1rem;">Frete: R$ ${budget.freight.toFixed(2).replace('.', ',')}</p>
                <p style="font-size: 1.3rem; color: #1a365d; margin-top: 10px;">Total: R$ ${budget.total.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <button class="cta-button duplicate-from-details" data-id="${budget.id}" style="padding: 12px 30px; margin-right: 10px;">
                <i class="fas fa-copy"></i> Reutilizar
            </button>
            <button class="btn-outline close-details" style="padding: 12px 30px;">
                <i class="fas fa-times"></i> Fechar
            </button>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2>Orçamento #${budget.id}</h2>
                <span class="close-details-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                ${detailsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.querySelector('.close-details-modal').addEventListener('click', function() {
            modal.remove();
        });
        
        document.querySelector('.close-details').addEventListener('click', function() {
            modal.remove();
        });
        
        document.querySelector('.duplicate-from-details').addEventListener('click', function() {
            const budgetId = parseInt(this.getAttribute('data-id'));
            modal.remove();
            duplicateBudget(budgetId);
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                modal.remove();
            }
        });
        
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 10);
}

function duplicateBudget(budgetId) {
    const budget = savedBudgets.find(b => b.id === budgetId);
    if (!budget) return;
    
    cart = [];
    
    budget.items.forEach(budgetItem => {
        const product = products.find(p => p.name === budgetItem.name);
        if (product) {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: budgetItem.quantity,
                bulkDiscount: product.bulkDiscount
            });
        }
    });
    
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
    
    const cepInput = document.getElementById('cep');
    if (cepInput && budget.cep) {
        cepInput.value = budget.cep;
    }
    
    showMessage('Orçamento reutilizado com sucesso!', 'success');
    document.getElementById('budget').scrollIntoView({ behavior: 'smooth' });
}

function deleteBudget(budgetId) {
    const budgetIndex = savedBudgets.findIndex(b => b.id === budgetId);
    
    if (budgetIndex === -1) {
        showMessage('Orçamento não encontrado.', 'error');
        return;
    }
    
    savedBudgets.splice(budgetIndex, 1);
    saveToLocalStorage();
    showMessage('Orçamento excluído com sucesso!', 'success');
}

// ============================================
// MEU PERFIL
// ============================================

function showMyProfile() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    
    const profileHTML = `
        <h3>Meu Perfil</h3>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nome:</strong> ${currentUser.name}</p>
            <p><strong>E-mail:</strong> ${currentUser.email}</p>
            <p><strong>Tipo de Conta:</strong> ${currentUser.isAdmin ? 'Administrador' : 'Cliente'}</p>
        </div>
        ${!currentUser.isAdmin ? `
        <div style="text-align: center; margin: 30px 0;">
            <button id="changePasswordBtn" class="cta-button" style="padding: 12px 30px;">
                <i class="fas fa-key"></i> Alterar Senha
            </button>
        </div>
        ` : ''}
        <div style="text-align: center;">
            <button class="btn-outline close-profile" style="padding: 12px 30px;">
                <i class="fas fa-times"></i> Fechar
            </button>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Meu Perfil</h2>
                <span class="close-profile-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                ${profileHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.querySelector('.close-profile-modal').addEventListener('click', function() {
            modal.remove();
        });
        
        document.querySelector('.close-profile').addEventListener('click', function() {
            modal.remove();
        });
        
        if (!currentUser.isAdmin) {
            document.getElementById('changePasswordBtn').addEventListener('click', function() {
                modal.remove();
                showChangePasswordModal();
            });
        }
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                modal.remove();
            }
        });
        
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 10);
}

function showChangePasswordModal() {
    const modalHTML = `
        <h3>Alterar Senha</h3>
        <div style="margin: 20px 0;">
            <div class="form-group">
                <label for="currentPassword">Senha Atual</label>
                <input type="password" id="currentPassword" placeholder="Digite sua senha atual" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px;">
            </div>
            <div class="form-group">
                <label for="newPassword">Nova Senha</label>
                <input type="password" id="newPassword" placeholder="Digite a nova senha" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px;">
            </div>
            <div class="form-group">
                <label for="confirmPassword">Confirmar Nova Senha</label>
                <input type="password" id="confirmPassword" placeholder="Confirme a nova senha" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px;">
            </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <button id="savePasswordBtn" class="cta-button" style="padding: 12px 30px; margin-right: 10px;">
                <i class="fas fa-save"></i> Salvar
            </button>
            <button class="btn-outline cancel-password" style="padding: 12px 30px;">
                <i class="fas fa-times"></i> Cancelar
            </button>
        </div>
        <p id="passwordMessage" style="text-align: center; color: #e74c3c; margin-top: 15px;"></p>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Alterar Senha</h2>
                <span class="close-password-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                ${modalHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.querySelector('.close-password-modal').addEventListener('click', function() {
            modal.remove();
        });
        
        document.querySelector('.cancel-password').addEventListener('click', function() {
            modal.remove();
        });
        
        document.getElementById('savePasswordBtn').addEventListener('click', function() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const passwordMessage = document.getElementById('passwordMessage');
            
            if (!currentPassword || !newPassword || !confirmPassword) {
                passwordMessage.textContent = 'Por favor, preencha todos os campos.';
                return;
            }
            
            if (newPassword !== confirmPassword) {
                passwordMessage.textContent = 'As senhas não coincidem.';
                return;
            }
            
            if (newPassword.length < 6) {
                passwordMessage.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                return;
            }
            
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            
            if (userIndex === -1) {
                passwordMessage.textContent = 'Erro ao encontrar usuário.';
                return;
            }
            
            if (users[userIndex].password !== currentPassword) {
                passwordMessage.textContent = 'Senha atual incorreta.';
                return;
            }
            
            users[userIndex].password = newPassword;
            saveToLocalStorage();
            
            modal.remove();
            showMessage('Senha alterada com sucesso!', 'success');
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                modal.remove();
            }
        });
        
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 10);
}

// ============================================
// SISTEMA DE PRODUTOS E ORÇAMENTO
// ============================================

function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const stockClass = product.stock === 0 ? 'out' : product.stock < 20 ? 'low' : 'available';
        const stockText = product.stock === 0 ? 'Esgotado' : 
                         product.stock < 20 ? `${product.stock} unidades (estoque baixo)` : 
                         `${product.stock} unidades disponíveis`;
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <i class="${product.image}"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')} cada</p>
                <p class="product-stock ${stockClass}">
                    <i class="fas fa-${stockClass === 'available' ? 'check' : stockClass === 'low' ? 'exclamation' : 'times'}-circle"></i> ${stockText}
                </p>
                <div class="product-actions">
                    <button class="btn-secondary add-to-budget" data-id="${product.id}">
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
    
    document.querySelectorAll('.add-to-budget').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToBudget(productId);
        });
    });
    
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            showProductDetails(productId);
        });
    });
}

function showProductDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const detailsHTML = `
        <h3>${product.name}</h3>
        <div style="display: flex; gap: 20px; margin: 20px 0;">
            <div style="flex: 1; text-align: center;">
                <i class="${product.image}" style="font-size: 80px; color: #1a365d;"></i>
            </div>
            <div style="flex: 2;">
                <p><strong>Categoria:</strong> ${product.category}</p>
                <p><strong>Preço:</strong> R$ ${product.price.toFixed(2).replace('.', ',')}</p>
                <p><strong>Estoque:</strong> ${product.stock} unidades</p>
                ${product.bulkDiscount ? `
                    <p><strong>Desconto:</strong> ${product.bulkDiscount.quantity}+ unidades por R$ ${product.bulkDiscount.price.toFixed(2).replace('.', ',')} cada</p>
                ` : ''}
            </div>
        </div>
        <p><strong>Descrição:</strong> ${product.description}</p>
        <div style="text-align: center; margin-top: 30px;">
            <button class="cta-button add-from-details" data-id="${product.id}" style="padding: 12px 30px;">
                <i class="fas fa-cart-plus"></i> Adicionar ao Orçamento
            </button>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Detalhes do Produto</h2>
                <span class="close-product-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                ${detailsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.querySelector('.close-product-modal').addEventListener('click', function() {
            modal.remove();
        });
        
        document.querySelector('.add-from-details').addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToBudget(productId);
            modal.remove();
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                modal.remove();
            }
        });
    }, 10);
}

function addToBudget(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock === 0) {
        showMessage('Este produto está esgotado.', 'error');
        return;
    }
    
    const cartItem = cart.find(item => item.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity < product.stock) {
            cartItem.quantity += 1;
        } else {
            showMessage(`Estoque insuficiente. Máximo: ${product.stock} unidades.`, 'error');
            return;
        }
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            bulkDiscount: product.bulkDiscount
        });
    }
    
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
    
    showMessage(`${product.name} adicionado ao orçamento.`, 'success');
}

function renderBudgetItems() {
    const itemsContainer = document.querySelector('.items-selection');
    if (!itemsContainer) return;
    
    itemsContainer.innerHTML = '';
    
    products.forEach(product => {
        const cartItem = cart.find(item => item.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'item-select';
        itemElement.innerHTML = `
            <div class="item-info">
                <h4>${product.name}</h4>
                <p class="item-price">R$ ${product.price.toFixed(2).replace('.', ',')} cada</p>
                <p class="item-stock">${product.stock} unidades disponíveis</p>
            </div>
            <div class="item-quantity">
                <button class="btn-small decrease-quantity" data-id="${product.id}" ${quantity === 0 ? 'disabled' : ''}>
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" class="quantity-input" data-id="${product.id}" value="${quantity}" 
                       min="0" max="${product.stock}" ${product.stock === 0 ? 'disabled' : ''}>
                <button class="btn-small increase-quantity" data-id="${product.id}" 
                        ${quantity >= product.stock ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        
        itemsContainer.appendChild(itemElement);
    });
    
    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            updateCartQuantity(productId, -1);
        });
    });
    
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            updateCartQuantity(productId, 1);
        });
    });
    
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            const quantity = parseInt(this.value) || 0;
            updateCartQuantity(productId, quantity, true);
        });
    });
}

function updateCartQuantity(productId, change, setAbsolute = false) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    let cartItem = cart.find(item => item.id === productId);
    
    if (setAbsolute) {
        const newQuantity = Math.max(0, Math.min(change, product.stock));
        
        if (newQuantity === 0) {
            cart = cart.filter(item => item.id !== productId);
        } else if (cartItem) {
            cartItem.quantity = newQuantity;
        } else if (newQuantity > 0) {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                quantity: newQuantity,
                bulkDiscount: product.bulkDiscount
            });
        }
    } else {
        if (!cartItem && change > 0) {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                quantity: 1,
                bulkDiscount: product.bulkDiscount
            });
        } else if (cartItem) {
            const newQuantity = cartItem.quantity + change;
            
            if (newQuantity <= 0) {
                cart = cart.filter(item => item.id !== productId);
            } else if (newQuantity > product.stock) {
                showMessage(`Estoque insuficiente. Máximo: ${product.stock} unidades.`, 'error');
                return;
            } else {
                cartItem.quantity = newQuantity;
            }
        }
    }
    
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cartItems');
    const totalItemsElement = document.getElementById('totalItems');
    
    if (!cartItemsContainer || !totalItemsElement) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Nenhum item adicionado</p>';
        totalItemsElement.textContent = '0';
        return;
    }
    
    let cartHTML = '';
    let totalItems = 0;
    
    cart.forEach(item => {
        totalItems += item.quantity;
        
        let itemPrice = item.price;
        if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
            itemPrice = item.bulkDiscount.price;
        }
        
        const itemTotal = itemPrice * item.quantity;
        
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-quantity">${item.quantity}x</div>
                <div class="cart-item-price">R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = cartHTML;
    totalItemsElement.textContent = totalItems.toString();
}

function updateBudgetSummary() {
    const subtotalElement = document.getElementById('subtotal');
    const freightElement = document.getElementById('freight');
    const totalElement = document.getElementById('total');
    
    if (!subtotalElement || !freightElement || !totalElement) return;
    
    let subtotal = 0;
    
    cart.forEach(item => {
        let itemPrice = item.price;
        if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
            itemPrice = item.bulkDiscount.price;
        }
        subtotal += itemPrice * item.quantity;
    });
    
    const total = subtotal + freightValue;
    
    subtotalElement.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    freightElement.textContent = `R$ ${freightValue.toFixed(2).replace('.', ',')}`;
    totalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ============================================
// CEP E FRETE
// ============================================

function checkCep() {
    const cepInput = document.getElementById('cep');
    if (!cepInput) return;
    
    let cep = cepInput.value.replace(/\D/g, '');
    
    if (cep.length !== 8) {
        showCepMessage('CEP inválido. Digite um CEP com 8 dígitos.', 'error');
        freightValue = 0;
        updateBudgetSummary();
        return;
    }
    
    cep = cep.substring(0, 5) + '-' + cep.substring(5);
    cepInput.value = cep;
    
    showCepMessage('Consultando CEP...', 'info');
    
    setTimeout(() => {
        simulateCepCheck(cep);
    }, 800);
}

function simulateCepCheck(cep) {
    const cepNumbers = cep.replace(/\D/g, '');
    const cepFirstTwo = cepNumbers.substring(0, 2);
    
    let state = '';
    if (cepFirstTwo >= '80' && cepFirstTwo <= '87') {
        state = 'PR';
    } else if (cepFirstTwo >= '88' && cepFirstTwo <= '90') {
        state = 'SC';
    }
    
    if (state === 'PR' || state === 'SC') {
        let subtotal = 0;
        cart.forEach(item => {
            let itemPrice = item.price;
            if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
                itemPrice = item.bulkDiscount.price;
            }
            subtotal += itemPrice * item.quantity;
        });
        
        if (subtotal >= 1000) {
            freightValue = 0;
            showCepMessage(`Frete grátis para ${state}! CEP ${cep} atendido.`, 'success');
        } else {
            freightValue = state === 'PR' ? 80.00 : 90.00;
            showCepMessage(`Frete para ${state}: R$ ${freightValue.toFixed(2).replace('.', ',')}. CEP ${cep} atendido.`, 'success');
        }
    } else {
        freightValue = 0;
        showCepMessage(`Não atendemos este CEP (${cep}). Atendemos apenas PR e SC.`, 'error');
    }
    
    updateBudgetSummary();
}

function showCepMessage(message, type) {
    const cepMessage = document.getElementById('cepMessage');
    if (!cepMessage) return;
    
    let icon = '';
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'times-circle'; break;
        case 'warning': icon = 'exclamation-circle'; break;
        default: icon = 'info-circle';
    }
    
    cepMessage.innerHTML = `<i class="fas fa-${icon} message-icon"></i><div class="message-text">${message}</div>`;
    cepMessage.className = type;
}

// ============================================
// SALVAR ORÇAMENTO
// ============================================

function saveBudget() {
    if (cart.length === 0) {
        showMessage('Adicione itens ao orçamento antes de salvar.', 'error');
        return;
    }
    
    const cepInput = document.getElementById('cep');
    if (!cepInput || !cepInput.value) {
        showMessage('Informe um CEP para calcular o frete.', 'error');
        return;
    }
    
    if (!currentUser) {
        showMessage('Faça login para salvar seu orçamento.', 'error');
        openLoginModal();
        return;
    }
    
    let subtotal = 0;
    const itemsDetails = [];
    
    cart.forEach(item => {
        let itemPrice = item.price;
        if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
            itemPrice = item.bulkDiscount.price;
        }
        
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;
        
        itemsDetails.push({
            name: item.name,
            quantity: item.quantity,
            price: itemPrice,
            total: itemTotal
        });
    });
    
    const total = subtotal + freightValue;
    
    const budget = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        date: new Date().toLocaleString('pt-BR'),
        items: itemsDetails,
        subtotal: subtotal,
        freight: freightValue,
        total: total,
        cep: cepInput.value,
        status: 'Pendente'
    };
    
    savedBudgets.push(budget);
    saveToLocalStorage();
    
    showMessage(`Orçamento salvo! Total: R$ ${total.toFixed(2).replace('.', ',')}`, 'success');
    clearBudget();
}

function clearBudget() {
    cart = [];
    freightValue = 0;
    
    const cepInput = document.getElementById('cep');
    const cepMessage = document.getElementById('cepMessage');
    
    if (cepInput) cepInput.value = '';
    if (cepMessage) cepMessage.innerHTML = '';
    
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
}

// ============================================
// ASSISTENTE IA
// ============================================

function getAISuggestions() {
    const eventDescription = document.getElementById('eventDescription').value.trim();
    const suggestionsContainer = document.getElementById('aiSuggestions');
    
    if (!eventDescription) {
        showMessage('Descreva seu evento para receber sugestões.', 'error');
        return;
    }
    
    showMessage('Analisando seu evento...', 'info');
    
    setTimeout(() => {
        const suggestions = generateAISuggestions(eventDescription);
        renderAISuggestions(suggestions, suggestionsContainer);
        showMessage('Sugestões geradas!', 'success');
    }, 1500);
}

function generateAISuggestions(description) {
    const text = description.toLowerCase();
    let suggestions = [];
    
    if (text.includes('casamento') || text.includes('noivado')) {
        suggestions.push({
            title: "Para Casamentos",
            icon: "fas fa-ring",
            items: [
                "Cadeira de Madeira Maciça: 1 por convidado",
                "Mesa Redonda 1,5m: 1 para cada 8 convidados",
                "Biombo Decorativo: 2-3 unidades para fotos",
                "Puff de Couro Sintético: 5-10 unidades para área de descanso"
            ],
            totalGuests: extractNumber(text) || 100,
            note: "Para casamentos, recomendamos móveis elegantes."
        });
    }
    
    if (text.includes('corporativo') || text.includes('empresa')) {
        suggestions.push({
            title: "Para Eventos Corporativos",
            icon: "fas fa-briefcase",
            items: [
                "Cadeira Dobrável Plástico: 1 por participante",
                "Mesa Retangular 2m: Para cabines de trabalho",
                "Sofá de Canto: 1-2 unidades para networking",
                "Mesa Redonda 1,5m: Para coffee breaks"
            ],
            totalGuests: extractNumber(text) || 50,
            note: "Eventos corporativos exigem mobiliário profissional."
        });
    }
    
    if (suggestions.length === 0) {
        suggestions.push({
            title: "Sugestões Gerais",
            icon: "fas fa-lightbulb",
            items: [
                "Cadeira de Madeira Maciça: Para eventos formais",
                "Cadeira Dobrável Plástico: Para grandes quantidades",
                "Mesa Redonda 1,5m: Ideal para refeições",
                "Puff de Couro Sintético: Conforto adicional"
            ],
            note: "Considere a quantidade de convidados."
        });
    }
    
    return suggestions;
}

function extractNumber(text) {
    const match = text.match(/\d+/g);
    return match ? parseInt(match[0]) : null;
}

function renderAISuggestions(suggestions, container) {
    if (!container) return;
    
    let suggestionsHTML = '';
    
    suggestions.forEach(suggestion => {
        suggestionsHTML += `
            <div class="ai-suggestion-item">
                <h4><i class="${suggestion.icon}"></i> ${suggestion.title}</h4>
                <ul>
                    ${suggestion.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
                ${suggestion.totalGuests ? `<p><strong>Estimativa para ${suggestion.totalGuests} convidados</strong></p>` : ''}
                ${suggestion.note ? `<p><em>${suggestion.note}</em></p>` : ''}
            </div>
        `;
    });
    
    suggestionsHTML += `
        <div style="text-align: center; margin-top: 20px;">
            <button id="applySuggestions" class="cta-button">
                <i class="fas fa-magic"></i> Aplicar Sugestões
            </button>
        </div>
    `;
    
    container.innerHTML = suggestionsHTML;
    
    document.getElementById('applySuggestions').addEventListener('click', function() {
        applyAISuggestions(suggestions);
    });
}

function applyAISuggestions(suggestions) {
    cart = [];
    
    const productNameToId = {
        "Cadeira de Madeira Maciça": 1,
        "Mesa Redonda 1,5m": 2,
        "Puff de Couro Sintético": 3,
        "Biombo Decorativo": 4,
        "Cadeira Dobrável Plástico": 5,
        "Mesa Retangular 2m": 6,
        "Sofá de Canto": 7,
        "Barril de Cerveja Decorativo": 8
    };
    
    let addedItems = 0;
    
    suggestions[0].items.forEach(itemText => {
        const productName = itemText.split(':')[0].trim();
        const productId = productNameToId[productName];
        
        if (productId) {
            const product = products.find(p => p.id === productId);
            if (product && product.stock > 0) {
                let quantity = 1;
                const match = itemText.match(/\d+/g);
                if (match) {
                    quantity = parseInt(match[0]);
                }
                
                if (suggestions[0].totalGuests) {
                    if (productName.includes("Cadeira")) {
                        quantity = Math.ceil(suggestions[0].totalGuests * 1.1);
                    } else if (productName.includes("Mesa")) {
                        const guestsPerTable = productName.includes("Redonda") ? 8 : 10;
                        quantity = Math.ceil(suggestions[0].totalGuests / guestsPerTable);
                    }
                }
                
                quantity = Math.min(quantity, product.stock);
                
                if (quantity > 0) {
                    cart.push({
                        id: productId,
                        name: product.name,
                        price: product.price,
                        quantity: quantity,
                        bulkDiscount: product.bulkDiscount
                    });
                    addedItems++;
                }
            }
        }
    });
    
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
    
    if (addedItems > 0) {
        showMessage(`${addedItems} itens adicionados!`, 'success');
        document.getElementById('budget').scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// PAINEL ADMINISTRATIVO CORRIGIDO
// ============================================

function openAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) {
        showMessage('Acesso restrito. Faça login como administrador.', 'error');
        openLoginModal();
        return;
    }
    
    const adminPanel = document.createElement('div');
    adminPanel.id = 'adminPanel';
    
    document.body.appendChild(adminPanel);
    
    adminPanel.innerHTML = `
        <div class="admin-header">
            <div class="admin-header-left">
                <h1><i class="fas fa-tools"></i> Painel Administrativo</h1>
                <p>${companyData.name}</p>
            </div>
            <div class="admin-header-right">
                <div class="admin-user-info">
                    <p>${currentUser.name}</p>
                    <small>Administrador</small>
                </div>
                <button id="closeAdminPanel">
                    <i class="fas fa-times"></i> Sair
                </button>
            </div>
        </div>
        
        <div class="admin-main-container">
            <div class="admin-sidebar">
                <nav class="admin-nav">
                    <button class="admin-nav-btn active" data-tab="dashboard">
                        <i class="fas fa-tachometer-alt"></i> Dashboard
                    </button>
                    <button class="admin-nav-btn" data-tab="products">
                        <i class="fas fa-boxes"></i> Produtos
                    </button>
                    <button class="admin-nav-btn" data-tab="orders">
                        <i class="fas fa-file-invoice-dollar"></i> Orçamentos
                    </button>
                    <button class="admin-nav-btn" data-tab="users">
                        <i class="fas fa-users"></i> Usuários
                    </button>
                    <button class="admin-nav-btn" data-tab="reports">
                        <i class="fas fa-chart-bar"></i> Relatórios
                    </button>
                    <button class="admin-nav-btn" data-tab="settings">
                        <i class="fas fa-cog"></i> Configurações
                    </button>
                </nav>
                
                <div class="admin-tools">
                    <h3>Ferramentas</h3>
                    <div class="tool-buttons">
                        <button onclick="exportData()">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                        <button onclick="importData()">
                            <i class="fas fa-upload"></i> Importar
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="admin-content">
                <div id="adminDashboardTab" class="admin-tab-content active">
                    ${renderAdminDashboard()}
                </div>
                <div id="adminProductsTab" class="admin-tab-content">
                    ${renderAdminProducts()}
                </div>
                <div id="adminOrdersTab" class="admin-tab-content">
                    ${renderAdminOrders()}
                </div>
                <div id="adminUsersTab" class="admin-tab-content">
                    ${renderAdminUsers()}
                </div>
                <div id="adminReportsTab" class="admin-tab-content">
                    ${renderAdminReports()}
                </div>
                <div id="adminSettingsTab" class="admin-tab-content">
                    ${renderAdminSettings()}
                </div>
            </div>
        </div>
    `;
    
    setupAdminPanelEvents();
}

function setupAdminPanelEvents() {
    document.getElementById('closeAdminPanel').addEventListener('click', function() {
        document.getElementById('adminPanel').remove();
    });
    
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tab = this.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            const tabId = `admin${capitalizeFirstLetter(tab)}Tab`;
            document.getElementById(tabId).style.display = 'block';
            
            if (tab === 'products') {
                updateAdminProductsTable();
            } else if (tab === 'orders') {
                updateAdminOrdersTable();
            } else if (tab === 'users') {
                updateAdminUsersTable();
            }
        });
    });
    
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            document.getElementById('adminPanel')?.remove();
        }
    };
    document.addEventListener('keydown', escHandler);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// ============================================
// DASHBOARD ADMIN
// ============================================

function renderAdminDashboard() {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalBudgets = savedBudgets.length;
    const totalUsers = users.length;
    
    const totalRevenue = savedBudgets.reduce((sum, b) => sum + b.total, 0);
    const pendingBudgets = savedBudgets.filter(b => b.status === 'Pendente').length;
    
    return `
        <div class="dashboard-header">
            <h2>Dashboard</h2>
            <div class="dashboard-time">
                Última atualização: ${new Date().toLocaleString('pt-BR')}
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Produtos</h3>
                        <div class="stat-number">${totalProducts}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-boxes"></i>
                    </div>
                </div>
                <div class="stat-card-bottom">
                    ${totalStock} unidades em estoque
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Orçamentos</h3>
                        <div class="stat-number">${totalBudgets}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </div>
                </div>
                <div class="stat-card-bottom">
                    ${pendingBudgets} pendentes
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Usuários</h3>
                        <div class="stat-number">${totalUsers}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                <div class="stat-card-bottom">
                    ${users.filter(u => u.isAdmin).length} administradores
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Faturamento</h3>
                        <div class="stat-number">R$ ${totalRevenue.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
                <div class="stat-card-bottom">
                    Valor total dos orçamentos
                </div>
            </div>
        </div>
        
        <div class="dashboard-grid">
            <div class="dashboard-section">
                <h3><i class="fas fa-history"></i> Atividade Recente</h3>
                ${renderRecentActivity()}
            </div>
            
            <div class="dashboard-section">
                <h3><i class="fas fa-exclamation-circle"></i> Alertas</h3>
                ${renderAdminAlerts()}
            </div>
        </div>
    `;
}

function renderRecentActivity() {
    const recentBudgets = [...savedBudgets]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (recentBudgets.length === 0) {
        return '<div class="empty-state"><i class="fas fa-inbox"></i><p>Nenhuma atividade recente</p></div>';
    }
    
    let html = '<div class="activity-list">';
    
    recentBudgets.forEach(budget => {
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-file-invoice-dollar"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">Orçamento #${budget.id}</div>
                    <div class="activity-details">
                        <span>${budget.userName}</span>
                        <span>•</span>
                        <span>${budget.date}</span>
                    </div>
                </div>
                <div class="activity-amount">
                    R$ ${budget.total.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderAdminAlerts() {
    const lowStockProducts = products.filter(p => p.stock < 20 && p.stock > 0);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    const pendingBudgets = savedBudgets.filter(b => b.status === 'Pendente');
    
    let alerts = [];
    
    if (outOfStockProducts.length > 0) {
        alerts.push({
            type: 'error',
            message: `${outOfStockProducts.length} produto(s) esgotado(s)`,
            icon: 'fa-times-circle'
        });
    }
    
    if (lowStockProducts.length > 0) {
        alerts.push({
            type: 'warning',
            message: `${lowStockProducts.length} produto(s) com estoque baixo`,
            icon: 'fa-exclamation-triangle'
        });
    }
    
    if (pendingBudgets.length > 0) {
        alerts.push({
            type: 'info',
            message: `${pendingBudgets.length} orçamento(s) pendente(s)`,
            icon: 'fa-clock'
        });
    }
    
    if (alerts.length === 0) {
        alerts.push({
            type: 'success',
            message: 'Tudo em ordem!',
            icon: 'fa-check-circle'
        });
    }
    
    let html = '<div class="alert-list">';
    
    alerts.forEach(alert => {
        html += `
            <div class="alert-item ${alert.type}">
                <i class="fas ${alert.icon}"></i>
                <span>${alert.message}</span>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// ============================================
// GERENCIAMENTO DE PRODUTOS
// ============================================

function renderAdminProducts() {
    return `
        <div class="section-header">
            <h2>Gerenciamento de Produtos</h2>
            <div class="admin-actions">
                <button id="addNewProduct">
                    <i class="fas fa-plus"></i> Novo Produto
                </button>
            </div>
        </div>
        
        <div id="adminProductsContainer">
            ${renderAdminProductsTable()}
        </div>
    `;
}

function renderAdminProductsTable() {
    if (products.length === 0) {
        return '<div class="empty-state"><i class="fas fa-box-open"></i><h3>Nenhum produto cadastrado</h3><p>Adicione produtos para começar</p></div>';
    }
    
    let tableHTML = `
        <div class="products-table">
            <div class="table-header">
                <div>ID</div>
                <div>Ícone</div>
                <div>Produto</div>
                <div>Categoria</div>
                <div>Preço</div>
                <div>Estoque</div>
                <div>Status</div>
                <div>Ações</div>
            </div>
    `;
    
    products.forEach(product => {
        const stockStatus = product.stock === 0 ? 'status-out' : 
                          product.stock < 20 ? 'status-low' : 'status-available';
        const statusText = product.stock === 0 ? 'Esgotado' : 
                          product.stock < 20 ? 'Baixo' : 'Normal';
        
        tableHTML += `
            <div class="table-row">
                <div data-label="ID" class="cell-center">${product.id}</div>
                <div data-label="Ícone" class="cell-center">
                    <i class="${product.image} product-icon"></i>
                </div>
                <div data-label="Produto">${product.name}</div>
                <div data-label="Categoria">${product.category}</div>
                <div data-label="Preço">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
                <div data-label="Estoque">${product.stock}</div>
                <div data-label="Status">
                    <span class="status-badge ${stockStatus}">${statusText}</span>
                </div>
                <div data-label="Ações">
                    <div class="action-buttons">
                        <button class="action-btn action-edit" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="action-btn action-delete" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    tableHTML += '</div>';
    return tableHTML;
}

function updateAdminProductsTable() {
    const container = document.getElementById('adminProductsContainer');
    if (container) {
        container.innerHTML = renderAdminProductsTable();
    }
}

function addNewProduct() {
    const newProductId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    const newProduct = {
        id: newProductId,
        name: "Novo Produto",
        description: "Descrição do novo produto",
        price: 0.00,
        stock: 0,
        bulkDiscount: null,
        image: "fas fa-box",
            category: "Diversos"
    };
    
    products.push(newProduct);
    saveToLocalStorage();
    updateAdminProductsTable();
    renderProducts();
    
    editProduct(newProductId);
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const iconOptions = [
        'fas fa-chair', 'fas fa-table', 'fas fa-couch', 'fas fa-border-none',
        'fas fa-wine-bottle', 'fas fa-bed', 'fas fa-tv', 'fas fa-umbrella-beach',
        'fas fa-campground', 'fas fa-glass-cheers', 'fas fa-utensils', 'fas fa-lightbulb',
        'fas fa-box', 'fas fa-pallet', 'fas fa-warehouse', 'fas fa-truck-loading',
        'fas fa-chair-office', 'fas fa-desktop', 'fas fa-door-closed', 'fas fa-fan'
    ];
    
        const categoryOptions = ['Aparador', 'Banqueta', 'Bar', 'Cadeira', 'Diversos', 'Espelho', 'Mesas', 'Poltrona', 'Puff', 'Sofá', 'Tapete'];
    
    const modalHTML = `
        <div class="modal" id="productEditModal" style="display: block; background: rgba(0, 0, 0, 0.9);">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${product.id ? 'Editar Produto' : 'Novo Produto'}</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editProductForm" class="edit-product-form">
                        <div class="form-row-2">
                            <div class="settings-form-group">
                                <label for="editProductName">Nome do Produto *</label>
                                <input type="text" id="editProductName" value="${product.name}" required>
                            </div>
                            
                            <div class="settings-form-group">
                                <label for="editProductCategory">Categoria *</label>
                                <select id="editProductCategory" required>
                                    ${categoryOptions.map(cat => 
                                        `<option value="${cat}" ${cat === product.category ? 'selected' : ''}>${cat}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="settings-form-group">
                            <label for="editProductDescription">Descrição *</label>
                            <textarea id="editProductDescription" rows="3" required>${product.description}</textarea>
                        </div>
                        
                        <div class="form-row-3">
                            <div class="settings-form-group">
                                <label for="editProductPrice">Preço (R$) *</label>
                                <input type="number" id="editProductPrice" step="0.01" min="0" value="${product.price}" required>
                            </div>
                            
                            <div class="settings-form-group">
                                <label for="editProductStock">Estoque *</label>
                                <input type="number" id="editProductStock" min="0" value="${product.stock}" required>
                            </div>
                            
                            <div class="settings-form-group">
                                <label for="editProductIcon">Ícone *</label>
                                <div class="icon-selector">
                                    <select id="editProductIcon" required>
                                        ${iconOptions.map(icon => 
                                            `<option value="${icon}" ${icon === product.image ? 'selected' : ''}>
                                                ${icon.replace('fas fa-', '').replace(/-/g, ' ')}
                                            </option>`
                                        ).join('')}
                                    </select>
                                    <div id="iconPreview">
                                        <i class="${product.image}"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="discount-section">
                            <div class="discount-header">
                                <label>Desconto por Quantidade</label>
                                <button type="button" id="toggleDiscount">
                                    ${product.bulkDiscount ? 'Remover Desconto' : 'Adicionar Desconto'}
                                </button>
                            </div>
                            
                            <div id="discountFields" class="${product.bulkDiscount ? 'show' : ''}">
                                <div class="form-row-2">
                                    <div class="settings-form-group">
                                        <label for="editBulkQuantity">Quantidade Mínima</label>
                                        <input type="number" id="editBulkQuantity" min="2" value="${product.bulkDiscount?.quantity || ''}" placeholder="Ex: 100">
                                    </div>
                                    <div class="settings-form-group">
                                        <label for="editBulkPrice">Preço com Desconto (R$)</label>
                                        <input type="number" id="editBulkPrice" step="0.01" min="0" value="${product.bulkDiscount?.price || ''}" placeholder="Ex: 10.50">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit">
                                <i class="fas fa-save"></i> Salvar
                            </button>
                            <button type="button" class="cancel-btn">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.getElementById('adminPanel').appendChild(modalContainer);
    
    setTimeout(() => {
        // Icon preview
        const iconSelect = document.getElementById('editProductIcon');
        const iconPreview = document.getElementById('iconPreview');
        
        iconSelect.addEventListener('change', function() {
            iconPreview.innerHTML = `<i class="${this.value}"></i>`;
        });
        
        // Toggle discount
        const toggleDiscountBtn = document.getElementById('toggleDiscount');
        const discountFields = document.getElementById('discountFields');
        
        toggleDiscountBtn.addEventListener('click', function() {
            if (discountFields.classList.contains('show')) {
                discountFields.classList.remove('show');
                this.textContent = 'Adicionar Desconto';
                document.getElementById('editBulkQuantity').value = '';
                document.getElementById('editBulkPrice').value = '';
            } else {
                discountFields.classList.add('show');
                this.textContent = 'Remover Desconto';
            }
        });
        
        // Form submission
        document.getElementById('editProductForm').addEventListener('submit', function(e) {
            e.preventDefault();
            saveProductChanges(productId);
        });
        
        // Close modal
        document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                modalContainer.remove();
            });
        });
        
        // Close on outside click
        document.getElementById('productEditModal').addEventListener('click', function(e) {
            if (e.target === this) {
                modalContainer.remove();
            }
        });
        
        // Close with ESC
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modalContainer.remove();
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 10);
}

function saveProductChanges(productId) {
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const productName = document.getElementById('editProductName').value.trim();
    const productCategory = document.getElementById('editProductCategory').value;
    const productDescription = document.getElementById('editProductDescription').value.trim();
    const productPrice = parseFloat(document.getElementById('editProductPrice').value);
    const productStock = parseInt(document.getElementById('editProductStock').value);
    const productIcon = document.getElementById('editProductIcon').value;
    
    // Validation
    if (!productName || !productDescription || isNaN(productPrice) || isNaN(productStock)) {
        showAdminMessage('Preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    if (productPrice < 0 || productStock < 0) {
        showAdminMessage('Preço e estoque devem ser valores positivos.', 'error');
        return;
    }
    
    let bulkDiscount = null;
    const bulkQuantity = document.getElementById('editBulkQuantity').value;
    const bulkPrice = document.getElementById('editBulkPrice').value;
    
    if (bulkQuantity && bulkPrice) {
        const quantity = parseInt(bulkQuantity);
        const price = parseFloat(bulkPrice);
        
        if (quantity > 0 && price > 0 && price < productPrice) {
            bulkDiscount = { quantity: quantity, price: price };
        }
    }
    
    products[productIndex] = {
        ...products[productIndex],
        name: productName,
        category: productCategory,
        description: productDescription,
        price: productPrice,
        stock: productStock,
        image: productIcon,
        bulkDiscount: bulkDiscount
    };
    
    saveToLocalStorage();
    
    updateAdminProductsTable();
    renderProducts();
    
    document.querySelector('#productEditModal')?.remove();
    showAdminMessage('Produto salvo com sucesso!', 'success');
}

function deleteProduct(productId) {
    if (productId === 1) {
        showAdminMessage('Não é possível excluir produtos essenciais.', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    products.splice(productIndex, 1);
    cart = cart.filter(item => item.id !== productId);
    
    saveToLocalStorage();
    updateAdminProductsTable();
    renderProducts();
    updateCartDisplay();
    updateBudgetSummary();
    
    showAdminMessage('Produto excluído com sucesso!', 'success');
}

// ============================================
// GERENCIAMENTO DE ORÇAMENTOS
// ============================================

function renderAdminOrders() {
    return `
        <div class="section-header">
            <h2>Gerenciamento de Orçamentos</h2>
        </div>
        <div id="adminOrdersContainer">
            ${renderAdminOrdersTable()}
        </div>
    `;
}

function renderAdminOrdersTable() {
    const sortedBudgets = [...savedBudgets].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedBudgets.length === 0) {
        return '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><h3>Nenhum orçamento encontrado</h3><p>Os orçamentos aparecerão aqui</p></div>';
    }
    
    let tableHTML = `
        <div class="products-table orders-table">
            <div class="table-header">
                <div>ID</div>
                <div>Cliente</div>
                <div>Data</div>
                <div>Itens</div>
                <div>Total</div>
                <div>Status</div>
                <div>Ações</div>
            </div>
    `;
    
    sortedBudgets.forEach(budget => {
        const totalItems = budget.items.reduce((sum, item) => sum + item.quantity, 0);
        
        tableHTML += `
            <div class="table-row">
                <div data-label="ID">${budget.id}</div>
                <div data-label="Cliente">${budget.userName}</div>
                <div data-label="Data">${budget.date}</div>
                <div data-label="Itens">${totalItems} itens</div>
                <div data-label="Total">R$ ${budget.total.toFixed(2).replace('.', ',')}</div>
                <div data-label="Status">
                    <select class="status-select" onchange="updateBudgetStatus(${budget.id}, this.value)">
                        <option value="Pendente" ${budget.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Aprovado" ${budget.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                        <option value="Cancelado" ${budget.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        <option value="Finalizado" ${budget.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                    </select>
                </div>
                <div data-label="Ações">
                    <div class="action-buttons">
                        <button class="action-btn action-edit" onclick="viewBudgetDetailsAdmin(${budget.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-delete" onclick="deleteBudgetAdmin(${budget.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    tableHTML += '</div>';
    return tableHTML;
}

function updateAdminOrdersTable() {
    const container = document.getElementById('adminOrdersContainer');
    if (container) {
        container.innerHTML = renderAdminOrdersTable();
    }
}

function updateBudgetStatus(budgetId, newStatus) {
    const budgetIndex = savedBudgets.findIndex(b => b.id === budgetId);
    if (budgetIndex === -1) return;
    
    savedBudgets[budgetIndex].status = newStatus;
    saveToLocalStorage();
    
    showAdminMessage(`Status do orçamento #${budgetId} atualizado para "${newStatus}"`, 'success');
}

function viewBudgetDetailsAdmin(budgetId) {
    const budget = savedBudgets.find(b => b.id === budgetId);
    if (!budget) return;
    
    let itemsHTML = '';
    budget.items.forEach((item, index) => {
        itemsHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">R$ ${item.price.toFixed(2).replace('.', ',')}</td>
                <td class="text-right">R$ ${item.total.toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
    });
    
    const modalHTML = `
        <div class="modal" id="budgetDetailsModal" style="display: block; background: rgba(0,0,0,0.9);">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Orçamento #${budget.id}</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="budget-details-header">
                        <div class="budget-info-group">
                            <h4>Informações Gerais</h4>
                            <p><strong>Data:</strong> ${budget.date}</p>
                            <p><strong>Cliente:</strong> ${budget.userName}</p>
                            <p><strong>ID do Cliente:</strong> ${budget.userId}</p>
                        </div>
                        <div class="budget-info-group">
                            <h4>Entrega</h4>
                            <p><strong>CEP:</strong> ${budget.cep}</p>
                            <p><strong>Status:</strong> 
                                <span style="padding: 4px 12px; background: ${getStatusColor(budget.status)}30; color: ${getStatusColor(budget.status)}; border-radius: 20px;">
                                    ${budget.status}
                                </span>
                            </p>
                        </div>
                    </div>
                    
                    <h4>Itens do Orçamento</h4>
                    <table class="budget-items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Produto</th>
                                <th class="text-center">Quantidade</th>
                                <th class="text-right">Preço Unit.</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                    </table>
                    
                    <div class="budget-summary-box">
                        <div class="summary-line">
                            <span>Subtotal:</span>
                            <span>R$ ${budget.subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div class="summary-line">
                            <span>Frete:</span>
                            <span>R$ ${budget.freight.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div class="summary-line">
                            <span>Total:</span>
                            <span>R$ ${budget.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                    
                    <div class="form-actions" style="margin-top: 20px;">
                        <button class="cancel-btn" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i> Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.getElementById('adminPanel').appendChild(modalContainer);
    
    setTimeout(() => {
        document.querySelector('#budgetDetailsModal .close-modal').addEventListener('click', function() {
            modalContainer.remove();
        });
        
        document.querySelector('#budgetDetailsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                modalContainer.remove();
            }
        });
        
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modalContainer.remove();
            }
        };
        document.addEventListener('keydown', escHandler);
    }, 10);
}

function getStatusColor(status) {
    switch(status) {
        case 'Pendente': return '#ffd166';
        case 'Aprovado': return '#2ecc71';
        case 'Cancelado': return '#e74c3c';
        case 'Finalizado': return '#3498db';
        default: return '#ffffff';
    }
}

function deleteBudgetAdmin(budgetId) {
    if (!confirm('Excluir este orçamento permanentemente?')) return;
    
    const budgetIndex = savedBudgets.findIndex(b => b.id === budgetId);
    if (budgetIndex === -1) return;
    
    savedBudgets.splice(budgetIndex, 1);
    saveToLocalStorage();
    
    updateAdminOrdersTable();
    showAdminMessage('Orçamento excluído!', 'success');
}

// ============================================
// GERENCIAMENTO DE USUÁRIOS
// ============================================

function renderAdminUsers() {
    return `
        <div class="section-header">
            <h2>Gerenciamento de Usuários</h2>
        </div>
        <div id="adminUsersContainer">
            ${renderAdminUsersTable()}
        </div>
    `;
}

function renderAdminUsersTable() {
    if (users.length === 0) {
        return '<div class="empty-state"><i class="fas fa-users"></i><h3>Nenhum usuário cadastrado</h3><p>Os usuários aparecerão aqui</p></div>';
    }
    
    let tableHTML = `
        <div class="products-table users-table">
            <div class="table-header">
                <div>ID</div>
                <div>Nome</div>
                <div>Email</div>
                <div>Tipo</div>
                <div>Criado em</div>
                <div>Ações</div>
            </div>
    `;
    
    users.forEach(user => {
        tableHTML += `
            <div class="table-row">
                <div data-label="ID">${user.id}</div>
                <div data-label="Nome">
                    ${user.name}
                    ${user.isAdmin ? '<span class="admin-badge-small">ADMIN</span>' : ''}
                </div>
                <div data-label="Email">${user.email}</div>
                <div data-label="Tipo">${user.isAdmin ? 'Administrador' : 'Cliente'}</div>
                <div data-label="Criado em">${new Date(user.createdAt).toLocaleDateString('pt-BR')}</div>
                <div data-label="Ações">
                    <div class="action-buttons">
                        ${!user.isAdmin ? `
                        <button class="action-btn action-edit" onclick="makeAdmin(${user.id})">
                            <i class="fas fa-user-shield"></i> Admin
                        </button>
                        ` : ''}
                        ${user.id !== 1 ? `
                        <button class="action-btn action-delete" onclick="deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    tableHTML += '</div>';
    return tableHTML;
}

function updateAdminUsersTable() {
    const container = document.getElementById('adminUsersContainer');
    if (container) {
        container.innerHTML = renderAdminUsersTable();
    }
}

function makeAdmin(userId) {
    if (userId === 1) {
        showAdminMessage('Não é possível alterar o administrador principal.', 'error');
        return;
    }
    
    if (!confirm('Tornar este usuário administrador?')) return;
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    users[userIndex].isAdmin = true;
    saveToLocalStorage();
    
    updateAdminUsersTable();
    showAdminMessage('Usuário promovido a administrador!', 'success');
}

function deleteUser(userId) {
    if (userId === 1) {
        showAdminMessage('Não é possível excluir o administrador principal.', 'error');
        return;
    }
    
    if (!confirm('Excluir este usuário permanentemente?')) return;
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    users.splice(userIndex, 1);
    savedBudgets = savedBudgets.filter(b => b.userId !== userId);
    
    if (currentUser && currentUser.id === userId) {
        currentUser = null;
        sessionStorage.removeItem('currentUser');
        updateUserState();
    }
    
    saveToLocalStorage();
    
    updateAdminUsersTable();
    showAdminMessage('Usuário excluído!', 'success');
}

// ============================================
// RELATÓRIOS
// ============================================

function renderAdminReports() {
    return `
        <div class="section-header">
            <h2>Relatórios e Estatísticas</h2>
        </div>
        <div class="reports-grid">
            <div class="report-card">
                <h3>Produtos Mais Alugados</h3>
                ${renderTopProducts()}
            </div>
            <div class="report-card">
                <h3>Faturamento por Status</h3>
                ${renderRevenueByStatus()}
            </div>
        </div>
    `;
}

function renderTopProducts() {
    // Contar quantas vezes cada produto aparece nos orçamentos
    const productCounts = {};
    
    savedBudgets.forEach(budget => {
        budget.items.forEach(item => {
            if (!productCounts[item.name]) {
                productCounts[item.name] = {
                    name: item.name,
                    quantity: 0,
                    total: 0
                };
            }
            productCounts[item.name].quantity += item.quantity;
            productCounts[item.name].total += item.total;
        });
    });
    
    const sortedProducts = Object.values(productCounts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    
    if (sortedProducts.length === 0) {
        return '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>Nenhum dado disponível</p></div>';
    }
    
    let html = '<div class="top-products-list">';
    
    sortedProducts.forEach((product, index) => {
        html += `
            <div class="top-product-item">
                <div class="top-product-rank">${index + 1}</div>
                <div class="top-product-info">
                    <div class="top-product-name">${product.name}</div>
                    <div class="top-product-stats">${product.quantity} unidades</div>
                </div>
                <div class="top-product-revenue">
                    R$ ${product.total.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderRevenueByStatus() {
    const revenueByStatus = {
        'Pendente': 0,
        'Aprovado': 0,
        'Cancelado': 0,
        'Finalizado': 0
    };
    
    savedBudgets.forEach(budget => {
        revenueByStatus[budget.status] += budget.total;
    });
    
    let html = '<div class="revenue-stats">';
    
    Object.entries(revenueByStatus).forEach(([status, total]) => {
        const color = getStatusColor(status);
        html += `
            <div class="revenue-item">
                <div class="revenue-status">
                    <span class="status-dot" style="background-color: ${color}"></span>
                    <span>${status}</span>
                </div>
                <div class="revenue-amount">
                    R$ ${total.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// ============================================
// CONFIGURAÇÕES
// ============================================

function renderAdminSettings() {
    return `
        <div class="section-header">
            <h2>Configurações da Empresa</h2>
        </div>
        <div class="report-card">
            <form id="companySettingsForm" class="settings-form">
                <div class="form-grid">
                    <div class="settings-form-group">
                        <label for="companyName">Nome da Empresa *</label>
                        <input type="text" id="companyName" value="${companyData.name}" required>
                    </div>
                    
                    <div class="settings-form-group">
                        <label for="companyInstagram">Instagram</label>
                        <input type="text" id="companyInstagram" value="${companyData.instagram}">
                    </div>
                </div>
                
                <div class="form-grid">
                    <div class="settings-form-group">
                        <label for="companyPhone">Telefone *</label>
                        <input type="text" id="companyPhone" value="${companyData.phone}" required>
                    </div>
                    
                    <div class="settings-form-group">
                        <label for="companyEmail">Email *</label>
                        <input type="email" id="companyEmail" value="${companyData.email}" required>
                    </div>
                </div>
                
                <div class="settings-form-group">
                    <label>Estados de Entrega *</label>
                    <div class="states-checkbox">
                        <label>
                            <input type="checkbox" id="statePR" ${companyData.deliveryStates.includes('PR') ? 'checked' : ''}>
                            Paraná (PR)
                        </label>
                        <label>
                            <input type="checkbox" id="stateSC" ${companyData.deliveryStates.includes('SC') ? 'checked' : ''}>
                            Santa Catarina (SC)
                        </label>
                    </div>
                </div>
                
                <div class="form-submit">
                    <button type="submit" id="saveSettings">
                        <i class="fas fa-save"></i> Salvar Configurações
                    </button>
                </div>
            </form>
        </div>
    `;
}

function saveCompanySettings() {
    const companyName = document.getElementById('companyName').value.trim();
    const companyInstagram = document.getElementById('companyInstagram').value.trim();
    const companyPhone = document.getElementById('companyPhone').value.trim();
    const companyEmail = document.getElementById('companyEmail').value.trim();
    
    const deliveryStates = [];
    if (document.getElementById('statePR').checked) deliveryStates.push('PR');
    if (document.getElementById('stateSC').checked) deliveryStates.push('SC');
    
    if (!companyName || !companyPhone || !companyEmail || deliveryStates.length === 0) {
        showAdminMessage('Preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    companyData.name = companyName;
    companyData.instagram = companyInstagram;
    companyData.phone = companyPhone;
    companyData.email = companyEmail;
    companyData.deliveryStates = deliveryStates;
    
    saveToLocalStorage();
    
    // Update company name in header
    const logoText = document.querySelector('.logo-text');
    if (logoText) {
        logoText.textContent = companyName.split('-')[0].trim();
    }
    
    showAdminMessage('Configurações salvas com sucesso!', 'success');
}

// ============================================
// UTILITÁRIOS
// ============================================

function showMessage(message, type = 'info') {
    showCepMessage(message, type);
    
    if (type === 'success') {
        setTimeout(() => {
            const cepMessage = document.getElementById('cepMessage');
            if (cepMessage) {
                cepMessage.innerHTML = '';
                cepMessage.className = '';
            }
        }, 5000);
    }
}

function showAdminMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.admin-message');
    if (existingMessage) existingMessage.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message ${type}`;
    
    document.getElementById('adminPanel').appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function saveToLocalStorage() {
    try {
        const data = {
            products: products,
            users: users,
            savedBudgets: savedBudgets,
            companyData: companyData
        };
        localStorage.setItem('mobilierData', JSON.stringify(data));
    } catch (e) {
        console.error('Erro ao salvar:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('mobilierData');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.products) products = data.products;
            if (data.users) users = data.users;
            if (data.savedBudgets) savedBudgets = data.savedBudgets;
            if (data.companyData) Object.assign(companyData, data.companyData);
        }
    } catch (e) {
        console.error('Erro ao carregar:', e);
    }
}

// ============================================
// EXPORT/IMPORT DATA
// ============================================

window.exportData = function() {
    const data = {
        products: products,
        users: users,
        savedBudgets: savedBudgets,
        companyData: companyData,
        cart: cart,
        currentUser: currentUser
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mobilier-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showAdminMessage('Dados exportados com sucesso!', 'success');
};

window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('Substituir todos os dados atuais? Esta ação não pode ser desfeita.')) {
                    products = data.products || products;
                    users = data.users || users;
                    savedBudgets = data.savedBudgets || savedBudgets;
                    Object.assign(companyData, data.companyData || {});
                    
                    if (data.currentUser) {
                        currentUser = data.currentUser;
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    
                    saveToLocalStorage();
                    showAdminMessage('Dados importados com sucesso! Recarregando...', 'success');
                    
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }
            } catch (error) {
                showAdminMessage('Erro ao importar arquivo. Verifique o formato.', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
};

// ============================================
// INITIALIZE ADMIN PANEL EVENTS
// ============================================

// Add admin panel event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup admin panel form submissions
    setTimeout(() => {
        const companySettingsForm = document.getElementById('companySettingsForm');
        if (companySettingsForm) {
            companySettingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveCompanySettings();
            });
        }
        
        // Add product button
        document.addEventListener('click', function(e) {
            if (e.target.id === 'addNewProduct' || e.target.closest('#addNewProduct')) {
                addNewProduct();
            }
        });
    }, 1000);
});

console.log('Sistema Mobilier carregado com sucesso!');

// ============================================
// PROFESSIONAL UPGRADE
// ============================================

function formatCurrencyBRL(value) {
    return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function formatDateBR(dateValue) {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString('pt-BR');
}

function getEventBriefFromForm() {
    return {
        type: document.getElementById('eventType')?.value || '',
        guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
        date: document.getElementById('eventDate')?.value || '',
        city: document.getElementById('eventCity')?.value.trim() || '',
        venueType: document.getElementById('venueType')?.value || '',
        notes: document.getElementById('eventNotes')?.value.trim() || ''
    };
}

function clearEventBriefForm() {
    ['eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function describeBudgetItems(items) {
    return items.map(item => `${item.quantity}x ${item.name}`).join(', ');
}

function normalizeAppData() {
    stockMovements = Array.isArray(stockMovements) ? stockMovements : [];
    financialEntries = Array.isArray(financialEntries) ? financialEntries : [];

    savedBudgets = savedBudgets.map(budget => ({
        ...budget,
        createdAt: budget.createdAt || budget.date || new Date().toISOString(),
        updatedAt: budget.updatedAt || budget.date || new Date().toISOString(),
        eventDetails: budget.eventDetails || {
            type: '',
            guests: 0,
            date: '',
            city: '',
            venueType: '',
            notes: ''
        },
        inventoryCommitted: Boolean(budget.inventoryCommitted)
    }));

    syncFinancialEntriesFromBudgets();
}

function syncFinancialEntriesFromBudgets() {
    const existingMap = new Map(financialEntries.filter(entry => entry.budgetId).map(entry => [entry.budgetId, entry]));

    savedBudgets.forEach(budget => {
        const current = existingMap.get(budget.id);
        const nextStatus = mapBudgetStatusToFinanceStatus(budget.status);
        const entryBase = {
            id: current?.id || (Date.now() + Math.floor(Math.random() * 1000)),
            budgetId: budget.id,
            customerName: budget.userName,
            description: `${budget.eventDetails?.type || 'Evento'} - Orcamento #${budget.id}`,
            amount: budget.total,
            kind: 'Receita',
            category: 'Locacao de mobiliario',
            dueDate: budget.eventDetails?.date || budget.createdAt || new Date().toISOString(),
            status: nextStatus,
            createdAt: current?.createdAt || budget.createdAt || new Date().toISOString()
        };

        if (current) {
            Object.assign(current, entryBase);
        } else {
            financialEntries.push(entryBase);
        }
    });

    financialEntries = financialEntries.filter(entry => !entry.budgetId || savedBudgets.some(budget => budget.id === entry.budgetId));
}

function mapBudgetStatusToFinanceStatus(status) {
    switch (status) {
        case 'Aprovado':
            return 'A receber';
        case 'Finalizado':
            return 'Recebido';
        case 'Cancelado':
            return 'Cancelado';
        default:
            return 'Previsto';
    }
}

function getFinanceStatusClass(status) {
    switch (status) {
        case 'Recebido':
            return 'status-available';
        case 'A receber':
            return 'status-low';
        case 'Cancelado':
            return 'status-out';
        default:
            return 'status-pending';
    }
}

function registerStockMovement(productId, type, quantity, reason) {
    const product = products.find(item => item.id === productId);
    if (!product || !quantity) return;

    stockMovements.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        productId,
        productName: product.name,
        type,
        quantity,
        reason,
        date: new Date().toISOString(),
        resultingStock: product.stock
    });

    stockMovements = stockMovements.slice(0, 80);
}

function applyInventoryForBudget(budget, direction) {
    for (const item of budget.items) {
        const product = products.find(prod => prod.name === item.name);
        if (!product) continue;

        if (direction === 'out' && product.stock < item.quantity) {
            return {
                ok: false,
                message: `Estoque insuficiente para ${product.name}. Disponivel: ${product.stock}.`
            };
        }
    }

    budget.items.forEach(item => {
        const product = products.find(prod => prod.name === item.name);
        if (!product) return;

        if (direction === 'out') {
            product.stock -= item.quantity;
            registerStockMovement(product.id, 'saida', item.quantity, `Reserva do orcamento #${budget.id}`);
        } else {
            product.stock += item.quantity;
            registerStockMovement(product.id, 'entrada', item.quantity, `Estorno do orcamento #${budget.id}`);
        }
    });

    budget.inventoryCommitted = direction === 'out';
    return { ok: true };
}

function refreshAdminViews() {
    const dashboardTab = document.getElementById('adminDashboardTab');
    const productsContainer = document.getElementById('adminProductsContainer');
    const stockMovementsContainer = document.getElementById('stockMovementsContainer');
    const ordersContainer = document.getElementById('adminOrdersContainer');
    const financeTab = document.getElementById('adminFinanceTab');
    const usersContainer = document.getElementById('adminUsersContainer');
    const reportsTab = document.getElementById('adminReportsTab');

    if (dashboardTab) dashboardTab.innerHTML = renderAdminDashboard();
    if (productsContainer) productsContainer.innerHTML = renderAdminProductsTable();
    if (stockMovementsContainer) stockMovementsContainer.innerHTML = renderStockMovementsTable();
    if (ordersContainer) ordersContainer.innerHTML = renderAdminOrdersTable();
    if (financeTab) financeTab.innerHTML = renderAdminFinance();
    if (usersContainer) usersContainer.innerHTML = renderAdminUsersTable();
    if (reportsTab) reportsTab.innerHTML = renderAdminReports();
}

function renderAdminDashboard() {
    const approvedRevenue = savedBudgets
        .filter(item => ['Aprovado', 'Finalizado'].includes(item.status))
        .reduce((sum, item) => sum + item.total, 0);
    const projectedRevenue = financialEntries
        .filter(entry => ['Previsto', 'A receber'].includes(entry.status))
        .reduce((sum, entry) => sum + entry.amount, 0);
    const lowStock = products.filter(product => product.stock > 0 && product.stock < 20).length;
    const pendingBudgets = savedBudgets.filter(item => item.status === 'Pendente').length;

    return `
        <div class="dashboard-header">
            <h2>Dashboard Executivo</h2>
            <div class="dashboard-time">Atualizado em ${new Date().toLocaleString('pt-BR')}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Pipeline</h3>
                        <div class="stat-number">${savedBudgets.length}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-file-signature"></i></div>
                </div>
                <div class="stat-card-bottom">${pendingBudgets} aguardando aprovacao</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Receita aprovada</h3>
                        <div class="stat-number">${formatCurrencyBRL(approvedRevenue)}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-sack-dollar"></i></div>
                </div>
                <div class="stat-card-bottom">Pedidos aprovados e finalizados</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Previsto</h3>
                        <div class="stat-number">${formatCurrencyBRL(projectedRevenue)}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                </div>
                <div class="stat-card-bottom">Financeiro ainda nao recebido</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info">
                        <h3>Estoque critico</h3>
                        <div class="stat-number">${lowStock}</div>
                    </div>
                    <div class="stat-icon"><i class="fas fa-triangle-exclamation"></i></div>
                </div>
                <div class="stat-card-bottom">${products.reduce((sum, item) => sum + item.stock, 0)} itens em estoque total</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="dashboard-section">
                <h3><i class="fas fa-history"></i> Orcamentos recentes</h3>
                ${renderRecentActivity()}
            </div>
            <div class="dashboard-section">
                <h3><i class="fas fa-bell"></i> Alertas operacionais</h3>
                ${renderAdminAlerts()}
            </div>
        </div>
    `;
}

function renderAdminAlerts() {
    const alerts = [];
    const lowStockProducts = products.filter(product => product.stock > 0 && product.stock < 20);
    const missingEventDate = savedBudgets.filter(budget => !budget.eventDetails?.date).length;
    const openReceivables = financialEntries.filter(entry => entry.kind === 'Receita' && ['Previsto', 'A receber'].includes(entry.status)).length;

    if (lowStockProducts.length) {
        alerts.push({ type: 'warning', icon: 'fa-box-open', message: `${lowStockProducts.length} produto(s) com estoque baixo` });
    }
    if (openReceivables) {
        alerts.push({ type: 'info', icon: 'fa-file-invoice-dollar', message: `${openReceivables} titulo(s) de receita em aberto` });
    }
    if (missingEventDate) {
        alerts.push({ type: 'error', icon: 'fa-calendar-xmark', message: `${missingEventDate} orcamento(s) sem data do evento` });
    }
    if (!alerts.length) {
        alerts.push({ type: 'success', icon: 'fa-circle-check', message: 'Painel sem alertas criticos no momento.' });
    }

    return `<div class="alert-list">${alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <i class="fas ${alert.icon}"></i>
            <span>${alert.message}</span>
        </div>
    `).join('')}</div>`;
}

function renderAdminProducts() {
    const lowStock = products.filter(item => item.stock > 0 && item.stock < 20).length;
    const noStock = products.filter(item => item.stock === 0).length;

    return `
        <div class="section-header">
            <h2>Cadastro e Estoque</h2>
            <div class="admin-actions">
                <button id="addNewProduct">
                    <i class="fas fa-plus"></i> Novo produto
                </button>
            </div>
        </div>
        <div class="inventory-summary-grid">
            <div class="report-card"><h3>${products.length}</h3><p>produtos cadastrados</p></div>
            <div class="report-card"><h3>${lowStock}</h3><p>com estoque baixo</p></div>
            <div class="report-card"><h3>${noStock}</h3><p>esgotados</p></div>
        </div>
        <div id="adminProductsContainer">${renderAdminProductsTable()}</div>
        <div class="report-card stock-log-card">
            <div class="section-header">
                <h2>Movimentacoes de estoque</h2>
            </div>
            <div id="stockMovementsContainer">${renderStockMovementsTable()}</div>
        </div>
    `;
}

function renderAdminProductsTable() {
    if (!products.length) {
        return '<div class="empty-state"><i class="fas fa-box-open"></i><h3>Nenhum produto cadastrado</h3><p>Adicione produtos para comecar.</p></div>';
    }

    let html = `
        <div class="products-table">
            <div class="table-header">
                <div>ID</div>
                <div>Icone</div>
                <div>Produto</div>
                <div>Categoria</div>
                <div>Preco</div>
                <div>Estoque</div>
                <div>Status</div>
                <div>Acoes</div>
            </div>
    `;

    products.forEach(product => {
        const stockStatus = product.stock === 0 ? 'status-out' : (product.stock < 20 ? 'status-low' : 'status-available');
        const statusText = product.stock === 0 ? 'Esgotado' : (product.stock < 20 ? 'Baixo' : 'Saudavel');

        html += `
            <div class="table-row">
                <div data-label="ID" class="cell-center">${product.id}</div>
                <div data-label="Icone" class="cell-center"><i class="${product.image} product-icon"></i></div>
                <div data-label="Produto">${product.name}</div>
                <div data-label="Categoria">${product.category}</div>
                <div data-label="Preco">${formatCurrencyBRL(product.price)}</div>
                <div data-label="Estoque">${product.stock}</div>
                <div data-label="Status"><span class="status-badge ${stockStatus}">${statusText}</span></div>
                <div data-label="Acoes">
                    <div class="action-buttons">
                        <button class="action-btn action-edit" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="action-btn" onclick="openStockAdjustmentModal(${product.id}, 'entrada')"><i class="fas fa-arrow-down"></i></button>
                        <button class="action-btn" onclick="openStockAdjustmentModal(${product.id}, 'saida')"><i class="fas fa-arrow-up"></i></button>
                        <button class="action-btn action-delete" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function renderStockMovementsTable() {
    if (!stockMovements.length) {
        return '<div class="empty-state"><i class="fas fa-boxes-stacked"></i><p>Nenhuma movimentacao registrada.</p></div>';
    }

    return `
        <div class="products-table compact-table stock-table">
            <div class="table-header">
                <div>Data</div>
                <div>Produto</div>
                <div>Tipo</div>
                <div>Qtd.</div>
                <div>Motivo</div>
                <div>Saldo</div>
            </div>
            ${stockMovements.slice(0, 12).map(movement => `
                <div class="table-row">
                    <div data-label="Data">${new Date(movement.date).toLocaleString('pt-BR')}</div>
                    <div data-label="Produto">${movement.productName}</div>
                    <div data-label="Tipo">${movement.type === 'entrada' ? 'Entrada' : 'Saida'}</div>
                    <div data-label="Qtd.">${movement.quantity}</div>
                    <div data-label="Motivo">${movement.reason}</div>
                    <div data-label="Saldo">${movement.resultingStock}</div>
                </div>
            `).join('')}
        </div>
    `;
}

window.openStockAdjustmentModal = function(productId, movementType) {
    const product = products.find(item => item.id === productId);
    if (!product) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="stockAdjustmentModal" style="display:block; background: rgba(0,0,0,0.9);">
            <div class="modal-content" style="max-width: 520px;">
                <div class="modal-header">
                    <h2>${movementType === 'entrada' ? 'Entrada' : 'Saida'} de estoque</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="settings-form-group">
                        <label>Produto</label>
                        <input type="text" value="${product.name}" disabled>
                    </div>
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="stockAdjustmentQty">Quantidade</label>
                            <input type="number" id="stockAdjustmentQty" min="1" value="1">
                        </div>
                        <div class="settings-form-group">
                            <label for="stockAdjustmentReason">Motivo</label>
                            <input type="text" id="stockAdjustmentReason" placeholder="Ex: compra, devolucao, perda">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="applyStockAdjustment(${productId}, '${movementType}')">Salvar movimentacao</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#stockAdjustmentModal')?.addEventListener('click', event => {
        if (event.target.id === 'stockAdjustmentModal') wrapper.remove();
    });
};

window.applyStockAdjustment = function(productId, movementType) {
    const product = products.find(item => item.id === productId);
    const quantity = parseInt(document.getElementById('stockAdjustmentQty')?.value || '0', 10);
    const reason = document.getElementById('stockAdjustmentReason')?.value.trim() || 'Ajuste manual';

    if (!product || quantity <= 0) {
        showAdminMessage('Informe uma quantidade valida.', 'error');
        return;
    }

    if (movementType === 'saida' && product.stock < quantity) {
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

function renderAdminFinance() {
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
    const balance = received - expenses;

    return `
        <div class="section-header">
            <h2>Financeiro</h2>
            <div class="admin-actions">
                <button onclick="openSaleModal()"><i class="fas fa-cash-register"></i> Nova venda</button>
                <button onclick="openFinancialEntryModal()"><i class="fas fa-receipt"></i> Nova despesa</button>
            </div>
        </div>
        <div class="inventory-summary-grid">
            <div class="report-card"><h3>${formatCurrencyBRL(received)}</h3><p>recebido</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(receivable)}</h3><p>a receber</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(expenses)}</h3><p>despesas</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(balance)}</h3><p>saldo operacional</p></div>
        </div>
        <div class="report-card">
            <h3 style="margin-bottom:16px;">Controle de precos e historico financeiro</h3>
            ${renderFinancialEntriesTable()}
        </div>
    `;
}

window.openFinancialEntryModal = function() {
    trackAccess('open_financial_expense');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="financialEntryModal" style="display:block; background: rgba(3,7,18,0.78);">
            <div class="modal-content" style="max-width: 720px;">
                <div class="modal-header">
                    <h2>Nova despesa</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="report-card" style="margin-bottom:18px;">
                        <p style="margin:0; color:rgba(255,255,255,0.78);">Registre custos operacionais, manutencao, transporte, equipe e outros gastos do negocio.</p>
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
                            </select>
                        </div>
                    </div>
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="financialAmount">Valor</label>
                            <input type="number" id="financialAmount" min="0" step="0.01" placeholder="0.00">
                        </div>
                        <div class="settings-form-group">
                            <label for="financialDueDate">Vencimento</label>
                            <input type="date" id="financialDueDate">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="createFinancialEntry()">Salvar despesa</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#financialEntryModal')?.addEventListener('click', event => {
        if (event.target.id === 'financialEntryModal') wrapper.remove();
    });
};

window.openSaleModal = function() {
    const customers = users.filter(user => !user.isAdmin);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="saleModal" style="display:block; background: rgba(3,7,18,0.78);">
            <div class="modal-content" style="max-width: 760px;">
                <div class="modal-header">
                    <h2>Registrar venda / locacao</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="saleCustomer">Cliente</label>
                            <select id="saleCustomer">
                                <option value="">Selecione</option>
                                ${customers.map(customer => `<option value="${customer.id}">${customer.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="settings-form-group">
                            <label for="saleProduct">Produto</label>
                            <select id="saleProduct">
                                <option value="">Selecione</option>
                                ${products.map(product => `<option value="${product.id}">${product.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="settings-form-group">
                            <label for="saleQuantity">Quantidade</label>
                            <input type="number" id="saleQuantity" min="1" value="1">
                        </div>
                        <div class="settings-form-group">
                            <label for="salePrice">Preco unitario</label>
                            <input type="number" id="salePrice" min="0" step="0.01" value="0">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleDueDate">Data</label>
                            <input type="date" id="saleDueDate">
                        </div>
                    </div>
                    <div class="settings-form-group">
                        <label for="saleDescription">Descricao</label>
                        <input type="text" id="saleDescription" placeholder="Ex: locacao direta sem passar pelo orcamento">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="createDirectSale()">Salvar venda</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    const productSelect = wrapper.querySelector('#saleProduct');
    const priceInput = wrapper.querySelector('#salePrice');
    productSelect?.addEventListener('change', function() {
        const product = products.find(item => item.id === parseInt(this.value, 10));
        if (product) priceInput.value = product.price;
    });
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#saleModal')?.addEventListener('click', event => {
        if (event.target.id === 'saleModal') wrapper.remove();
    });
};

window.createDirectSale = function() {
    const customerId = parseInt(document.getElementById('saleCustomer')?.value || '0', 10);
    const productId = parseInt(document.getElementById('saleProduct')?.value || '0', 10);
    const quantity = parseInt(document.getElementById('saleQuantity')?.value || '0', 10);
    const price = parseFloat(document.getElementById('salePrice')?.value || '0');
    const dueDate = document.getElementById('saleDueDate')?.value || new Date().toISOString();
    const description = document.getElementById('saleDescription')?.value.trim() || 'Venda direta';
    const customer = users.find(user => user.id === customerId);
    const product = products.find(item => item.id === productId);
    if (!customer || !product || quantity <= 0 || price <= 0) {
        showAdminMessage('Preencha cliente, produto, quantidade e preco.', 'error');
        return;
    }
    if (product.stock < quantity) {
        showAdminMessage('Estoque insuficiente para essa venda.', 'error');
        return;
    }

    product.stock -= quantity;
    registerStockMovement(product.id, 'saida', quantity, `Venda direta - ${customer.name}`);
    financialEntries.push({
        id: Date.now(),
        budgetId: null,
        customerName: customer.name,
        description: `${description} - ${product.name}`,
        amount: quantity * price,
        kind: 'Receita',
        category: 'Venda direta',
        dueDate,
        status: 'Recebido',
        createdAt: new Date().toISOString()
    });
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    document.getElementById('saleModal')?.parentElement?.remove();
    showAdminMessage('Venda registrada com sucesso.', 'success');
};

function renderAccessHistory() {
    if (!accessHistory.length) {
        return '<div class="empty-state"><i class="fas fa-user-clock"></i><p>Nenhum acesso registrado ainda.</p></div>';
    }

    return `
        <div class="products-table compact-table finance-table">
            <div class="table-header">
                <div>Usuario</div>
                <div>Inicio</div>
                <div>Ultima atividade</div>
                <div>Acoes</div>
                <div>Cliques</div>
                <div>Converteu</div>
                <div>Tempo</div>
            </div>
            ${accessHistory.slice(0, 20).map(session => {
                const started = new Date(session.startedAt);
                const ended = new Date(session.lastActivityAt || session.startedAt);
                const minutes = Math.max(0, Math.round((ended - started) / 60000));
                return `
                    <div class="table-row">
                        <div data-label="Usuario">${session.userName}</div>
                        <div data-label="Inicio">${started.toLocaleString('pt-BR')}</div>
                        <div data-label="Ultima atividade">${ended.toLocaleString('pt-BR')}</div>
                        <div data-label="Acoes">${session.actions.length}</div>
                        <div data-label="Cliques">${session.productClicks.length}</div>
                        <div data-label="Converteu">${session.converted ? 'Sim' : 'Nao'}</div>
                        <div data-label="Tempo">${minutes} min</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderLeadContacts() {
    if (!leadContacts.length) {
        return '<div class="empty-state"><i class="fas fa-address-card"></i><p>Nenhum lead capturado ainda.</p></div>';
    }

    return `
        <div class="products-table compact-table finance-table">
            <div class="table-header">
                <div>Nome</div>
                <div>Email</div>
                <div>Telefone</div>
                <div>Origem</div>
                <div>Produto</div>
                <div>Quantidade</div>
                <div>Capturado em</div>
            </div>
            ${leadContacts.slice(0, 30).map(lead => `
                <div class="table-row">
                    <div data-label="Nome">${lead.name}</div>
                    <div data-label="Email">${lead.email}</div>
                    <div data-label="Telefone">${lead.phone}</div>
                    <div data-label="Origem">${lead.source || 'site'}</div>
                    <div data-label="Produto">${lead.productName || '-'}</div>
                    <div data-label="Quantidade">${lead.quantity || 0}</div>
                    <div data-label="Capturado em">${new Date(lead.capturedAt).toLocaleString('pt-BR')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function getLogisticsMonthLabel(date) {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function getMonthEntries() {
    const month = logisticsViewDate.getMonth();
    const year = logisticsViewDate.getFullYear();
    return logisticsEntries.filter(entry => {
        const date = new Date(entry.date);
        return date.getMonth() === month && date.getFullYear() === year;
    });
}

function renderLogisticsCalendar() {
    const year = logisticsViewDate.getFullYear();
    const month = logisticsViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startWeekday + lastDay.getDate()) / 7) * 7;
    const monthEntries = getMonthEntries();
    let html = '<div class="logistics-calendar-grid">';

    ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].forEach(day => {
        html += `<div class="logistics-calendar-head">${day}</div>`;
    });

    for (let i = 0; i < totalCells; i++) {
        const dayNumber = i - startWeekday + 1;
        const inMonth = dayNumber >= 1 && dayNumber <= lastDay.getDate();
        const isoDate = inMonth ? new Date(year, month, dayNumber).toISOString() : '';
        const dayEntries = inMonth ? monthEntries.filter(entry => entry.date === isoDate.slice(0, 10)) : [];

        html += `
            <div class="logistics-calendar-day ${inMonth ? '' : 'is-empty'}">
                ${inMonth ? `
                    <div class="logistics-day-number">${dayNumber}</div>
                    <div class="logistics-day-events">
                        ${dayEntries.slice(0, 3).map(entry => `<span class="logistics-chip">${entry.time} • ${entry.responsible}</span>`).join('')}
                        ${dayEntries.length > 3 ? `<span class="logistics-chip more">+${dayEntries.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function renderLogisticsList() {
    const entries = getMonthEntries().sort((a, b) => {
        const left = `${a.date} ${a.time}`;
        const right = `${b.date} ${b.time}`;
        return left.localeCompare(right);
    });

    if (!entries.length) {
        return '<div class="empty-state"><i class="fas fa-truck-fast"></i><p>Nenhuma entrega programada para este mes.</p></div>';
    }

    return `
        <div class="products-table finance-table">
            <div class="table-header">
                <div>Data</div>
                <div>Evento</div>
                <div>Entrega</div>
                <div>Local</div>
                <div>Responsavel</div>
                <div>Status</div>
                <div>Acoes</div>
            </div>
            ${entries.map(entry => `
                <div class="table-row">
                    <div data-label="Data">${formatDateBR(entry.date)} ${entry.time}</div>
                    <div data-label="Evento">${entry.eventName}</div>
                    <div data-label="Entrega">${entry.contactName}<br>${entry.contactPhone}</div>
                    <div data-label="Local">${entry.location}</div>
                    <div data-label="Responsavel">${entry.responsible}</div>
                    <div data-label="Status"><span class="status-badge ${entry.status === 'Confirmado' ? 'status-available' : entry.status === 'Em rota' ? 'status-low' : 'status-pending'}">${entry.status}</span></div>
                    <div data-label="Acoes"><button class="action-btn action-delete" onclick="removeLogisticsEntry(${entry.id})"><i class="fas fa-trash"></i></button></div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAdminLogistics() {
    return `
        <div class="section-header">
            <h2>Logistica</h2>
            <div class="admin-actions">
                <button onclick="changeLogisticsMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                <button onclick="changeLogisticsMonth(1)"><i class="fas fa-chevron-right"></i></button>
                <button onclick="openLogisticsModal()"><i class="fas fa-plus"></i> Nova entrega</button>
            </div>
        </div>
        <div class="report-card" style="margin-bottom:20px;">
            <div class="section-header">
                <h3 style="margin:0;">Agenda de ${getLogisticsMonthLabel(logisticsViewDate)}</h3>
                <div style="color:rgba(255,255,255,0.72);">Planejamento mensal para equipe e motorista</div>
            </div>
            ${renderLogisticsCalendar()}
        </div>
        <div class="report-card">
            <h3 style="margin-bottom:16px;">Entregas programadas</h3>
            ${renderLogisticsList()}
        </div>
    `;
}

window.changeLogisticsMonth = function(offset) {
    logisticsViewDate = new Date(logisticsViewDate.getFullYear(), logisticsViewDate.getMonth() + offset, 1);
    refreshAdminViews();
};

window.openLogisticsModal = function() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="logisticsModal" style="display:block; background: rgba(3,7,18,0.78);">
            <div class="modal-content" style="max-width: 860px;">
                <div class="modal-header">
                    <h2>Programar entrega</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
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
                            <input type="date" id="logisticsDate">
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
                        <textarea id="logisticsNotes" rows="3" placeholder="Acesso, referencia, montagem, antecedencia e instrucoes"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="createLogisticsEntry()">Salvar entrega</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#logisticsModal')?.addEventListener('click', event => {
        if (event.target.id === 'logisticsModal') wrapper.remove();
    });
};

window.createLogisticsEntry = function() {
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
        showAdminMessage('Preencha os campos principais da entrega.', 'error');
        return;
    }

    logisticsEntries.push({
        id: Date.now(),
        eventName,
        responsible,
        date,
        time,
        status,
        contactName,
        contactPhone,
        location,
        notes,
        createdAt: new Date().toISOString()
    });

    saveToLocalStorage();
    refreshAdminViews();
    document.getElementById('logisticsModal')?.parentElement?.remove();
    showAdminMessage('Entrega programada com sucesso.', 'success');
};

window.removeLogisticsEntry = function(entryId) {
    logisticsEntries = logisticsEntries.filter(entry => entry.id !== entryId);
    saveToLocalStorage();
    refreshAdminViews();
};

function renderAdminReports() {
    const rentedCustomers = new Set(savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).map(item => item.userName)).size;
    const pendingCustomers = new Set(savedBudgets.filter(item => item.status === 'Pendente').map(item => item.userName)).size;
    const averageTicket = savedBudgets.length ? savedBudgets.reduce((sum, item) => sum + item.total, 0) / savedBudgets.length : 0;

    return `
        <div class="section-header">
            <h2>Indicadores e Historico de acesso</h2>
        </div>
        <div class="inventory-summary-grid">
            <div class="report-card"><h3>${formatCurrencyBRL(averageTicket)}</h3><p>ticket medio</p></div>
            <div class="report-card"><h3>${rentedCustomers}</h3><p>clientes que alugaram</p></div>
            <div class="report-card"><h3>${pendingCustomers}</h3><p>clientes sem finalizar</p></div>
        </div>
        <div class="reports-grid">
            <div class="report-card">
                <h3>Produtos mais alugados</h3>
                ${renderTopProducts()}
            </div>
            <div class="report-card">
                <h3>Receita por status</h3>
                ${renderRevenueByStatus()}
            </div>
        </div>
        <div class="report-card" style="margin-top:20px;">
            <h3>Historico de acesso e navegacao</h3>
            ${renderAccessHistory()}
        </div>
        <div class="report-card" style="margin-top:20px;">
            <h3>Leads capturados para contato</h3>
            ${renderLeadContacts()}
        </div>
    `;
}

function saveProductChanges(productId) {
    const productIndex = products.findIndex(product => product.id === productId);
    if (productIndex === -1) return;

    const previousStock = products[productIndex].stock;
    const productName = document.getElementById('editProductName').value.trim();
    const productCategory = document.getElementById('editProductCategory').value;
    const productDescription = document.getElementById('editProductDescription').value.trim();
    const productPrice = parseFloat(document.getElementById('editProductPrice').value || '0');
    const productStock = parseInt(document.getElementById('editProductStock').value || '0', 10);
    const productIcon = document.getElementById('editProductIcon').value;
    const productImageUrl = document.getElementById('editProductImageUrl').value.trim();
    const bulkQuantity = parseInt(document.getElementById('editBulkQuantity').value || '0', 10);
    const bulkPrice = parseFloat(document.getElementById('editBulkPrice').value || '0');

    if (!productName || !productDescription) {
        showAdminMessage('Nome e descricao sao obrigatorios.', 'error');
        return;
    }

    let bulkDiscount = null;
    if (bulkQuantity > 0 && bulkPrice > 0 && bulkPrice < productPrice) {
        bulkDiscount = { quantity: bulkQuantity, price: bulkPrice };
    }

    products[productIndex] = {
        ...products[productIndex],
        name: productName,
        category: productCategory,
        description: productDescription,
        price: productPrice,
        stock: productStock,
        image: productImageUrl ? 'fas fa-image' : productIcon,
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
    document.getElementById('productEditModal')?.parentElement?.remove();
    showAdminMessage('Produto atualizado e refletido no site inicial.', 'success');
}

function saveToLocalStorage() {
    try {
        normalizeAppData();
        localStorage.setItem('mobilierData', JSON.stringify({
            products,
            users,
            savedBudgets,
            companyData,
            stockMovements,
            financialEntries,
            accessHistory,
            leadContacts,
            logisticsEntries
        }));
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('mobilierData');
        if (!savedData) {
            normalizeAppData();
            return;
        }
        const data = JSON.parse(savedData);
        if (data.products) products = data.products;
        if (data.users) users = data.users;
        if (data.savedBudgets) savedBudgets = data.savedBudgets;
        if (data.companyData) Object.assign(companyData, data.companyData);
        if (data.stockMovements) stockMovements = data.stockMovements;
        if (data.financialEntries) financialEntries = data.financialEntries;
        if (data.accessHistory) accessHistory = data.accessHistory;
        if (data.leadContacts) leadContacts = data.leadContacts;
        if (data.logisticsEntries) logisticsEntries = data.logisticsEntries;
        normalizeAppData();
    } catch (error) {
        console.error('Erro ao carregar:', error);
    }
}

window.exportData = function() {
    normalizeAppData();
    if (typeof XLSX === 'undefined') {
        showAdminMessage('Biblioteca Excel nao carregada.', 'error');
        return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
        { Metrica: 'Total de pedidos', Valor: savedBudgets.length },
        { Metrica: 'Pedidos pendentes', Valor: savedBudgets.filter(item => item.status === 'Pendente').length },
        { Metrica: 'Receita aprovada', Valor: savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).reduce((sum, item) => sum + item.total, 0) },
        { Metrica: 'Estoque total', Valor: products.reduce((sum, item) => sum + item.stock, 0) },
        { Metrica: 'Acessos sem conversao', Valor: accessHistory.filter(item => !item.converted).length }
    ]), 'Dashboard');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(products.map(product => ({
        ID: product.id,
        Produto: product.name,
        Categoria: product.category,
        Preco: product.price,
        Estoque: product.stock,
        Foto: product.imageUrl || '',
        Status: product.stock === 0 ? 'Esgotado' : product.stock < 20 ? 'Baixo' : 'Saudavel'
    }))), 'Estoque');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(financialEntries.map(entry => ({
        Tipo: entry.kind,
        Descricao: entry.description,
        Cliente: entry.customerName || '',
        Categoria: entry.category || '',
        Valor: entry.amount,
        Vencimento: formatDateBR(entry.dueDate),
        Status: entry.status
    }))), 'Financeiro');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(users.filter(user => !user.isAdmin).map(user => {
        const userBudgets = savedBudgets.filter(item => item.userId === user.id);
        return {
            Cliente: user.name,
            Email: user.email,
            Orcamentos: userBudgets.length,
            Alugou: userBudgets.some(item => ['Aprovado', 'Finalizado'].includes(item.status)) ? 'Sim' : 'Nao',
            NaoFinalizou: userBudgets.some(item => item.status === 'Pendente') ? 'Sim' : 'Nao'
        };
    })), 'Clientes');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(accessHistory.map(session => ({
        Usuario: session.userName,
        Inicio: new Date(session.startedAt).toLocaleString('pt-BR'),
        UltimaAtividade: new Date(session.lastActivityAt).toLocaleString('pt-BR'),
        Acoes: session.actions.length,
        CliquesProdutos: session.productClicks.length,
        Converteu: session.converted ? 'Sim' : 'Nao'
    }))), 'Acessos');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(leadContacts.map(lead => ({
        Nome: lead.name,
        Email: lead.email,
        Telefone: lead.phone,
        Origem: lead.source || 'site',
        Produto: lead.productName || '',
        Quantidade: lead.quantity || 0,
        CapturadoEm: new Date(lead.capturedAt).toLocaleString('pt-BR')
    }))), 'Leads');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logisticsEntries.map(entry => ({
        Evento: entry.eventName,
        Data: formatDateBR(entry.date),
        Horario: entry.time,
        Responsavel: entry.responsible,
        Recebe: entry.contactName,
        Telefone: entry.contactPhone,
        Local: entry.location,
        Status: entry.status,
        Observacoes: entry.notes || ''
    }))), 'Logistica');

    XLSX.writeFile(workbook, `mobilier-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAdminMessage('Planilha Excel exportada com sucesso.', 'success');
};

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();

    if (['Aprovado', 'Finalizado'].includes(newStatus)) {
        createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
    }

    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

document.addEventListener('DOMContentLoaded', function() {
    ensureAccessSession();
    trackAccess('page_loaded');
    document.addEventListener('click', function(event) {
        const target = event.target.closest('button, a');
        if (!target) return;
        trackAccess('ui_click', { text: (target.innerText || target.textContent || '').trim().slice(0, 80) });
    });
});

function getEventBriefFromForm() {
    return {
        type: document.getElementById('eventType')?.value || '',
        guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
        date: document.getElementById('eventDate')?.value || '',
        city: document.getElementById('eventCity')?.value.trim() || '',
        venueType: document.getElementById('venueType')?.value || '',
        notes: document.getElementById('eventNotes')?.value.trim() || '',
        eventName: document.getElementById('eventName')?.value.trim() || '',
        deliveryDate: document.getElementById('deliveryDate')?.value || '',
        deliveryTime: document.getElementById('deliveryTime')?.value || '',
        returnDate: document.getElementById('returnDate')?.value || '',
        returnTime: document.getElementById('returnTime')?.value || '',
        responsible: document.getElementById('eventResponsible')?.value.trim() || '',
        responsiblePhone: document.getElementById('eventResponsiblePhone')?.value.trim() || '',
        deliveryAddress: document.getElementById('deliveryAddress')?.value.trim() || ''
    };
}

function clearEventBriefForm() {
    [
        'eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes',
        'eventName', 'deliveryDate', 'deliveryTime', 'returnDate', 'returnTime',
        'eventResponsible', 'eventResponsiblePhone', 'deliveryAddress'
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function createLogisticsFromBudget(budget, responsibleFallback = '') {
    const event = budget.eventDetails || {};
    const deliveryDate = event.deliveryDate || event.date;
    const deliveryTime = event.deliveryTime || '09:00';
    const responsible = event.responsible || responsibleFallback || budget.userName;
    const location = event.deliveryAddress || `${event.city || ''} ${budget.cep || ''}`.trim();

    if (!deliveryDate || !location) return;

    const alreadyExists = logisticsEntries.some(entry => entry.budgetId === budget.id);
    if (alreadyExists) return;

    logisticsEntries.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        budgetId: budget.id,
        eventName: event.eventName || event.type || `Evento ${budget.id}`,
        responsible,
        date: deliveryDate,
        time: deliveryTime,
        status: 'Confirmado',
        contactName: event.responsible || budget.userName,
        contactPhone: event.responsiblePhone || currentUser?.phone || '',
        location,
        notes: event.notes || '',
        createdAt: new Date().toISOString()
    });
}

// ============================================
// CUSTOMER EXPERIENCE OVERRIDES
// ============================================

function showMessage(message, type = 'info') {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        info: 'info-circle',
        warning: 'exclamation-triangle'
    };
    messageEl.innerHTML = `
        <i class="fas fa-${icons[type] || icons.info}"></i>
        <div>${message}</div>
    `;
    container.appendChild(messageEl);

    setTimeout(() => {
        messageEl.classList.add('hiding');
        setTimeout(() => messageEl.remove(), 350);
    }, 3200);
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showLoginMessage('Preencha e-mail e senha.', 'error');
        return;
    }

    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        currentUser = {
            id: 0,
            email: ADMIN_CREDENTIALS.email,
            name: ADMIN_CREDENTIALS.name,
            isAdmin: true
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeLoginModal();
        updateUserState();
        showMessage('Login administrativo realizado com sucesso.', 'success');
        return;
    }

    const user = users.find(item => item.email === email && item.password === password);
    if (!user) {
        showLoginMessage('E-mail ou senha incorretos.', 'error');
        return;
    }

    currentUser = { ...user };
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateSessionIdentity?.();
    closeLoginModal();
    updateUserState();
    unlockBudgetSection(false);
    showMessage(`Bem-vindo(a), ${user.name}!`, 'success');
    openCustomerArea('budgets');
}

function handleRegister() {
    openRegistrationModal();
}

function openRegistrationModal(user = null) {
    document.getElementById('registrationModal')?.remove();
    const isEditing = Boolean(user);
    const wrapper = document.createElement('div');
    wrapper.id = 'registrationModal';
    const addressParts = {
        cep: user?.cep || '',
        street: user?.street || '',
        number: user?.number || '',
        complement: user?.complement || '',
        neighborhood: user?.neighborhood || '',
        cityState: user?.cityState || '',
        streetFallback: user?.address || ''
    };
    wrapper.innerHTML = `
        <div class="modal" style="display:block; background: rgba(3,7,18,0.78);">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEditing ? 'Atualizar cadastro' : 'Criar cadastro completo'}</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="registration-grid">
                    <div class="registration-grid-2">
                        <div class="settings-form-group">
                            <label for="regName">Nome completo</label>
                            <input type="text" id="regName" value="${user?.name || ''}" placeholder="Nome do cliente">
                        </div>
                        <div class="settings-form-group">
                            <label for="regEmail">E-mail</label>
                            <input type="email" id="regEmail" value="${user?.email || ''}" placeholder="cliente@email.com">
                        </div>
                    </div>
                    <div class="registration-grid-3">
                        <div class="settings-form-group">
                            <label for="regPhone">Telefone</label>
                            <input type="text" id="regPhone" value="${user?.phone || ''}" placeholder="(00) 00000-0000">
                        </div>
                        <div class="settings-form-group">
                            <label for="regCpf">CPF</label>
                            <input type="text" id="regCpf" value="${user?.cpf || ''}" placeholder="000.000.000-00">
                        </div>
                        <div class="settings-form-group">
                            <label for="regPassword">Senha</label>
                            <input type="password" id="regPassword" value="${user?.password || ''}" placeholder="Crie uma senha">
                        </div>
                    </div>

                    <div class="registration-address-card">
                        <h4>Endereco</h4>
                        <div class="registration-grid-3">
                            <div class="settings-form-group">
                                <label for="regCep">CEP</label>
                                <input type="text" id="regCep" value="${addressParts.cep}" placeholder="00000-000">
                            </div>
                            <div class="settings-form-group">
                                <label for="regStreet">Rua / logradouro</label>
                                <input type="text" id="regStreet" value="${addressParts.street || addressParts.streetFallback}" placeholder="Rua, avenida, travessa">
                            </div>
                            <div class="settings-form-group">
                                <label for="regNumber">Numero</label>
                                <input type="text" id="regNumber" value="${addressParts.number}" placeholder="Numero">
                            </div>
                        </div>
                        <div class="registration-grid-3">
                            <div class="settings-form-group">
                                <label for="regComplement">Complemento</label>
                                <input type="text" id="regComplement" value="${addressParts.complement}" placeholder="Apto, bloco, referencia">
                            </div>
                            <div class="settings-form-group">
                                <label for="regNeighborhood">Bairro</label>
                                <input type="text" id="regNeighborhood" value="${addressParts.neighborhood}" placeholder="Bairro">
                            </div>
                            <div class="settings-form-group">
                                <label for="regCity">Cidade / UF</label>
                                <input type="text" id="regCity" value="${addressParts.cityState}" placeholder="Cidade / UF">
                            </div>
                        </div>
                        <div id="registrationLookupStatus"></div>
                        <div class="registration-inline-note">Digite o CEP para preencher automaticamente rua, bairro, cidade e estado.</div>
                    </div>

                    <div class="settings-form-group">
                        <label for="regNotes">Informacoes importantes</label>
                        <textarea id="regNotes" rows="3" placeholder="Restricoes, preferencias, observacoes">${user?.notes || ''}</textarea>
                    </div>

                    <div class="form-actions registration-actions">
                        <button type="button" id="saveRegistrationBtn">${isEditing ? 'Salvar cadastro' : 'Salvar cadastro'}</button>
                        <button type="button" class="cancel-btn registration-secondary-btn">Fechar</button>
                    </div>
                    <p id="registrationMessage" style="margin-top:12px; color:#fecaca;"></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    wrapper.querySelector('#regCep')?.addEventListener('input', event => {
        let value = event.target.value.replace(/\D/g, '').slice(0, 8);
        if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
        event.target.value = value;
    });
    wrapper.querySelector('#regPhone')?.addEventListener('input', event => {
        let value = event.target.value.replace(/\D/g, '').slice(0, 11);
        if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        else if (value.length > 2) value = value.replace(/^(\d{2})(\d+)/, '($1) $2');
        else if (value.length) value = `(${value}`;
        event.target.value = value;
    });
    wrapper.querySelector('#regCpf')?.addEventListener('input', event => {
        let value = event.target.value.replace(/\D/g, '').slice(0, 11);
        value = value.replace(/^(\d{3})(\d)/, '$1.$2');
        value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
        event.target.value = value;
    });
    wrapper.querySelector('#regCep')?.addEventListener('blur', () => lookupRegistrationCep());
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.modal')?.addEventListener('click', event => {
        if (event.target === wrapper.querySelector('.modal')) wrapper.remove();
    });
    wrapper.querySelector('#saveRegistrationBtn')?.addEventListener('click', () => saveRegistrationForm(isEditing ? user.id : null));
}

function saveRegistrationForm(userId = null) {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const phone = document.getElementById('regPhone')?.value.trim();
    const cpf = document.getElementById('regCpf')?.value.trim();
    const cep = document.getElementById('regCep')?.value.trim();
    const street = document.getElementById('regStreet')?.value.trim();
    const number = document.getElementById('regNumber')?.value.trim();
    const complement = document.getElementById('regComplement')?.value.trim();
    const neighborhood = document.getElementById('regNeighborhood')?.value.trim();
    const cityState = document.getElementById('regCity')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const notes = document.getElementById('regNotes')?.value.trim();
    const message = document.getElementById('registrationMessage');
    const address = [street, number ? `nº ${number}` : '', neighborhood, cityState, complement].filter(Boolean).join(', ');

    if (!name || !email || !phone || !password) {
        if (message) message.textContent = 'Preencha nome, e-mail, telefone e senha.';
        return;
    }

    const emailInUse = users.some(user => user.email === email && user.id !== userId);
    if (emailInUse) {
        if (message) message.textContent = 'Este e-mail já está cadastrado.';
        return;
    }

    if (userId) {
        const index = users.findIndex(user => user.id === userId);
        if (index === -1) return;
        users[index] = { ...users[index], name, email, phone, cpf, cep, street, number, complement, neighborhood, cityState, address, password, notes };
        currentUser = { ...users[index] };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMessage('Perfil atualizado com sucesso.', 'success');
    } else {
        const newUser = {
            id: users.length ? Math.max(...users.map(user => user.id)) + 1 : 1,
            name,
            email,
            phone,
            cpf,
            cep,
            street,
            number,
            complement,
            neighborhood,
            cityState,
            address,
            password,
            notes,
            isAdmin: false,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        currentUser = { ...newUser };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMessage(`Conta criada com sucesso. Bem-vindo(a), ${name}!`, 'success');
    }

    saveToLocalStorage();
    updateUserState();
    document.getElementById('registrationModal')?.remove();
    closeLoginModal();
    openCustomerArea('profile');
}

async function lookupRegistrationCep() {
    const cepField = document.getElementById('regCep');
    const statusField = document.getElementById('registrationLookupStatus');
    if (!cepField || !statusField) return;

    const cep = cepField.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        statusField.textContent = cep ? 'Digite um CEP com 8 numeros.' : '';
        return;
    }

    statusField.textContent = 'Buscando endereco pelo CEP...';

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (!response.ok || data.erro) {
            statusField.textContent = 'CEP nao encontrado. Revise os numeros digitados.';
            return;
        }

        const streetField = document.getElementById('regStreet');
        const neighborhoodField = document.getElementById('regNeighborhood');
        const cityField = document.getElementById('regCity');

        if (streetField) streetField.value = data.logradouro || '';
        if (neighborhoodField) neighborhoodField.value = data.bairro || '';
        if (cityField) cityField.value = [data.localidade || '', data.uf || ''].filter(Boolean).join(' / ');

        statusField.textContent = 'Endereco preenchido automaticamente.';
    } catch (error) {
        statusField.textContent = 'Nao foi possivel consultar o CEP agora.';
    }
}

function openCustomerArea(defaultTab = 'budgets') {
    if (!currentUser || currentUser.isAdmin) return;

    document.getElementById('customerAreaModal')?.remove();
    const userBudgets = savedBudgets
        .filter(budget => budget.userId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    const wrapper = document.createElement('div');
    wrapper.id = 'customerAreaModal';
    wrapper.innerHTML = `
        <div class="modal" style="display:block; background: rgba(3,7,18,0.72);">
            <div class="modal-content" style="max-width: 1100px;">
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
                                            <p>${budget.eventDetails?.type || 'Evento'}${budget.eventDetails?.date ? ` • ${formatDateBR(budget.eventDetails.date)}` : ''}</p>
                                            <small>Status: ${budget.status}</small>
                                        </div>
                                        <div class="customer-budget-right">
                                            <strong>${formatCurrencyBRL(budget.total)}</strong>
                                            <button class="btn-small customer-view-budget" data-id="${budget.id}">Ver detalhes</button>
                                        </div>
                                    </div>
                                `).join('') : '<p>Nenhum orçamento salvo até agora.</p>'}
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
                                <div style="margin-top:20px;">
                                    <button id="editCustomerProfileBtn" class="cta-button">Editar cadastro</button>
                                </div>
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
        button.addEventListener('click', function() {
            wrapper.querySelectorAll('.customer-area-tab').forEach(item => item.classList.remove('active'));
            wrapper.querySelectorAll('.customer-tab').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            wrapper.querySelector(`#customer${capitalizeFirstLetter(this.dataset.tab)}Tab`)?.classList.add('active');
        });
    });
    wrapper.querySelectorAll('.customer-view-budget').forEach(button => {
        button.addEventListener('click', function() {
            showBudgetDetails(parseInt(this.dataset.id, 10));
        });
    });
    wrapper.querySelector('#editCustomerProfileBtn')?.addEventListener('click', function() {
        openRegistrationModal(users.find(user => user.id === currentUser.id));
    });
}

function showMyBudgets() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    if (currentUser.isAdmin) {
        openAdminPanel();
        return;
    }
    openCustomerArea('budgets');
}

function showMyProfile() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    if (currentUser.isAdmin) {
        showMessage('Perfil administrativo ativo.', 'info');
        return;
    }
    openCustomerArea('profile');
}

// ============================================
// OPERATIONS FLOW OVERRIDES
// ============================================

function renderAdminOrdersTable() {
    const sortedBudgets = [...savedBudgets].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    if (!sortedBudgets.length) {
        return '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><h3>Nenhum pedido encontrado</h3><p>Os orcamentos salvos aparecerao aqui.</p></div>';
    }

    return `
        <div class="products-table orders-table">
            <div class="table-header">
                <div>ID</div>
                <div>Cliente</div>
                <div>Evento</div>
                <div>Data</div>
                <div>Total</div>
                <div>Status</div>
                <div>Acoes</div>
            </div>
            ${sortedBudgets.map(budget => `
                <div class="table-row">
                    <div data-label="ID">#${budget.id}</div>
                    <div data-label="Cliente">${budget.userName}</div>
                    <div data-label="Evento">${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Nao informado'}${budget.eventDetails?.guests ? ` • ${budget.eventDetails.guests} pax` : ''}</div>
                    <div data-label="Data">${budget.eventDetails?.deliveryDate ? formatDateBR(budget.eventDetails.deliveryDate) : (budget.eventDetails?.date ? formatDateBR(budget.eventDetails.date) : budget.date)}</div>
                    <div data-label="Total">${formatCurrencyBRL(budget.total)}</div>
                    <div data-label="Status">
                        <select class="status-select" onchange="updateBudgetStatus(${budget.id}, this.value)">
                            <option value="Pendente" ${budget.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="Aprovado" ${budget.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option value="Finalizado" ${budget.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                            <option value="Cancelado" ${budget.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div data-label="Acoes">
                        <div class="action-buttons">
                            <button class="action-btn action-edit" onclick="viewBudgetDetailsAdmin(${budget.id})"><i class="fas fa-eye"></i></button>
                            ${budget.status === 'Pendente' ? `<button class="action-btn" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')"><i class="fas fa-check"></i></button>` : ''}
                            <button class="action-btn action-delete" onclick="deleteBudgetAdmin(${budget.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();
    if (['Aprovado', 'Finalizado'].includes(newStatus)) {
        createLogisticsFromBudget(budget);
    }
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

function renderAdminFinance() {
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
    const balance = received - expenses;

    return `
        <div class="section-header">
            <h2>Financeiro</h2>
            <div class="admin-actions">
                <button onclick="openSaleModal()"><i class="fas fa-cash-register"></i> Nova venda</button>
                <button onclick="openFinancialEntryModal()"><i class="fas fa-receipt"></i> Nova despesa</button>
            </div>
        </div>
        <div class="inventory-summary-grid">
            <div class="report-card"><h3>${formatCurrencyBRL(received)}</h3><p>recebido</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(receivable)}</h3><p>a receber</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(expenses)}</h3><p>despesas</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(balance)}</h3><p>saldo operacional</p></div>
        </div>
        <div class="report-card">
            <h3 style="margin-bottom:16px;">Controle de vendas, precos e lancamentos</h3>
            ${renderFinancialEntriesTable()}
        </div>
    `;
}

window.openSaleModal = function() {
    const customers = users.filter(user => !user.isAdmin);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="saleModal" style="display:block; background: rgba(3,7,18,0.78);">
            <div class="modal-content" style="max-width: 980px;">
                <div class="modal-header">
                    <h2>Nova venda / locacao</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="saleCustomer">Cliente</label>
                            <select id="saleCustomer">
                                <option value="">Selecione</option>
                                ${customers.map(customer => `<option value="${customer.id}">${customer.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="settings-form-group">
                            <label for="saleEventName">Nome da festa</label>
                            <input type="text" id="saleEventName" placeholder="Ex: Casamento Ana e Pedro">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="settings-form-group">
                            <label for="saleEventType">Tipo do evento</label>
                            <input type="text" id="saleEventType" placeholder="Casamento, corporativo, aniversario">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleGuests">Convidados</label>
                            <input type="number" id="saleGuests" min="0" value="0">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleVenueType">Ambiente</label>
                            <input type="text" id="saleVenueType" placeholder="Interno / Externo">
                        </div>
                    </div>
                    <div class="form-row-3">
                        <div class="settings-form-group">
                            <label for="saleDeliveryDate">Data da entrega</label>
                            <input type="date" id="saleDeliveryDate">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleDeliveryTime">Horario da entrega</label>
                            <input type="time" id="saleDeliveryTime">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleReturnDate">Data da retirada</label>
                            <input type="date" id="saleReturnDate">
                        </div>
                    </div>
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="saleResponsible">Responsavel no local</label>
                            <input type="text" id="saleResponsible" placeholder="Quem recebe">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleResponsiblePhone">Telefone do responsavel</label>
                            <input type="text" id="saleResponsiblePhone" placeholder="(00) 00000-0000">
                        </div>
                    </div>
                    <div class="settings-form-group">
                        <label for="saleAddress">Endereco da entrega</label>
                        <input type="text" id="saleAddress" placeholder="Rua, numero, bairro, cidade e referencia">
                    </div>
                    <div class="settings-form-group">
                        <label for="saleNotes">Observacoes</label>
                        <input type="text" id="saleNotes" placeholder="Montagem, acesso, horario, detalhes importantes">
                    </div>
                    <div class="report-card" style="margin: 18px 0;">
                        <h3 style="margin-bottom:12px;">Itens da venda</h3>
                        <div class="products-table finance-table">
                            <div class="table-header">
                                <div>Produto</div>
                                <div>Disponivel</div>
                                <div>Qtd.</div>
                                <div>Preco unit.</div>
                                <div>Total</div>
                                <div>Selecionar</div>
                                <div>Info</div>
                            </div>
                            ${products.map(product => `
                                <div class="table-row">
                                    <div data-label="Produto">${product.name}</div>
                                    <div data-label="Disponivel">${product.stock}</div>
                                    <div data-label="Qtd."><input type="number" id="saleQty${product.id}" min="0" max="${product.stock}" value="0"></div>
                                    <div data-label="Preco unit."><input type="number" id="salePrice${product.id}" min="0" step="0.01" value="${product.price}"></div>
                                    <div data-label="Total" id="saleLineTotal${product.id}">${formatCurrencyBRL(0)}</div>
                                    <div data-label="Selecionar"><input type="checkbox" id="saleCheck${product.id}"></div>
                                    <div data-label="Info">${product.category}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="createDirectSale()">Salvar venda</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);

    products.forEach(product => {
        const qty = wrapper.querySelector(`#saleQty${product.id}`);
        const price = wrapper.querySelector(`#salePrice${product.id}`);
        const total = wrapper.querySelector(`#saleLineTotal${product.id}`);
        const sync = () => {
            const q = parseInt(qty?.value || '0', 10);
            const p = parseFloat(price?.value || '0');
            total.textContent = formatCurrencyBRL(q * p);
            const checkbox = wrapper.querySelector(`#saleCheck${product.id}`);
            if (checkbox) checkbox.checked = q > 0;
        };
        qty?.addEventListener('input', sync);
        price?.addEventListener('input', sync);
    });

    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#saleModal')?.addEventListener('click', event => {
        if (event.target.id === 'saleModal') wrapper.remove();
    });
};

window.createDirectSale = function() {
    const customerId = parseInt(document.getElementById('saleCustomer')?.value || '0', 10);
    const customer = users.find(user => user.id === customerId);
    if (!customer) {
        showAdminMessage('Selecione um cliente para a venda.', 'error');
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
            items.push({
                id: product.id,
                name: product.name,
                quantity,
                price,
                total
            });
        }
    }

    if (!items.length) {
        showAdminMessage('Selecione ao menos um item para a venda.', 'error');
        return;
    }

    const eventDetails = {
        eventName: document.getElementById('saleEventName')?.value.trim() || 'Evento sem nome',
        type: document.getElementById('saleEventType')?.value.trim() || 'Evento',
        guests: parseInt(document.getElementById('saleGuests')?.value || '0', 10) || 0,
        venueType: document.getElementById('saleVenueType')?.value.trim() || '',
        deliveryDate: document.getElementById('saleDeliveryDate')?.value || '',
        deliveryTime: document.getElementById('saleDeliveryTime')?.value || '09:00',
        returnDate: document.getElementById('saleReturnDate')?.value || '',
        responsible: document.getElementById('saleResponsible')?.value.trim() || customer.name,
        responsiblePhone: document.getElementById('saleResponsiblePhone')?.value.trim() || customer.phone || '',
        deliveryAddress: document.getElementById('saleAddress')?.value.trim() || customer.address || '',
        notes: document.getElementById('saleNotes')?.value.trim() || '',
        date: document.getElementById('saleDeliveryDate')?.value || '',
        city: (document.getElementById('saleAddress')?.value.trim() || customer.address || '').split(',').pop()?.trim() || ''
    };

    if (!eventDetails.deliveryDate || !eventDetails.deliveryAddress || !eventDetails.responsible) {
        showAdminMessage('Preencha data, endereco e responsavel pela entrega.', 'error');
        return;
    }

    const budget = {
        id: Date.now(),
        userId: customer.id,
        userName: customer.name,
        date: new Date().toLocaleString('pt-BR'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items,
        subtotal,
        freight: 0,
        total: subtotal,
        cep: '',
        status: 'Aprovado',
        inventoryCommitted: false,
        eventDetails
    };

    savedBudgets.push(budget);
    const inventoryResult = applyInventoryForBudget(budget, 'out');
    if (!inventoryResult.ok) {
        savedBudgets = savedBudgets.filter(item => item.id !== budget.id);
        showAdminMessage(inventoryResult.message, 'error');
        return;
    }

    createLogisticsFromBudget(budget, eventDetails.responsible);
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    document.getElementById('saleModal')?.parentElement?.remove();
    showAdminMessage('Venda criada com estoque, financeiro e logistica atualizados.', 'success');
};

function saveBudget() {
    if (!cart.length) {
        showMessage('Adicione itens ao orcamento antes de salvar.', 'error');
        return;
    }

    const cepInput = document.getElementById('cep');
    if (!cepInput?.value) {
        showMessage('Informe um CEP para calcular o frete.', 'error');
        return;
    }

    if (!currentUser) {
        showMessage('Faca login para salvar seu orcamento.', 'error');
        openLoginModal();
        return;
    }

    const eventDetails = getEventBriefFromForm();
    if (!eventDetails.eventName || !eventDetails.deliveryDate || !eventDetails.deliveryTime || !eventDetails.deliveryAddress || !eventDetails.responsible) {
        showMessage('Preencha nome da festa, entrega, endereco e responsavel para concluir o orcamento.', 'error');
        return;
    }

    let subtotal = 0;
    const items = cart.map(item => {
        let unitPrice = item.price;
        if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
            unitPrice = item.bulkDiscount.price;
        }
        const total = unitPrice * item.quantity;
        subtotal += total;
        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: unitPrice,
            total
        };
    });

    const budget = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        date: new Date().toLocaleString('pt-BR'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items,
        subtotal,
        freight: freightValue,
        total: subtotal + freightValue,
        cep: cepInput.value,
        status: 'Pendente',
        inventoryCommitted: false,
        eventDetails
    };

    savedBudgets.push(budget);
    ensureAccessSession().converted = true;
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    refreshAdminViews();
    showMessage(`Orcamento salvo com sucesso. Total: ${formatCurrencyBRL(budget.total)}`, 'success');
    clearBudget();
}

function renderAdminOrders() {
    return `
        <div class="section-header">
            <h2>Pedidos e Orcamentos</h2>
        </div>
        <div id="adminOrdersContainer">${renderAdminOrdersTable()}</div>
    `;
}

function renderAdminOrdersTable() {
    const sortedBudgets = [...savedBudgets].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    if (!sortedBudgets.length) {
        return '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><h3>Nenhum pedido encontrado</h3><p>Os orcamentos salvos aparecerao aqui.</p></div>';
    }

    return `
        <div class="products-table orders-table">
            <div class="table-header">
                <div>ID</div>
                <div>Cliente</div>
                <div>Evento</div>
                <div>Data</div>
                <div>Total</div>
                <div>Status</div>
                <div>Acoes</div>
            </div>
            ${sortedBudgets.map(budget => `
                <div class="table-row">
                    <div data-label="ID">#${budget.id}</div>
                    <div data-label="Cliente">${budget.userName}</div>
                    <div data-label="Evento">${budget.eventDetails?.type || 'Nao informado'}${budget.eventDetails?.guests ? ` • ${budget.eventDetails.guests} pax` : ''}</div>
                    <div data-label="Data">${budget.eventDetails?.date ? formatDateBR(budget.eventDetails.date) : budget.date}</div>
                    <div data-label="Total">${formatCurrencyBRL(budget.total)}</div>
                    <div data-label="Status">
                        <select class="status-select" onchange="updateBudgetStatus(${budget.id}, this.value)">
                            <option value="Pendente" ${budget.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="Aprovado" ${budget.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option value="Finalizado" ${budget.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                            <option value="Cancelado" ${budget.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div data-label="Acoes">
                        <div class="action-buttons">
                            <button class="action-btn action-edit" onclick="viewBudgetDetailsAdmin(${budget.id})"><i class="fas fa-eye"></i></button>
                            <button class="action-btn action-delete" onclick="deleteBudgetAdmin(${budget.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAdminFinance() {
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
    const balance = received - expenses;

    return `
        <div class="section-header">
            <h2>Financeiro</h2>
            <div class="admin-actions">
                <button onclick="openFinancialEntryModal()"><i class="fas fa-plus"></i> Nova despesa</button>
            </div>
        </div>
        <div class="inventory-summary-grid">
            <div class="report-card"><h3>${formatCurrencyBRL(received)}</h3><p>recebido</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(receivable)}</h3><p>previsto / a receber</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(expenses)}</h3><p>despesas</p></div>
            <div class="report-card"><h3>${formatCurrencyBRL(balance)}</h3><p>saldo operacional</p></div>
        </div>
        <div class="report-card">
            <div class="finance-table-wrapper">
                ${renderFinancialEntriesTable()}
            </div>
        </div>
    `;
}

function renderFinancialEntriesTable() {
    if (!financialEntries.length) {
        return '<div class="empty-state"><i class="fas fa-wallet"></i><p>Nenhum lancamento financeiro.</p></div>';
    }

    return `
        <div class="products-table compact-table finance-table">
            <div class="table-header">
                <div>Tipo</div>
                <div>Descricao</div>
                <div>Cliente</div>
                <div>Vencimento</div>
                <div>Valor</div>
                <div>Status</div>
                <div>Acoes</div>
            </div>
            ${financialEntries
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map(entry => `
                    <div class="table-row">
                        <div data-label="Tipo">${entry.kind}</div>
                        <div data-label="Descricao">${entry.description}</div>
                        <div data-label="Cliente">${entry.customerName || '-'}</div>
                        <div data-label="Vencimento">${formatDateBR(entry.dueDate)}</div>
                        <div data-label="Valor">${formatCurrencyBRL(entry.amount)}</div>
                        <div data-label="Status"><span class="status-badge ${getFinanceStatusClass(entry.status)}">${entry.status}</span></div>
                        <div data-label="Acoes">
                            ${entry.kind === 'Despesa' ? `<button class="action-btn action-delete" onclick="removeFinancialEntry(${entry.id})"><i class="fas fa-trash"></i></button>` : ''}
                            ${entry.kind === 'Receita' && entry.status !== 'Recebido' && entry.status !== 'Cancelado' ? `<button class="action-btn action-edit" onclick="markFinancialEntryAsPaid(${entry.id})"><i class="fas fa-check"></i></button>` : ''}
                        </div>
                    </div>
                `).join('')}
        </div>
    `;
}

window.openFinancialEntryModal = function() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="financialEntryModal" style="display:block; background: rgba(0,0,0,0.9);">
            <div class="modal-content" style="max-width: 560px;">
                <div class="modal-header">
                    <h2>Nova despesa</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="settings-form-group">
                        <label for="financialDescription">Descricao</label>
                        <input type="text" id="financialDescription" placeholder="Ex: transporte, manutencao, equipe">
                    </div>
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="financialAmount">Valor</label>
                            <input type="number" id="financialAmount" min="0" step="0.01" placeholder="0.00">
                        </div>
                        <div class="settings-form-group">
                            <label for="financialDueDate">Vencimento</label>
                            <input type="date" id="financialDueDate">
                        </div>
                    </div>
                    <div class="settings-form-group">
                        <label for="financialCategory">Categoria</label>
                        <input type="text" id="financialCategory" placeholder="Operacional">
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="createFinancialEntry()">Salvar despesa</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#financialEntryModal')?.addEventListener('click', event => {
        if (event.target.id === 'financialEntryModal') wrapper.remove();
    });
};

window.createFinancialEntry = function() {
    const description = document.getElementById('financialDescription')?.value.trim();
    const amount = parseFloat(document.getElementById('financialAmount')?.value || '0');
    const dueDate = document.getElementById('financialDueDate')?.value || new Date().toISOString();
    const category = document.getElementById('financialCategory')?.value.trim() || 'Operacional';

    if (!description || amount <= 0) {
        showAdminMessage('Preencha descricao e valor da despesa.', 'error');
        return;
    }

    financialEntries.push({
        id: Date.now(),
        budgetId: null,
        customerName: '',
        description,
        amount,
        kind: 'Despesa',
        category,
        dueDate,
        status: 'Recebido',
        createdAt: new Date().toISOString()
    });

    saveToLocalStorage();
    refreshAdminViews();
    document.getElementById('financialEntryModal')?.parentElement?.remove();
    showAdminMessage('Despesa cadastrada com sucesso.', 'success');
};

window.markFinancialEntryAsPaid = function(entryId) {
    const entry = financialEntries.find(item => item.id === entryId);
    if (!entry) return;
    entry.status = 'Recebido';

    if (entry.budgetId) {
        const budget = savedBudgets.find(item => item.id === entry.budgetId);
        if (budget) budget.status = 'Finalizado';
    }

    saveToLocalStorage();
    refreshAdminViews();
    showAdminMessage('Lancamento marcado como recebido.', 'success');
};

window.removeFinancialEntry = function(entryId) {
    financialEntries = financialEntries.filter(entry => entry.id !== entryId);
    saveToLocalStorage();
    refreshAdminViews();
    showAdminMessage('Lancamento removido.', 'success');
};

function renderAdminUsers() {
    return `
        <div class="section-header">
            <h2>Cadastros</h2>
            <div class="admin-actions">
                <button onclick="openAdminUserModal()"><i class="fas fa-user-plus"></i> Novo cadastro</button>
            </div>
        </div>
        <div id="adminUsersContainer">${renderAdminUsersTable()}</div>
    `;
}

function renderAdminUsersTable() {
    if (!users.length) {
        return '<div class="empty-state"><i class="fas fa-users"></i><h3>Nenhum cadastro</h3><p>Os usuarios aparecerao aqui.</p></div>';
    }

    return `
        <div class="products-table users-table">
            <div class="table-header">
                <div>ID</div>
                <div>Nome</div>
                <div>Email</div>
                <div>Tipo</div>
                <div>Pedidos</div>
                <div>Acoes</div>
            </div>
            ${users.map(user => {
                const totalBudgets = savedBudgets.filter(budget => budget.userId === user.id).length;
                return `
                    <div class="table-row">
                        <div data-label="ID">${user.id}</div>
                        <div data-label="Nome">${user.name}${user.isAdmin ? '<span class="admin-badge-small">ADMIN</span>' : ''}</div>
                        <div data-label="Email">${user.email}</div>
                        <div data-label="Tipo">${user.isAdmin ? 'Administrador' : 'Cliente'}</div>
                        <div data-label="Pedidos">${totalBudgets}</div>
                        <div data-label="Acoes">
                            <div class="action-buttons">
                                ${!user.isAdmin ? `<button class="action-btn action-edit" onclick="makeAdmin(${user.id})"><i class="fas fa-user-shield"></i></button>` : ''}
                                ${user.id !== 1 ? `<button class="action-btn action-delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.openAdminUserModal = function() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="adminUserModal" style="display:block; background: rgba(0,0,0,0.9);">
            <div class="modal-content" style="max-width: 520px;">
                <div class="modal-header">
                    <h2>Novo cadastro</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="settings-form-group">
                        <label for="adminUserName">Nome</label>
                        <input type="text" id="adminUserName">
                    </div>
                    <div class="settings-form-group">
                        <label for="adminUserEmail">Email</label>
                        <input type="email" id="adminUserEmail">
                    </div>
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="adminUserPassword">Senha</label>
                            <input type="password" id="adminUserPassword">
                        </div>
                        <div class="settings-form-group">
                            <label for="adminUserType">Perfil</label>
                            <select id="adminUserType">
                                <option value="client">Cliente</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="createAdminUser()">Salvar cadastro</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#adminUserModal')?.addEventListener('click', event => {
        if (event.target.id === 'adminUserModal') wrapper.remove();
    });
};

window.createAdminUser = function() {
    const name = document.getElementById('adminUserName')?.value.trim();
    const email = document.getElementById('adminUserEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('adminUserPassword')?.value.trim();
    const userType = document.getElementById('adminUserType')?.value;

    if (!name || !email || !password) {
        showAdminMessage('Preencha todos os campos do cadastro.', 'error');
        return;
    }

    if (users.some(user => user.email === email)) {
        showAdminMessage('Ja existe um usuario com este email.', 'error');
        return;
    }

    users.push({
        id: users.length ? Math.max(...users.map(user => user.id)) + 1 : 1,
        name,
        email,
        password,
        isAdmin: userType === 'admin',
        createdAt: new Date().toISOString()
    });

    saveToLocalStorage();
    refreshAdminViews();
    document.getElementById('adminUserModal')?.parentElement?.remove();
    showAdminMessage('Cadastro criado com sucesso.', 'success');
};

function renderAdminReports() {
    return `
        <div class="section-header">
            <h2>Indicadores</h2>
        </div>
        <div class="reports-grid">
            <div class="report-card">
                <h3>Produtos mais alugados</h3>
                ${renderTopProducts()}
            </div>
            <div class="report-card">
                <h3>Receita por status</h3>
                ${renderRevenueByStatus()}
            </div>
        </div>
    `;
}

function renderRevenueByStatus() {
    const summary = {
        Pendente: 0,
        Aprovado: 0,
        Finalizado: 0,
        Cancelado: 0
    };

    savedBudgets.forEach(budget => {
        summary[budget.status] += budget.total;
    });

    return `
        <div class="revenue-stats">
            ${Object.entries(summary).map(([status, amount]) => `
                <div class="revenue-item">
                    <div class="revenue-status">
                        <span class="status-dot" style="background-color: ${getStatusColor(status)}"></span>
                        <span>${status}</span>
                    </div>
                    <div class="revenue-amount">${formatCurrencyBRL(amount)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function openAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) {
        showMessage('Acesso restrito. Faca login como administrador.', 'error');
        openLoginModal();
        return;
    }

    document.getElementById('adminPanel')?.remove();

    const adminPanel = document.createElement('div');
    adminPanel.id = 'adminPanel';
    adminPanel.innerHTML = `
        <div class="admin-header">
            <div class="admin-header-left">
                <h1><i class="fas fa-briefcase"></i> Painel Administrativo</h1>
                <p>${companyData.name}</p>
            </div>
            <div class="admin-header-right">
                <div class="admin-user-info">
                    <p>${currentUser.name}</p>
                    <small>Operacao, estoque e financeiro</small>
                </div>
                <button id="closeAdminPanel"><i class="fas fa-times"></i> Fechar</button>
            </div>
        </div>
        <div class="admin-main-container">
            <div class="admin-sidebar">
                <nav class="admin-nav">
                    <button class="admin-nav-btn active" data-tab="dashboard"><i class="fas fa-gauge"></i> Dashboard</button>
                    <button class="admin-nav-btn" data-tab="products"><i class="fas fa-boxes-stacked"></i> Estoque</button>
                    <button class="admin-nav-btn" data-tab="orders"><i class="fas fa-file-invoice"></i> Pedidos</button>
                    <button class="admin-nav-btn" data-tab="finance"><i class="fas fa-wallet"></i> Financeiro</button>
                    <button class="admin-nav-btn" data-tab="users"><i class="fas fa-address-book"></i> Cadastros</button>
                    <button class="admin-nav-btn" data-tab="reports"><i class="fas fa-chart-column"></i> Indicadores</button>
                    <button class="admin-nav-btn" data-tab="settings"><i class="fas fa-gear"></i> Configuracoes</button>
                </nav>
                <div class="admin-tools">
                    <h3>Ferramentas</h3>
                    <div class="tool-buttons">
                        <button onclick="exportData()"><i class="fas fa-download"></i> Exportar</button>
                        <button onclick="importData()"><i class="fas fa-upload"></i> Importar</button>
                    </div>
                </div>
            </div>
            <div class="admin-content">
                <div id="adminDashboardTab" class="admin-tab-content active">${renderAdminDashboard()}</div>
                <div id="adminProductsTab" class="admin-tab-content">${renderAdminProducts()}</div>
                <div id="adminOrdersTab" class="admin-tab-content">${renderAdminOrders()}</div>
                <div id="adminFinanceTab" class="admin-tab-content">${renderAdminFinance()}</div>
                <div id="adminUsersTab" class="admin-tab-content">${renderAdminUsers()}</div>
                <div id="adminReportsTab" class="admin-tab-content">${renderAdminReports()}</div>
                <div id="adminSettingsTab" class="admin-tab-content">${renderAdminSettings()}</div>
            </div>
        </div>
    `;

    document.body.appendChild(adminPanel);
    setupAdminPanelEvents();
}

function setupAdminPanelEvents() {
    document.getElementById('closeAdminPanel')?.addEventListener('click', () => {
        document.getElementById('adminPanel')?.remove();
    });

    document.getElementById('addNewProduct')?.addEventListener('click', () => {
        addNewProduct();
    });

    document.querySelectorAll('.admin-nav-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            document.querySelectorAll('.admin-nav-btn').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const tabElement = document.getElementById(`admin${capitalizeFirstLetter(tab)}Tab`);
            if (tabElement) tabElement.style.display = 'block';
        });
    });

    document.getElementById('companySettingsForm')?.addEventListener('submit', event => {
        event.preventDefault();
        saveCompanySettings();
    });
}

// EOF FINAL OVERRIDES
async function checkCep() {
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
}

function getEventBriefFromForm() {
    const street = document.getElementById('deliveryStreet')?.value.trim() || '';
    const number = document.getElementById('deliveryNumber')?.value.trim() || '';
    const complement = document.getElementById('deliveryComplement')?.value.trim() || '';
    const neighborhood = document.getElementById('deliveryNeighborhood')?.value.trim() || '';
    const city = document.getElementById('deliveryCity')?.value.trim() || '';
    const state = document.getElementById('deliveryState')?.value.trim() || '';
    const deliveryAddress = [street, number, complement, neighborhood, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
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
        deliveryAddress
    };
}

function clearEventBriefForm() {
    ['eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes', 'eventName', 'deliveryDate', 'deliveryTime', 'eventResponsible', 'eventResponsiblePhone', 'deliveryStreet', 'deliveryNumber', 'deliveryComplement', 'deliveryNeighborhood', 'deliveryCity', 'deliveryState'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function createLogisticsFromBudget(budget, responsibleFallback = '') {
    const event = budget.eventDetails || {};
    const location = event.deliveryAddress || `${event.city || ''} ${budget.cep || ''}`.trim();
    const deliveryDate = event.deliveryDate || event.date || '';
    if (!deliveryDate || !location) return;
    const statusMap = { Pendente: 'Aguardando confirmacao', Aprovado: 'Confirmado', Finalizado: 'Entregue', Cancelado: 'Cancelado' };
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
}

function renderAdminFinance() {
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
                    <h4>${budget.userName || 'Cliente'} • #${budget.id}</h4>
                    <p style="margin:0 0 6px;">${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}</p>
                    <small>${budget.eventDetails?.deliveryDate ? `Entrega em ${formatDateBR(budget.eventDetails.deliveryDate)}` : 'Sem data de entrega'}${budget.eventDetails?.deliveryTime ? ` • ${budget.eventDetails.deliveryTime}` : ''}</small>
                    <p style="margin:12px 0 0;"><strong style="color:#fff;">${formatCurrencyBRL(budget.total || 0)}</strong></p>
                    <div class="finance-budget-actions">
                        <button type="button" onclick="viewBudgetDetailsAdmin(${budget.id})"><i class="fas fa-eye"></i> Ver</button>
                        ${budget.status === 'Pendente' ? `<button type="button" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')"><i class="fas fa-check"></i> Aprovar</button>` : ''}
                        <button type="button" class="secondary-btn" onclick="updateBudgetStatus(${budget.id}, 'Cancelado')"><i class="fas fa-ban"></i> Reprovar</button>
                    </div>
                </div>
            `).join('')}</div>` : '<p style="color: rgba(255,255,255,0.72); margin:0;">Nenhum orcamento aguardando avaliacao no momento.</p>'}
        </div>
        <div class="report-card">
            <h3 style="margin-bottom: 16px;">Vendas, contratos e movimentacao financeira</h3>
            <div class="finance-table-wrapper">${renderFinancialEntriesTable()}</div>
        </div>
    `;
}

async function saveBudget() {
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

    savedBudgets.unshift(budget);
    createLogisticsFromBudget(budget, eventDetails.responsible);
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();

    try {
        await fetch(`${getMobilierServerBaseUrl()}/api/budget-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento',
                deliveryDate: budget.eventDetails?.deliveryDate || '',
                deliveryTime: budget.eventDetails?.deliveryTime || '',
                address: budget.eventDetails?.deliveryAddress || '',
                items: budget.items || []
            })
        });
    } catch (error) {
        console.error('Erro ao enviar e-mail do orcamento:', error);
    }

    cart = [];
    clearEventBriefForm();
    resetFreightFields();
    renderProducts();
    renderBudgetItems();
    updateBudgetSummary();
    openCustomerArea('budgets');
    showMessage('Orcamento salvo com sucesso. Ele ja esta na sua area e no painel administrativo.', 'success');
}

function openCustomerArea(defaultTab = 'budgets') {
    if (!currentUser || currentUser.isAdmin) return;
    document.getElementById('customerAreaModal')?.remove();
    const currentEmail = String(currentUser.email || '').trim().toLowerCase();
    const currentPhone = String(currentUser.phone || '').trim();
    const userBudgets = savedBudgets.filter(budget => {
        const budgetEmail = String(budget.userEmail || '').trim().toLowerCase();
        const budgetPhone = String(budget.userPhone || '').trim();
        return budget.userId === currentUser.id || (!!currentEmail && budgetEmail === currentEmail) || (!!currentPhone && budgetPhone === currentPhone);
    }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
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
                                            <p>${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}${budget.eventDetails?.date ? ` • ${formatDateBR(budget.eventDetails.date)}` : ''}</p>
                                            <small>Status: ${budget.status}</small>
                                        </div>
                                        <div class="customer-budget-right">
                                            <strong>${formatCurrencyBRL(budget.total)}</strong>
                                            <button class="btn-small customer-view-budget" data-id="${budget.id}">Ver detalhes</button>
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
        button.addEventListener('click', function() {
            wrapper.querySelectorAll('.customer-area-tab').forEach(item => item.classList.remove('active'));
            wrapper.querySelectorAll('.customer-tab').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            wrapper.querySelector(`#customer${capitalizeFirstLetter(this.dataset.tab)}Tab`)?.classList.add('active');
        });
    });
    wrapper.querySelectorAll('.customer-view-budget').forEach(button => button.addEventListener('click', function() {
        showBudgetDetails(parseInt(this.dataset.id, 10));
    }));
    wrapper.querySelector('#editCustomerProfileBtn')?.addEventListener('click', function() {
        openRegistrationModal(users.find(user => user.id === currentUser.id) || currentUser);
    });
}

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;
    const previousStatus = budget.status;
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
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    if (previousStatus !== newStatus && budget.userEmail) {
        fetch(`${getMobilierServerBaseUrl()}/api/budget-status-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                status: newStatus,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'
            })
        }).catch(error => console.error('Erro ao enviar e-mail de status:', error));
    }
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    resetFreightFields();
    updateBudgetSummary();
});

// FINAL UX AND OPERATIONS OVERRIDES
var currentFreightResult = null;

function getMobilierServerBaseUrl() {
    if (window.MOBILIER_API_URL) return String(window.MOBILIER_API_URL).replace(/\/$/, '');
    if (window.location?.protocol?.startsWith('http')) return window.location.origin;
    return 'http://localhost:3001';
}

function composeDeliveryAddressFromForm() {
    const street = document.getElementById('deliveryStreet')?.value.trim() || '';
    const number = document.getElementById('deliveryNumber')?.value.trim() || '';
    const complement = document.getElementById('deliveryComplement')?.value.trim() || '';
    const neighborhood = document.getElementById('deliveryNeighborhood')?.value.trim() || '';
    const city = document.getElementById('deliveryCity')?.value.trim() || '';
    const state = document.getElementById('deliveryState')?.value.trim() || '';
    return [street, number, complement, neighborhood, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
}

function resetFreightFields() {
    currentFreightResult = null;
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

async function sendBudgetCreatedEmail(budget) {
    if (!budget?.userEmail) return false;
    try {
        const response = await fetch(`${getMobilierServerBaseUrl()}/api/budget-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento',
                deliveryDate: budget.eventDetails?.deliveryDate || '',
                deliveryTime: budget.eventDetails?.deliveryTime || '',
                address: budget.eventDetails?.deliveryAddress || '',
                items: budget.items || []
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Erro ao enviar e-mail do orcamento:', error);
        return false;
    }
}

async function sendBudgetStatusEmail(budget, status) {
    if (!budget?.userEmail) return false;
    try {
        const response = await fetch(`${getMobilierServerBaseUrl()}/api/budget-status-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                status,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Erro ao enviar e-mail de status:', error);
        return false;
    }
}

function getEventBriefFromForm() {
    const deliveryAddress = composeDeliveryAddressFromForm();
    return {
        type: document.getElementById('eventType')?.value || '',
        guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
        date: document.getElementById('eventDate')?.value || '',
        city: document.getElementById('eventCity')?.value.trim() || document.getElementById('deliveryCity')?.value.trim() || '',
        venueType: document.getElementById('venueType')?.value || '',
        notes: document.getElementById('eventNotes')?.value.trim() || '',
        eventName: document.getElementById('eventName')?.value.trim() || '',
        deliveryDate: document.getElementById('deliveryDate')?.value || '',
        deliveryTime: document.getElementById('deliveryTime')?.value || '',
        responsible: document.getElementById('eventResponsible')?.value.trim() || '',
        responsiblePhone: document.getElementById('eventResponsiblePhone')?.value.trim() || '',
        deliveryAddress
    };
}

function clearEventBriefForm() {
    [
        'eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes',
        'eventName', 'deliveryDate', 'deliveryTime', 'eventResponsible', 'eventResponsiblePhone',
        'deliveryStreet', 'deliveryNumber', 'deliveryComplement', 'deliveryNeighborhood', 'deliveryCity', 'deliveryState'
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

async function checkCep() {
    const cepInput = document.getElementById('cep');
    if (!cepInput) return;
    const rawCep = cepInput.value.replace(/\D/g, '');
    if (rawCep.length !== 8) {
        currentFreightResult = null;
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
            currentFreightResult = null;
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

        currentFreightResult = { cep: maskedCep, city, state, street, neighborhood };

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
        currentFreightResult = null;
        freightValue = 0;
        showCepMessage('Nao foi possivel consultar o CEP agora. Tente novamente em instantes.', 'error');
        updateBudgetSummary();
    }
}

function createLogisticsFromBudget(budget, responsibleFallback = '') {
    const event = budget.eventDetails || {};
    const deliveryDate = event.deliveryDate || event.date || '';
    const deliveryTime = event.deliveryTime || '09:00';
    const location = event.deliveryAddress || `${event.city || ''} ${budget.cep || ''}`.trim();
    if (!deliveryDate || !location) return;

    const logisticsStatusMap = {
        Pendente: 'Aguardando confirmacao',
        Aprovado: 'Confirmado',
        Finalizado: 'Entregue',
        Cancelado: 'Cancelado'
    };

    const entryBase = {
        budgetId: budget.id,
        eventName: event.eventName || event.type || `Evento ${budget.id}`,
        clientName: budget.userName || '',
        contactName: event.responsible || responsibleFallback || budget.userName || '',
        contactPhone: event.responsiblePhone || budget.userPhone || '',
        receiverName: event.responsible || responsibleFallback || budget.userName || '',
        receiverPhone: event.responsiblePhone || budget.userPhone || '',
        responsible: event.responsible || responsibleFallback || budget.userName || '',
        owner: event.responsible || responsibleFallback || budget.userName || '',
        date: deliveryDate,
        time: deliveryTime,
        location,
        notes: event.notes || '',
        status: logisticsStatusMap[budget.status] || 'Programado',
        updatedAt: new Date().toISOString()
    };

    const existingIndex = logisticsEntries.findIndex(entry => entry.budgetId === budget.id);
    if (existingIndex >= 0) {
        logisticsEntries[existingIndex] = { ...logisticsEntries[existingIndex], ...entryBase };
        return;
    }

    logisticsEntries.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString(),
        ...entryBase
    });
}

function openCustomerArea(defaultTab = 'budgets') {
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
                                            <p>${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}${budget.eventDetails?.date ? ` • ${formatDateBR(budget.eventDetails.date)}` : ''}</p>
                                            <small>Status: ${budget.status}</small>
                                        </div>
                                        <div class="customer-budget-right">
                                            <strong>${formatCurrencyBRL(budget.total)}</strong>
                                            <button class="btn-small customer-view-budget" data-id="${budget.id}">Ver detalhes</button>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div class="customer-empty-state">
                                        <h4>Nenhum orcamento salvo ainda</h4>
                                        <p>Assim que voce salvar um pedido com este cadastro, ele aparecera aqui com status, valor e detalhes do evento.</p>
                                    </div>
                                `}
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
                                <div style="margin-top:20px;">
                                    <button id="editCustomerProfileBtn" class="cta-button">Editar cadastro</button>
                                </div>
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
        button.addEventListener('click', function() {
            wrapper.querySelectorAll('.customer-area-tab').forEach(item => item.classList.remove('active'));
            wrapper.querySelectorAll('.customer-tab').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            wrapper.querySelector(`#customer${capitalizeFirstLetter(this.dataset.tab)}Tab`)?.classList.add('active');
        });
    });
    wrapper.querySelectorAll('.customer-view-budget').forEach(button => {
        button.addEventListener('click', function() {
            showBudgetDetails(parseInt(this.dataset.id, 10));
        });
    });
    wrapper.querySelector('#editCustomerProfileBtn')?.addEventListener('click', function() {
        openRegistrationModal(users.find(user => user.id === currentUser.id) || currentUser);
    });
}

function renderFinanceBudgetReviewSection() {
    const reviewBudgets = [...savedBudgets].filter(budget => ['Pendente', 'Aprovado'].includes(budget.status)).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 8);
    return `
        <div class="report-card finance-budget-review">
            <h3 style="margin-bottom: 16px;">Aprovacao de orcamentos</h3>
            ${reviewBudgets.length ? `
                <div class="finance-budget-review-grid">
                    ${reviewBudgets.map(budget => `
                        <div class="finance-budget-card">
                            <h4>${budget.userName || 'Cliente'} • #${budget.id}</h4>
                            <p style="margin:0 0 6px;">${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}</p>
                            <small>${budget.eventDetails?.deliveryDate ? `Entrega em ${formatDateBR(budget.eventDetails.deliveryDate)}` : 'Sem data de entrega'}${budget.eventDetails?.deliveryTime ? ` • ${budget.eventDetails.deliveryTime}` : ''}</small>
                            <p style="margin:12px 0 0;"><strong style="color:#fff;">${formatCurrencyBRL(budget.total || 0)}</strong></p>
                            <div class="finance-budget-actions">
                                <button type="button" onclick="viewBudgetDetailsAdmin(${budget.id})"><i class="fas fa-eye"></i> Ver</button>
                                ${budget.status === 'Pendente' ? `<button type="button" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')"><i class="fas fa-check"></i> Aprovar</button>` : ''}
                                <button type="button" class="secondary-btn" onclick="updateBudgetStatus(${budget.id}, 'Cancelado')"><i class="fas fa-ban"></i> Reprovar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: rgba(255,255,255,0.72); margin:0;">Nenhum orcamento aguardando avaliacao no momento.</p>'}
        </div>
    `;
}

function renderAdminFinance() {
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
    const balance = received - expenses;

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
        ${renderFinanceBudgetReviewSection()}
        <div class="report-card">
            <h3 style="margin-bottom: 16px;">Vendas, contratos e movimentacao financeira</h3>
            <div class="finance-table-wrapper">${renderFinancialEntriesTable()}</div>
        </div>
    `;
}

async function saveBudget() {
    if (!cart.length) {
        showMessage('Adicione itens ao orcamento antes de salvar.', 'error');
        return;
    }
    const cepInput = document.getElementById('cep');
    if (!cepInput?.value) {
        showMessage('Informe um CEP para calcular o frete.', 'error');
        return;
    }
    if (!currentUser) {
        showMessage('Faca login para salvar seu orcamento.', 'error');
        openLoginModal();
        return;
    }

    const eventDetails = getEventBriefFromForm();
    const validation = validateEventDetails(eventDetails);
    if (!validation.ok) {
        showMessage(`Preencha os dados da festa: ${validation.missing.join(', ')}.`, 'error');
        return;
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
        city: currentFreightResult?.city || eventDetails.city || '',
        state: currentFreightResult?.state || document.getElementById('deliveryState')?.value.trim() || '',
        status: 'Pendente',
        eventDetails,
        notes: eventDetails.notes,
        inventoryCommitted: false,
        origin: 'site-user'
    };

    savedBudgets.unshift(budget);
    createLogisticsFromBudget(budget, eventDetails.responsible);
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();

    cart = [];
    clearEventBriefForm();
    resetFreightFields();
    renderProducts();
    renderBudgetItems();
    updateBudgetSummary();
    openCustomerArea('budgets');
    showMessage('Orcamento salvo com sucesso. Ele ja esta na sua area e no painel administrativo.', 'success');
    sendBudgetCreatedEmail(budget);
}

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;
    const previousStatus = budget.status;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();
    createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();

    if (previousStatus !== newStatus) {
        sendBudgetStatusEmail(budget, newStatus);
    }

    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    resetFreightFields();
    updateBudgetSummary();
});

var currentFreightResult = null;

function getMobilierServerBaseUrl() {
    if (window.MOBILIER_API_URL) {
        return String(window.MOBILIER_API_URL).replace(/\/$/, '');
    }

    if (window.location?.protocol?.startsWith('http')) {
        return window.location.origin;
    }

    return 'http://localhost:3001';
}

function composeDeliveryAddressFromForm() {
    const street = document.getElementById('deliveryStreet')?.value.trim() || '';
    const number = document.getElementById('deliveryNumber')?.value.trim() || '';
    const complement = document.getElementById('deliveryComplement')?.value.trim() || '';
    const neighborhood = document.getElementById('deliveryNeighborhood')?.value.trim() || '';
    const city = document.getElementById('deliveryCity')?.value.trim() || '';
    const state = document.getElementById('deliveryState')?.value.trim() || '';

    return [street, number, complement, neighborhood, [city, state].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
}

function resetFreightFields() {
    currentFreightResult = null;
    freightValue = 0;
    [
        'cep',
        'deliveryStreet',
        'deliveryNumber',
        'deliveryComplement',
        'deliveryNeighborhood',
        'deliveryCity',
        'deliveryState'
    ].forEach(id => {
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

async function sendBudgetCreatedEmail(budget) {
    if (!budget?.userEmail) return false;

    try {
        const response = await fetch(`${getMobilierServerBaseUrl()}/api/budget-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento',
                deliveryDate: budget.eventDetails?.deliveryDate || '',
                deliveryTime: budget.eventDetails?.deliveryTime || '',
                address: budget.eventDetails?.deliveryAddress || '',
                items: budget.items || []
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Erro ao enviar e-mail do orcamento:', error);
        return false;
    }
}

async function sendBudgetStatusEmail(budget, status) {
    if (!budget?.userEmail) return false;

    try {
        const response = await fetch(`${getMobilierServerBaseUrl()}/api/budget-status-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: budget.userEmail,
                customerName: budget.userName,
                budgetId: budget.id,
                status,
                total: formatCurrencyBRL(budget.total || 0),
                eventName: budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Erro ao enviar e-mail de status:', error);
        return false;
    }
}

function getEventBriefFromForm() {
    const deliveryAddress = composeDeliveryAddressFromForm();
    return {
        type: document.getElementById('eventType')?.value || '',
        guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
        date: document.getElementById('eventDate')?.value || '',
        city: document.getElementById('eventCity')?.value.trim() || document.getElementById('deliveryCity')?.value.trim() || '',
        venueType: document.getElementById('venueType')?.value || '',
        notes: document.getElementById('eventNotes')?.value.trim() || '',
        eventName: document.getElementById('eventName')?.value.trim() || '',
        deliveryDate: document.getElementById('deliveryDate')?.value || '',
        deliveryTime: document.getElementById('deliveryTime')?.value || '',
        responsible: document.getElementById('eventResponsible')?.value.trim() || '',
        responsiblePhone: document.getElementById('eventResponsiblePhone')?.value.trim() || '',
        deliveryAddress
    };
}

function clearEventBriefForm() {
    [
        'eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes',
        'eventName', 'deliveryDate', 'deliveryTime',
        'eventResponsible', 'eventResponsiblePhone',
        'deliveryStreet', 'deliveryNumber', 'deliveryComplement', 'deliveryNeighborhood', 'deliveryCity', 'deliveryState'
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

async function checkCep() {
    const cepInput = document.getElementById('cep');
    if (!cepInput) return;

    const rawCep = cepInput.value.replace(/\D/g, '');
    if (rawCep.length !== 8) {
        currentFreightResult = null;
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
            currentFreightResult = null;
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

        currentFreightResult = { cep: maskedCep, city, state, street, neighborhood };

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
        currentFreightResult = null;
        freightValue = 0;
        showCepMessage('Nao foi possivel consultar o CEP agora. Tente novamente em instantes.', 'error');
        updateBudgetSummary();
    }
}

function createLogisticsFromBudget(budget, responsibleFallback = '') {
    const event = budget.eventDetails || {};
    const deliveryDate = event.deliveryDate || event.date || '';
    const deliveryTime = event.deliveryTime || '09:00';
    const location = event.deliveryAddress || composeDeliveryAddressFromForm() || `${event.city || ''} ${budget.cep || ''}`.trim();

    if (!deliveryDate || !location) return;

    const logisticsStatusMap = {
        Pendente: 'Aguardando confirmacao',
        Aprovado: 'Confirmado',
        Finalizado: 'Entregue',
        Cancelado: 'Cancelado'
    };

    const entryBase = {
        budgetId: budget.id,
        eventName: event.eventName || event.type || `Evento ${budget.id}`,
        clientName: budget.userName || '',
        contactName: event.responsible || responsibleFallback || budget.userName || '',
        contactPhone: event.responsiblePhone || budget.userPhone || '',
        receiverName: event.responsible || responsibleFallback || budget.userName || '',
        receiverPhone: event.responsiblePhone || budget.userPhone || '',
        responsible: event.responsible || responsibleFallback || budget.userName || '',
        owner: event.responsible || responsibleFallback || budget.userName || '',
        date: deliveryDate,
        time: deliveryTime,
        location,
        notes: event.notes || '',
        status: logisticsStatusMap[budget.status] || 'Programado',
        updatedAt: new Date().toISOString()
    };

    const existingIndex = logisticsEntries.findIndex(entry => entry.budgetId === budget.id);
    if (existingIndex >= 0) {
        logisticsEntries[existingIndex] = {
            ...logisticsEntries[existingIndex],
            ...entryBase
        };
        return;
    }

    logisticsEntries.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString(),
        ...entryBase
    });
}

function openCustomerArea(defaultTab = 'budgets') {
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
                                            <p>${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}${budget.eventDetails?.date ? ` • ${formatDateBR(budget.eventDetails.date)}` : ''}</p>
                                            <small>Status: ${budget.status}</small>
                                        </div>
                                        <div class="customer-budget-right">
                                            <strong>${formatCurrencyBRL(budget.total)}</strong>
                                            <button class="btn-small customer-view-budget" data-id="${budget.id}">Ver detalhes</button>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div class="customer-empty-state">
                                        <h4>Nenhum orcamento salvo ainda</h4>
                                        <p>Assim que voce salvar um pedido com este cadastro, ele aparecera aqui com status, valor e detalhes do evento.</p>
                                    </div>
                                `}
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
                                <div style="margin-top:20px;">
                                    <button id="editCustomerProfileBtn" class="cta-button">Editar cadastro</button>
                                </div>
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
        button.addEventListener('click', function() {
            wrapper.querySelectorAll('.customer-area-tab').forEach(item => item.classList.remove('active'));
            wrapper.querySelectorAll('.customer-tab').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            wrapper.querySelector(`#customer${capitalizeFirstLetter(this.dataset.tab)}Tab`)?.classList.add('active');
        });
    });
    wrapper.querySelectorAll('.customer-view-budget').forEach(button => {
        button.addEventListener('click', function() {
            showBudgetDetails(parseInt(this.dataset.id, 10));
        });
    });
    wrapper.querySelector('#editCustomerProfileBtn')?.addEventListener('click', function() {
        openRegistrationModal(users.find(user => user.id === currentUser.id) || currentUser);
    });
}

function renderFinanceBudgetReviewSection() {
    const reviewBudgets = [...savedBudgets]
        .filter(budget => ['Pendente', 'Aprovado'].includes(budget.status))
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .slice(0, 8);

    return `
        <div class="report-card finance-budget-review">
            <h3 style="margin-bottom: 16px;">Aprovacao de orcamentos</h3>
            ${reviewBudgets.length ? `
                <div class="finance-budget-review-grid">
                    ${reviewBudgets.map(budget => `
                        <div class="finance-budget-card">
                            <h4>${budget.userName || 'Cliente'} • #${budget.id}</h4>
                            <p style="margin:0 0 6px;">${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento'}</p>
                            <small>${budget.eventDetails?.deliveryDate ? `Entrega em ${formatDateBR(budget.eventDetails.deliveryDate)}` : 'Sem data de entrega'}${budget.eventDetails?.deliveryTime ? ` • ${budget.eventDetails.deliveryTime}` : ''}</small>
                            <p style="margin:12px 0 0;"><strong style="color:#fff;">${formatCurrencyBRL(budget.total || 0)}</strong></p>
                            <div class="finance-budget-actions">
                                <button type="button" onclick="viewBudgetDetailsAdmin(${budget.id})"><i class="fas fa-eye"></i> Ver</button>
                                ${budget.status === 'Pendente' ? `<button type="button" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')"><i class="fas fa-check"></i> Aprovar</button>` : ''}
                                <button type="button" class="secondary-btn" onclick="updateBudgetStatus(${budget.id}, 'Cancelado')"><i class="fas fa-ban"></i> Reprovar</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: rgba(255,255,255,0.72); margin:0;">Nenhum orcamento aguardando avaliacao no momento.</p>'}
        </div>
    `;
}

function renderAdminFinance() {
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
    const balance = received - expenses;

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
        ${renderFinanceBudgetReviewSection()}
        <div class="report-card">
            <h3 style="margin-bottom: 16px;">Vendas, contratos e movimentacao financeira</h3>
            <div class="finance-table-wrapper">
                ${renderFinancialEntriesTable()}
            </div>
        </div>
    `;
}

async function saveBudget() {
    if (!cart.length) {
        showMessage('Adicione itens ao orcamento antes de salvar.', 'error');
        return;
    }

    const cepInput = document.getElementById('cep');
    if (!cepInput?.value) {
        showMessage('Informe um CEP para calcular o frete.', 'error');
        return;
    }

    if (!currentUser) {
        showMessage('Faca login para salvar seu orcamento.', 'error');
        openLoginModal();
        return;
    }

    const eventDetails = getEventBriefFromForm();
    const validation = validateEventDetails(eventDetails);
    if (!validation.ok) {
        showMessage(`Preencha os dados da festa: ${validation.missing.join(', ')}.`, 'error');
        return;
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
        city: currentFreightResult?.city || eventDetails.city || '',
        state: currentFreightResult?.state || eventDetails.deliveryAddress.split('/').pop()?.trim() || '',
        status: 'Pendente',
        eventDetails,
        notes: eventDetails.notes,
        inventoryCommitted: false,
        origin: 'site-user'
    };

    savedBudgets.unshift(budget);
    createLogisticsFromBudget(budget, eventDetails.responsible);
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();

    cart = [];
    freightValue = 0;
    currentFreightResult = null;
    clearEventBriefForm();
    resetFreightFields();

    renderProducts();
    renderBudgetItems();
    updateBudgetSummary();
    openCustomerArea('budgets');
    showMessage('Orcamento salvo com sucesso. Ele ja esta na sua area e no painel administrativo.', 'success');
    sendBudgetCreatedEmail(budget);
}

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    const previousStatus = budget.status;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();
    createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');

    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();

    if (previousStatus !== newStatus) {
        sendBudgetStatusEmail(budget, newStatus);
    }

    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    const cepField = document.getElementById('cep');
    if (cepField) cepField.value = '';
    resetFreightFields();
    updateBudgetSummary();
});

// FINAL CUSTOMER BUDGET UX OVERRIDES
function getEventBriefFromForm() {
    return {
        type: document.getElementById('eventType')?.value || '',
        guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
        date: document.getElementById('eventDate')?.value || '',
        city: document.getElementById('eventCity')?.value.trim() || '',
        venueType: document.getElementById('venueType')?.value || '',
        notes: document.getElementById('eventNotes')?.value.trim() || '',
        eventName: document.getElementById('eventName')?.value.trim() || '',
        deliveryDate: document.getElementById('deliveryDate')?.value || '',
        deliveryTime: document.getElementById('deliveryTime')?.value || '',
        responsible: document.getElementById('eventResponsible')?.value.trim() || '',
        responsiblePhone: document.getElementById('eventResponsiblePhone')?.value.trim() || '',
        deliveryAddress: document.getElementById('deliveryAddress')?.value.trim() || ''
    };
}

function clearEventBriefForm() {
    [
        'eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes',
        'eventName', 'deliveryDate', 'deliveryTime',
        'eventResponsible', 'eventResponsiblePhone', 'deliveryAddress'
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function showCepMessage(message, type = 'info') {
    const cepMessage = document.getElementById('cepMessage');
    if (!cepMessage) return;

    const iconMap = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const cleanMessage = String(message || '').replace(/^\(+\s*/, '').trim();
    cepMessage.className = `cep-feedback ${type} is-visible`;
    cepMessage.innerHTML = '';

    const icon = document.createElement('i');
    icon.className = `fas fa-${iconMap[type] || iconMap.info} message-icon`;

    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = cleanMessage;

    cepMessage.appendChild(icon);
    cepMessage.appendChild(text);
}

function getBudgetSuggestionProducts() {
    const cartIds = new Set(cart.map(item => item.id));
    const cartCategories = new Set(
        cart
            .map(item => products.find(product => product.id === item.id)?.category)
            .filter(Boolean)
    );

    return [...products]
        .filter(product => product.stock > 0)
        .sort((a, b) => {
            const score = product => {
                let value = 0;
                if (!cartIds.has(product.id)) value += 30;
                if (cartCategories.size && cartCategories.has(product.category)) value += 20;
                if (product.imageUrl) value += 8;
                value += Math.min(product.stock, 40);
                return value;
            };

            const diff = score(b) - score(a);
            if (diff !== 0) return diff;
            return a.name.localeCompare(b.name, 'pt-BR');
        })
        .slice(0, 6);
}

function renderBudgetItems() {
    const itemsContainer = document.getElementById('itemsSelection');
    if (!itemsContainer) return;

    const suggestions = getBudgetSuggestionProducts();
    itemsContainer.classList.add('budget-suggestions');

    if (!suggestions.length) {
        itemsContainer.innerHTML = `
            <div class="budget-suggestion-empty">
                No momento nao ha itens disponiveis para sugerir.
            </div>
        `;
        return;
    }

    itemsContainer.innerHTML = suggestions.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        const visual = product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${product.name}">`
            : `<i class="${product.image}"></i>`;
        const stockLabel = product.stock < 20 ? `Estoque baixo: ${product.stock}` : `${product.stock} unidades disponiveis`;
        const selectedTag = cartItem ? `<span class="budget-tag">Ja no orcamento: ${cartItem.quantity}</span>` : '';

        return `
            <article class="budget-suggestion-card">
                <div class="budget-suggestion-visual">${visual}</div>
                <div class="budget-suggestion-meta">
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                </div>
                <div class="budget-suggestion-tags">
                    <span class="budget-tag">${product.category || 'Catalogo'}</span>
                    <span class="budget-tag">${stockLabel}</span>
                    ${selectedTag}
                </div>
                <div class="budget-suggestion-actions">
                    <input
                        type="number"
                        class="quantity-input suggestion-quantity"
                        data-id="${product.id}"
                        min="1"
                        max="${Math.max(product.stock, 1)}"
                        value="${cartItem ? Math.min(cartItem.quantity + 1, product.stock) : 1}"
                    >
                    <button type="button" class="btn-secondary add-suggested-item" data-id="${product.id}">
                        <i class="fas fa-plus"></i> Adicionar
                    </button>
                </div>
            </article>
        `;
    }).join('');

    itemsContainer.querySelectorAll('.add-suggested-item').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id') || '0', 10);
            const quantity = parseInt(itemsContainer.querySelector(`.suggestion-quantity[data-id="${productId}"]`)?.value || '1', 10);
            addToBudget(productId, quantity);
        });
    });
}

// ============================================
// CUSTOMER BUDGET UX OVERRIDES
// ============================================

function getEventBriefFromForm() {
    return {
        type: document.getElementById('eventType')?.value || '',
        guests: parseInt(document.getElementById('guestCount')?.value || '0', 10) || 0,
        date: document.getElementById('eventDate')?.value || '',
        city: document.getElementById('eventCity')?.value.trim() || '',
        venueType: document.getElementById('venueType')?.value || '',
        notes: document.getElementById('eventNotes')?.value.trim() || '',
        eventName: document.getElementById('eventName')?.value.trim() || '',
        deliveryDate: document.getElementById('deliveryDate')?.value || '',
        deliveryTime: document.getElementById('deliveryTime')?.value || '',
        responsible: document.getElementById('eventResponsible')?.value.trim() || '',
        responsiblePhone: document.getElementById('eventResponsiblePhone')?.value.trim() || '',
        deliveryAddress: document.getElementById('deliveryAddress')?.value.trim() || ''
    };
}

function clearEventBriefForm() {
    [
        'eventType', 'guestCount', 'eventDate', 'eventCity', 'venueType', 'eventNotes',
        'eventName', 'deliveryDate', 'deliveryTime',
        'eventResponsible', 'eventResponsiblePhone', 'deliveryAddress'
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

function showCepMessage(message, type = 'info') {
    const cepMessage = document.getElementById('cepMessage');
    if (!cepMessage) return;

    const iconMap = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    const cleanMessage = String(message || '').replace(/^\(+\s*/, '').trim();

    cepMessage.className = `cep-feedback ${type} is-visible`;
    cepMessage.innerHTML = '';

    const icon = document.createElement('i');
    icon.className = `fas fa-${iconMap[type] || iconMap.info} message-icon`;

    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = cleanMessage;

    cepMessage.appendChild(icon);
    cepMessage.appendChild(text);
}

function getBudgetSuggestionProducts() {
    const cartIds = new Set(cart.map(item => item.id));
    const cartCategories = new Set(
        cart
            .map(item => products.find(product => product.id === item.id)?.category)
            .filter(Boolean)
    );

    return [...products]
        .filter(product => product.stock > 0)
        .sort((a, b) => {
            const score = product => {
                let value = 0;
                if (!cartIds.has(product.id)) value += 30;
                if (cartCategories.size && cartCategories.has(product.category)) value += 20;
                if (product.imageUrl) value += 8;
                value += Math.min(product.stock, 40);
                return value;
            };

            const diff = score(b) - score(a);
            if (diff !== 0) return diff;
            return a.name.localeCompare(b.name, 'pt-BR');
        })
        .slice(0, 6);
}

function renderBudgetItems() {
    const itemsContainer = document.getElementById('itemsSelection');
    if (!itemsContainer) return;

    const suggestions = getBudgetSuggestionProducts();
    itemsContainer.classList.add('budget-suggestions');

    if (!suggestions.length) {
        itemsContainer.innerHTML = `
            <div class="budget-suggestion-empty">
                No momento nao ha itens disponiveis para sugerir.
            </div>
        `;
        return;
    }

    itemsContainer.innerHTML = suggestions.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        const visual = product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${product.name}">`
            : `<i class="${product.image}"></i>`;
        const stockLabel = product.stock < 20 ? `Estoque baixo: ${product.stock}` : `${product.stock} unidades disponiveis`;
        const selectedTag = cartItem ? `<span class="budget-tag">Ja no orcamento: ${cartItem.quantity}</span>` : '';

        return `
            <article class="budget-suggestion-card">
                <div class="budget-suggestion-visual">${visual}</div>
                <div class="budget-suggestion-meta">
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                </div>
                <div class="budget-suggestion-tags">
                    <span class="budget-tag">${product.category || 'Catalogo'}</span>
                    <span class="budget-tag">${stockLabel}</span>
                    ${selectedTag}
                </div>
                <div class="budget-suggestion-actions">
                    <input
                        type="number"
                        class="quantity-input suggestion-quantity"
                        data-id="${product.id}"
                        min="1"
                        max="${Math.max(product.stock, 1)}"
                        value="${cartItem ? Math.min(cartItem.quantity + 1, product.stock) : 1}"
                    >
                    <button type="button" class="btn-secondary add-suggested-item" data-id="${product.id}">
                        <i class="fas fa-plus"></i> Adicionar
                    </button>
                </div>
            </article>
        `;
    }).join('');

    itemsContainer.querySelectorAll('.add-suggested-item').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id') || '0', 10);
            const quantity = parseInt(itemsContainer.querySelector(`.suggestion-quantity[data-id="${productId}"]`)?.value || '1', 10);
            addToBudget(productId, quantity);
        });
    });
}

function getMobilierApiBaseUrl() {
    if (window.MOBILIER_API_URL) {
        return String(window.MOBILIER_API_URL).replace(/\/$/, '');
    }

    if (window.location?.protocol?.startsWith('http')) {
        return window.location.origin;
    }

    return 'http://localhost:3001';
}

async function fetchServerAppData() {
    const response = await fetch(`${getMobilierApiBaseUrl()}/api/app-data`, {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Falha ao carregar dados do servidor: ${response.status}`);
    }

    const payload = await response.json();
    return payload?.data || {};
}

let serverSyncTimeout = null;

async function persistDataToServer() {
    if (!window.location?.protocol?.startsWith('http')) return;

    const payload = {
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

    try {
        await fetch(`${getMobilierApiBaseUrl()}/api/app-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.warn('Nao foi possivel sincronizar com o servidor agora:', error);
    }
}

function queueServerSync() {
    clearTimeout(serverSyncTimeout);
    serverSyncTimeout = setTimeout(() => {
        persistDataToServer();
    }, 350);
}

const originalSaveToLocalStorage = saveToLocalStorage;
saveToLocalStorage = function() {
    originalSaveToLocalStorage();
    queueServerSync();
};

document.addEventListener('DOMContentLoaded', async function() {
    if (!window.location?.protocol?.startsWith('http')) return;

    try {
        const remoteData = await fetchServerAppData();
        const hasRemoteState = Array.isArray(remoteData.products) && remoteData.products.length > 0;
        if (!hasRemoteState) {
            queueServerSync();
            return;
        }

        if (remoteData.products) products = remoteData.products;
        if (remoteData.users) users = remoteData.users;
        if (remoteData.savedBudgets) savedBudgets = remoteData.savedBudgets;
        if (remoteData.companyData) Object.assign(companyData, remoteData.companyData);
        if (remoteData.stockMovements) stockMovements = remoteData.stockMovements;
        if (remoteData.financialEntries) financialEntries = remoteData.financialEntries;
        if (remoteData.accessHistory) accessHistory = remoteData.accessHistory;
        if (remoteData.leadContacts) leadContacts = remoteData.leadContacts;
        if (remoteData.logisticsEntries) logisticsEntries = remoteData.logisticsEntries;

        normalizeAppData();
        localStorage.setItem('mobilierData', JSON.stringify({
            products,
            users,
            savedBudgets,
            companyData,
            stockMovements,
            financialEntries,
            accessHistory,
            leadContacts,
            logisticsEntries
        }));

        if (currentUser?.id) {
            const syncedUser = users.find(user => user.id === currentUser.id);
            if (syncedUser) {
                currentUser = { ...syncedUser };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        }

        renderProducts();
        renderBudgetItems();
        updateBudgetSummary();
        if (document.getElementById('adminPanel')) refreshAdminViews();
        if (document.getElementById('customerAreaModal') && typeof openCustomerArea === 'function') openCustomerArea();
    } catch (error) {
        console.warn('Continuando com dados locais:', error);
    }
});

saveToLocalStorage = function() {
    try {
        normalizeAppData();
        localStorage.setItem('mobilierData', JSON.stringify({
            products,
            users,
            savedBudgets,
            companyData,
            stockMovements,
            financialEntries,
            accessHistory,
            leadContacts,
            logisticsEntries
        }));
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
};

loadFromLocalStorage = function() {
    try {
        const savedData = localStorage.getItem('mobilierData');
        if (!savedData) {
            normalizeAppData();
            accessHistory = [];
            leadContacts = [];
            logisticsEntries = [];
            return;
        }

        const data = JSON.parse(savedData);
        if (data.products) products = data.products;
        if (data.users) users = data.users;
        if (data.savedBudgets) savedBudgets = data.savedBudgets;
        if (data.companyData) Object.assign(companyData, data.companyData);
        if (data.stockMovements) stockMovements = data.stockMovements;
        if (data.financialEntries) financialEntries = data.financialEntries;
        accessHistory = Array.isArray(data.accessHistory) ? data.accessHistory : [];
        leadContacts = Array.isArray(data.leadContacts) ? data.leadContacts : [];
        logisticsEntries = Array.isArray(data.logisticsEntries) ? data.logisticsEntries : [];
        normalizeAppData();
    } catch (error) {
        console.error('Erro ao carregar:', error);
    }
};

window.exportData = function() {
    normalizeAppData();

    if (typeof XLSX === 'undefined') {
        showAdminMessage('Biblioteca de Excel indisponivel no momento.', 'error');
        return;
    }

    const workbook = XLSX.utils.book_new();
    const sheets = [
        ['Dashboard', [
            ['Indicador', 'Valor'],
            ['Total de pedidos', savedBudgets.length],
            ['Pedidos pendentes', savedBudgets.filter(item => item.status === 'Pendente').length],
            ['Receita aprovada', savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).reduce((sum, item) => sum + item.total, 0)],
            ['Receita recebida', financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0)],
            ['A receber', financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0)],
            ['Estoque total', products.reduce((sum, item) => sum + item.stock, 0)],
            ['Entregas programadas', logisticsEntries.length],
            ['Leads capturados', leadContacts.length]
        ]],
        ['Estoque', [
            ['ID', 'Produto', 'Categoria', 'Preco', 'Estoque', 'Imagem'],
            ...products.map(product => [product.id, product.name, product.category || '', product.price || 0, product.stock || 0, product.imageUrl || product.image || ''])
        ]],
        ['Pedidos', [
            ['ID', 'Cliente', 'Email', 'Telefone', 'Evento', 'Tipo', 'Data evento', 'Entrega', 'Endereco', 'Total', 'Status'],
            ...savedBudgets.map(budget => [
                budget.id,
                budget.userName || '',
                budget.userEmail || '',
                budget.userPhone || '',
                budget.eventDetails?.eventName || '',
                budget.eventDetails?.type || '',
                budget.eventDetails?.date || '',
                `${budget.eventDetails?.deliveryDate || ''} ${budget.eventDetails?.deliveryTime || ''}`.trim(),
                budget.eventDetails?.deliveryAddress || '',
                budget.total || 0,
                budget.status || ''
            ])
        ]],
        ['Financeiro', [
            ['ID', 'Tipo', 'Descricao', 'Cliente', 'Categoria', 'Vencimento', 'Valor', 'Status'],
            ...financialEntries.map(entry => [entry.id, entry.kind || '', entry.description || '', entry.customerName || '', entry.category || '', entry.dueDate || '', entry.amount || 0, entry.status || ''])
        ]],
        ['Clientes', [
            ['ID', 'Nome', 'Email', 'Telefone', 'Endereco', 'CPF', 'Observacoes'],
            ...users.filter(user => !user.isAdmin).map(user => [user.id, user.name || '', user.email || '', user.phone || '', user.address || '', user.cpf || '', user.notes || ''])
        ]],
        ['Leads', [
            ['Nome', 'Email', 'Telefone', 'Origem', 'Produto', 'Quantidade', 'Capturado em'],
            ...leadContacts.map(lead => [lead.name || '', lead.email || '', lead.phone || '', lead.source || '', lead.productName || '', lead.quantity || 0, lead.capturedAt || ''])
        ]],
        ['Logistica', [
            ['ID', 'Evento', 'Cliente', 'Recebedor', 'Telefone', 'Data', 'Horario', 'Local', 'Responsavel', 'Status'],
            ...logisticsEntries.map(entry => [entry.id, entry.eventName || '', entry.clientName || '', entry.receiverName || '', entry.receiverPhone || '', entry.date || '', entry.time || '', entry.location || '', entry.owner || '', entry.status || ''])
        ]],
        ['Acessos', [
            ['Sessao', 'Usuario', 'Inicio', 'Ultima atividade', 'Acoes', 'Cliques em produtos', 'Converteu lead'],
            ...accessHistory.map(session => [session.id, session.userName || '', session.startedAt || '', session.lastActivityAt || '', Array.isArray(session.actions) ? session.actions.length : 0, Array.isArray(session.productClicks) ? session.productClicks.length : 0, session.leadUnlocked ? 'Sim' : 'Nao'])
        ]]
    ];

    sheets.forEach(([name, rows]) => {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
    });

    XLSX.writeFile(workbook, `mobilier-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAdminMessage('Planilha Excel exportada com sucesso.', 'success');
};

updateBudgetStatus = function(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();

    if (['Aprovado', 'Finalizado'].includes(newStatus)) {
        createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
    }

    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
};

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();

    if (['Aprovado', 'Finalizado'].includes(newStatus)) {
        createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
    }

    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

function saveToLocalStorage() {
    try {
        normalizeAppData();
        localStorage.setItem('mobilierData', JSON.stringify({
            products,
            users,
            savedBudgets,
            companyData,
            stockMovements,
            financialEntries,
            accessHistory,
            leadContacts,
            logisticsEntries
        }));
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('mobilierData');
        if (!savedData) {
            normalizeAppData();
            accessHistory = [];
            leadContacts = [];
            logisticsEntries = [];
            return;
        }

        const data = JSON.parse(savedData);
        if (data.products) products = data.products;
        if (data.users) users = data.users;
        if (data.savedBudgets) savedBudgets = data.savedBudgets;
        if (data.companyData) Object.assign(companyData, data.companyData);
        if (data.stockMovements) stockMovements = data.stockMovements;
        if (data.financialEntries) financialEntries = data.financialEntries;
        accessHistory = Array.isArray(data.accessHistory) ? data.accessHistory : [];
        leadContacts = Array.isArray(data.leadContacts) ? data.leadContacts : [];
        logisticsEntries = Array.isArray(data.logisticsEntries) ? data.logisticsEntries : [];
        normalizeAppData();
    } catch (error) {
        console.error('Erro ao carregar:', error);
    }
}

window.exportData = function() {
    normalizeAppData();

    if (typeof XLSX === 'undefined') {
        showAdminMessage('Biblioteca de Excel indisponivel no momento.', 'error');
        return;
    }

    const dashboardRows = [
        ['Indicador', 'Valor'],
        ['Total de pedidos', savedBudgets.length],
        ['Pedidos pendentes', savedBudgets.filter(item => item.status === 'Pendente').length],
        ['Receita aprovada', savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).reduce((sum, item) => sum + item.total, 0)],
        ['Receita recebida', financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0)],
        ['A receber', financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0)],
        ['Estoque total', products.reduce((sum, item) => sum + item.stock, 0)],
        ['Eventos em logistica', logisticsEntries.length],
        ['Leads capturados', leadContacts.length]
    ];

    const stockRows = [
        ['ID', 'Produto', 'Categoria', 'Preco', 'Estoque', 'Imagem'],
        ...products.map(product => [
            product.id,
            product.name,
            product.category || '',
            product.price || 0,
            product.stock || 0,
            product.imageUrl || product.image || ''
        ])
    ];

    const budgetRows = [
        ['ID', 'Cliente', 'Email', 'Telefone', 'Evento', 'Tipo', 'Data evento', 'Entrega', 'Endereco', 'Total', 'Status'],
        ...savedBudgets.map(budget => [
            budget.id,
            budget.userName || '',
            budget.userEmail || '',
            budget.userPhone || '',
            budget.eventDetails?.eventName || '',
            budget.eventDetails?.type || '',
            budget.eventDetails?.date || '',
            `${budget.eventDetails?.deliveryDate || ''} ${budget.eventDetails?.deliveryTime || ''}`.trim(),
            budget.eventDetails?.deliveryAddress || '',
            budget.total || 0,
            budget.status || ''
        ])
    ];

    const financeRows = [
        ['ID', 'Tipo', 'Descricao', 'Cliente', 'Categoria', 'Vencimento', 'Valor', 'Status'],
        ...financialEntries.map(entry => [
            entry.id,
            entry.kind || '',
            entry.description || '',
            entry.customerName || '',
            entry.category || '',
            entry.dueDate || '',
            entry.amount || 0,
            entry.status || ''
        ])
    ];

    const customerRows = [
        ['ID', 'Nome', 'Email', 'Telefone', 'Endereco', 'CPF', 'Observacoes'],
        ...users.filter(user => !user.isAdmin).map(user => [
            user.id,
            user.name || '',
            user.email || '',
            user.phone || '',
            user.address || '',
            user.cpf || '',
            user.notes || ''
        ])
    ];

    const leadRows = [
        ['Nome', 'Email', 'Telefone', 'Origem', 'Produto', 'Quantidade', 'Capturado em'],
        ...leadContacts.map(lead => [
            lead.name || '',
            lead.email || '',
            lead.phone || '',
            lead.source || '',
            lead.productName || '',
            lead.quantity || 0,
            lead.capturedAt || ''
        ])
    ];

    const logisticsRows = [
        ['ID', 'Evento', 'Cliente', 'Recebedor', 'Telefone', 'Data', 'Horario', 'Local', 'Responsavel', 'Status'],
        ...logisticsEntries.map(entry => [
            entry.id,
            entry.eventName || '',
            entry.clientName || '',
            entry.receiverName || '',
            entry.receiverPhone || '',
            entry.date || '',
            entry.time || '',
            entry.location || '',
            entry.owner || '',
            entry.status || ''
        ])
    ];

    const accessRows = [
        ['Sessao', 'Usuario', 'Inicio', 'Ultima atividade', 'Acoes', 'Cliques em produtos', 'Converteu lead'],
        ...accessHistory.map(session => [
            session.id,
            session.userName || '',
            session.startedAt || '',
            session.lastActivityAt || '',
            Array.isArray(session.actions) ? session.actions.length : 0,
            Array.isArray(session.productClicks) ? session.productClicks.length : 0,
            session.leadUnlocked ? 'Sim' : 'Nao'
        ])
    ];

    const workbook = XLSX.utils.book_new();
    [
        ['Dashboard', dashboardRows],
        ['Estoque', stockRows],
        ['Pedidos', budgetRows],
        ['Financeiro', financeRows],
        ['Clientes', customerRows],
        ['Leads', leadRows],
        ['Logistica', logisticsRows],
        ['Acessos', accessRows]
    ].forEach(([name, rows]) => {
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, name);
    });

    XLSX.writeFile(workbook, `mobilier-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAdminMessage('Planilha Excel exportada com sucesso.', 'success');
};

function validateEventDetails(eventDetails) {
    const requiredFields = [
        ['eventName', 'nome da festa'],
        ['type', 'tipo do evento'],
        ['date', 'data da festa'],
        ['city', 'cidade'],
        ['deliveryDate', 'data da entrega'],
        ['deliveryTime', 'horario da entrega'],
        ['deliveryAddress', 'endereco da entrega'],
        ['responsible', 'responsavel no local'],
        ['responsiblePhone', 'telefone do responsavel']
    ];

    const missing = requiredFields
        .filter(([key]) => !String(eventDetails[key] || '').trim())
        .map(([, label]) => label);

    return {
        ok: missing.length === 0,
        missing
    };
}

function ensureSaleCustomer() {
    const selectedId = parseInt(document.getElementById('saleCustomer')?.value || '0', 10);
    if (selectedId) {
        const existing = users.find(user => user.id === selectedId && !user.isAdmin);
        if (existing) return existing;
    }

    const name = document.getElementById('saleCustomerName')?.value.trim() || '';
    const email = document.getElementById('saleCustomerEmail')?.value.trim() || '';
    const phone = document.getElementById('saleCustomerPhone')?.value.trim() || '';
    const address = document.getElementById('saleCustomerAddress')?.value.trim() || '';
    const cpf = document.getElementById('saleCustomerCpf')?.value.trim() || '';
    const notes = document.getElementById('saleCustomerNotes')?.value.trim() || '';

    if (!name || !email || !phone) {
        showAdminMessage('Selecione um cliente existente ou preencha nome, email e telefone do novo cadastro.', 'error');
        return null;
    }

    const existingByEmail = users.find(user => !user.isAdmin && user.email?.toLowerCase() === email.toLowerCase());
    if (existingByEmail) {
        existingByEmail.name = name;
        existingByEmail.phone = phone;
        existingByEmail.address = address;
        existingByEmail.cpf = cpf;
        existingByEmail.notes = notes;
        return existingByEmail;
    }

    const newCustomer = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        email,
        phone,
        address,
        cpf,
        notes,
        password: 'cliente123',
        isAdmin: false,
        createdAt: new Date().toISOString()
    };

    users.push(newCustomer);
    return newCustomer;
}

window.prefillSaleCustomer = function() {
    const selectedId = parseInt(document.getElementById('saleCustomer')?.value || '0', 10);
    const customer = users.find(user => user.id === selectedId && !user.isAdmin);
    const mappings = [
        ['saleCustomerName', customer?.name || ''],
        ['saleCustomerEmail', customer?.email || ''],
        ['saleCustomerPhone', customer?.phone || ''],
        ['saleCustomerAddress', customer?.address || ''],
        ['saleCustomerCpf', customer?.cpf || ''],
        ['saleCustomerNotes', customer?.notes || '']
    ];

    mappings.forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
    });
};

window.updateSalePrice = function(productId) {
    const product = products.find(item => item.id === productId);
    const priceField = document.getElementById(`salePrice${productId}`);
    if (product && priceField && (!priceField.value || Number(priceField.value) === 0)) {
        priceField.value = Number(product.price || 0).toFixed(2);
    }
};

function buildSaleItemsSummary(items) {
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    return { units, subtotal };
}

function renderAdminOrdersTable() {
    const sortedBudgets = [...savedBudgets].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    if (!sortedBudgets.length) {
        return '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><h3>Nenhum pedido encontrado</h3><p>Os orcamentos salvos aparecerao aqui.</p></div>';
    }

    return `
        <div class="products-table orders-table">
            <div class="table-header">
                <div>ID</div>
                <div>Cliente</div>
                <div>Evento</div>
                <div>Data</div>
                <div>Total</div>
                <div>Status</div>
                <div>Acoes</div>
            </div>
            ${sortedBudgets.map(budget => `
                <div class="table-row">
                    <div data-label="ID">#${budget.id}</div>
                    <div data-label="Cliente">${budget.userName}</div>
                    <div data-label="Evento">
                        ${budget.eventDetails?.eventName || budget.eventDetails?.type || 'Evento nao informado'}
                        ${budget.eventDetails?.guests ? `<br><small>${budget.eventDetails.guests} convidados</small>` : ''}
                    </div>
                    <div data-label="Data">${budget.eventDetails?.date ? formatDateBR(budget.eventDetails.date) : budget.date}</div>
                    <div data-label="Total">${formatCurrencyBRL(budget.total)}</div>
                    <div data-label="Status">
                        <select class="status-select" onchange="updateBudgetStatus(${budget.id}, this.value)">
                            <option value="Pendente" ${budget.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="Aprovado" ${budget.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option value="Finalizado" ${budget.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                            <option value="Cancelado" ${budget.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div data-label="Acoes">
                        <div class="action-buttons">
                            <button class="action-btn action-edit" onclick="viewBudgetDetailsAdmin(${budget.id})" title="Ver detalhes"><i class="fas fa-eye"></i></button>
                            ${budget.status === 'Pendente' ? `<button class="action-btn action-approve" onclick="updateBudgetStatus(${budget.id}, 'Aprovado')" title="Aprovar"><i class="fas fa-check"></i></button>` : ''}
                            <button class="action-btn action-delete" onclick="deleteBudgetAdmin(${budget.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderAdminFinance() {
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status) && entry.kind === 'Receita').reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);
    const balance = received - expenses;

    return `
        <div class="section-header">
            <div>
                <h2>Financeiro</h2>
                <p style="margin:8px 0 0; color: rgba(255,255,255,0.7);">Registre vendas, acompanhe recebimentos e consolide a operacao por evento.</p>
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
            <div class="finance-table-wrapper">
                ${renderFinancialEntriesTable()}
            </div>
        </div>
    `;
}

window.openSaleModal = function() {
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
                    <div class="report-card" style="margin-bottom: 18px;">
                        <p style="margin:0; color:rgba(255,255,255,0.78);">Cadastre o cliente, monte a festa, reserve o estoque e deixe entrega e financeiro prontos em um unico fluxo.</p>
                    </div>

                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="saleCustomer">Cliente ja cadastrado</label>
                            <select id="saleCustomer" onchange="prefillSaleCustomer()">
                                <option value="">Novo cliente / preencher abaixo</option>
                                ${customers.map(customer => `<option value="${customer.id}">${customer.name} • ${customer.email || customer.phone || 'sem contato'}</option>`).join('')}
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
                            <label for="saleDeliveryDate">Data da entrega</label>
                            <input type="date" id="saleDeliveryDate">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleDeliveryTime">Horario da entrega</label>
                            <input type="time" id="saleDeliveryTime">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleReturnDate">Data da retirada</label>
                            <input type="date" id="saleReturnDate">
                        </div>
                    </div>

                    <div class="form-row-3">
                        <div class="settings-form-group">
                            <label for="saleReturnTime">Horario da retirada</label>
                            <input type="time" id="saleReturnTime">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleResponsible">Responsavel no local</label>
                            <input type="text" id="saleResponsible" placeholder="Quem recebe a entrega">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleResponsiblePhone">Telefone do responsavel</label>
                            <input type="text" id="saleResponsiblePhone" placeholder="(00) 00000-0000">
                        </div>
                    </div>

                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="saleDeliveryAddress">Endereco de entrega</label>
                            <input type="text" id="saleDeliveryAddress" placeholder="Rua, numero, bairro, cidade e referencia">
                        </div>
                        <div class="settings-form-group">
                            <label for="saleDescription">Observacoes da festa / venda</label>
                            <input type="text" id="saleDescription" placeholder="Montagem, acesso, observacoes comerciais">
                        </div>
                    </div>

                    <div class="report-card">
                        <h3 style="margin-bottom: 16px;">Itens da venda</h3>
                        <div class="sale-items-grid">
                            ${products.map(product => `
                                <div class="sale-item-row">
                                    <div class="sale-item-name">
                                        <strong>${product.name}</strong>
                                        <span>${product.category || 'Categoria geral'} • estoque ${product.stock}</span>
                                    </div>
                                    <input type="number" id="saleQty${product.id}" min="0" max="${product.stock}" value="0" placeholder="Qtd">
                                    <input type="number" id="salePrice${product.id}" min="0" step="0.01" value="${Number(product.price || 0).toFixed(2)}" onfocus="updateSalePrice(${product.id})" placeholder="Preco">
                                    <div style="color: rgba(255,255,255,0.72); font-size: 0.92rem;">${formatCurrencyBRL(product.price || 0)}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="sale-summary-bar">
                            <div>
                                <strong style="display:block; color:#fff;">Fluxo automatico</strong>
                                <span style="color: rgba(255,255,255,0.68);">Pedido, financeiro, estoque e logistica serao atualizados juntos.</span>
                            </div>
                            <div class="form-actions" style="margin:0;">
                                <button type="button" onclick="createDirectSale()">Salvar venda</button>
                                <button type="button" class="secondary-btn" onclick="document.getElementById('saleModal')?.parentElement?.remove()">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
};

window.createDirectSale = function() {
    const customer = ensureSaleCustomer();
    if (!customer) return;

    const eventDetails = {
        eventName: document.getElementById('saleEventName')?.value.trim() || '',
        type: document.getElementById('saleEventType')?.value.trim() || '',
        date: document.getElementById('saleEventDate')?.value || '',
        guests: parseInt(document.getElementById('saleGuests')?.value || '0', 10) || 0,
        city: document.getElementById('saleCity')?.value.trim() || '',
        venueType: document.getElementById('saleVenueType')?.value.trim() || '',
        deliveryDate: document.getElementById('saleDeliveryDate')?.value || '',
        deliveryTime: document.getElementById('saleDeliveryTime')?.value || '',
        returnDate: document.getElementById('saleReturnDate')?.value || '',
        returnTime: document.getElementById('saleReturnTime')?.value || '',
        responsible: document.getElementById('saleResponsible')?.value.trim() || '',
        responsiblePhone: document.getElementById('saleResponsiblePhone')?.value.trim() || '',
        deliveryAddress: document.getElementById('saleDeliveryAddress')?.value.trim() || '',
        notes: document.getElementById('saleDescription')?.value.trim() || ''
    };

    const validation = validateEventDetails(eventDetails);
    if (!validation.ok) {
        showAdminMessage(`Preencha os dados da festa: ${validation.missing.join(', ')}.`, 'error');
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
            items.push({
                id: product.id,
                name: product.name,
                quantity,
                price,
                total
            });
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
        cep: '',
        city: eventDetails.city,
        state: '',
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

function saveBudget() {
    if (!cart.length) {
        showMessage('Adicione itens ao orcamento antes de salvar.', 'error');
        return;
    }

    const cepInput = document.getElementById('cep');
    if (!cepInput?.value) {
        showMessage('Informe um CEP para calcular o frete.', 'error');
        return;
    }

    if (!currentUser) {
        showMessage('Faca login para salvar seu orcamento.', 'error');
        openLoginModal();
        return;
    }

    const eventDetails = getEventBriefFromForm();
    const validation = validateEventDetails(eventDetails);
    if (!validation.ok) {
        showMessage(`Preencha os dados da festa: ${validation.missing.join(', ')}.`, 'error');
        return;
    }

    let subtotal = 0;

    const items = cart.map(item => {
        let unitPrice = item.price;
        if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
            unitPrice = item.bulkDiscount.price;
        }

        const total = unitPrice * item.quantity;
        subtotal += total;

        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: unitPrice,
            total
        };
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
        city: currentFreightResult?.city || eventDetails.city || '',
        state: currentFreightResult?.state || '',
        status: 'Pendente',
        eventDetails,
        notes: eventDetails.notes,
        inventoryCommitted: false,
        origin: 'site-user'
    };

    savedBudgets.unshift(budget);
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    cart = [];
    freightValue = 0;
    currentFreightResult = null;
    clearEventBriefForm();

    const cepField = document.getElementById('cep');
    const freightResult = document.getElementById('freightResult');
    if (cepField) cepField.value = '';
    if (freightResult) freightResult.style.display = 'none';

    renderProducts();
    renderBudgetItems();
    updateBudgetSummary();
    if (typeof openCustomerArea === 'function') openCustomerArea('budgets');
    showMessage('Orcamento salvo com sucesso. Nossa equipe ja consegue ver os dados completos da festa.', 'success');
}

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();

    if (['Aprovado', 'Finalizado'].includes(newStatus)) {
        createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
    }

    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

function renderAdminProducts() {
    const categories = [...new Set(products.map(item => item.category))].sort();
    const filteredProducts = getFilteredProductsForAdmin();
    const lowStock = products.filter(item => item.stock > 0 && item.stock < 20).length;
    const noStock = products.filter(item => item.stock === 0).length;

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
                    <input type="text" id="stockFilterName" placeholder="Buscar por nome">
                </div>
                <div class="settings-form-group">
                    <label for="stockFilterCategory">Categoria</label>
                    <select id="stockFilterCategory">
                        <option value="">Todas</option>
                        ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                    </select>
                </div>
                <div class="settings-form-group">
                    <label for="stockFilterQuantity">Quantidade</label>
                    <select id="stockFilterQuantity">
                        <option value="">Todas</option>
                        <option value="available">Saudavel</option>
                        <option value="low">Estoque baixo</option>
                        <option value="out">Esgotado</option>
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
}

function renderAdminProductsTable(items = products) {
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
                const stockStatus = product.stock === 0 ? 'status-out' : (product.stock < 20 ? 'status-low' : 'status-available');
                const statusText = product.stock === 0 ? 'Esgotado' : (product.stock < 20 ? 'Baixo' : 'Saudavel');
                return `
                    <div class="table-row">
                        <div data-label="ID">${product.id}</div>
                        <div data-label="Midia">${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-thumb">` : `<i class="${product.image} product-icon"></i>`}</div>
                        <div data-label="Produto">${product.name}</div>
                        <div data-label="Categoria">${product.category}</div>
                        <div data-label="Preco">${formatCurrencyBRL(product.price)}</div>
                        <div data-label="Estoque">${product.stock}</div>
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
}

window.openStockAdjustmentModal = function(productId, movementType) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    trackAccess('open_stock_adjustment', { productId, movementType });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="stockAdjustmentModal" style="display:block; background: rgba(3,7,18,0.78);">
            <div class="modal-content" style="max-width: 680px;">
                <div class="modal-header">
                    <h2>${movementType === 'entrada' ? 'Entrada de estoque' : 'Saida de estoque'}</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="report-card" style="margin-bottom:18px;">
                        <div style="display:grid; grid-template-columns: 88px 1fr; gap:16px; align-items:center;">
                            <div>${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-thumb" style="width:88px;height:88px;border-radius:18px;">` : `<div class="product-thumb" style="width:88px;height:88px;display:grid;place-items:center;border-radius:18px;"><i class="${product.image}" style="font-size:32px;"></i></div>`}</div>
                            <div>
                                <h3 style="margin:0 0 6px;">${product.name}</h3>
                                <p style="margin:0; color:rgba(255,255,255,0.72);">Estoque atual: ${product.stock} unidades</p>
                                <p style="margin:4px 0 0; color:rgba(255,255,255,0.72);">Categoria: ${product.category}</p>
                            </div>
                        </div>
                    </div>
                    <div class="form-row-2">
                        <div class="settings-form-group">
                            <label for="stockAdjustmentQty">Quantidade</label>
                            <input type="number" id="stockAdjustmentQty" min="1" value="1">
                        </div>
                        <div class="settings-form-group">
                            <label for="stockAdjustmentReason">Motivo</label>
                            <select id="stockAdjustmentReason">
                                <option value="Compra de reposicao">Compra de reposicao</option>
                                <option value="Venda direta">Venda direta</option>
                                <option value="Avaria">Avaria</option>
                                <option value="Devolucao">Devolucao</option>
                                <option value="Ajuste manual">Ajuste manual</option>
                            </select>
                        </div>
                    </div>
                    <div class="settings-form-group">
                        <label for="stockAdjustmentNote">Observacao</label>
                        <textarea id="stockAdjustmentNote" rows="3" placeholder="Detalhe o motivo da movimentacao para manter o historico organizado."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="applyStockAdjustment(${productId}, '${movementType}')">${movementType === 'entrada' ? 'Registrar entrada' : 'Registrar saida'}</button>
                        <button type="button" class="cancel-btn">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#stockAdjustmentModal')?.addEventListener('click', event => {
        if (event.target.id === 'stockAdjustmentModal') wrapper.remove();
    });
};

window.applyStockAdjustment = function(productId, movementType) {
    const product = products.find(item => item.id === productId);
    const quantity = parseInt(document.getElementById('stockAdjustmentQty')?.value || '0', 10);
    const reasonBase = document.getElementById('stockAdjustmentReason')?.value || 'Ajuste manual';
    const note = document.getElementById('stockAdjustmentNote')?.value.trim();
    const reason = note ? `${reasonBase} - ${note}` : reasonBase;

    if (!product || quantity <= 0) {
        showAdminMessage('Informe uma quantidade valida.', 'error');
        return;
    }
    if (movementType === 'saida' && product.stock < quantity) {
        showAdminMessage('Saida maior que o saldo atual.', 'error');
        return;
    }

    product.stock += movementType === 'entrada' ? quantity : -quantity;
    registerStockMovement(productId, movementType, quantity, reason);
    trackAccess('stock_adjustment_saved', { productId, movementType, quantity, reason });
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    document.getElementById('stockAdjustmentModal')?.parentElement?.remove();
    showAdminMessage('Movimentacao registrada com sucesso.', 'success');
};

function renderAdminProductsTable() {
    if (!products.length) {
        return '<div class="empty-state"><i class="fas fa-box-open"></i><h3>Nenhum produto cadastrado</h3><p>Adicione produtos para comecar.</p></div>';
    }

    let html = `
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
    `;

    products.forEach(product => {
        const stockStatus = product.stock === 0 ? 'status-out' : (product.stock < 20 ? 'status-low' : 'status-available');
        const statusText = product.stock === 0 ? 'Esgotado' : (product.stock < 20 ? 'Baixo' : 'Saudavel');
        html += `
            <div class="table-row">
                <div data-label="ID">${product.id}</div>
                <div data-label="Midia">
                    ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-thumb">` : `<i class="${product.image} product-icon"></i>`}
                </div>
                <div data-label="Produto">${product.name}</div>
                <div data-label="Categoria">${product.category}</div>
                <div data-label="Preco">${formatCurrencyBRL(product.price)}</div>
                <div data-label="Estoque">${product.stock}</div>
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
    });

    html += '</div>';
    return html;
}

function addNewProduct() {
    const nextId = products.length ? Math.max(...products.map(product => product.id)) + 1 : 1;
    products.push({
        id: nextId,
        name: 'Novo produto',
        description: '',
        price: 0,
        stock: 0,
        bulkDiscount: null,
        image: 'fas fa-box',
        imageUrl: '',
            category: 'Diversos'
    });
    saveToLocalStorage();
    refreshAdminViews();
    editProduct(nextId);
}

function editProduct(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="productEditModal" style="display:block; background: rgba(0,0,0,0.88);">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Editar Produto</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editProductForm">
                        <div class="form-row-2">
                            <div class="settings-form-group">
                                <label for="editProductName">Nome do produto</label>
                                <input type="text" id="editProductName" value="${product.name || ''}">
                            </div>
                            <div class="settings-form-group">
                                <label for="editProductCategory">Categoria</label>
                                <select id="editProductCategory">
                        ${['Aparador', 'Banqueta', 'Bar', 'Cadeira', 'Diversos', 'Espelho', 'Mesas', 'Poltrona', 'Puff', 'Sofá', 'Tapete'].map(category =>
                                        `<option value="${category}" ${product.category === category ? 'selected' : ''}>${category}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="settings-form-group">
                            <label for="editProductDescription">Descricao</label>
                            <textarea id="editProductDescription" rows="4">${product.description || ''}</textarea>
                        </div>
                        <div class="form-row-3">
                            <div class="settings-form-group">
                                <label for="editProductPrice">Preco (R$)</label>
                                <input type="number" id="editProductPrice" step="0.01" min="0" value="${product.price || 0}">
                            </div>
                            <div class="settings-form-group">
                                <label for="editProductStock">Estoque</label>
                                <input type="number" id="editProductStock" min="0" value="${product.stock || 0}">
                            </div>
                            <div class="settings-form-group">
                                <label for="editProductIcon">Icone de apoio</label>
                                <select id="editProductIcon">
                                    ${['fas fa-chair', 'fas fa-table', 'fas fa-couch', 'fas fa-border-none', 'fas fa-wine-bottle', 'fas fa-box'].map(icon =>
                                        `<option value="${icon}" ${product.image === icon ? 'selected' : ''}>${icon}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="settings-form-group">
                                <label for="editProductImageUrl">Foto por URL</label>
                                <input type="text" id="editProductImageUrl" value="${product.imageUrl || ''}" placeholder="https://...">
                            </div>
                            <div class="settings-form-group">
                                <label for="editProductImageFile">Ou enviar foto</label>
                                <input type="file" id="editProductImageFile" accept="image/*">
                            </div>
                        </div>
                        <div class="settings-form-group">
                            <label>Preview</label>
                            <div id="productImagePreview">
                                ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="image-upload-preview">` : `<div class="image-upload-preview" style="display:grid;place-items:center;color:white;"><i class="${product.image}" style="font-size:42px;"></i></div>`}
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="settings-form-group">
                                <label for="editBulkQuantity">Quantidade minima para desconto</label>
                                <input type="number" id="editBulkQuantity" min="0" value="${product.bulkDiscount?.quantity || ''}">
                            </div>
                            <div class="settings-form-group">
                                <label for="editBulkPrice">Preco com desconto</label>
                                <input type="number" id="editBulkPrice" step="0.01" min="0" value="${product.bulkDiscount?.price || ''}">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit">Salvar produto</button>
                            <button type="button" class="cancel-btn">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);

    const imageFile = wrapper.querySelector('#editProductImageFile');
    const imageUrl = wrapper.querySelector('#editProductImageUrl');
    const preview = wrapper.querySelector('#productImagePreview');

    function updatePreview(src) {
        preview.innerHTML = src
            ? `<img src="${src}" alt="${product.name}" class="image-upload-preview">`
            : `<div class="image-upload-preview" style="display:grid;place-items:center;color:white;"><i class="${wrapper.querySelector('#editProductIcon').value}" style="font-size:42px;"></i></div>`;
    }

    imageUrl?.addEventListener('input', function() {
        updatePreview(this.value.trim());
    });

    imageFile?.addEventListener('change', function() {
        const file = this.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            imageUrl.value = e.target.result;
            updatePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    });

    wrapper.querySelector('#editProductIcon')?.addEventListener('change', function() {
        if (!imageUrl.value.trim()) updatePreview('');
    });

    wrapper.querySelector('#editProductForm')?.addEventListener('submit', function(event) {
        event.preventDefault();
        saveProductChanges(productId);
    });
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#productEditModal')?.addEventListener('click', event => {
        if (event.target.id === 'productEditModal') wrapper.remove();
    });
}

function saveProductChanges(productId) {
    const productIndex = products.findIndex(product => product.id === productId);
    if (productIndex === -1) return;

    const previousStock = products[productIndex].stock;
    const productName = document.getElementById('editProductName').value.trim();
    const productCategory = document.getElementById('editProductCategory').value;
    const productDescription = document.getElementById('editProductDescription').value.trim();
    const productPrice = parseFloat(document.getElementById('editProductPrice').value || '0');
    const productStock = parseInt(document.getElementById('editProductStock').value || '0', 10);
    const productIcon = document.getElementById('editProductIcon').value;
    const productImageUrl = document.getElementById('editProductImageUrl').value.trim();
    const bulkQuantity = parseInt(document.getElementById('editBulkQuantity').value || '0', 10);
    const bulkPrice = parseFloat(document.getElementById('editBulkPrice').value || '0');

    if (!productName || !productDescription || Number.isNaN(productPrice) || Number.isNaN(productStock)) {
        showAdminMessage('Preencha os campos obrigatorios.', 'error');
        return;
    }

    let bulkDiscount = null;
    if (bulkQuantity > 0 && bulkPrice > 0 && bulkPrice < productPrice) {
        bulkDiscount = { quantity: bulkQuantity, price: bulkPrice };
    }

    products[productIndex] = {
        ...products[productIndex],
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
    showAdminMessage('Produto salvo com sucesso.', 'success');
}

function renderAdminReports() {
    const rentedCustomers = new Set(savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).map(item => item.userName)).size;
    const pendingCustomers = new Set(savedBudgets.filter(item => item.status === 'Pendente').map(item => item.userName)).size;
    const averageTicket = savedBudgets.length ? savedBudgets.reduce((sum, item) => sum + item.total, 0) / savedBudgets.length : 0;

    return `
        <div class="section-header">
            <h2>Indicadores</h2>
        </div>
        <div class="inventory-summary-grid">
            <div class="report-card"><h3>${formatCurrencyBRL(averageTicket)}</h3><p>ticket medio</p></div>
            <div class="report-card"><h3>${rentedCustomers}</h3><p>clientes que alugaram</p></div>
            <div class="report-card"><h3>${pendingCustomers}</h3><p>clientes aguardando fechamento</p></div>
        </div>
        <div class="reports-grid">
            <div class="report-card">
                <h3>Produtos mais alugados</h3>
                ${renderTopProducts()}
            </div>
            <div class="report-card">
                <h3>Receita por status</h3>
                ${renderRevenueByStatus()}
            </div>
        </div>
    `;
}

window.exportData = function() {
    normalizeAppData();

    if (typeof XLSX === 'undefined') {
        showAdminMessage('Biblioteca de Excel nao carregada.', 'error');
        return;
    }

    const workbook = XLSX.utils.book_new();

    const productsSheet = products.map(product => ({
        ID: product.id,
        Produto: product.name,
        Categoria: product.category,
        Preco: product.price,
        Estoque: product.stock,
        Status: product.stock === 0 ? 'Esgotado' : product.stock < 20 ? 'Baixo' : 'Saudavel'
    }));

    const financeSheet = financialEntries.map(entry => ({
        Tipo: entry.kind,
        Descricao: entry.description,
        Cliente: entry.customerName || '',
        Categoria: entry.category || '',
        Valor: entry.amount,
        Vencimento: formatDateBR(entry.dueDate),
        Status: entry.status
    }));

    const customersSheet = users.filter(user => !user.isAdmin).map(user => {
        const userBudgets = savedBudgets.filter(item => item.userId === user.id);
        return {
            Cliente: user.name,
            Email: user.email,
            Orcamentos: userBudgets.length,
            Alugou: userBudgets.some(item => ['Aprovado', 'Finalizado'].includes(item.status)) ? 'Sim' : 'Nao',
            Pendente: userBudgets.some(item => item.status === 'Pendente') ? 'Sim' : 'Nao',
            ValorTotal: userBudgets.reduce((sum, item) => sum + item.total, 0)
        };
    });

    const dashboardSheet = [
        { Metrica: 'Total de pedidos', Valor: savedBudgets.length },
        { Metrica: 'Pedidos pendentes', Valor: savedBudgets.filter(item => item.status === 'Pendente').length },
        { Metrica: 'Receita aprovada', Valor: savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).reduce((sum, item) => sum + item.total, 0) },
        { Metrica: 'Previsto', Valor: financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0) },
        { Metrica: 'Despesas', Valor: financialEntries.filter(entry => entry.kind === 'Despesa').reduce((sum, entry) => sum + entry.amount, 0) },
        { Metrica: 'Itens em estoque', Valor: products.reduce((sum, item) => sum + item.stock, 0) }
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dashboardSheet), 'Dashboard');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productsSheet), 'Estoque');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(financeSheet), 'Financeiro');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customersSheet), 'Clientes');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(savedBudgets.map(item => ({
        ID: item.id,
        Cliente: item.userName,
        Evento: item.eventDetails?.type || '',
        DataEvento: formatDateBR(item.eventDetails?.date),
        Cidade: item.eventDetails?.city || '',
        Total: item.total,
        Status: item.status
    }))), 'Pedidos');

    XLSX.writeFile(workbook, `mobilier-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAdminMessage('Planilha Excel exportada com sucesso.', 'success');
};

function saveBudget() {
    if (!cart.length) {
        showMessage('Adicione itens ao orcamento antes de salvar.', 'error');
        return;
    }

    const cepInput = document.getElementById('cep');
    if (!cepInput?.value) {
        showMessage('Informe um CEP para calcular o frete.', 'error');
        return;
    }

    if (!currentUser) {
        showMessage('Faca login para salvar seu orcamento.', 'error');
        openLoginModal();
        return;
    }

    const eventDetails = getEventBriefFromForm();
    let subtotal = 0;

    const items = cart.map(item => {
        let unitPrice = item.price;
        if (item.bulkDiscount && item.quantity >= item.bulkDiscount.quantity) {
            unitPrice = item.bulkDiscount.price;
        }

        const total = unitPrice * item.quantity;
        subtotal += total;

        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: unitPrice,
            total
        };
    });

    const budget = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        date: new Date().toLocaleString('pt-BR'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items,
        subtotal,
        freight: freightValue,
        total: subtotal + freightValue,
        cep: cepInput.value,
        status: 'Pendente',
        inventoryCommitted: false,
        eventDetails
    };

    savedBudgets.push(budget);
    ensureAccessSession().converted = true;
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    refreshAdminViews();

    showMessage(`Orcamento salvo com sucesso. Total: ${formatCurrencyBRL(budget.total)}`, 'success');
    clearBudget();
}

function clearBudget() {
    cart = [];
    freightValue = 0;
    const cepInput = document.getElementById('cep');
    const cepMessage = document.getElementById('cepMessage');

    if (cepInput) cepInput.value = '';
    if (cepMessage) {
        cepMessage.innerHTML = '';
        cepMessage.className = '';
    }

    clearEventBriefForm();
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
}

function createBudgetModal(budgets, title) {
    const existingModal = document.getElementById('budgetsModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'budgetsModal';
    modal.className = 'modal';
    modal.style.display = 'block';

    const html = `
        <div class="modal-content" style="max-width: 900px; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>${title}</h2>
                <span class="close-budgets-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 20px;">
                ${[...budgets].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).map(budget => `
                    <div class="budget-item" style="background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; margin-bottom: 16px;">
                        <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                            <div>
                                <h3 style="margin-bottom:6px;">Orcamento #${budget.id}</h3>
                                <p style="margin:0; color:#64748b;">${budget.eventDetails?.type || 'Evento nao informado'}${budget.eventDetails?.date ? ` • ${formatDateBR(budget.eventDetails.date)}` : ''}${budget.eventDetails?.city ? ` • ${budget.eventDetails.city}` : ''}</p>
                                <p style="margin:6px 0 0; color:#64748b;">${describeBudgetItems(budget.items)}</p>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:1.2rem; font-weight:700; color:#1a365d;">${formatCurrencyBRL(budget.total)}</div>
                                <span class="status-badge ${getFinanceStatusClass(mapBudgetStatusToFinanceStatus(budget.status))}">${budget.status}</span>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                            <button class="btn-small view-budget-details" data-id="${budget.id}" style="background:#3498db; color:white;">Ver detalhes</button>
                            <button class="btn-small duplicate-budget-btn" data-id="${budget.id}" style="background:#2ecc71; color:white;">Duplicar</button>
                            ${currentUser?.isAdmin ? `<button class="btn-small delete-budget-btn" data-id="${budget.id}" style="background:#e74c3c; color:white;">Excluir</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    modal.querySelector('.close-budgets-modal')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', event => {
        if (event.target === modal) modal.remove();
    });
    modal.querySelectorAll('.view-budget-details').forEach(button => button.addEventListener('click', function() {
        modal.remove();
        showBudgetDetails(parseInt(this.dataset.id, 10));
    }));
    modal.querySelectorAll('.duplicate-budget-btn').forEach(button => button.addEventListener('click', function() {
        modal.remove();
        duplicateBudget(parseInt(this.dataset.id, 10));
    }));
    modal.querySelectorAll('.delete-budget-btn').forEach(button => button.addEventListener('click', function() {
        deleteBudget(parseInt(this.dataset.id, 10));
        modal.remove();
    }));
}

function viewBudgetDetailsAdmin(budgetId) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="modal" id="budgetDetailsModal" style="display:block; background: rgba(0,0,0,0.9);">
            <div class="modal-content" style="max-width: 920px;">
                <div class="modal-header">
                    <h2>Pedido #${budget.id}</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="budget-details-header">
                        <div class="budget-info-group">
                            <h4>Cliente</h4>
                            <p><strong>Nome:</strong> ${budget.userName}</p>
                            <p><strong>CEP:</strong> ${budget.cep}</p>
                            <p><strong>Status:</strong> ${budget.status}</p>
                        </div>
                        <div class="budget-info-group">
                            <h4>Evento</h4>
                            <p><strong>Tipo:</strong> ${budget.eventDetails?.type || '-'}</p>
                            <p><strong>Data:</strong> ${budget.eventDetails?.date ? formatDateBR(budget.eventDetails.date) : '-'}</p>
                            <p><strong>Cidade:</strong> ${budget.eventDetails?.city || '-'}</p>
                            <p><strong>Convidados:</strong> ${budget.eventDetails?.guests || '-'}</p>
                            <p><strong>Ambiente:</strong> ${budget.eventDetails?.venueType || '-'}</p>
                        </div>
                    </div>
                    ${budget.eventDetails?.notes ? `<div class="report-card" style="margin-bottom: 20px;"><h3>Observacoes</h3><p>${budget.eventDetails.notes}</p></div>` : ''}
                    <table class="budget-items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Produto</th>
                                <th class="text-center">Quantidade</th>
                                <th class="text-right">Preco unit.</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${budget.items.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${item.name}</td>
                                    <td class="text-center">${item.quantity}</td>
                                    <td class="text-right">${formatCurrencyBRL(item.price)}</td>
                                    <td class="text-right">${formatCurrencyBRL(item.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="budget-summary-box">
                        <div class="summary-line"><span>Subtotal:</span><span>${formatCurrencyBRL(budget.subtotal)}</span></div>
                        <div class="summary-line"><span>Frete:</span><span>${formatCurrencyBRL(budget.freight)}</span></div>
                        <div class="summary-line"><span>Total:</span><span>${formatCurrencyBRL(budget.total)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('#budgetDetailsModal')?.addEventListener('click', event => {
        if (event.target.id === 'budgetDetailsModal') wrapper.remove();
    });
}

function updateBudgetStatus(budgetId, newStatus) {
    const budget = savedBudgets.find(item => item.id === budgetId);
    if (!budget) return;

    if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
        const inventoryResult = applyInventoryForBudget(budget, 'out');
        if (!inventoryResult.ok) {
            refreshAdminViews();
            showAdminMessage(inventoryResult.message, 'error');
            return;
        }
    }

    if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    budget.status = newStatus;
    budget.updatedAt = new Date().toISOString();
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
}

function deleteBudgetAdmin(budgetId) {
    if (!confirm('Excluir este pedido permanentemente?')) return;
    deleteBudget(budgetId);
    refreshAdminViews();
    showAdminMessage('Pedido excluido com sucesso.', 'success');
}

function deleteBudget(budgetId) {
    const budgetIndex = savedBudgets.findIndex(item => item.id === budgetId);
    if (budgetIndex === -1) return;

    const budget = savedBudgets[budgetIndex];
    if (budget.inventoryCommitted) {
        applyInventoryForBudget(budget, 'in');
    }

    savedBudgets.splice(budgetIndex, 1);
    syncFinancialEntriesFromBudgets();
    saveToLocalStorage();
}

function saveProductChanges(productId) {
    const productIndex = products.findIndex(product => product.id === productId);
    if (productIndex === -1) return;

    const previousStock = products[productIndex].stock;
    const productName = document.getElementById('editProductName').value.trim();
    const productCategory = document.getElementById('editProductCategory').value;
    const productDescription = document.getElementById('editProductDescription').value.trim();
    const productPrice = parseFloat(document.getElementById('editProductPrice').value);
    const productStock = parseInt(document.getElementById('editProductStock').value, 10);
    const productIcon = document.getElementById('editProductIcon').value;
    const bulkQuantity = document.getElementById('editBulkQuantity').value;
    const bulkPrice = document.getElementById('editBulkPrice').value;

    if (!productName || !productDescription || Number.isNaN(productPrice) || Number.isNaN(productStock)) {
        showAdminMessage('Preencha os campos obrigatorios.', 'error');
        return;
    }

    let bulkDiscount = null;
    if (bulkQuantity && bulkPrice) {
        const quantity = parseInt(bulkQuantity, 10);
        const price = parseFloat(bulkPrice);
        if (quantity > 0 && price > 0 && price < productPrice) {
            bulkDiscount = { quantity, price };
        }
    }

    products[productIndex] = {
        ...products[productIndex],
        name: productName,
        category: productCategory,
        description: productDescription,
        price: productPrice,
        stock: productStock,
        image: productIcon,
        bulkDiscount
    };

    const stockDifference = productStock - previousStock;
    if (stockDifference > 0) {
        registerStockMovement(productId, 'entrada', stockDifference, 'Ajuste pelo cadastro do produto');
    } else if (stockDifference < 0) {
        registerStockMovement(productId, 'saida', Math.abs(stockDifference), 'Ajuste pelo cadastro do produto');
    }

    saveToLocalStorage();
    renderProducts();
    renderBudgetItems();
    refreshAdminViews();
    document.querySelector('#productEditModal')?.remove();
    showAdminMessage('Produto salvo com sucesso.', 'success');
}

function showAdminMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.admin-message');
    if (existingMessage) existingMessage.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message ${type}`;
    messageDiv.innerHTML = `<strong>${type === 'error' ? 'Atencao' : 'Atualizacao'}</strong><span>${message}</span>`;
    document.getElementById('adminPanel')?.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 4500);
}

function saveToLocalStorage() {
    try {
        normalizeAppData();
        localStorage.setItem('mobilierData', JSON.stringify({
            products,
            users,
            savedBudgets,
            companyData,
            stockMovements,
            financialEntries
        }));
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('mobilierData');
        if (!savedData) {
            normalizeAppData();
            return;
        }

        const data = JSON.parse(savedData);
        if (data.products) products = data.products;
        if (data.users) users = data.users;
        if (data.savedBudgets) savedBudgets = data.savedBudgets;
        if (data.companyData) Object.assign(companyData, data.companyData);
        if (data.stockMovements) stockMovements = data.stockMovements;
        if (data.financialEntries) financialEntries = data.financialEntries;
        normalizeAppData();
    } catch (error) {
        console.error('Erro ao carregar:', error);
    }
}

window.exportData = function() {
    normalizeAppData();
    const blob = new Blob([JSON.stringify({
        products,
        users,
        savedBudgets,
        companyData,
        stockMovements,
        financialEntries
    }, null, 2)], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mobilier-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showAdminMessage('Backup exportado com sucesso.', 'success');
};

window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(loadEvent) {
            try {
                const data = JSON.parse(loadEvent.target.result);
                products = data.products || products;
                users = data.users || users;
                savedBudgets = data.savedBudgets || savedBudgets;
                stockMovements = data.stockMovements || [];
                financialEntries = data.financialEntries || [];
                Object.assign(companyData, data.companyData || {});
                normalizeAppData();
                saveToLocalStorage();
                location.reload();
            } catch (error) {
                showAdminMessage('Arquivo invalido para importacao.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

document.addEventListener('DOMContentLoaded', function() {
    normalizeAppData();

    document.getElementById('myBudgetsQuickBtn')?.addEventListener('click', function() {
        if (!currentUser) {
            openLoginModal();
            return;
        }
        showMyBudgets();
    });
});

// ============================================
// ADMIN FIXES AND MEDIA SUPPORT
// ============================================

let adminCharts = {
    orders: null,
    revenue: null
};

let accessHistory = [];
let currentAccessSession = null;
let leadContacts = [];
let logisticsEntries = [];
let logisticsViewDate = new Date();

setTimeout(() => {
    saveToLocalStorage = function() {
        try {
            normalizeAppData();
            localStorage.setItem('mobilierData', JSON.stringify({
                products,
                users,
                savedBudgets,
                companyData,
                stockMovements,
                financialEntries,
                accessHistory,
                leadContacts,
                logisticsEntries
            }));
        } catch (error) {
            console.error('Erro ao salvar:', error);
        }
    };

    loadFromLocalStorage = function() {
        try {
            const savedData = localStorage.getItem('mobilierData');
            if (!savedData) {
                normalizeAppData();
                accessHistory = [];
                leadContacts = [];
                logisticsEntries = [];
                return;
            }

            const data = JSON.parse(savedData);
            if (data.products) products = data.products;
            if (data.users) users = data.users;
            if (data.savedBudgets) savedBudgets = data.savedBudgets;
            if (data.companyData) Object.assign(companyData, data.companyData);
            if (data.stockMovements) stockMovements = data.stockMovements;
            if (data.financialEntries) financialEntries = data.financialEntries;
            accessHistory = Array.isArray(data.accessHistory) ? data.accessHistory : [];
            leadContacts = Array.isArray(data.leadContacts) ? data.leadContacts : [];
            logisticsEntries = Array.isArray(data.logisticsEntries) ? data.logisticsEntries : [];
            normalizeAppData();
        } catch (error) {
            console.error('Erro ao carregar:', error);
        }
    };

    window.exportData = function() {
        normalizeAppData();

        if (typeof XLSX === 'undefined') {
            showAdminMessage('Biblioteca de Excel indisponivel no momento.', 'error');
            return;
        }

        const workbook = XLSX.utils.book_new();
        const sheets = [
            ['Dashboard', [
                ['Indicador', 'Valor'],
                ['Total de pedidos', savedBudgets.length],
                ['Pedidos pendentes', savedBudgets.filter(item => item.status === 'Pendente').length],
                ['Receita aprovada', savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).reduce((sum, item) => sum + item.total, 0)],
                ['Receita recebida', financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0)],
                ['A receber', financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0)],
                ['Estoque total', products.reduce((sum, item) => sum + item.stock, 0)],
                ['Entregas programadas', logisticsEntries.length],
                ['Leads capturados', leadContacts.length]
            ]],
            ['Estoque', [
                ['ID', 'Produto', 'Categoria', 'Preco', 'Estoque', 'Imagem'],
                ...products.map(product => [product.id, product.name, product.category || '', product.price || 0, product.stock || 0, product.imageUrl || product.image || ''])
            ]],
            ['Pedidos', [
                ['ID', 'Cliente', 'Email', 'Telefone', 'Evento', 'Tipo', 'Data evento', 'Entrega', 'Endereco', 'Total', 'Status'],
                ...savedBudgets.map(budget => [
                    budget.id,
                    budget.userName || '',
                    budget.userEmail || '',
                    budget.userPhone || '',
                    budget.eventDetails?.eventName || '',
                    budget.eventDetails?.type || '',
                    budget.eventDetails?.date || '',
                    `${budget.eventDetails?.deliveryDate || ''} ${budget.eventDetails?.deliveryTime || ''}`.trim(),
                    budget.eventDetails?.deliveryAddress || '',
                    budget.total || 0,
                    budget.status || ''
                ])
            ]],
            ['Financeiro', [
                ['ID', 'Tipo', 'Descricao', 'Cliente', 'Categoria', 'Vencimento', 'Valor', 'Status'],
                ...financialEntries.map(entry => [entry.id, entry.kind || '', entry.description || '', entry.customerName || '', entry.category || '', entry.dueDate || '', entry.amount || 0, entry.status || ''])
            ]],
            ['Clientes', [
                ['ID', 'Nome', 'Email', 'Telefone', 'Endereco', 'CPF', 'Observacoes'],
                ...users.filter(user => !user.isAdmin).map(user => [user.id, user.name || '', user.email || '', user.phone || '', user.address || '', user.cpf || '', user.notes || ''])
            ]],
            ['Leads', [
                ['Nome', 'Email', 'Telefone', 'Origem', 'Produto', 'Quantidade', 'Capturado em'],
                ...leadContacts.map(lead => [lead.name || '', lead.email || '', lead.phone || '', lead.source || '', lead.productName || '', lead.quantity || 0, lead.capturedAt || ''])
            ]],
            ['Logistica', [
                ['ID', 'Evento', 'Cliente', 'Recebedor', 'Telefone', 'Data', 'Horario', 'Local', 'Responsavel', 'Status'],
                ...logisticsEntries.map(entry => [entry.id, entry.eventName || '', entry.clientName || '', entry.receiverName || '', entry.receiverPhone || '', entry.date || '', entry.time || '', entry.location || '', entry.owner || '', entry.status || ''])
            ]],
            ['Acessos', [
                ['Sessao', 'Usuario', 'Inicio', 'Ultima atividade', 'Acoes', 'Cliques em produtos', 'Converteu lead'],
                ...accessHistory.map(session => [session.id, session.userName || '', session.startedAt || '', session.lastActivityAt || '', Array.isArray(session.actions) ? session.actions.length : 0, Array.isArray(session.productClicks) ? session.productClicks.length : 0, session.leadUnlocked ? 'Sim' : 'Nao'])
            ]]
        ];

        sheets.forEach(([name, rows]) => {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
        });

        XLSX.writeFile(workbook, `mobilier-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
        showAdminMessage('Planilha Excel exportada com sucesso.', 'success');
    };

    updateBudgetStatus = function(budgetId, newStatus) {
        const budget = savedBudgets.find(item => item.id === budgetId);
        if (!budget) return;

        if (['Aprovado', 'Finalizado'].includes(newStatus) && !budget.inventoryCommitted) {
            const inventoryResult = applyInventoryForBudget(budget, 'out');
            if (!inventoryResult.ok) {
                refreshAdminViews();
                showAdminMessage(inventoryResult.message, 'error');
                return;
            }
        }

        if (newStatus === 'Cancelado' && budget.inventoryCommitted) {
            applyInventoryForBudget(budget, 'in');
        }

        budget.status = newStatus;
        budget.updatedAt = new Date().toISOString();

        if (['Aprovado', 'Finalizado'].includes(newStatus)) {
            createLogisticsFromBudget(budget, budget.eventDetails?.responsible || '');
        }

        syncFinancialEntriesFromBudgets();
        saveToLocalStorage();
        renderProducts();
        renderBudgetItems();
        refreshAdminViews();
        showAdminMessage(`Pedido #${budgetId} atualizado para ${newStatus}.`, 'success');
    };
}, 0);

function ensureAccessSession() {
    if (currentAccessSession) return currentAccessSession;
    currentAccessSession = {
        id: Date.now(),
        userId: currentUser?.id || null,
        userName: currentUser?.name || 'Visitante',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        productClicks: [],
        actions: [],
        converted: false
    };
    accessHistory.unshift(currentAccessSession);
    accessHistory = accessHistory.slice(0, 300);
    return currentAccessSession;
}

function trackAccess(type, details = {}) {
    const session = ensureAccessSession();
    session.lastActivityAt = new Date().toISOString();
    session.actions.push({
        type,
        details,
        at: new Date().toISOString()
    });
}

function hasUnlockedPrices() {
    const session = ensureAccessSession();
    return Boolean(session.leadUnlocked);
}

function openLeadCaptureModal(context = {}) {
    const session = ensureAccessSession();
    if (session.leadUnlocked) return;

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
        wrapper.remove();
        openLoginModal();
        const loginEmailField = document.getElementById('loginEmail');
        const currentLeadEmail = document.getElementById('leadEmail')?.value.trim().toLowerCase();
        if (loginEmailField && currentLeadEmail) {
            loginEmailField.value = currentLeadEmail;
        }
    });
    wrapper.querySelector('#saveLeadCapture')?.addEventListener('click', function() {
        const name = document.getElementById('leadName')?.value.trim();
        const email = document.getElementById('leadEmail')?.value.trim().toLowerCase();
        const phone = document.getElementById('leadPhone')?.value.trim();
        if (!name || !email || !phone) {
            alert('Preencha nome, email e telefone.');
            return;
        }

        session.userName = name;
        session.leadUnlocked = true;
        session.lead = {
            name,
            email,
            phone,
            capturedAt: new Date().toISOString(),
            context
        };
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
        unlockBudgetSection(context.source !== 'budget_entry');
        wrapper.remove();
    });
}

function getProductVisual(product) {
    if (product.imageUrl) {
        return `<img src="${product.imageUrl}" alt="${product.name}" class="hero-product-image">`;
    }
    return `<i class="${product.image}"></i>`;
}

function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    productsGrid.innerHTML = '';
    const canShowPrices = hasUnlockedPrices();

    products.forEach(product => {
        const stockClass = product.stock === 0 ? 'out' : product.stock < 20 ? 'low' : 'available';
        const stockText = product.stock === 0 ? 'Esgotado' : product.stock < 20 ? `${product.stock} unidades (estoque baixo)` : `${product.stock} unidades disponiveis`;

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">${getProductVisual(product)}</div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price ${canShowPrices ? '' : 'price-locked'}">${canShowPrices ? `${formatCurrencyBRL(product.price)} cada` : 'Atendimento sob consulta'}</p>
                <p class="product-stock ${stockClass}">
                    <i class="fas fa-${stockClass === 'available' ? 'check' : stockClass === 'low' ? 'exclamation' : 'times'}-circle"></i>
                    ${stockText}
                </p>
                <div class="catalog-quantity">
                    <label for="catalogQty${product.id}">Quantidade</label>
                    <input type="number" id="catalogQty${product.id}" min="1" max="${Math.max(product.stock, 1)}" value="1" ${product.stock === 0 ? 'disabled' : ''}>
                </div>
                <div class="product-actions">
                    <button class="btn-secondary add-to-budget" data-id="${product.id}">
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

    document.querySelectorAll('.add-to-budget').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id, 10);
            const product = products.find(item => item.id === id);
            const quantity = parseInt(document.getElementById(`catalogQty${id}`)?.value || '1', 10);
            trackAccess('add_to_budget', { productId: id, productName: product?.name || '' });
            addToBudget(id, quantity);
        });
    });

    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id, 10);
            const product = products.find(item => item.id === id);
            const session = ensureAccessSession();
            session.productClicks.push({ productId: id, productName: product?.name || '', at: new Date().toISOString() });
            showProductDetails(id);
        });
    });
}

function getFilteredProductsForAdmin() {
    const name = document.getElementById('stockFilterName')?.value.trim().toLowerCase() || '';
    const category = document.getElementById('stockFilterCategory')?.value || '';
    const quantity = document.getElementById('stockFilterQuantity')?.value || '';

    return products.filter(product => {
        const nameOk = !name || product.name.toLowerCase().includes(name);
        const categoryOk = !category || product.category === category;
        const quantityOk = !quantity ||
            (quantity === 'low' && product.stock > 0 && product.stock < 20) ||
            (quantity === 'out' && product.stock === 0) ||
            (quantity === 'available' && product.stock >= 20);
        return nameOk && categoryOk && quantityOk;
    });
}

function saveRegistrationForm(userId = null) {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const phone = document.getElementById('regPhone')?.value.trim();
    const cpf = document.getElementById('regCpf')?.value.trim();
    const cep = document.getElementById('regCep')?.value.trim();
    const street = document.getElementById('regStreet')?.value.trim();
    const number = document.getElementById('regNumber')?.value.trim();
    const complement = document.getElementById('regComplement')?.value.trim();
    const neighborhood = document.getElementById('regNeighborhood')?.value.trim();
    const cityState = document.getElementById('regCity')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const notes = document.getElementById('regNotes')?.value.trim();
    const message = document.getElementById('registrationMessage');
    const address = [street, number ? `n. ${number}` : '', neighborhood, cityState, complement].filter(Boolean).join(', ');

    if (!name || !email || !phone || !password) {
        if (message) {
            message.style.color = '#fecaca';
            message.textContent = 'Preencha nome, e-mail, telefone e senha.';
        }
        return;
    }

    const emailInUse = users.some(user => user.email === email && user.id !== userId);
    if (emailInUse) {
        if (message) {
            message.style.color = '#fecaca';
            message.textContent = 'Este e-mail ja esta cadastrado.';
        }
        return;
    }

    let successText = '';
    if (userId) {
        const index = users.findIndex(user => user.id === userId);
        if (index === -1) return;
        users[index] = { ...users[index], name, email, phone, cpf, cep, street, number, complement, neighborhood, cityState, address, password, notes };
        currentUser = { ...users[index] };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        successText = 'Perfil atualizado com sucesso.';
    } else {
        const newUser = {
            id: users.length ? Math.max(...users.map(user => user.id)) + 1 : 1,
            name,
            email,
            phone,
            cpf,
            cep,
            street,
            number,
            complement,
            neighborhood,
            cityState,
            address,
            password,
            notes,
            isAdmin: false,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        currentUser = { ...newUser };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        successText = `Cadastro concluido com sucesso. Bem-vindo(a), ${name}!`;
    }

    saveToLocalStorage();
    updateUserState();

    if (message) {
        message.style.color = '#bbf7d0';
        message.textContent = successText;
    }

    showMessage(successText, 'success');

    if (!userId) {
        sendRegistrationEmail({
            name,
            email,
            phone,
            address,
            notes
        }).then(sent => {
            if (sent && message) {
                message.style.color = '#bfdbfe';
                message.textContent = `${successText} E-mail de boas-vindas enviado.`;
            }
        });
    }

    setTimeout(() => {
        document.getElementById('registrationModal')?.remove();
        closeLoginModal();
        unlockBudgetSection(false);
        openCustomerArea('profile');
    }, 700);
}

function getRegistrationEmailEndpoint() {
    if (window.MOBILIER_API_URL) {
        return `${String(window.MOBILIER_API_URL).replace(/\/$/, '')}/api/registration-email`;
    }

    if (window.location?.protocol?.startsWith('http')) {
        return `${window.location.protocol}//${window.location.hostname}:3001/api/registration-email`;
    }

    return 'http://localhost:3001/api/registration-email';
}

async function sendRegistrationEmail(payload) {
    try {
        const response = await fetch(getRegistrationEmailEndpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.warn('Falha ao enviar e-mail de cadastro:', data?.message || response.statusText);
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Servico de e-mail indisponivel:', error);
        return false;
    }
}

function showLoginMessage(message, type = 'info') {
    const loginMessage = document.getElementById('loginMessage');
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.className = `login-message ${type}`;
}

function openPasswordRecoveryModal(prefilledEmail = '') {
    document.getElementById('passwordRecoveryModal')?.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'passwordRecoveryModal';
    wrapper.innerHTML = `
        <div class="modal" style="display:block; background: rgba(3,7,18,0.72);">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Recuperar senha</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p class="recovery-copy">Digite o e-mail da conta para receber um link seguro de redefinicao de senha.</p>
                    <div class="form-group">
                        <label for="recoveryEmail">E-mail</label>
                        <input type="email" id="recoveryEmail" placeholder="seu@email.com" value="${prefilledEmail}">
                    </div>
                    <div class="form-actions">
                        <button type="button" id="sendRecoveryEmailBtn" class="cta-button">Enviar link</button>
                        <button type="button" class="btn-outline cancel-recovery-btn">Cancelar</button>
                    </div>
                    <div id="recoveryMessage" class="login-message" style="display:none;"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.close-modal')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.cancel-recovery-btn')?.addEventListener('click', () => wrapper.remove());
    wrapper.querySelector('.modal')?.addEventListener('click', event => {
        if (event.target === wrapper.querySelector('.modal')) wrapper.remove();
    });
    wrapper.querySelector('#sendRecoveryEmailBtn')?.addEventListener('click', requestPasswordReset);
}

async function requestPasswordReset() {
    const email = document.getElementById('recoveryEmail')?.value.trim().toLowerCase();
    const messageBox = document.getElementById('recoveryMessage');

    if (!email) {
        if (messageBox) {
            messageBox.style.display = 'block';
            messageBox.className = 'login-message error';
            messageBox.textContent = 'Informe o e-mail da conta.';
        }
        return;
    }

    try {
        const response = await fetch(`${getMobilierApiBaseUrl()}/api/password-reset/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.message || 'Nao foi possivel enviar o link.');

        if (messageBox) {
            messageBox.style.display = 'block';
            messageBox.className = 'login-message success';
            messageBox.textContent = 'Se existir uma conta com esse e-mail, o link de redefinicao foi enviado.';
        }
    } catch (error) {
        if (messageBox) {
            messageBox.style.display = 'block';
            messageBox.className = 'login-message error';
            messageBox.textContent = error.message || 'Nao foi possivel enviar o link agora.';
        }
    }
}

function openPasswordResetFlowFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email') || '';
    const token = params.get('resetToken') || '';
    if (!email || !token) return;

    document.getElementById('passwordResetTokenModal')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'passwordResetTokenModal';
    wrapper.innerHTML = `
        <div class="modal" style="display:block; background: rgba(3,7,18,0.72);">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Criar nova senha</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p class="recovery-copy">Defina sua nova senha para voltar a acessar sua conta com seguranca.</p>
                    <div class="form-group">
                        <label for="resetPasswordNew">Nova senha</label>
                        <input type="password" id="resetPasswordNew" placeholder="Minimo de 6 caracteres">
                    </div>
                    <div class="form-group">
                        <label for="resetPasswordConfirm">Confirmar nova senha</label>
                        <input type="password" id="resetPasswordConfirm" placeholder="Repita a nova senha">
                    </div>
                    <div class="form-actions">
                        <button type="button" id="confirmPasswordResetBtn" class="cta-button">Salvar nova senha</button>
                        <button type="button" class="btn-outline cancel-password-reset-btn">Cancelar</button>
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
        const newPassword = document.getElementById('resetPasswordNew')?.value || '';
        const confirmPassword = document.getElementById('resetPasswordConfirm')?.value || '';
        const messageBox = document.getElementById('passwordResetMessage');

        if (newPassword.length < 6) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.className = 'login-message error';
                messageBox.textContent = 'A nova senha precisa ter pelo menos 6 caracteres.';
            }
            return;
        }

        if (newPassword !== confirmPassword) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.className = 'login-message error';
                messageBox.textContent = 'As senhas nao conferem.';
            }
            return;
        }

        try {
            const response = await fetch(`${getMobilierApiBaseUrl()}/api/password-reset/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.message || 'Nao foi possivel salvar a nova senha.');

            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.className = 'login-message success';
                messageBox.textContent = 'Senha atualizada com sucesso. Agora voce ja pode entrar.';
            }

            setTimeout(() => {
                closeHandler();
                openLoginModal();
                const loginEmail = document.getElementById('loginEmail');
                if (loginEmail) loginEmail.value = email;
                showLoginMessage('Sua senha foi redefinida. Entre com a nova senha.', 'success');
            }, 900);
        } catch (error) {
            if (messageBox) {
                messageBox.style.display = 'block';
                messageBox.className = 'login-message error';
                messageBox.textContent = error.message || 'Nao foi possivel redefinir a senha.';
            }
        }
    });
}

document.addEventListener('click', event => {
    if (event.target?.id === 'forgotPasswordButton') {
        const email = document.getElementById('loginEmail')?.value.trim().toLowerCase() || '';
        openPasswordRecoveryModal(email);
    }
    if (event.target?.id === 'openBudgetEntry' || event.target?.closest('#openBudgetEntry')) {
        if (currentUser || hasUnlockedPrices()) {
            unlockBudgetSection(true);
        } else {
            openLeadCaptureModal({ source: 'budget_entry' });
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    openPasswordResetFlowFromUrl();
    updateBudgetGateState();
});

function canAccessBudgetFlow() {
    return Boolean(currentUser || hasUnlockedPrices());
}

function updateBudgetGateState() {
    const budgetSection = document.getElementById('budget');
    const entryCard = document.getElementById('budgetEntryCard');
    if (!budgetSection) return;

    const unlocked = canAccessBudgetFlow();
    budgetSection.classList.toggle('budget-gated', !unlocked);
    if (entryCard) {
        entryCard.style.display = unlocked ? 'none' : 'flex';
    }
}

function unlockBudgetSection(scrollIntoView = false) {
    updateBudgetGateState();
    if (scrollIntoView) {
        document.getElementById('budget')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showProductDetails(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;
    const canShowPrices = hasUnlockedPrices();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px;">
            <div class="modal-header">
                <h2>Detalhes do Produto</h2>
                <span class="close-product-modal" style="font-size: 28px; cursor: pointer; color: white;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <div style="display:grid; grid-template-columns: minmax(220px, 280px) 1fr; gap:24px; align-items:start;">
                    <div style="background:#f3f6fb; border-radius:18px; min-height:240px; display:grid; place-items:center; overflow:hidden;">
                        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="${product.image}" style="font-size:90px; color:#1a365d;"></i>`}
                    </div>
                    <div>
                        <h3>${product.name}</h3>
                        <p><strong>Categoria:</strong> ${product.category}</p>
                        <p><strong>Preco:</strong> ${canShowPrices ? formatCurrencyBRL(product.price) : 'Libere os valores com nome, email e telefone'}</p>
                        <p><strong>Estoque:</strong> ${product.stock} unidades</p>
                        <p><strong>Descricao:</strong> ${product.description}</p>
                        <div class="catalog-quantity" style="max-width:160px; margin-top:16px;">
                            <label for="detailQty${product.id}">Quantidade</label>
                            <input type="number" id="detailQty${product.id}" min="1" max="${Math.max(product.stock, 1)}" value="1" ${product.stock === 0 ? 'disabled' : ''}>
                        </div>
                        <div style="margin-top:20px;">
                            <button class="cta-button add-from-details" data-id="${product.id}">
                                <i class="fas fa-cart-plus"></i> Adicionar ao Orcamento
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.close-product-modal')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.add-from-details')?.addEventListener('click', () => {
        const quantity = parseInt(document.getElementById(`detailQty${product.id}`)?.value || '1', 10);
        addToBudget(product.id, quantity);
        modal.remove();
    });
    modal.addEventListener('click', event => {
        if (event.target === modal) modal.remove();
    });
}

function addToBudget(productId, requestedQuantity = 1) {
    const product = products.find(item => item.id === productId);
    if (!product) return;

    if (!hasUnlockedPrices()) {
        openLeadCaptureModal({
            source: 'catalogo',
            productName: product.name,
            quantity: requestedQuantity
        });
        return;
    }

    if (product.stock === 0) {
        showMessage('Este produto esta esgotado.', 'error');
        return;
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
        return;
    }

    cartItem.quantity += quantityToAdd;
    updateCartDisplay();
    updateBudgetSummary();
    renderBudgetItems();
    showMessage(`${quantityToAdd} unidade(s) de ${product.name} adicionadas ao orcamento.`, 'success');
}

function updateBudgetSummary() {
    const subtotalElement = document.getElementById('subtotal');
    const freightElement = document.getElementById('freight');
    const totalElement = document.getElementById('total');
    if (!subtotalElement || !freightElement || !totalElement) return;

    if (!hasUnlockedPrices()) {
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
}

function renderAdminDashboard() {
    const approvedRevenue = savedBudgets.filter(item => ['Aprovado', 'Finalizado'].includes(item.status)).reduce((sum, item) => sum + item.total, 0);
    const projectedRevenue = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0);
    const pendingBudgets = savedBudgets.filter(item => item.status === 'Pendente').length;
    const lowStock = products.filter(product => product.stock > 0 && product.stock < 20).length;

    return `
        <div class="dashboard-header">
            <div>
                <h2>Dashboard Executivo</h2>
                <p style="color: rgba(255,255,255,0.72); margin: 8px 0 0;">Visao comercial, operacional e financeira da locacao.</p>
            </div>
            <div class="dashboard-time">Atualizado em ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info"><h3>Pipeline</h3><div class="stat-number">${savedBudgets.length}</div></div>
                    <div class="stat-icon"><i class="fas fa-file-signature"></i></div>
                </div>
                <div class="stat-card-bottom">${pendingBudgets} aguardando aprovacao</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info"><h3>Receita aprovada</h3><div class="stat-number">${formatCurrencyBRL(approvedRevenue)}</div></div>
                    <div class="stat-icon"><i class="fas fa-sack-dollar"></i></div>
                </div>
                <div class="stat-card-bottom">Pedidos aprovados e finalizados</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info"><h3>Previsto</h3><div class="stat-number">${formatCurrencyBRL(projectedRevenue)}</div></div>
                    <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                </div>
                <div class="stat-card-bottom">Financeiro ainda nao recebido</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-top">
                    <div class="stat-card-info"><h3>Estoque critico</h3><div class="stat-number">${lowStock}</div></div>
                    <div class="stat-icon"><i class="fas fa-triangle-exclamation"></i></div>
                </div>
                <div class="stat-card-bottom">${products.reduce((sum, item) => sum + item.stock, 0)} itens em estoque total</div>
            </div>
        </div>
        <div class="chart-grid">
            <div class="report-card chart-card">
                <h3>Pedidos por status</h3>
                <canvas id="ordersStatusChart"></canvas>
            </div>
            <div class="report-card chart-card">
                <h3>Financeiro</h3>
                <canvas id="revenueFinanceChart"></canvas>
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="dashboard-section">
                <h3><i class="fas fa-history"></i> Orcamentos recentes</h3>
                ${renderRecentActivity()}
            </div>
            <div class="dashboard-section">
                <h3><i class="fas fa-bell"></i> Alertas operacionais</h3>
                ${renderAdminAlerts()}
            </div>
        </div>
    `;
}

function mountAdminCharts() {
    if (typeof Chart === 'undefined') return;
    const ordersCanvas = document.getElementById('ordersStatusChart');
    const revenueCanvas = document.getElementById('revenueFinanceChart');
    if (!ordersCanvas || !revenueCanvas) return;

    if (adminCharts.orders) adminCharts.orders.destroy();
    if (adminCharts.revenue) adminCharts.revenue.destroy();

    const statusCounts = ['Pendente', 'Aprovado', 'Finalizado', 'Cancelado'].map(status =>
        savedBudgets.filter(item => item.status === status).length
    );
    const received = financialEntries.filter(entry => entry.status === 'Recebido').reduce((sum, entry) => sum + entry.amount, 0);
    const receivable = financialEntries.filter(entry => ['Previsto', 'A receber'].includes(entry.status)).reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = financialEntries.filter(entry => entry.kind === 'Despesa' && entry.status !== 'Cancelado').reduce((sum, entry) => sum + entry.amount, 0);

    adminCharts.orders = new Chart(ordersCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Pendente', 'Aprovado', 'Finalizado', 'Cancelado'],
            datasets: [{
                data: statusCounts,
                backgroundColor: ['#f4b942', '#60d394', '#4ea8de', '#ef476f'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#fff' } }
            }
        }
    });

    adminCharts.revenue = new Chart(revenueCanvas, {
        type: 'bar',
        data: {
            labels: ['Recebido', 'A receber', 'Despesas'],
            datasets: [{
                data: [received, receivable, expenses],
                backgroundColor: ['#60d394', '#f4b942', '#ef476f'],
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { display: false } },
                y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' } }
            }
        }
    });
}

function refreshAdminViews() {
    const dashboardTab = document.getElementById('adminDashboardTab');
    const productsTab = document.getElementById('adminProductsTab');
    const ordersContainer = document.getElementById('adminOrdersContainer');
    const financeTab = document.getElementById('adminFinanceTab');
    const logisticsTab = document.getElementById('adminLogisticsTab');
    const usersContainer = document.getElementById('adminUsersContainer');
    const reportsTab = document.getElementById('adminReportsTab');

    if (dashboardTab) dashboardTab.innerHTML = renderAdminDashboard();
    if (productsTab) productsTab.innerHTML = renderAdminProducts();
    if (ordersContainer) ordersContainer.innerHTML = renderAdminOrdersTable();
    if (financeTab) financeTab.innerHTML = renderAdminFinance();
    if (logisticsTab) logisticsTab.innerHTML = renderAdminLogistics();
    if (usersContainer) usersContainer.innerHTML = renderAdminUsersTable();
    if (reportsTab) reportsTab.innerHTML = renderAdminReports();

    setTimeout(mountAdminCharts, 30);
}

function openAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) {
        showMessage('Acesso restrito. Faca login como administrador.', 'error');
        openLoginModal();
        return;
    }

    document.getElementById('adminPanel')?.remove();

    const adminPanel = document.createElement('div');
    adminPanel.id = 'adminPanel';
    adminPanel.innerHTML = `
        <div class="admin-header">
            <div class="admin-header-left">
                <h1><i class="fas fa-briefcase"></i> Painel Administrativo</h1>
                <p>Operacao, estoque e financeiro</p>
            </div>
            <div class="admin-header-right">
                <div class="admin-user-info">
                    <p>${currentUser.name}</p>
                    <small>${companyData.name}</small>
                </div>
                <button id="closeAdminPanel"><i class="fas fa-times"></i> Fechar</button>
            </div>
        </div>
        <div class="admin-main-container">
            <div class="admin-sidebar">
                <nav class="admin-nav">
                    <button class="admin-nav-btn active" data-tab="dashboard"><i class="fas fa-gauge"></i> Dashboard</button>
                    <button class="admin-nav-btn" data-tab="products"><i class="fas fa-boxes-stacked"></i> Estoque</button>
                    <button class="admin-nav-btn" data-tab="orders"><i class="fas fa-file-invoice"></i> Pedidos</button>
                    <button class="admin-nav-btn" data-tab="finance"><i class="fas fa-wallet"></i> Financeiro</button>
                    <button class="admin-nav-btn" data-tab="logistics"><i class="fas fa-truck"></i> Logistica</button>
                    <button class="admin-nav-btn" data-tab="users"><i class="fas fa-address-book"></i> Cadastros</button>
                    <button class="admin-nav-btn" data-tab="reports"><i class="fas fa-chart-column"></i> Indicadores</button>
                    <button class="admin-nav-btn" data-tab="settings"><i class="fas fa-gear"></i> Configuracoes</button>
                </nav>
                <div class="admin-tools">
                    <h3>Ferramentas</h3>
                    <div class="tool-buttons">
                        <button onclick="exportData()"><i class="fas fa-download"></i> Exportar</button>
                        <button onclick="importData()"><i class="fas fa-upload"></i> Importar</button>
                    </div>
                </div>
            </div>
            <div class="admin-content">
                <div id="adminDashboardTab" class="admin-tab-content active">${renderAdminDashboard()}</div>
                <div id="adminProductsTab" class="admin-tab-content">${renderAdminProducts()}</div>
                <div id="adminOrdersTab" class="admin-tab-content">${renderAdminOrders()}</div>
                <div id="adminFinanceTab" class="admin-tab-content">${renderAdminFinance()}</div>
                <div id="adminLogisticsTab" class="admin-tab-content">${renderAdminLogistics()}</div>
                <div id="adminUsersTab" class="admin-tab-content">${renderAdminUsers()}</div>
                <div id="adminReportsTab" class="admin-tab-content">${renderAdminReports()}</div>
                <div id="adminSettingsTab" class="admin-tab-content">${renderAdminSettings()}</div>
            </div>
        </div>
    `;

    document.body.appendChild(adminPanel);
    setupAdminPanelEvents();
    setTimeout(mountAdminCharts, 40);
}

function setupAdminPanelEvents() {
    document.getElementById('closeAdminPanel')?.addEventListener('click', () => {
        document.getElementById('adminPanel')?.remove();
    });

    document.getElementById('addNewProduct')?.addEventListener('click', () => {
        addNewProduct();
    });

    ['stockFilterName', 'stockFilterCategory', 'stockFilterQuantity'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', refreshAdminViews);
        document.getElementById(id)?.addEventListener('change', refreshAdminViews);
    });

    document.querySelectorAll('.admin-nav-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            document.querySelectorAll('.admin-nav-btn').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            const tabElement = document.getElementById(`admin${capitalizeFirstLetter(tab)}Tab`);
            if (tabElement) {
                tabElement.style.display = 'block';
                tabElement.classList.add('active');
            }
            if (tab === 'dashboard') setTimeout(mountAdminCharts, 30);
        });
    });

    document.getElementById('companySettingsForm')?.addEventListener('submit', event => {
        event.preventDefault();
        saveCompanySettings();
    });
}
