// ========================================
// AUTH.JS - Firebase Authentication with Username
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

function initAuth() {
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDatabase) {
            clearInterval(checkFirebase);

            window.firebaseAuth.onAuthStateChanged(async (user) => {
                await updateUI(user);
            });

            initTabs();
            initForms();
        }
    }, 100);

    setTimeout(() => clearInterval(checkFirebase), 5000);
}

// ========================================
// UPDATE UI BASED ON AUTH STATE
// ========================================
async function updateUI(user) {
    const authForms = document.getElementById('authForms');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userUsername = document.getElementById('userUsername');
    const verifiedBadge = document.getElementById('verifiedBadge');
    const unverifiedBadge = document.getElementById('unverifiedBadge');
    const verificationNotice = document.getElementById('verificationNotice');
    const ownerBadge = document.getElementById('ownerBadge');

    if (user) {
        if (authForms) authForms.style.display = 'none';
        if (userInfo) userInfo.classList.add('show');

        // Get username from database
        const username = await window.getUsername(user.uid);

        if (userName) userName.textContent = user.displayName || 'Welcome!';
        if (userUsername) userUsername.textContent = '@' + username;

        // Check if owner
        const isUserOwner = await window.isOwner(user);
        if (ownerBadge) {
            ownerBadge.style.display = isUserOwner ? 'inline-flex' : 'none';
        }

        // Check email verification
        if (user.emailVerified) {
            if (verifiedBadge) verifiedBadge.style.display = 'inline-flex';
            if (unverifiedBadge) unverifiedBadge.style.display = 'none';
            if (verificationNotice) verificationNotice.classList.remove('show');
        } else {
            if (verifiedBadge) verifiedBadge.style.display = 'none';
            if (unverifiedBadge) unverifiedBadge.style.display = 'inline-flex';
            if (verificationNotice) verificationNotice.classList.add('show');
        }
    } else {
        if (authForms) authForms.style.display = 'block';
        if (userInfo) userInfo.classList.remove('show');
    }
}

// ========================================
// TAB SWITCHING
// ========================================
function initTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${targetTab}Form`) {
                    form.classList.add('active');
                }
            });
        });
    });
}

// ========================================
// FORM HANDLERS
// ========================================
function initForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Username validation - only allow letters, numbers, underscores
    const usernameInput = document.getElementById('signupUsername');
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        });

        // Check availability on blur
        usernameInput.addEventListener('blur', async (e) => {
            const username = e.target.value.trim();
            if (username.length >= 3) {
                const taken = await window.isUsernameTaken(username);
                const feedback = document.getElementById('usernameFeedback');
                if (feedback) {
                    if (taken) {
                        feedback.textContent = '❌ Username already taken';
                        feedback.style.color = 'var(--accent-error)';
                    } else {
                        feedback.textContent = '✓ Username available';
                        feedback.style.color = 'var(--accent-success)';
                    }
                }
            }
        });
    }
}

// ========================================
// LOGIN
// ========================================
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        showToast('Login successful!', 'success');

        // Check if owner
        const isUserOwner = await window.isOwner(user);
        if (isUserOwner) {
            showToast('Welcome back, Owner!', 'success');
        }

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'contact.html';
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ========================================
// SIGNUP WITH USERNAME
// ========================================
async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim().toLowerCase();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;

    // Validation
    if (!name || !username || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (username.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
        showToast('Username can only contain letters, numbers, and underscores', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    try {
        // Check if username is taken
        const usernameTaken = await window.isUsernameTaken(username);
        if (usernameTaken) {
            showToast('Username already taken. Please choose another.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            return;
        }

        // Create user
        const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update display name
        await user.updateProfile({
            displayName: name
        });

        // Save username to database
        await window.firebaseDatabase.ref('users/' + user.uid).set({
            username: username,
            name: name,
            createdAt: Date.now()
        });

        // Reserve username
        await window.firebaseDatabase.ref('usernames/' + username).set(user.uid);

        // Send verification email
        await user.sendEmailVerification();

        showToast('Account created! Please check your email to verify.', 'success');

        // Update UI
        await updateUI(user);

    } catch (error) {
        console.error('Signup error:', error);
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ========================================
// LOGOUT
// ========================================
async function logout() {
    try {
        await window.firebaseAuth.signOut();
        showToast('Logged out successfully', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// ========================================
// RESEND VERIFICATION EMAIL
// ========================================
async function resendVerification() {
    const user = window.firebaseAuth?.currentUser;

    if (user && !user.emailVerified) {
        try {
            await user.sendEmailVerification();
            showToast('Verification email sent! Check your inbox.', 'success');
        } catch (error) {
            if (error.code === 'auth/too-many-requests') {
                showToast('Please wait before requesting another email', 'error');
            } else {
                showToast('Error sending verification email', 'error');
            }
        }
    }
}

// ========================================
// PASSWORD RESET
// ========================================
async function resetPassword() {
    const emailInput = document.getElementById('loginEmail');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
        showToast('Please enter your email first', 'error');
        if (emailInput) emailInput.focus();
        return;
    }

    try {
        await window.firebaseAuth.sendPasswordResetEmail(email);
        showToast('Password reset email sent!', 'success');
    } catch (error) {
        showToast(getErrorMessage(error.code), 'error');
    }
}

// ========================================
// TOGGLE PASSWORD
// ========================================
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    const icon = toggle.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ========================================
// ERROR MESSAGES
// ========================================
function getErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered. Try logging in.',
        'auth/invalid-email': 'Please enter a valid email address',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.'
    };

    return messages[errorCode] || 'An error occurred. Please try again.';
}

// ========================================
// EXPORTS
// ========================================
window.logout = logout;
window.resendVerification = resendVerification;
window.resetPassword = resetPassword;
window.togglePassword = togglePassword;
