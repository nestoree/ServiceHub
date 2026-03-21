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
const LOGIN_PATH = "../login/index.html";

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
    activeDraftTarget: "lunes",
    draftedSlotsByTarget: {},
    finishedTargets: new Set(),
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
    availabilityEditorTargets: document.getElementById("availability-editor-targets"),
    availabilityEditorStatus: document.getElementById("availability-editor-status"),
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
renderEditorTargetSelector();
renderDraftedSlots();
renderScheduleSummary();
updateModeUi();
updateScheduleTypeUi();
renderProfileSnapshot();

onAuthStateChanged(auth, async (user) => {
    state.currentUser = user || null;

    if (!user) {
        redirectToLogin();
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
    state.activeDraftTarget = state.availabilityMode === "daily" ? "daily" : null;
    state.draftedSlotsByTarget = {};
    state.finishedTargets = new Set();
    renderAvailabilityModeButtons();
    renderTargetSelector();
    renderEditorTargetSelector();
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback("Has cambiado la recurrencia. Vuelve a definir los horarios de cada día.", "success");
});

dom.scheduleTypeSelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-schedule-type]");
    if (!button) {
        return;
    }

    state.scheduleType = button.dataset.scheduleType;
    state.draftedSlotsByTarget = {};
    state.finishedTargets = new Set();
    renderScheduleTypeButtons();
    updateScheduleTypeUi();
    renderEditorTargetSelector();
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback("Has cambiado el tipo de horario. Añade de nuevo los huecos para cada día.", "success");
});

dom.availabilityTargets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-target-key]");
    if (!button || button.disabled || state.availabilityMode === "daily") {
        return;
    }

    const key = button.dataset.targetKey;
    const wasSelected = state.selectedTargets.has(key);
    if (wasSelected) {
        state.selectedTargets.delete(key);
    } else {
        state.selectedTargets.add(key);
        state.activeDraftTarget = key;
    }

    syncDraftStateWithSelection();
    renderTargetSelector();
    renderEditorTargetSelector();
    renderDraftedSlots();
    renderScheduleSummary();
});

dom.availabilityEditorTargets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-editor-target-key]");
    if (!button) {
        return;
    }

    state.activeDraftTarget = button.dataset.editorTargetKey;
    renderEditorTargetSelector();
    renderDraftedSlots();
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

    const targetKey = String(removeButton.dataset.removeTarget || "").trim();
    const slotKey = String(removeButton.dataset.removeSlot || "").trim();
    const nextSlots = getDraftedSlotsForTarget(targetKey).filter((slot) => slot.key !== slotKey);

    if (nextSlots.length) {
        state.draftedSlotsByTarget[targetKey] = nextSlots;
    } else {
        delete state.draftedSlotsByTarget[targetKey];
    }

    state.finishedTargets.delete(targetKey);
    renderEditorTargetSelector();
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback(`Horario eliminado de ${resolveTargetLabel(targetKey)}. Pulsa Terminar de nuevo cuando acabes.`, "success");
});

dom.publishForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.currentUser) {
        redirectToLogin();
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

    const selectedTargets = getSelectedTargetObjects();
    const targetsWithoutSlots = selectedTargets.filter((target) => getDraftedSlotsForTarget(target.key).length === 0);
    if (targetsWithoutSlots.length) {
        showFeedback(`Añade al menos un horario en: ${targetsWithoutSlots.map((target) => target.label).join(", ")}.`, "error");
        return;
    }

    const unfinishedTargets = selectedTargets.filter((target) => !state.finishedTargets.has(target.key));
    if (unfinishedTargets.length) {
        showFeedback(`Pulsa Terminar en: ${unfinishedTargets.map((target) => target.label).join(", ")} antes de publicar.`, "error");
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

function renderEditorTargetSelector() {
    syncDraftStateWithSelection();

    const targets = getSelectedTargetObjects();
    if (!targets.length) {
        dom.availabilityEditorTargets.innerHTML = `<span class="summary-card">Selecciona primero un día o una fecha.</span>`;
        dom.availabilityEditorStatus.textContent = "Aún no hay ningún día activo para editar horarios.";
        return;
    }

    dom.availabilityEditorTargets.innerHTML = targets.map((target) => `
        <button
            type="button"
            class="target-button ${state.activeDraftTarget === target.key ? "is-active" : ""}"
            data-editor-target-key="${escapeHTML(target.key)}"
        >
            ${escapeHTML(target.label)}
        </button>
    `).join("");

    const activeTarget = getActiveDraftTargetObject();
    const draftedCount = activeTarget ? getDraftedSlotsForTarget(activeTarget.key).length : 0;
    const finished = activeTarget ? state.finishedTargets.has(activeTarget.key) : false;
    const draftedLabel = draftedCount === 1 ? "1 horario preparado" : `${draftedCount} horarios preparados`;

    dom.availabilityEditorStatus.textContent = activeTarget
        ? `${activeTarget.label}: ${draftedCount ? draftedLabel : "sin horarios todavía"} · ${finished ? "terminado" : "pendiente de pulsar Terminar"}.`
        : "Aún no hay ningún día activo para editar horarios.";
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
    const activeTarget = getActiveDraftTargetObject();
    if (!activeTarget) {
        showFeedback("Selecciona antes un día o una fecha para cargar sus horarios.", "error");
        return;
    }

    const targetKey = activeTarget.key;
    const targetSlots = getDraftedSlotsForTarget(targetKey);
    if (targetSlots.some((existingSlot) => existingSlot.key === slot.key)) {
        showFeedback("Ese horario ya estaba añadido.", "error");
        return;
    }

    state.draftedSlotsByTarget[targetKey] = [...targetSlots, slot];
    state.finishedTargets.delete(targetKey);
    renderEditorTargetSelector();
    renderDraftedSlots();
    renderScheduleSummary();
    showFeedback(`Horario añadido a ${activeTarget.label}. Puedes seguir sumando más o pulsar Terminar.`, "success");
}

function finishDrafting(message) {
    const activeTarget = getActiveDraftTargetObject();
    if (!activeTarget) {
        showFeedback("Selecciona antes un día o una fecha para terminar su horario.", "error");
        return;
    }

    if (!getDraftedSlotsForTarget(activeTarget.key).length) {
        showFeedback("Añade al menos un horario antes de pulsar Terminar.", "error");
        return;
    }

    state.finishedTargets.add(activeTarget.key);
    renderEditorTargetSelector();
    renderScheduleSummary();
    showFeedback(`${message} Día editado: ${activeTarget.label}.`, "success");
}

function renderDraftedSlots() {
    const activeTarget = getActiveDraftTargetObject();
    if (!activeTarget) {
        dom.draftedSlots.innerHTML = `<span class="summary-card">Selecciona primero un día o una fecha.</span>`;
        return;
    }

    const draftedSlots = getDraftedSlotsForTarget(activeTarget.key);
    if (!draftedSlots.length) {
        dom.draftedSlots.innerHTML = `<span class="summary-card">Todavía no has añadido horas ni tramos para ${escapeHTML(activeTarget.label)}.</span>`;
        return;
    }

    dom.draftedSlots.innerHTML = draftedSlots.map((slot) => `
        <div class="drafted-chip">
            <span>${escapeHTML(slot.label)}</span>
            <button
                type="button"
                data-remove-slot="${escapeHTML(slot.key)}"
                data-remove-target="${escapeHTML(activeTarget.key)}"
                aria-label="Eliminar ${escapeHTML(slot.label)} de ${escapeHTML(activeTarget.label)}"
            >
                ×
            </button>
        </div>
    `).join("");
}

function renderScheduleSummary() {
    const targets = getSelectedTargetObjects();
    if (!targets.length) {
        dom.scheduleSummary.innerHTML = `
            <span class="summary-card">Sin objetivos de disponibilidad</span>
            <span class="summary-card">Selecciona un día o una fecha para empezar</span>
        `;
        return;
    }

    const targetCards = targets.map((target) => {
        const draftedSlots = getDraftedSlotsForTarget(target.key);
        const slotSummary = draftedSlots.length
            ? draftedSlots.map((slot) => slot.label).join(", ")
            : "Sin horarios preparados";
        const finishedLabel = state.finishedTargets.has(target.key) ? "Terminado" : "Pendiente";

        return `<span class="summary-card">${escapeHTML(target.label)}: ${escapeHTML(slotSummary)} · ${finishedLabel}</span>`;
    }).join("");

    const pendingTargets = targets
        .filter((target) => !state.finishedTargets.has(target.key))
        .map((target) => target.label);

    dom.scheduleSummary.innerHTML = `
        ${targetCards}
        <span class="summary-card">${escapeHTML(pendingTargets.length ? `Pendientes de terminar: ${pendingTargets.join(", ")}` : "Todos los días están listos para publicar")}</span>
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

function syncDraftStateWithSelection() {
    const selectedTargets = getSelectedTargetObjects();
    const selectedKeys = new Set(selectedTargets.map((target) => target.key));

    Object.keys(state.draftedSlotsByTarget).forEach((key) => {
        if (!selectedKeys.has(key)) {
            delete state.draftedSlotsByTarget[key];
        }
    });

    state.finishedTargets = new Set(
        [...state.finishedTargets].filter((key) => selectedKeys.has(key))
    );

    if (state.activeDraftTarget && selectedKeys.has(state.activeDraftTarget)) {
        return;
    }

    state.activeDraftTarget = selectedTargets[0]?.key || null;
}

function getActiveDraftTargetObject() {
    syncDraftStateWithSelection();
    return getSelectedTargetObjects().find((target) => target.key === state.activeDraftTarget) || null;
}

function getDraftedSlotsForTarget(targetKey) {
    return Array.isArray(state.draftedSlotsByTarget[targetKey]) ? state.draftedSlotsByTarget[targetKey] : [];
}

function resolveTargetLabel(targetKey) {
    const normalizedKey = String(targetKey || "").trim();
    return getAvailableTargets().find((target) => target.key === normalizedKey)?.label || normalizedKey || "ese día";
}

function buildSchedule() {
    return {
        mode: state.availabilityMode,
        type: state.scheduleType,
        targets: getSelectedTargetObjects().map((target) => ({
            key: target.key,
            label: target.label,
            slots: getDraftedSlotsForTarget(target.key).map((slot) => ({ ...slot }))
        })).filter((target) => target.slots.length > 0)
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

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
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

function buildLoginUrl() {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

function redirectToLogin() {
    window.location.href = buildLoginUrl();
}
