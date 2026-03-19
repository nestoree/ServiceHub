import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBbStIV1FTMfoGza12KoqstmBj_9sYpxo",
    authDomain: "slowcode-7596b.firebaseapp.com",
    databaseURL: "https://slowcode-7596b-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "slowcode-7596b",
    storageBucket: "slowcode-7596b.firebasestorage.app",
    messagingSenderId: "582717395006",
    appId: "1:582717395006:web:75e4e1f5afc1fcf62cc16f"
};

const CATEGORY_OPTIONS = ["Todas", "Limpieza", "Deportes", "Cocina", "Cuidados", "Compras", "Excursiones"];
const WEEKDAY_ORDER = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const WEEKDAY_LABELS = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
    daily: "Cada día"
};

const IMG_DEFAULT_AVATAR = "img/image.png";
const IMG_DEFAULT_SERVICE = "img/serv.png";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const state = {
    currentUser: null,
    rawServices: {},
    rawUsers: {},
    services: [],
    bookings: new Set(),
    filters: {
        query: "",
        category: "Todas",
        view: "grid"
    },
    detail: {
        serviceId: null,
        targetKey: null,
        slotKey: null,
        reviewStars: "all",
        reviewSort: "recent"
    }
};

const dom = {
    homeScreen: document.getElementById("home-screen"),
    detailScreen: document.getElementById("detail-screen"),
    publishCta: document.getElementById("publish-cta"),
    heroPublish: document.getElementById("hero-publish"),
    heroExplore: document.getElementById("hero-explore"),
    accountTrigger: document.getElementById("account-trigger"),
    accountWrap: document.querySelector(".account-wrap"),
    accountMenu: document.getElementById("account-menu"),
    logoutAction: document.getElementById("logout-action"),
    authSubmit: document.getElementById("auth-submit"),
    fullName: document.getElementById("full-name"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    searchInput: document.getElementById("search-input"),
    categoryFilters: document.getElementById("category-filters"),
    categorySummary: document.getElementById("category-summary"),
    viewButtons: document.querySelectorAll(".view-button"),
    serviceFeed: document.getElementById("service-feed"),
    emptyState: document.getElementById("empty-state"),
    resultsCopy: document.getElementById("results-copy"),
    serviceCount: document.getElementById("service-count"),
    categoryCount: document.getElementById("category-count"),
    spotlightList: document.getElementById("spotlight-list"),
    detailBack: document.getElementById("detail-back"),
    detailBannerImage: document.getElementById("detail-banner-image"),
    detailCategoryPill: document.getElementById("detail-category-pill"),
    detailModePill: document.getElementById("detail-mode-pill"),
    detailTitle: document.getElementById("detail-title"),
    detailSubtitle: document.getElementById("detail-subtitle"),
    detailOwnerPhoto: document.getElementById("detail-owner-photo"),
    detailOwnerName: document.getElementById("detail-owner-name"),
    detailOwnerStars: document.getElementById("detail-owner-stars"),
    detailOwnerLocation: document.getElementById("detail-owner-location"),
    detailOwnerBio: document.getElementById("detail-owner-bio"),
    detailSocialLinks: document.getElementById("detail-social-links"),
    detailChatButton: document.getElementById("detail-chat-button"),
    detailAvailabilityHeading: document.getElementById("detail-availability-heading"),
    detailAvailabilityCopy: document.getElementById("detail-availability-copy"),
    detailTargetButtons: document.getElementById("detail-target-buttons"),
    detailSlotButtons: document.getElementById("detail-slot-buttons"),
    detailBookingPanel: document.getElementById("detail-booking-panel"),
    detailBookingSummary: document.getElementById("detail-booking-summary"),
    detailLocalInfo: document.getElementById("detail-local-info"),
    detailDomicileForm: document.getElementById("detail-domicile-form"),
    bookingCustomerName: document.getElementById("booking-customer-name"),
    bookingCustomerPhone: document.getElementById("booking-customer-phone"),
    bookingCustomerAddress: document.getElementById("booking-customer-address"),
    bookingCustomerNotes: document.getElementById("booking-customer-notes"),
    detailBookButton: document.getElementById("detail-book-button"),
    detailDescription: document.getElementById("detail-description"),
    detailSpecGrid: document.getElementById("detail-spec-grid"),
    detailReviewSummary: document.getElementById("detail-review-summary"),
    reviewStarFilters: document.getElementById("review-star-filters"),
    reviewSort: document.getElementById("review-sort"),
    reviewList: document.getElementById("review-list"),
    toast: document.getElementById("toast")
};

let toastTimer = null;

attachEventListeners();
subscribeToUsers();
subscribeToServices();
subscribeToBookings();

onAuthStateChanged(auth, async (user) => {
    state.currentUser = user || null;
    updateAccountUi();

    if (state.detail.serviceId) {
        renderDetailScreen();
    }

    if (!user) {
        return;
    }

    try {
        await update(ref(db, `users/${user.uid}`), {
            name: user.displayName || user.email || "Usuario",
            photo: user.photoURL || ""
        });
    } catch (error) {
        console.error("No se pudo sincronizar el usuario:", error);
    }
});

function attachEventListeners() {
    dom.publishCta.addEventListener("click", handlePublishIntent);
    dom.heroPublish.addEventListener("click", handlePublishIntent);
    dom.heroExplore.addEventListener("click", () => {
        dom.homeScreen.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.querySelectorAll("[data-go-home]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            showHomeScreen();
        });
    });

    dom.detailBack.addEventListener("click", showHomeScreen);

    dom.accountTrigger.addEventListener("click", () => {
        if (state.currentUser) {
            toggleAccountMenu();
        } else {
            openModal("auth-modal");
        }
    });

    dom.logoutAction.addEventListener("click", async () => {
        try {
            await signOut(auth);
            toggleAccountMenu(false);
            showToast("Sesión cerrada. Puedes seguir explorando anuncios.");
        } catch (error) {
            showToast(getFriendlyError(error));
        }
    });

    dom.authSubmit.addEventListener("click", handleAuthSubmit);

    dom.searchInput.addEventListener("input", (event) => {
        state.filters.query = event.target.value.trim();
        renderHomeScreen();
    });

    dom.categoryFilters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) {
            return;
        }

        state.filters.category = button.dataset.category;
        renderHomeScreen();
    });

    dom.viewButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.filters.view = button.dataset.view;
            renderHomeScreen();
        });
    });

    dom.serviceFeed.addEventListener("click", (event) => {
        const card = event.target.closest("[data-open-service]");
        if (!card) {
            return;
        }

        openDetailScreen(card.dataset.openService);
    });

    dom.detailTargetButtons.addEventListener("click", (event) => {
        const button = event.target.closest("[data-target-key]");
        if (!button || button.disabled) {
            return;
        }

        state.detail.targetKey = button.dataset.targetKey;
        state.detail.slotKey = null;
        renderDetailScreen();
    });

    dom.detailSlotButtons.addEventListener("click", (event) => {
        const button = event.target.closest("[data-slot-key]");
        if (!button || button.disabled) {
            return;
        }

        state.detail.slotKey = button.dataset.slotKey;
        renderDetailScreen();
    });

    dom.detailBookButton.addEventListener("click", confirmBooking);
    dom.detailChatButton.addEventListener("click", handleStartChat);

    dom.reviewStarFilters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-review-stars]");
        if (!button) {
            return;
        }

        state.detail.reviewStars = button.dataset.reviewStars;
        renderDetailScreen();
    });

    dom.reviewSort.addEventListener("change", () => {
        state.detail.reviewSort = dom.reviewSort.value;
        renderDetailScreen();
    });

    document.querySelectorAll("[data-close]").forEach((button) => {
        button.addEventListener("click", () => closeModal(button.dataset.close));
    });

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    document.addEventListener("click", (event) => {
        if (!dom.accountWrap.contains(event.target)) {
            toggleAccountMenu(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal("auth-modal");
            toggleAccountMenu(false);
        }
    });
}

function subscribeToUsers() {
    onValue(ref(db, "users"), (snapshot) => {
        state.rawUsers = snapshot.val() || {};
        rebuildServices();
    });
}

function subscribeToServices() {
    onValue(ref(db, "services"), (snapshot) => {
        state.rawServices = snapshot.val() || {};
        rebuildServices();
    }, () => {
        showToast("No se han podido cargar los anuncios ahora mismo.");
    });
}

function subscribeToBookings() {
    onValue(ref(db, "bookingLocks"), (snapshot) => {
        const rawBookings = snapshot.val() || {};
        const nextBookings = new Set();

        Object.values(rawBookings).forEach((booking) => {
            const serviceId = String(booking.serviceId || "").trim();
            const targetKey = String(booking.targetKey || booking.availabilityTargetKey || "").trim();
            const slotKey = String(booking.slotKey || booking.timeKey || "").trim();

            if (serviceId && targetKey && slotKey) {
                nextBookings.add(buildBookingKey(serviceId, targetKey, slotKey));
            }
        });

        state.bookings = nextBookings;
        renderHomeScreen();

        if (state.detail.serviceId) {
            renderDetailScreen();
        }
    });
}

async function handleAuthSubmit() {
    const fullName = dom.fullName.value.trim();
    const email = dom.email.value.trim();
    const password = dom.password.value.trim();

    if (!email || !password) {
        showToast("Escribe tu correo y tu contraseña para continuar.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeModal("auth-modal");
        showToast("Has iniciado sesión correctamente.");
        return;
    } catch (error) {
        if (!fullName) {
            showToast("Si quieres crear una cuenta nueva, añade también tu nombre.");
            return;
        }
    }

    try {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credentials.user, { displayName: fullName });
        await update(ref(db, `users/${credentials.user.uid}`), {
            name: fullName,
            photo: ""
        });
        closeModal("auth-modal");
        showToast("Cuenta creada. Ya puedes publicar tu anuncio.");
    } catch (error) {
        showToast(getFriendlyError(error));
    }
}

function handlePublishIntent() {
    if (!state.currentUser) {
        openModal("auth-modal");
        showToast("Necesitas acceso para publicar anuncios.");
        return;
    }

    window.location.href = "serv/index.html";
}

function updateAccountUi() {
    if (!state.currentUser) {
        dom.accountTrigger.textContent = "Entrar";
        toggleAccountMenu(false);
        return;
    }

    dom.accountTrigger.textContent = formatName(state.currentUser.displayName || state.currentUser.email || "Mi cuenta");
}

function rebuildServices() {
    state.services = Object.entries(state.rawServices).map(([id, rawService]) => {
        const userProfile = rawService.uid ? state.rawUsers[rawService.uid] || {} : {};
        return normalizeService(id, rawService, userProfile);
    }).sort((left, right) => right.timestamp - left.timestamp);

    if (state.detail.serviceId && !state.services.some((service) => service.id === state.detail.serviceId)) {
        showHomeScreen();
        return;
    }

    renderHomeScreen();

    if (state.detail.serviceId) {
        renderDetailScreen();
    }
}

function renderHomeScreen() {
    const filteredServices = getFilteredServices();
    const activeCategories = [...new Set(state.services.map((service) => service.category))];

    dom.serviceCount.textContent = String(state.services.length);
    dom.categoryCount.textContent = String(activeCategories.length);
    dom.resultsCopy.textContent = filteredServices.length === 1 ? "1 anuncio listo para abrir" : `${filteredServices.length} anuncios listos para abrir`;

    renderCategoryFilters();
    renderCategorySummary(filteredServices);
    renderSpotlights();
    renderCards(filteredServices);

    dom.serviceFeed.dataset.view = state.filters.view;
    dom.viewButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.view === state.filters.view);
    });
}

function renderCategoryFilters() {
    dom.categoryFilters.innerHTML = CATEGORY_OPTIONS.map((category) => `
        <button
            type="button"
            class="category-filter ${state.filters.category === category ? "is-active" : ""}"
            data-category="${escapeHTML(category)}"
        >
            ${escapeHTML(category)}
        </button>
    `).join("");
}

function renderCategorySummary(filteredServices) {
    const categories = [...new Set(filteredServices.map((service) => service.category))].slice(0, 6);

    if (!categories.length) {
        dom.categorySummary.innerHTML = `<span class="summary-chip">Sin categorias visibles</span>`;
        return;
    }

    dom.categorySummary.innerHTML = categories.map((category) => `
        <span class="summary-chip">${escapeHTML(category)}</span>
    `).join("");
}

function renderSpotlights() {
    const spotlightServices = [...state.services]
        .filter((service) => countAvailableSlots(service) > 0)
        .sort((left, right) => countAvailableSlots(right) - countAvailableSlots(left))
        .slice(0, 3);

    if (!spotlightServices.length) {
        dom.spotlightList.innerHTML = `<p class="discover-text">Todavia no hay huecos publicados.</p>`;
        return;
    }

    dom.spotlightList.innerHTML = spotlightServices.map((service) => `
        <article class="spotlight-item">
            <strong>${escapeHTML(service.title)}</strong>
            <span class="spotlight-meta">${escapeHTML(service.ownerName)} · ${escapeHTML(service.category)}</span>
            <span class="spotlight-meta">${escapeHTML(getNextAvailableLabel(service))}</span>
        </article>
    `).join("");
}

function renderCards(services) {
    dom.emptyState.classList.toggle("hidden", services.length > 0);

    if (!services.length) {
        dom.serviceFeed.innerHTML = "";
        return;
    }

    dom.serviceFeed.innerHTML = services.map((service) => {
        const tagMarkup = service.schedule.targets.slice(0, 4).map((target) => `
            <span class="service-tag">${escapeHTML(target.label)}</span>
        `).join("");

        const locationText = service.mode === "local"
            ? service.businessLocation || "En local"
            : service.ownerLocation || "Servicio a domicilio";

        return `
            <article class="service-card" data-open-service="${escapeHTML(service.id)}" tabindex="0">
                <div class="service-card-media">
                    <img class="service-card-image" src="${escapeHTML(service.image)}" alt="Imagen del anuncio ${escapeHTML(service.title)}">
                    <div class="price-corner">Precio medio ${escapeHTML(service.priceLabel)}</div>
                </div>

                <div class="service-card-body">
                    <div class="service-owner-row">
                        <img class="service-owner-avatar" src="${escapeHTML(service.ownerPhoto)}" alt="Foto de ${escapeHTML(service.ownerName)}">
                        <div>
                            <p class="service-owner-name">${escapeHTML(service.ownerName)}</p>
                            ${buildRatingMarkup(service.averageRating, service.reviews.length)}
                        </div>
                    </div>

                    <h3 class="service-title">${escapeHTML(service.title)}</h3>
                    <p class="service-description">${escapeHTML(service.shortDescription)}</p>

                    <div class="service-meta-row">
                        <span class="service-mode">${escapeHTML(service.modeLabel)}</span>
                        <span class="service-location">${escapeHTML(locationText)}</span>
                    </div>

                    <div class="service-tags">${tagMarkup}</div>

                    <div class="service-footer">
                        <span class="service-cta">Abrir anuncio</span>
                        <span class="availability-summary">${escapeHTML(getNextAvailableLabel(service))}</span>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    dom.serviceFeed.querySelectorAll("img").forEach((image) => {
        image.addEventListener("error", () => {
            image.src = image.classList.contains("service-owner-avatar") ? IMG_DEFAULT_AVATAR : IMG_DEFAULT_SERVICE;
        }, { once: true });
    });
}

function getFilteredServices() {
    const query = normalizeText(state.filters.query);

    return state.services.filter((service) => {
        if (state.filters.category !== "Todas" && service.category !== state.filters.category) {
            return false;
        }

        if (!query) {
            return true;
        }

        return service.searchText.includes(query);
    });
}

function openDetailScreen(serviceId) {
    const service = state.services.find((item) => item.id === serviceId);
    if (!service) {
        return;
    }

    state.detail.serviceId = serviceId;
    state.detail.slotKey = null;
    state.detail.reviewStars = "all";
    state.detail.reviewSort = "recent";
    state.detail.targetKey = findInitialTargetKey(service);

    resetBookingFields();
    renderDetailScreen();

    dom.homeScreen.classList.add("hidden");
    dom.detailScreen.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHomeScreen() {
    state.detail.serviceId = null;
    state.detail.targetKey = null;
    state.detail.slotKey = null;
    state.detail.reviewStars = "all";
    state.detail.reviewSort = "recent";
    resetBookingFields();
    dom.detailScreen.classList.add("hidden");
    dom.homeScreen.classList.remove("hidden");
}

function renderDetailScreen() {
    const service = getActiveService();
    if (!service) {
        return;
    }

    const activeTarget = service.schedule.targets.find((target) => target.key === state.detail.targetKey) || service.schedule.targets[0] || null;
    const activeSlot = activeTarget?.slots.find((slot) => slot.key === state.detail.slotKey) || null;

    dom.detailBannerImage.src = service.image;
    dom.detailBannerImage.onerror = () => {
        dom.detailBannerImage.src = IMG_DEFAULT_SERVICE;
    };
    dom.detailCategoryPill.textContent = service.category;
    dom.detailModePill.textContent = service.modeLabel;
    dom.detailTitle.textContent = service.title;
    dom.detailSubtitle.textContent = service.businessLocation && service.mode === "local"
        ? `${service.ownerName} · ${service.businessLocation}`
        : service.shortDescription;

    dom.detailOwnerPhoto.src = service.ownerPhoto;
    dom.detailOwnerPhoto.onerror = () => {
        dom.detailOwnerPhoto.src = IMG_DEFAULT_AVATAR;
    };
    dom.detailOwnerName.textContent = service.ownerName;
    dom.detailOwnerStars.innerHTML = buildRatingMarkup(service.averageRating, service.reviews.length);
    dom.detailOwnerLocation.textContent = service.ownerLocation || service.businessLocation || "Servicio disponible";
    dom.detailOwnerBio.textContent = service.ownerBio;
    dom.detailDescription.textContent = service.description;
    dom.detailAvailabilityHeading.textContent = getAvailabilityHeading(service.schedule.mode);
    dom.detailAvailabilityCopy.textContent = getAvailabilityCopy(service);

    renderDetailSocials(service.socials);
    renderDetailChatButton(service);
    renderDetailTargets(service, activeTarget?.key || null);
    renderDetailSlots(service, activeTarget, activeSlot?.key || null);
    renderBookingPanel(service, activeTarget, activeSlot);
    renderSpecGrid(service);
    renderReviews(service);
}

function renderDetailSocials(socials) {
    const links = Object.entries(socials).filter(([, value]) => Boolean(value));

    if (!links.length) {
        dom.detailSocialLinks.innerHTML = `<span class="summary-chip">Sin redes publicadas</span>`;
        return;
    }

    dom.detailSocialLinks.innerHTML = links.map(([label, value]) => `
        <a class="social-link" href="${escapeHTML(sanitizeLink(value))}" target="_blank" rel="noreferrer">
            ${escapeHTML(label)}
        </a>
    `).join("");
}

function renderDetailChatButton(service) {
    const ownerUid = String(service.uid || "").trim();
    const isOwnService = Boolean(state.currentUser && ownerUid && state.currentUser.uid === ownerUid);

    dom.detailChatButton.disabled = !ownerUid || isOwnService;

    if (!ownerUid) {
        dom.detailChatButton.textContent = "Chat no disponible";
        return;
    }

    if (isOwnService) {
        dom.detailChatButton.textContent = "Este anuncio es tuyo";
        return;
    }

    dom.detailChatButton.textContent = state.currentUser
        ? "Hablar con el vendedor"
        : "Inicia sesion para hablar";
}

function renderDetailTargets(service, activeTargetKey) {
    if (!service.schedule.targets.length) {
        dom.detailTargetButtons.innerHTML = `<button type="button" class="choice-button" disabled>Sin disponibilidad</button>`;
        return;
    }

    dom.detailTargetButtons.innerHTML = service.schedule.targets.map((target) => {
        const isTargetAvailable = countOpenSlotsForTarget(service, target) > 0;
        return `
            <button
                type="button"
                class="choice-button ${activeTargetKey === target.key ? "is-active" : ""}"
                data-target-key="${escapeHTML(target.key)}"
                ${isTargetAvailable ? "" : "disabled"}
            >
                ${escapeHTML(target.label)}
            </button>
        `;
    }).join("");
}

function renderDetailSlots(service, activeTarget, activeSlotKey) {
    if (!activeTarget) {
        dom.detailSlotButtons.innerHTML = `<button type="button" class="choice-button" disabled>Selecciona primero una disponibilidad</button>`;
        return;
    }

    if (!activeTarget.slots.length) {
        dom.detailSlotButtons.innerHTML = `<button type="button" class="choice-button" disabled>El anunciante todavia no ha cargado horarios</button>`;
        return;
    }

    dom.detailSlotButtons.innerHTML = activeTarget.slots.map((slot) => {
        const booked = isSlotBooked(service.id, activeTarget.key, slot.key);
        return `
            <button
                type="button"
                class="choice-button ${activeSlotKey === slot.key ? "is-active" : ""} ${booked ? "is-booked" : ""}"
                data-slot-key="${escapeHTML(slot.key)}"
                ${booked ? "disabled" : ""}
            >
                ${escapeHTML(booked ? `${slot.label} reservada` : slot.label)}
            </button>
        `;
    }).join("");
}

function renderBookingPanel(service, activeTarget, activeSlot) {
    const isBooked = activeTarget && activeSlot ? isSlotBooked(service.id, activeTarget.key, activeSlot.key) : false;

    if (!activeTarget || !activeSlot || isBooked) {
        dom.detailBookingPanel.classList.add("hidden");
        return;
    }

    dom.detailBookingPanel.classList.remove("hidden");
    dom.detailBookingSummary.innerHTML = `
        <strong>Seleccion actual</strong>
        <div>${escapeHTML(activeTarget.label)} · ${escapeHTML(activeSlot.label)}</div>
    `;

    if (service.mode === "local") {
        dom.detailLocalInfo.classList.remove("hidden");
        dom.detailLocalInfo.textContent = service.businessLocation
            ? `La cita se realizara en ${service.businessLocation}.`
            : "El anunciante concretara la ubicacion del servicio en local.";
        dom.detailDomicileForm.classList.add("hidden");
    } else {
        dom.detailLocalInfo.classList.add("hidden");
        dom.detailDomicileForm.classList.remove("hidden");
    }
}

function renderSpecGrid(service) {
    const specItems = [
        { label: "Precio medio", value: service.priceLabel },
        { label: "Categoria", value: service.category },
        { label: "Modalidad", value: service.modeLabel },
        { label: "Disponibilidad", value: getScheduleModeLabel(service.schedule.mode) },
        { label: "Tipo de horario", value: service.scheduleTypeLabel },
        { label: "Ubicacion", value: service.businessLocation || service.ownerLocation || "Por concretar" }
    ];

    dom.detailSpecGrid.innerHTML = specItems.map((item) => `
        <article class="spec-card">
            <span>${escapeHTML(item.label)}</span>
            <strong>${escapeHTML(item.value)}</strong>
        </article>
    `).join("");
}

function renderReviews(service) {
    const reviews = getFilteredReviews(service.reviews);

    dom.detailReviewSummary.innerHTML = service.reviews.length
        ? `${buildStarLine(service.averageRating)} <span class="rating-count">${service.averageRating.toFixed(1)}/5 · ${service.reviews.length} reseñas</span>`
        : `<span class="rating-count">Aun no hay reseñas</span>`;

    dom.reviewStarFilters.innerHTML = [
        { key: "all", label: "Todas" },
        { key: "5", label: "5 estrellas" },
        { key: "4", label: "4 estrellas" },
        { key: "3", label: "3 estrellas" },
        { key: "2", label: "2 estrellas" },
        { key: "1", label: "1 estrella" }
    ].map((filter) => `
        <button
            type="button"
            class="review-filter-button ${state.detail.reviewStars === filter.key ? "is-active" : ""}"
            data-review-stars="${filter.key}"
        >
            ${escapeHTML(filter.label)}
        </button>
    `).join("");

    dom.reviewSort.value = state.detail.reviewSort;

    if (!reviews.length) {
        dom.reviewList.innerHTML = `<div class="review-empty">No hay reseñas para ese filtro todavia.</div>`;
        return;
    }

    dom.reviewList.innerHTML = reviews.map((review) => `
        <article class="review-card">
            <div class="review-card-head">
                <div>
                    <strong>${escapeHTML(review.author)}</strong>
                    ${buildRatingMarkup(review.rating, 0, false)}
                </div>
                <span class="review-date">${escapeHTML(formatReviewDate(review.createdAt))}</span>
            </div>
            <p>${escapeHTML(review.comment)}</p>
        </article>
    `).join("");
}

function handleStartChat() {
    const service = getActiveService();
    if (!service) {
        return;
    }

    const ownerUid = String(service.uid || "").trim();
    if (!ownerUid) {
        showToast("Este anuncio todavia no tiene chat disponible.");
        return;
    }

    if (!state.currentUser) {
        openModal("auth-modal");
        showToast("Inicia sesion para hablar con el vendedor.");
        return;
    }

    if (state.currentUser.uid === ownerUid) {
        showToast("No puedes abrir un chat contigo mismo desde tu propio anuncio.");
        return;
    }

    window.location.href = buildChatUrl("contact/chat.html", ownerUid, service.ownerName, service.title);
}

async function confirmBooking() {
    const service = getActiveService();
    if (!service || !state.detail.targetKey || !state.detail.slotKey) {
        showToast("Selecciona antes una disponibilidad y una hora.");
        return;
    }

    const target = service.schedule.targets.find((item) => item.key === state.detail.targetKey);
    const slot = target?.slots.find((item) => item.key === state.detail.slotKey);
    if (!target || !slot) {
        showToast("No hemos podido reconocer el hueco seleccionado.");
        return;
    }

    if (isSlotBooked(service.id, target.key, slot.key)) {
        showToast("Ese hueco ya ha sido reservado.");
        renderDetailScreen();
        return;
    }

    let customerName = state.currentUser?.displayName || state.currentUser?.email || "Cliente web";
    let customerPhone = "";
    let customerAddress = "";
    let customerNotes = "";

    if (service.mode === "domicilio") {
        customerName = dom.bookingCustomerName.value.trim();
        customerPhone = dom.bookingCustomerPhone.value.trim();
        customerAddress = dom.bookingCustomerAddress.value.trim();
        customerNotes = dom.bookingCustomerNotes.value.trim();

        if (!customerName || !customerPhone || !customerAddress) {
            showToast("Para un servicio a domicilio necesitamos nombre, telefono y direccion.");
            return;
        }
    }

    try {
        const bookingId = push(ref(db, "bookings")).key;
        if (!bookingId) {
            showToast("No hemos podido generar el identificador de la reserva.");
            return;
        }

        const customerUid = state.currentUser?.uid || "";
        const ownerUid = String(service.uid || "").trim();
        const createdAt = Date.now();
        const updates = {
            [`bookings/${bookingId}`]: {
                serviceId: service.id,
                serviceTitle: service.title,
                ownerUid,
                customerUid,
                targetKey: target.key,
                targetLabel: target.label,
                slotKey: slot.key,
                slotLabel: slot.label,
                mode: service.mode,
                customerName,
                customerPhone,
                customerAddress,
                customerNotes,
                customerEmail: state.currentUser?.email || "",
                businessLocation: service.businessLocation || "",
                createdAt
            },
            [`bookingLocks/${bookingId}`]: {
                serviceId: service.id,
                targetKey: target.key,
                slotKey: slot.key,
                createdAt
            }
        };

        if (ownerUid) {
            updates[`bookingByOwner/${ownerUid}/${bookingId}`] = {
                serviceId: service.id,
                serviceTitle: service.title,
                serviceImage: service.image,
                customerName,
                customerEmail: state.currentUser?.email || "",
                customerPhone,
                customerAddress,
                customerNotes,
                targetLabel: target.label,
                slotLabel: slot.label,
                mode: service.mode,
                businessLocation: service.businessLocation || "",
                createdAt
            };
        }

        if (customerUid) {
            updates[`bookingByCustomer/${customerUid}/${bookingId}`] = {
                serviceId: service.id,
                serviceTitle: service.title,
                serviceImage: service.image,
                ownerUid,
                ownerName: service.ownerName,
                targetLabel: target.label,
                slotLabel: slot.label,
                mode: service.mode,
                businessLocation: service.businessLocation || "",
                createdAt
            };
        }

        await update(ref(db), updates);

        state.bookings.add(buildBookingKey(service.id, target.key, slot.key));
        state.detail.slotKey = null;
        resetBookingFields();
        renderHomeScreen();
        renderDetailScreen();
        showToast("Servicio concertado. Ese hueco ya ha quedado bloqueado.");
    } catch (error) {
        showToast(getFriendlyError(error));
    }
}

function getFilteredReviews(reviews) {
    const starsFilter = state.detail.reviewStars;
    const filtered = reviews.filter((review) => starsFilter === "all" || review.rating === Number(starsFilter));

    filtered.sort((left, right) => {
        if (state.detail.reviewSort === "oldest") {
            return left.createdAt - right.createdAt;
        }

        return right.createdAt - left.createdAt;
    });

    return filtered;
}

function getActiveService() {
    return state.services.find((service) => service.id === state.detail.serviceId) || null;
}

function findInitialTargetKey(service) {
    const firstOpenTarget = service.schedule.targets.find((target) => countOpenSlotsForTarget(service, target) > 0);
    return firstOpenTarget?.key || service.schedule.targets[0]?.key || null;
}

function normalizeService(id, rawService, userProfile = {}) {
    const title = String(rawService.title || rawService.name || "Servicio sin titulo").trim();
    const category = normalizeCategory(rawService.category || "Cuidados");
    const description = String(rawService.description || rawService.serviceDescription || "Servicio publicado por un anunciante de confianza.").trim();
    const shortDescription = truncate(description, 150);
    const mode = normalizeMode(rawService.mode || rawService.serviceMode || rawService.modality);
    const ownerName = String(rawService.ownerName || rawService.advertiserName || userProfile.name || "Anunciante").trim();
    const ownerPhoto = resolveMediaSource(rawService.ownerPhoto || rawService.advertiserPhoto || userProfile.photo, IMG_DEFAULT_AVATAR);
    const ownerBio = String(rawService.ownerBio || rawService.advertiserBio || userProfile.description || userProfile.bio || "Perfil del anunciante pendiente de completar.").trim();
    const ownerLocation = String(rawService.ownerLocation || userProfile.location || rawService.location || "").trim();
    const businessLocation = String(rawService.businessLocation || rawService.address || userProfile.businessLocation || "").trim();
    const socials = normalizeSocials(rawService.socials || rawService.ownerSocials || userProfile.socials || {});
    const image = resolveMediaSource(rawService.coverImage || rawService.imageUrl || rawService.serviceImage || rawService.image, IMG_DEFAULT_SERVICE);
    const schedule = normalizeSchedule(rawService.schedule, rawService.availability, rawService.time);
    const reviews = normalizeReviews(rawService.reviews || []);
    const averageRating = reviews.length
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0;

    const modeLabel = mode === "local" ? "Servicio en local" : "Servicio a domicilio";
    const priceLabel = formatPrice(rawService.price);
    const scheduleTypeLabel = schedule.type === "range" ? "Tramo fijo" : "Hora concreta";

    return {
        id,
        uid: String(rawService.uid || rawService.ownerUid || "").trim(),
        title,
        category,
        description,
        shortDescription,
        mode,
        modeLabel,
        priceLabel,
        numericPrice: Number(rawService.price) || 0,
        ownerName,
        ownerPhoto,
        ownerBio,
        ownerLocation,
        businessLocation,
        socials,
        image,
        schedule,
        scheduleTypeLabel,
        reviews,
        averageRating,
        timestamp: Number(rawService.timestamp) || Date.now(),
        searchText: normalizeText([
            title,
            category,
            description,
            ownerName,
            ownerBio,
            ownerLocation,
            businessLocation,
            modeLabel
        ].join(" "))
    };
}

function normalizeSchedule(schedule, legacyAvailability, legacyTime) {
    if (schedule && typeof schedule === "object" && Array.isArray(schedule.targets)) {
        return {
            mode: schedule.mode || "weekly",
            type: schedule.type || inferScheduleType(schedule.targets),
            targets: sortTargets(
                schedule.targets
                    .map((target) => normalizeTarget(target))
                    .filter((target) => target.slots.length > 0),
                schedule.mode || "weekly"
            )
        };
    }

    if (legacyAvailability && typeof legacyAvailability === "object") {
        const targets = Object.entries(legacyAvailability).map(([key, value]) => {
            const rawSlots = Array.isArray(value) ? value : Array.isArray(value?.slots) ? value.slots : [];
            const slots = dedupeSlots(rawSlots.map((slot) => normalizeSlot(slot)).filter(Boolean));
            return {
                key,
                label: WEEKDAY_LABELS[key] || capitalize(key),
                slots
            };
        }).filter((target) => target.slots.length > 0);

        return {
            mode: "weekly",
            type: inferScheduleType(targets),
            targets: sortTargets(targets, "weekly")
        };
    }

    const legacySlots = String(legacyTime || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((time) => normalizeSlot({ type: "specific", value: time }))
        .filter(Boolean);

    if (legacySlots.length) {
        return {
            mode: "daily",
            type: "specific",
            targets: [{ key: "daily", label: "Cada dia", slots: dedupeSlots(legacySlots) }]
        };
    }

    return {
        mode: "daily",
        type: "specific",
        targets: []
    };
}

function normalizeTarget(target) {
    const key = String(target.key || target.value || target.id || "").trim();
    const label = String(target.label || target.name || target.key || "").trim() || "Disponibilidad";
    const slots = dedupeSlots(
        (target.slots || target.times || [])
            .map((slot) => normalizeSlot(slot))
            .filter(Boolean)
    );

    return { key, label, slots };
}

function normalizeSlot(slot) {
    if (!slot) {
        return null;
    }

    const slotType = slot.type || (slot.start && slot.end ? "range" : "specific");
    if (slotType === "range") {
        const start = normalize24Hour(String(slot.start || "").trim());
        const end = normalize24Hour(String(slot.end || "").trim());
        if (!start || !end) {
            return null;
        }

        return {
            key: `range-${start}-${end}`,
            label: `${start} - ${end}`,
            type: "range",
            start,
            end
        };
    }

    const value = normalize24Hour(String(slot.value || slot.time || slot.label || "").trim());
    if (!value) {
        return null;
    }

    return {
        key: `specific-${value}`,
        label: `${value}h`,
        type: "specific",
        value
    };
}

function normalizeReviews(rawReviews) {
    const reviews = Array.isArray(rawReviews)
        ? rawReviews
        : typeof rawReviews === "object" && rawReviews !== null
            ? Object.values(rawReviews)
            : [];

    return reviews.map((review, index) => ({
        id: String(review.id || `review-${index}`),
        author: String(review.author || review.name || "Cliente verificado").trim(),
        rating: clampRating(review.rating),
        comment: String(review.comment || review.text || "Sin comentario.").trim(),
        createdAt: Number(review.createdAt || review.timestamp) || Date.now()
    })).filter((review) => review.rating > 0);
}

function normalizeSocials(rawSocials) {
    if (!rawSocials || typeof rawSocials !== "object") {
        return {};
    }

    return {
        Meta: rawSocials.Meta || rawSocials.meta || rawSocials.facebook || "",
        Twitter: rawSocials.Twitter || rawSocials.twitter || rawSocials.x || "",
        Otra: rawSocials.Otra || rawSocials.other || rawSocials.web || ""
    };
}

function countAvailableSlots(service) {
    return service.schedule.targets.reduce((total, target) => total + countOpenSlotsForTarget(service, target), 0);
}

function countOpenSlotsForTarget(service, target) {
    return target.slots.filter((slot) => !isSlotBooked(service.id, target.key, slot.key)).length;
}

function getNextAvailableLabel(service) {
    for (const target of service.schedule.targets) {
        for (const slot of target.slots) {
            if (!isSlotBooked(service.id, target.key, slot.key)) {
                return `${target.label} · ${slot.label}`;
            }
        }
    }

    return "Sin huecos libres";
}

function isSlotBooked(serviceId, targetKey, slotKey) {
    return state.bookings.has(buildBookingKey(serviceId, targetKey, slotKey));
}

function buildBookingKey(serviceId, targetKey, slotKey) {
    return `${serviceId}::${targetKey}::${slotKey}`;
}

function buildChatUrl(basePath, uid, name, serviceTitle) {
    const query = new URLSearchParams({
        uid: String(uid || "").trim(),
        name: String(name || "Anunciante").trim() || "Anunciante"
    });

    const safeServiceTitle = String(serviceTitle || "").trim();
    if (safeServiceTitle) {
        query.set("service", safeServiceTitle);
    }

    return `${basePath}?${query.toString()}`;
}

function buildRatingMarkup(rating, totalReviews, includeCount = true) {
    const stars = buildStarLine(rating);
    const count = includeCount
        ? `<span class="rating-count">${rating ? `${rating.toFixed(1)}/5` : "Sin reseñas"}${totalReviews ? ` · ${totalReviews}` : ""}</span>`
        : "";

    return `<div class="rating-line">${stars}${count}</div>`;
}

function buildStarLine(rating) {
    const rounded = Math.round(rating || 0);
    return `
        <span class="rating-stars">
            ${Array.from({ length: 5 }, (_, index) => `<span class="${index < rounded ? "is-filled" : ""}">&#9733;</span>`).join("")}
        </span>
    `;
}

function getAvailabilityHeading(mode) {
    if (mode === "weekly") {
        return "Elige un dia de la semana";
    }

    if (mode === "monthly") {
        return "Elige un dia del mes";
    }

    return "Horarios diarios disponibles";
}

function getAvailabilityCopy(service) {
    if (service.schedule.mode === "weekly") {
        return "Los dias solo dejan elegirse si todavia tienen alguna cita libre.";
    }

    if (service.schedule.mode === "monthly") {
        return "Al elegir un dia del mes veras las horas o tramos que siguen libres.";
    }

    return "Este servicio se presta cada dia y las horas reservadas dejan de poder pulsarse.";
}

function getScheduleModeLabel(mode) {
    if (mode === "weekly") {
        return "Dias de la semana";
    }

    if (mode === "monthly") {
        return "Dias del mes";
    }

    return "Servicio diario";
}

function sortTargets(targets, mode) {
    const clonedTargets = [...targets];

    if (mode === "monthly") {
        return clonedTargets.sort((left, right) => Number(left.key) - Number(right.key));
    }

    if (mode === "weekly") {
        return clonedTargets.sort((left, right) => WEEKDAY_ORDER.indexOf(left.key) - WEEKDAY_ORDER.indexOf(right.key));
    }

    return clonedTargets;
}

function inferScheduleType(targets) {
    const firstSlot = targets.flatMap((target) => target.slots || [])[0];
    return firstSlot?.type || "specific";
}

function dedupeSlots(slots) {
    const seen = new Set();

    return slots.filter((slot) => {
        if (seen.has(slot.key)) {
            return false;
        }

        seen.add(slot.key);
        return true;
    });
}

function normalizeCategory(value) {
    const category = String(value || "Cuidados").trim();
    return CATEGORY_OPTIONS.includes(category) ? category : "Cuidados";
}

function normalizeMode(rawMode) {
    const normalized = normalizeText(rawMode);
    return normalized.includes("local") ? "local" : "domicilio";
}

function resolveMediaSource(path, fallback) {
    const value = String(path || "").trim();

    if (!value) {
        return fallback;
    }

    if (value.startsWith("data:image/")) {
        return value;
    }

    if (value.startsWith("https://") || value.startsWith("http://")) {
        return value;
    }

    if (value.startsWith("../")) {
        return value.replace(/^\.\.\//, "");
    }

    if (value.startsWith("./")) {
        return value.replace(/^\.\//, "");
    }

    if (value.startsWith("img/")) {
        return value;
    }

    return fallback;
}

function sanitizeLink(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
        return "#";
    }

    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
        return trimmed;
    }

    return `https://${trimmed}`;
}

function clampRating(value) {
    const rating = Number(value);
    if (!Number.isFinite(rating)) {
        return 0;
    }

    return Math.max(1, Math.min(5, Math.round(rating)));
}

function formatPrice(value) {
    const numericPrice = Number(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(numericPrice)) {
        return "A consultar";
    }

    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: numericPrice % 1 === 0 ? 0 : 2
    }).format(numericPrice);
}

function formatReviewDate(timestamp) {
    return new Date(timestamp).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatName(name) {
    const parts = String(name || "Mi cuenta").trim().split(/\s+/);
    if (parts.length <= 1) {
        return parts[0];
    }

    return `${parts[0]} ${parts[1][0]}.`;
}

function truncate(value, maxLength) {
    const text = String(value || "");
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 1).trim()}…`;
}

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
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

function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function openModal(id) {
    document.getElementById(id)?.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    document.getElementById(id)?.classList.add("hidden");
    dom.password.value = "";

    if (document.querySelectorAll(".modal:not(.hidden)").length === 0) {
        document.body.classList.remove("modal-open");
    }
}

function toggleAccountMenu(forceState) {
    const shouldShow = typeof forceState === "boolean"
        ? forceState
        : dom.accountMenu.classList.contains("hidden");

    if (!state.currentUser) {
        dom.accountMenu.classList.add("hidden");
        return;
    }

    dom.accountMenu.classList.toggle("hidden", !shouldShow);
}

function resetBookingFields() {
    dom.bookingCustomerName.value = "";
    dom.bookingCustomerPhone.value = "";
    dom.bookingCustomerAddress.value = "";
    dom.bookingCustomerNotes.value = "";
}

function showToast(message) {
    if (!message) {
        return;
    }

    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        dom.toast.classList.add("hidden");
    }, 3600);
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

    if (code.includes("email-already-in-use")) {
        return "Ese correo ya esta en uso. Prueba iniciando sesion.";
    }

    if (code.includes("invalid-email")) {
        return "El correo no tiene un formato valido.";
    }

    if (code.includes("weak-password")) {
        return "La contraseña es demasiado corta. Usa al menos 6 caracteres.";
    }

    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        return "No hemos podido acceder con esos datos.";
    }

    if (code.includes("permission-denied")) {
        return "Firebase ha bloqueado esta operación. Revisa las reglas de Realtime Database y usa el archivo rules.txt.";
    }

    return error?.message || "Ha ocurrido un problema inesperado.";
}
