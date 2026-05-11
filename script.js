 class AuthSystem {
    constructor() {
        this.init();
    }

    init() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.loginEmail = document.getElementById('loginEmail');
        this.loginPassword = document.getElementById('loginPassword');
        this.registerEmail = document.getElementById('registerEmail');
        this.registerPassword = document.getElementById('registerPassword');
        this.message = document.getElementById('message');
        this.dashboard = document.getElementById('dashboard');
        this.userEmail = document.getElementById('userEmail');
        this.logoutBtn = document.getElementById('logoutBtn');

        this.bindEvents();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submissions
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        this.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Logout
        this.logoutBtn.addEventListener('click', () => {
            this.logout();
        });
    }

    switchTab(tab) {
        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Switch forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}Form`).classList.add('active');
    }

    showMessage(text, type) {
        this.message.textContent = text;
        this.message.className = `message ${type} show`;
        setTimeout(() => {
            this.message.classList.remove('show');
        }, 4000);
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password.length >= 6;
    }

    register() {
        const email = this.registerEmail.value.trim();
        const password = this.registerPassword.value;

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        // Check if user already exists
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(user => user.email === email)) {
            this.showMessage('Account already exists! Please login.', 'error');
            return;
        }

        // Save user
        users.push({ email, password });
        localStorage.setItem('users', JSON.stringify(users));

        this.showMessage('🎉 Account Created Successfully!', 'success');
        this.switchTab('login');
        this.registerForm.reset();
    }

    login() {
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value;

        // Validation
        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (!password) {
            this.showMessage('Please enter your password', 'error');
            return;
        }

        // Check credentials
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.showMessage('✅ Login Successful! Redirecting...', 'success');
            localStorage.setItem('currentUser', email);
            setTimeout(() => {
                this.showDashboard(email);
            }, 1500);
        } else {
            this.showMessage('❌ Invalid email or password', 'error');
        }
    }

    showDashboard(email) {
        this.userEmail.textContent = `Email: ${email}`;
        document.querySelector('.container').style.display = 'none';
        this.dashboard.classList.remove('hidden');
    }

    logout() {
        localStorage.removeItem('currentUser');
        document.querySelector('.container').style.display = 'flex';
        this.dashboard.classList.add('hidden');
        this.loginForm.reset();
        this.registerForm.reset();
        this.switchTab('login');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthSystem();
});
