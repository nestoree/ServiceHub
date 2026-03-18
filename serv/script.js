import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBbStIV1FTMfoGza12KoqstmBj_9sYpxo",
    authDomain: "slowcode-7596b.firebaseapp.com",
    databaseURL: "https://slowcode-7596b-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "slowcode-7596b",
    storageBucket: "slowcode-7596b.firebasestorage.app",
    messagingSenderId: "582717395006",
    appId: "1:582717395006:web:75e4e1f5afc1fcf62cc16f"
};

const WEEKDAY_TARGETS = [
    { key: "lunes", label: "Lunes" },
    { key: "martes", label: "Martes" },
    { key: "miercoles", label: "Miércoles" },
    { key: "jueves", label: "Jueves" },
    { key: "viernes", label: "Viernes" },
    { key: "sabado", label: "Sábado" },
    { key: "domingo", label: "Domingo" }
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const state = {
    currentUser: null,
    profile: {
        name: "",
        location: "",
        bio: "",
        photo: "../img/image.png",
        socials: {
            meta: "",
            twitter: "",
            other: ""
        },
        businessLocation: ""
    },
    mode: "domicilio",
    availabilityMode: "weekly",
    scheduleType: "specific",
    selectedTargets: new Set(["lunes"]),
    draftedSlots: [],
    timeBlockFinished: false,
    media: {
        serviceUrl: "",
        serviceFileData: "",
        serviceSource: "url"
    }
};

const dom = {
    authStatus: document.getElementById("auth-status"),
    publishForm: document.getElementById("publish-form"),
    title: document.getElementById("service-title"),
    category: document.getElementById("service-category"),
    price: document.getElementById("service-price"),
    businessLocation: document.getElementById("business-location"),
    description: document.getElementById("service-description"),
    modeSelector: document.getElementById("mode-selector"),
    serviceMode: document.getElementById("service-mode"),
    localAddressGroup: document.getElementById("local-address-group"),
    localAddress: document.getElementById("local-address"),
    ownerNameDisplay: document.getElementById("owner-name-display"),
    ownerLocationDisplay: document.getElementById("owner-location-display"),
    ownerBioDisplay: document.getElementById("owner-bio-display"),
    ownerSocialsDisplay: document.getElementById("owner-socials-display"),
    serviceImageUrl: document.getElementById("service-image-url"),
    serviceImageFile: document.getElementById("service-image-file"),
    serviceImagePreview: document.getElementById("service-image-preview"),
    ownerPhotoPreview: document.getElementById("owner-photo-preview"),
    availabilityModeSelector: document.getElementById("availability-mode-selector"),
    availabilityTargets: document.getElementById("availability-targets"),
    scheduleTypeSelector: document.getElementById("schedule-type-selector"),
    specificTimePanel: document.getElementById("specific-time-panel"),
    specificTimeInput: document.getElementById("specific-time-input"),
    addSpecificTime: document.getElementById("add-specific-time"),
    finishSpecificTime: document.getElementById("finish-specific-time"),
    rangeTimePanel: document.getElementById("range-time-panel"),
    rangeStartInput: document.getElementById("range-start-input"),
    rangeEndInput: document.getElementById("range-end-input"),
    addRangeTime: document.getElementById("add-range-time"),
    finishRangeTime: document.getElementById("finish-range-time"),
    draftedSlots: document.getElementById("drafted-slots"),
    scheduleSummary: document.getElementById("schedule-summary"),
    formFeedback: document.getElementById("form-feedback"),
    submitButton: document.getElementById("btn-post")
};

renderTargetSelector();
renderDraftedSlots();
renderScheduleSummary();
updateModeUi();
updateScheduleTypeUi();
renderProfileSnapshot();

onAuthStateChanged(auth, async (user) => {
    state.currentUser = user || null;

    if (!user) {
        dom.authStatus.textContent = "Necesitas iniciar sesión en la portada para publicar";
        dom.submitButton.disabled = true;
        dom.submitButton.textContent = "Inicia sesión para publicar";
        return;
    }

    dom.authStatus.textContent = `Sesión activa: ${formatName(user.displayName || user.email || "Usuario")}`;
    dom.submitButton.disabled = false;
    dom.submitButton.textContent = "Publicar anuncio";
    await preloadAdvertiserProfile(user);
});

dom.modeSelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) {
        return;
    }

    state.mode = button.dataset.mode;
    updateModeUi();
});

dom.availabilityModeSelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-availability-mode]");
    if (!button) {
        return;
    }

    state.availabilityMode = button.dataset.availabilityMode;
    state.selectedTargets = state.availabilityMode === "daily" ? new Set(["daily"]) : new Set();
    renderAvailabilityModeButtons();
    renderTargetSelector();
    renderScheduleSummary();
});

dom.scheduleTypeSelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-schedule-type]");
    if (!button) {
        return;
    }

    state.scheduleType = button.dataset.scheduleType;
    state.draftedSlots = [];
    state.timeBlockFinished = false;
    renderScheduleTypeButtons();
    updateScheduleTypeUi();
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback("Has cambiado el tipo de horario. Añade de nuevo los huecos de tiempo.", "success");
});

dom.availabilityTargets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-target-key]");
    if (!button || button.disabled || state.availabilityMode === "daily") {
        return;
    }

    const key = button.dataset.targetKey;
    if (state.selectedTargets.has(key)) {
        state.selectedTargets.delete(key);
    } else {
        state.selectedTargets.add(key);
    }

    renderTargetSelector();
    renderScheduleSummary();
});

dom.serviceImageUrl.addEventListener("input", () => {
    state.media.serviceUrl = dom.serviceImageUrl.value.trim();
    state.media.serviceSource = state.media.serviceUrl ? "url" : (state.media.serviceFileData ? "file" : "url");
    updateServiceImagePreview();
});

dom.serviceImageFile.addEventListener("change", async () => {
    const file = dom.serviceImageFile.files?.[0];
    if (!file) {
        return;
    }

    state.media.serviceFileData = await readFileAsDataUrl(file);
    state.media.serviceSource = "file";
    updateServiceImagePreview();
});

dom.specificTimeInput.addEventListener("input", () => {
    dom.specificTimeInput.value = sanitizeTimeTyping(dom.specificTimeInput.value);
});

dom.rangeStartInput.addEventListener("input", () => {
    dom.rangeStartInput.value = sanitizeTimeTyping(dom.rangeStartInput.value);
});

dom.rangeEndInput.addEventListener("input", () => {
    dom.rangeEndInput.value = sanitizeTimeTyping(dom.rangeEndInput.value);
});

[dom.rangeStartInput, dom.rangeEndInput].forEach((input) => {
    input.addEventListener("dblclick", () => {
        input.readOnly = false;
        input.focus();
        input.select();
    });

    input.addEventListener("blur", () => {
        input.readOnly = true;
    });
});

dom.addSpecificTime.addEventListener("click", () => {
    const time = normalize24Hour(dom.specificTimeInput.value);
    if (!time) {
        showFeedback("La hora debe escribirse en formato 24h valido, por ejemplo 18:30.", "error");
        return;
    }

    addDraftedSlot({ key: `specific-${time}`, label: `${time}h`, type: "specific", value: time });
    dom.specificTimeInput.value = "";
});

dom.finishSpecificTime.addEventListener("click", () => {
    finishDrafting("Has terminado de definir tus horas concretas.");
});

dom.addRangeTime.addEventListener("click", () => {
    const start = normalize24Hour(dom.rangeStartInput.value);
    const end = normalize24Hour(dom.rangeEndInput.value);

    if (!start || !end) {
        showFeedback("Los tramos fijos deben escribirse como 09:15 o 20:45.", "error");
        return;
    }

    if (start >= end) {
        showFeedback("La hora final del tramo debe ser posterior a la inicial.", "error");
        return;
    }

    addDraftedSlot({ key: `range-${start}-${end}`, label: `${start} - ${end}`, type: "range", start, end });
    dom.rangeStartInput.value = "";
    dom.rangeEndInput.value = "";
    dom.rangeStartInput.readOnly = true;
    dom.rangeEndInput.readOnly = true;
});

dom.finishRangeTime.addEventListener("click", () => {
    finishDrafting("Has terminado de definir tus tramos fijos.");
});

dom.draftedSlots.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-slot]");
    if (!removeButton) {
        return;
    }

    state.draftedSlots = state.draftedSlots.filter((slot) => slot.key !== removeButton.dataset.removeSlot);
    state.timeBlockFinished = false;
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback("Horario eliminado. Pulsa Terminar de nuevo cuando acabes.", "success");
});

dom.publishForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.currentUser) {
        showFeedback("Necesitas iniciar sesión desde la portada antes de publicar.", "error");
        return;
    }

    const title = dom.title.value.trim();
    const description = dom.description.value.trim();
    const priceValue = Number(dom.price.value.trim());
    const ownerName = state.profile.name;
    const ownerLocation = state.profile.location;
    const ownerBio = state.profile.bio;
    const ownerPhoto = state.profile.photo || "../img/image.png";
    const ownerSocials = { ...state.profile.socials };
    const businessLocation = dom.businessLocation.value.trim();
    const localAddress = dom.localAddress.value.trim();

    if (!title) {
        showFeedback("Escribe el rótulo principal del anuncio.", "error");
        return;
    }

    if (!description) {
        showFeedback("Añade una descripción clara del servicio.", "error");
        return;
    }

    if (!Number.isFinite(priceValue) || priceValue < 0) {
        showFeedback("Introduce un precio medio válido igual o superior a 0.", "error");
        return;
    }

    if (!ownerName) {
        showFeedback("Tu nombre del anunciante debe existir en la base de datos. Complétalo en Mi perfil.", "error");
        return;
    }

    if (!ownerBio) {
        showFeedback("Tu descripción de anunciante debe existir en la base de datos. Complétala en Mi perfil.", "error");
        return;
    }

    if (state.mode === "local" && !localAddress) {
        showFeedback("Si el servicio es en local debes indicar la dirección exacta.", "error");
        return;
    }

    if (state.availabilityMode !== "daily" && state.selectedTargets.size === 0) {
        showFeedback("Selecciona al menos un día o número del mes para la disponibilidad.", "error");
        return;
    }

    if (!state.draftedSlots.length) {
        showFeedback("Añade al menos una hora concreta o un tramo fijo.", "error");
        return;
    }

    if (!state.timeBlockFinished) {
        showFeedback("Pulsa Terminar en el bloque horario antes de publicar.", "error");
        return;
    }

    const serviceImage = getFinalServiceImage();
    const schedule = buildSchedule();

    try {
        await updateProfile(state.currentUser, {
            displayName: ownerName,
            photoURL: ownerPhoto
        });

        await update(ref(db, `users/${state.currentUser.uid}`), {
            businessLocation
        });

        await push(ref(db, "services"), {
            title,
            description,
            category: dom.category.value,
            price: priceValue,
            mode: state.mode,
            businessLocation,
            address: state.mode === "local" ? localAddress : "",
            ownerName,
            ownerPhoto,
            ownerBio,
            ownerLocation,
            ownerSocials,
            coverImage: serviceImage,
            schedule,
            reviews: [],
            uid: state.currentUser.uid,
            timestamp: Date.now()
        });

        showFeedback("Anuncio publicado con éxito. Volviendo al inicio...", "success");
        window.setTimeout(() => {
            window.location.href = "../index.html";
        }, 950);
    } catch (error) {
        showFeedback(getFriendlyError(error), "error");
    }
});

async function preloadAdvertiserProfile(user) {
    try {
        const snapshot = await get(ref(db, `users/${user.uid}`));
        const profile = snapshot.exists() ? snapshot.val() : {};
        state.profile = {
            name: String(profile.name || user.displayName || "").trim(),
            location: String(profile.location || "").trim(),
            bio: String(profile.description || profile.bio || "").trim(),
            photo: String(profile.photo || user.photoURL || "../img/image.png").trim() || "../img/image.png",
            socials: {
                meta: String(profile.socials?.meta || "").trim(),
                twitter: String(profile.socials?.twitter || "").trim(),
                other: String(profile.socials?.other || "").trim()
            },
            businessLocation: String(profile.businessLocation || "").trim()
        };
    } catch (error) {
        console.error("No se pudo precargar el perfil del anunciante:", error);
        state.profile = {
            name: String(user.displayName || "").trim(),
            location: "",
            bio: "",
            photo: String(user.photoURL || "../img/image.png").trim() || "../img/image.png",
            socials: {
                meta: "",
                twitter: "",
                other: ""
            },
            businessLocation: ""
        };
    }

    if (!dom.businessLocation.value && state.profile.businessLocation) {
        dom.businessLocation.value = state.profile.businessLocation;
    }

    renderProfileSnapshot();

    if (!state.profile.name || !state.profile.bio) {
        showFeedback("Completa tu perfil en Mi perfil antes de publicar para que el anuncio tome esos datos desde la base de datos.", "error");
    }
}

function updateModeUi() {
    dom.serviceMode.value = state.mode;
    dom.localAddressGroup.classList.toggle("hidden", state.mode !== "local");

    dom.modeSelector.querySelectorAll("[data-mode]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.mode === state.mode);
    });
}

function renderAvailabilityModeButtons() {
    dom.availabilityModeSelector.querySelectorAll("[data-availability-mode]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.availabilityMode === state.availabilityMode);
    });
}

function renderScheduleTypeButtons() {
    dom.scheduleTypeSelector.querySelectorAll("[data-schedule-type]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.scheduleType === state.scheduleType);
    });
}

function updateScheduleTypeUi() {
    dom.specificTimePanel.classList.toggle("hidden", state.scheduleType !== "specific");
    dom.rangeTimePanel.classList.toggle("hidden", state.scheduleType !== "range");
}

function renderTargetSelector() {
    const targets = getAvailableTargets();

    if (state.availabilityMode === "daily") {
        dom.availabilityTargets.innerHTML = `<button type="button" class="target-button is-active" disabled>Cada día</button>`;
        return;
    }

    dom.availabilityTargets.innerHTML = targets.map((target) => `
        <button
            type="button"
            class="target-button ${state.selectedTargets.has(target.key) ? "is-active" : ""}"
            data-target-key="${target.key}"
        >
            ${target.label}
        </button>
    `).join("");
}

function getAvailableTargets() {
    if (state.availabilityMode === "monthly") {
        return Array.from({ length: 31 }, (_, index) => {
            const day = String(index + 1);
            return { key: day, label: `Día ${day}` };
        });
    }

    if (state.availabilityMode === "daily") {
        return [{ key: "daily", label: "Cada día" }];
    }

    return WEEKDAY_TARGETS;
}

function addDraftedSlot(slot) {
    if (state.draftedSlots.some((existingSlot) => existingSlot.key === slot.key)) {
        showFeedback("Ese horario ya estaba añadido.", "error");
        return;
    }

    state.draftedSlots.push(slot);
    state.timeBlockFinished = false;
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback("Horario añadido. Puedes seguir sumando más o pulsar Terminar.", "success");
}

function finishDrafting(message) {
    if (!state.draftedSlots.length) {
        showFeedback("Añade al menos un horario antes de pulsar Terminar.", "error");
        return;
    }

    state.timeBlockFinished = true;
    renderScheduleSummary();
    showFeedback(message, "success");
}

function renderDraftedSlots() {
    if (!state.draftedSlots.length) {
        dom.draftedSlots.innerHTML = `<span class="summary-card">Todavía no has añadido horas ni tramos.</span>`;
        return;
    }

    dom.draftedSlots.innerHTML = state.draftedSlots.map((slot) => `
        <div class="drafted-chip">
            <span>${slot.label}</span>
            <button type="button" data-remove-slot="${slot.key}" aria-label="Eliminar ${slot.label}">×</button>
        </div>
    `).join("");
}

function renderScheduleSummary() {
    const targets = getSelectedTargetObjects();
    const targetSummary = targets.length ? targets.map((target) => target.label).join(", ") : "Sin objetivos de disponibilidad";
    const slotSummary = state.draftedSlots.length ? state.draftedSlots.map((slot) => slot.label).join(", ") : "Sin horarios preparados";

    dom.scheduleSummary.innerHTML = `
        <span class="summary-card">${targetSummary}</span>
        <span class="summary-card">${slotSummary}</span>
        <span class="summary-card">${state.timeBlockFinished ? "Horario terminado" : "Pendiente de pulsar Terminar"}</span>
    `;
}

function getSelectedTargetObjects() {
    if (state.availabilityMode === "daily") {
        return [{ key: "daily", label: "Cada día" }];
    }

    const targets = getAvailableTargets().filter((target) => state.selectedTargets.has(target.key));

    if (state.availabilityMode === "monthly") {
        return targets.sort((left, right) => Number(left.key) - Number(right.key));
    }

    return targets.sort((left, right) => WEEKDAY_TARGETS.findIndex((target) => target.key === left.key) - WEEKDAY_TARGETS.findIndex((target) => target.key === right.key));
}

function buildSchedule() {
    return {
        mode: state.availabilityMode,
        type: state.scheduleType,
        targets: getSelectedTargetObjects().map((target) => ({
            key: target.key,
            label: target.label,
            slots: state.draftedSlots.map((slot) => ({ ...slot }))
        }))
    };
}

function getFinalServiceImage() {
    if (state.media.serviceSource === "file" && state.media.serviceFileData) {
        return state.media.serviceFileData;
    }

    return state.media.serviceUrl || "../img/serv.png";
}

function updateServiceImagePreview() {
    const finalImage = getFinalServiceImage().replace(/^\.\.\//, "../");
    dom.serviceImagePreview.src = finalImage;
    dom.serviceImagePreview.onerror = () => {
        dom.serviceImagePreview.src = "../img/serv.png";
    };
}

function renderProfileSnapshot() {
    dom.ownerNameDisplay.textContent = state.profile.name || "Pendiente en tu perfil";
    dom.ownerLocationDisplay.textContent = state.profile.location || "Añade tu ubicación desde Mi perfil.";
    dom.ownerBioDisplay.textContent = state.profile.bio || "Añade tu descripción desde Mi perfil para usarla en los anuncios.";

    const socialLines = [];
    if (state.profile.socials.meta) {
        socialLines.push(`Meta: ${state.profile.socials.meta}`);
    }
    if (state.profile.socials.twitter) {
        socialLines.push(`Twitter/X: ${state.profile.socials.twitter}`);
    }
    if (state.profile.socials.other) {
        socialLines.push(`Otra: ${state.profile.socials.other}`);
    }
    dom.ownerSocialsDisplay.textContent = socialLines.length
        ? socialLines.join(" · ")
        : "Sin redes guardadas en tu perfil.";

    dom.ownerPhotoPreview.src = state.profile.photo || "../img/image.png";
    dom.ownerPhotoPreview.onerror = () => {
        dom.ownerPhotoPreview.src = "../img/image.png";
    };
}

function sanitizeTimeTyping(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
        return digits;
    }

    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalize24Hour(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
        return "";
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
        return "";
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
        reader.readAsDataURL(file);
    });
}

function showFeedback(message, tone = "info") {
    dom.formFeedback.textContent = message;
    dom.formFeedback.dataset.tone = tone;
    dom.formFeedback.classList.remove("hidden");
}

function getFriendlyError(error) {
    const code = error?.code || "";

    if (code.includes("permission-denied")) {
        return "Firebase ha bloqueado esta operación. Revisa las reglas de Realtime Database y usa el archivo rules.txt.";
    }

    return error?.message || "No hemos podido completar la operación.";
}

function formatName(name) {
    const parts = String(name || "Usuario").trim().split(/\s+/);
    if (parts.length <= 1) {
        return parts[0];
    }

    return `${parts[0]} ${parts[1][0]}.`;
}
