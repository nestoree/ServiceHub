import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const dom = {
    activityStatus: document.getElementById("activity-status"),
    customerBookingsCount: document.getElementById("customer-bookings-count"),
    ownerBookingsCount: document.getElementById("owner-bookings-count"),
    messagesCount: document.getElementById("messages-count"),
    customerBookingsList: document.getElementById("customer-bookings-list"),
    ownerBookingsList: document.getElementById("owner-bookings-list"),
    messagesList: document.getElementById("messages-list")
};

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }

    dom.activityStatus.textContent = `Sesión activa: ${formatName(user.displayName || user.email || "Usuario")}`;
    loadCustomerBookings(user.uid);
    loadOwnerBookings(user.uid);
    loadMyMessages(user.uid);
});

function loadCustomerBookings(uid) {
    onValue(ref(db, `bookingByCustomer/${uid}`), (snapshot) => {
        const items = snapshot.exists()
            ? Object.values(snapshot.val()).sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
            : [];

        dom.customerBookingsCount.textContent = String(items.length);

        if (!items.length) {
            dom.customerBookingsList.innerHTML = renderEmptyCard(
                "Todavía no has contratado servicios desde tu sesión.",
                "Cuando reserves estando dentro de tu cuenta, aparecerán aquí."
            );
            return;
        }

        dom.customerBookingsList.innerHTML = items.map((booking) => `
            <article class="activity-card">
                <img class="activity-image" src="${escapeHTML(resolveImage(booking.serviceImage))}" alt="Servicio ${escapeHTML(booking.serviceTitle)}">
                <div class="activity-content">
                    <div class="activity-head">
                        <div>
                            <h3 class="activity-title">${escapeHTML(booking.serviceTitle)}</h3>
                            <p class="activity-subtitle">Con ${escapeHTML(booking.ownerName || "Anunciante")}</p>
                        </div>
                        <span class="activity-time">${escapeHTML(formatDate(booking.createdAt))}</span>
                    </div>

                    <div class="activity-chip-row">
                        <span class="activity-chip">${escapeHTML(booking.targetLabel || "Disponibilidad")}</span>
                        <span class="activity-chip">${escapeHTML(booking.slotLabel || "Hora")}</span>
                        <span class="activity-chip">${escapeHTML(formatMode(booking.mode))}</span>
                    </div>

                    <div class="activity-meta-grid">
                        <div class="activity-meta">
                            <span>Ubicación</span>
                            <strong>${escapeHTML(booking.businessLocation || "Por concretar")}</strong>
                        </div>

                        <div class="activity-meta">
                            <span>Estado</span>
                            <strong>Reserva registrada</strong>
                        </div>
                    </div>

                    ${booking.ownerUid ? `
                        <div class="btn-group">
                            <button
                                type="button"
                                class="button button-primary btn-inline"
                                data-open-chat="${escapeHTML(booking.ownerUid)}"
                                data-open-name="${escapeHTML(booking.ownerName || "Anunciante")}"
                                data-open-service="${escapeHTML(booking.serviceTitle || "Servicio")}"
                            >
                                Hablar con el vendedor
                            </button>
                        </div>
                    ` : ""}
                </div>
            </article>
        `).join("");

        attachImageFallbacks(dom.customerBookingsList);
        attachChatOpeners(dom.customerBookingsList);
    });
}

function loadOwnerBookings(uid) {
    onValue(ref(db, `bookingByOwner/${uid}`), (snapshot) => {
        const items = snapshot.exists()
            ? Object.values(snapshot.val()).sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
            : [];

        dom.ownerBookingsCount.textContent = String(items.length);

        if (!items.length) {
            dom.ownerBookingsList.innerHTML = renderEmptyCard(
                "Todavía no te han contratado servicios.",
                "Las nuevas reservas aparecerán aquí con los datos del cliente."
            );
            return;
        }

        dom.ownerBookingsList.innerHTML = items.map((booking) => `
            <article class="activity-card">
                <img class="activity-image" src="${escapeHTML(resolveImage(booking.serviceImage))}" alt="Servicio ${escapeHTML(booking.serviceTitle)}">
                <div class="activity-content">
                    <div class="activity-head">
                        <div>
                            <h3 class="activity-title">${escapeHTML(booking.serviceTitle)}</h3>
                            <p class="activity-subtitle">Cliente: ${escapeHTML(booking.customerName || "Cliente web")}</p>
                        </div>
                        <span class="activity-time">${escapeHTML(formatDate(booking.createdAt))}</span>
                    </div>

                    <div class="activity-chip-row">
                        <span class="activity-chip">${escapeHTML(booking.targetLabel || "Disponibilidad")}</span>
                        <span class="activity-chip">${escapeHTML(booking.slotLabel || "Hora")}</span>
                        <span class="activity-chip">${escapeHTML(formatMode(booking.mode))}</span>
                    </div>

                    <div class="activity-meta-grid">
                        <div class="activity-meta">
                            <span>Correo</span>
                            <strong>${escapeHTML(booking.customerEmail || "No disponible")}</strong>
                        </div>

                        <div class="activity-meta">
                            <span>Teléfono</span>
                            <strong>${escapeHTML(booking.customerPhone || "No disponible")}</strong>
                        </div>

                        <div class="activity-meta">
                            <span>Dirección</span>
                            <strong>${escapeHTML(booking.customerAddress || booking.businessLocation || "Por concretar")}</strong>
                        </div>

                        <div class="activity-meta">
                            <span>Notas</span>
                            <strong>${escapeHTML(booking.customerNotes || "Sin notas")}</strong>
                        </div>
                    </div>
                </div>
            </article>
        `).join("");

        attachImageFallbacks(dom.ownerBookingsList);
    });
}

function loadMyMessages(myUid) {
    onValue(ref(db, `messages/${myUid}`), (snapshot) => {
        const data = snapshot.val() || {};
        const messages = Object.entries(data)
            .map(([key, value]) => ({ id: key, ...value }))
            .sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0));

        dom.messagesCount.textContent = String(messages.length);

        if (!messages.length) {
            dom.messagesList.innerHTML = renderEmptyCard(
                "Tu buzón está limpio.",
                "Cuando alguien te escriba o entre en un chat, aparecerá aquí."
            );
            return;
        }

        dom.messagesList.innerHTML = messages.map((message) => `
            <article class="message-card" data-message-id="${escapeHTML(message.id)}">
                <div class="msg-header">
                    <div>
                        <span class="msg-sender">${escapeHTML(message.fromName || "Usuario")}</span>
                        <span class="msg-date">${escapeHTML(formatDate(message.timestamp))}</span>
                    </div>
                    <span class="msg-service">${escapeHTML(message.service || "Conversación")}</span>
                </div>

                <div class="msg-body">${escapeHTML(message.message || "")}</div>

                <div class="btn-group">
                    <button
                        type="button"
                        class="button button-primary btn-inline"
                        data-open-chat="${escapeHTML(message.fromUid || "")}"
                        data-open-name="${escapeHTML(message.fromName || "Usuario")}"
                        data-open-service="${escapeHTML(message.service || "Conversación")}"
                    >
                        Abrir chat
                    </button>
                    <button type="button" class="button button-soft btn-inline" data-delete-message="${escapeHTML(message.id)}">Borrar</button>
                </div>
            </article>
        `).join("");

        attachChatOpeners(dom.messagesList);

        dom.messagesList.querySelectorAll("[data-delete-message]").forEach((button) => {
            button.addEventListener("click", async () => {
                const messageId = button.dataset.deleteMessage;
                if (!messageId) {
                    return;
                }

                if (!window.confirm("¿Eliminar esta conversación del buzón?")) {
                    return;
                }

                await remove(ref(db, `messages/${myUid}/${messageId}`));
            });
        });
    });
}

function attachChatOpeners(scope) {
    scope.querySelectorAll("[data-open-chat]").forEach((button) => {
        button.addEventListener("click", () => {
            const uid = button.dataset.openChat;
            const name = button.dataset.openName || "Usuario";
            const service = button.dataset.openService || "";
            if (!uid) {
                return;
            }

            const query = new URLSearchParams({
                uid,
                name
            });

            if (service) {
                query.set("service", service);
            }

            window.location.href = `chat.html?${query.toString()}`;
        });
    });
}

function attachImageFallbacks(scope) {
    scope.querySelectorAll("img").forEach((image) => {
        image.addEventListener("error", () => {
            image.src = "../img/serv.png";
        }, { once: true });
    });
}

function renderEmptyCard(title, copy) {
    return `
        <div class="empty-card">
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(copy)}</p>
        </div>
    `;
}

function resolveImage(value) {
    const path = String(value || "").trim();

    if (!path) {
        return "../img/serv.png";
    }

    if (path.startsWith("data:image/") || path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    if (path.startsWith("../") || path.startsWith("./") || path.startsWith("img/")) {
        return path;
    }

    return "../img/serv.png";
}

function formatMode(mode) {
    return mode === "local" ? "Servicio en local" : "Servicio a domicilio";
}

function formatDate(timestamp) {
    const numeric = Number(timestamp) || Date.now();
    return new Date(numeric).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatName(name) {
    const parts = String(name || "Usuario").trim().split(/\s+/);
    if (parts.length <= 1) {
        return parts[0];
    }

    return `${parts[0]} ${parts[1][0]}.`;
}

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
