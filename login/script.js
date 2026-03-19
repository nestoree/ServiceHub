import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBbStIV1FTMfoGza12KoqstmBj_9sYpxo",
    authDomain: "slowcode-7596b.firebaseapp.com",
    databaseURL: "https://slowcode-7596b-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "slowcode-7596b",
    storageBucket: "slowcode-7596b.firebasestorage.app",
    messagingSenderId: "582717395006",
    appId: "1:582717395006:web:75e4e1f5afc1fcf62cc16f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const FALLBACK_AFTER_AUTH = "../index.html";

const state = {
    mode: "login",
    isSubmitting: false,
    allowAutoRedirect: true
};

const dom = {
    switchLogin: document.getElementById("switch-login"),
    switchRegister: document.getElementById("switch-register"),
    authModeLabel: document.getElementById("auth-mode-label"),
    authTitle: document.getElementById("auth-title"),
    authCopy: document.getElementById("auth-copy"),
    authForm: document.getElementById("auth-form"),
    registerNameGrid: document.getElementById("register-name-grid"),
    firstName: document.getElementById("auth-first-name"),
    lastName: document.getElementById("auth-last-name"),
    email: document.getElementById("auth-email"),
    password: document.getElementById("auth-password"),
    confirmPasswordGroup: document.getElementById("confirm-password-group"),
    confirmPassword: document.getElementById("auth-password-confirm"),
    feedback: document.getElementById("auth-feedback"),
    submit: document.getElementById("auth-submit")
};

attachEventListeners();
renderMode();

onAuthStateChanged(auth, (user) => {
    if (user && state.allowAutoRedirect) {
        window.location.href = getSafeNextUrl();
    }
});

function attachEventListeners() {
    dom.switchLogin.addEventListener("click", () => setMode("login"));
    dom.switchRegister.addEventListener("click", () => setMode("register"));
    dom.authForm.addEventListener("submit", handleSubmit);
}

function setMode(mode) {
    state.mode = mode;
    clearFeedback();
    renderMode();
}

function renderMode() {
    const isRegister = state.mode === "register";

    dom.switchLogin.disabled = state.isSubmitting;
    dom.switchRegister.disabled = state.isSubmitting;
    dom.submit.disabled = state.isSubmitting;
    dom.switchLogin.classList.toggle("is-active", !isRegister);
    dom.switchRegister.classList.toggle("is-active", isRegister);
    dom.registerNameGrid.classList.toggle("hidden", !isRegister);
    dom.confirmPasswordGroup.classList.toggle("hidden", !isRegister);
    dom.password.autocomplete = isRegister ? "new-password" : "current-password";
    dom.confirmPassword.autocomplete = isRegister ? "new-password" : "off";

    if (isRegister) {
        dom.authModeLabel.textContent = "Crear cuenta";
        dom.authTitle.textContent = "Abre tu cuenta y entra en ServiceHub";
        dom.authCopy.textContent = "Necesitaremos tu nombre, primer apellido, correo y una confirmación de contraseña para verificar que todo se escribió bien.";
        dom.submit.textContent = state.isSubmitting ? "Creando cuenta..." : "Crear cuenta y entrar";
        return;
    }

    dom.authModeLabel.textContent = "Acceso";
    dom.authTitle.textContent = "Vuelve a entrar en ServiceHub";
    dom.authCopy.textContent = "Usa tu correo y contraseña para abrir la plataforma y continuar donde lo dejaste.";
    dom.submit.textContent = state.isSubmitting ? "Entrando..." : "Iniciar sesión";
}

async function handleSubmit(event) {
    event.preventDefault();

    if (state.isSubmitting) {
        return;
    }

    const email = dom.email.value.trim();
    const password = dom.password.value.trim();

    if (!email || !password) {
        showFeedback("Escribe tu correo y tu contraseña para continuar.", "error");
        return;
    }

    state.isSubmitting = true;
    state.allowAutoRedirect = false;
    renderMode();
    clearFeedback();

    try {
        if (state.mode === "register") {
            await registerUser(email, password);
            showFeedback("Cuenta creada correctamente. Entrando en la plataforma...", "success");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showFeedback("Sesión iniciada correctamente. Redirigiendo...", "success");
        }

        window.setTimeout(() => {
            window.location.href = getSafeNextUrl();
        }, 450);
    } catch (error) {
        state.allowAutoRedirect = true;
        showFeedback(getFriendlyError(error), "error");
    } finally {
        state.isSubmitting = false;
        renderMode();
    }
}

async function registerUser(email, password) {
    const firstName = normalizePersonPart(dom.firstName.value);
    const lastName = normalizePersonPart(dom.lastName.value);
    const confirmPassword = dom.confirmPassword.value.trim();

    if (!firstName) {
        throw new Error("Añade tu nombre para crear la cuenta.");
    }

    if (!lastName) {
        throw new Error("Añade tu primer apellido para crear la cuenta.");
    }

    if (password !== confirmPassword) {
        throw new Error("La confirmación de contraseña no coincide.");
    }

    const fullName = `${firstName} ${lastName}`;
    const credentials = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credentials.user, {
        displayName: fullName,
        photoURL: ""
    });

    await update(ref(db, `users/${credentials.user.uid}`), {
        name: fullName,
        firstName,
        lastName,
        photo: "",
        location: "",
        description: "",
        businessLocation: "",
        socials: {
            meta: "",
            twitter: "",
            other: ""
        }
    });
}

function showFeedback(message, tone = "info") {
    dom.feedback.textContent = message;
    dom.feedback.dataset.tone = tone;
    dom.feedback.classList.remove("hidden");
}

function clearFeedback() {
    dom.feedback.textContent = "";
    dom.feedback.dataset.tone = "info";
    dom.feedback.classList.add("hidden");
}

function getSafeNextUrl() {
    const raw = String(new URLSearchParams(window.location.search).get("next") || "").trim();

    if (!raw) {
        return FALLBACK_AFTER_AUTH;
    }

    const normalized = raw.toLowerCase();
    if (/^(?:[a-z]+:)?\/\//i.test(raw) || normalized.startsWith("javascript:") || normalized.includes("/login/")) {
        return FALLBACK_AFTER_AUTH;
    }

    return raw;
}

function normalizePersonPart(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function getFriendlyError(error) {
    const code = error?.code || "";
    const message = String(error?.message || "");

    if (message && !code) {
        return message;
    }

    if (code.includes("email-already-in-use")) {
        return "Ese correo ya está en uso. Prueba iniciando sesión.";
    }

    if (code.includes("invalid-email")) {
        return "El correo no tiene un formato válido.";
    }

    if (code.includes("weak-password")) {
        return "La contraseña es demasiado corta. Usa al menos 6 caracteres.";
    }

    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        return "No hemos podido acceder con esos datos.";
    }

    if (code.includes("network-request-failed")) {
        return "No se ha podido conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.";
    }

    return error?.message || "Ha ocurrido un problema inesperado.";
}
