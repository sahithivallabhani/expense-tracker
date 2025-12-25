// Transaction Storage Manager
class TransactionManager {
    constructor() {
        this.transactions = this.loadFromStorage();
        this.editingId = null;
    }

    loadFromStorage() {
        const data = localStorage.getItem('transactions');
        return data ? JSON.parse(data) : [];
    }

    saveToStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    add(transaction) {
        const newTransaction = {
            id: Date.now(),
            ...transaction,
            createdAt: new Date().toISOString()
        };
        this.transactions.unshift(newTransaction);
        this.saveToStorage();
        return newTransaction;
    }

    update(id, updatedData) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = { ...this.transactions[index], ...updatedData };
            this.saveToStorage();
            return this.transactions[index];
        }
        return null;
    }

    delete(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToStorage();
    }

    getById(id) {
        return this.transactions.find(t => t.id === id);
    }

    getAll() {
        return this.transactions;
    }

    getTotals() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return {
            income,
            expense,
            balance: income - expense
        };
    }
}

// Initialize Transaction Manager
const transactionManager = new TransactionManager();

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const typeSelect = document.getElementById('type');
const transactionsList = document.getElementById('transactionsList');
const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const currentDateEl = document.getElementById('currentDate');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const filterButtons = document.querySelectorAll('.filter-btn');

// Current filter state
let currentFilter = 'all';

// Initialize
function init() {
    setCurrentDate();
    setTodayAsDefault();
    updateTotals();
    renderTransactions();
    setupEventListeners();
}

// Set current date display
function setCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    currentDateEl.textContent = today.toLocaleDateString('en-US', options);
}

// Set today as default date in form
function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Setup Event Listeners
function setupEventListeners() {
    expenseForm.addEventListener('submit', handleFormSubmit);

    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    // Event delegation for transaction action buttons
    transactionsList.addEventListener('click', (e) => {
        const button = e.target.closest('.action-btn');
        if (!button) return;

        const action = button.dataset.action;
        const transactionId = parseInt(button.dataset.transactionId);

        if (action === 'edit') {
            editTransaction(transactionId);
        } else if (action === 'delete') {
            deleteTransaction(transactionId);
        }
    });
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();

    const transactionData = {
        description: descriptionInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: categorySelect.value,
        date: dateInput.value,
        type: typeSelect.value
    };

    if (transactionManager.editingId) {
        // Update existing transaction
        transactionManager.update(transactionManager.editingId, transactionData);
        transactionManager.editingId = null;

        // Reset button text
        btnText.textContent = 'Add Transaction';
        submitBtn.style.background = 'var(--primary-gradient)';
    } else {
        // Add new transaction
        transactionManager.add(transactionData);

        // Add success animation
        submitBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            submitBtn.style.transform = 'scale(1)';
        }, 100);
    }

    // Reset form
    expenseForm.reset();
    setTodayAsDefault();

    // Update UI
    updateTotals();
    renderTransactions();
}

// Update totals display
function updateTotals() {
    const { income, expense, balance } = transactionManager.getTotals();

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    totalBalanceEl.textContent = formatCurrency(balance);

    // Add color based on balance
    if (balance >= 0) {
        totalBalanceEl.style.background = 'var(--success-gradient)';
    } else {
        totalBalanceEl.style.background = 'var(--danger-gradient)';
    }
    totalBalanceEl.style.webkitBackgroundClip = 'text';
    totalBalanceEl.style.backgroundClip = 'text';
    totalBalanceEl.style.webkitTextFillColor = 'transparent';
}

// Render transactions list
function renderTransactions() {
    const transactions = transactionManager.getAll();

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        if (currentFilter === 'all') return true;
        return t.type === currentFilter;
    });

    // Clear list
    transactionsList.innerHTML = '';

    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M3 9H21" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 3V21" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p>No transactions yet</p>
                <span>Add your first transaction to get started!</span>
            </div>
        `;
        return;
    }

    // Render each transaction
    filteredTransactions.forEach(transaction => {
        const transactionEl = createTransactionElement(transaction);
        transactionsList.appendChild(transactionEl);
    });
}

// Create transaction element
function createTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = `transaction-item ${transaction.type}`;
    div.dataset.id = transaction.id;

    const categoryEmoji = getCategoryEmoji(transaction.category);
    const formattedDate = formatDate(transaction.date);
    const amountSign = transaction.type === 'income' ? '+' : '-';

    div.innerHTML = `
        <div class="transaction-info">
            <div class="transaction-icon">${categoryEmoji}</div>
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-meta">
                    <span>${transaction.category}</span>
                    <span>•</span>
                    <span>${formattedDate}</span>
                </div>
            </div>
        </div>
        <div class="transaction-amount">${amountSign}${formatCurrency(transaction.amount)}</div>
        <div class="transaction-actions">
            <button class="action-btn edit" data-action="edit" data-transaction-id="${transaction.id}" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button class="action-btn delete" data-action="delete" data-transaction-id="${transaction.id}" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    `;

    return div;
}

// Get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        food: '🍔',
        transport: '🚗',
        shopping: '🛍️',
        entertainment: '🎬',
        bills: '💡',
        health: '⚕️',
        income: '💰',
        other: '📌'
    };
    return emojis[category] || '📌';
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(Math.abs(amount));
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Edit transaction
function editTransaction(id) {
    const transaction = transactionManager.getById(id);
    if (!transaction) return;

    // Populate form
    descriptionInput.value = transaction.description;
    amountInput.value = transaction.amount;
    categorySelect.value = transaction.category;
    dateInput.value = transaction.date;
    typeSelect.value = transaction.type;

    // Update button
    btnText.textContent = 'Update Transaction';
    submitBtn.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

    // Store editing ID
    transactionManager.editingId = id;

    // Scroll to form
    expenseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Focus on description
    descriptionInput.focus();
}

// Delete transaction
function deleteTransaction(id) {
    // Show confirmation with custom styling
    if (confirm('Are you sure you want to delete this transaction?')) {
        const transactionEl = document.querySelector(`[data-id="${id}"]`);

        // Add fade out animation
        transactionEl.style.animation = 'slideOut 0.3s ease-out';

        setTimeout(() => {
            transactionManager.delete(id);
            updateTotals();
            renderTransactions();
        }, 300);
    }
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            opacity: 0;
            transform: translateX(-100%);
        }
    }
`;
document.head.appendChild(style);

// Handle filter change
function handleFilterChange(e) {
    // Update active state
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Update filter
    currentFilter = e.target.dataset.filter;

    // Re-render transactions
    renderTransactions();
}

// Initialize app
init();
