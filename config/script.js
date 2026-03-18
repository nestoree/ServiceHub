import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const state = {
    currentUser: null,
    photoUrl: "",
    photoFileData: "",
    photoSource: "url"
};

const dom = {
    profileStatus: document.getElementById("profile-status"),
    profileForm: document.getElementById("profile-form"),
    profileName: document.getElementById("profile-name"),
    profileLocation: document.getElementById("profile-location"),
    profileDescription: document.getElementById("profile-description"),
    profileMeta: document.getElementById("profile-meta"),
    profileTwitter: document.getElementById("profile-twitter"),
    profileOther: document.getElementById("profile-other"),
    profilePhotoUrl: document.getElementById("profile-photo-url"),
    profilePhotoFile: document.getElementById("profile-photo-file"),
    profilePhotoPreview: document.getElementById("profile-photo-preview"),
    profileFeedback: document.getElementById("profile-feedback")
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }

    state.currentUser = user;
    dom.profileStatus.textContent = `Sesión activa: ${formatName(user.displayName || user.email || "Usuario")}`;
    dom.profileName.value = user.displayName || "";
    dom.profilePhotoUrl.value = user.photoURL || "";
    state.photoUrl = user.photoURL || "";
    updateProfilePreview();

    try {
        const snapshot = await get(ref(db, `users/${user.uid}`));
        const profile = snapshot.exists() ? snapshot.val() : {};

        dom.profileLocation.value = profile.location || "";
        dom.profileDescription.value = profile.description || profile.bio || "";
        dom.profileMeta.value = profile.socials?.meta || "";
        dom.profileTwitter.value = profile.socials?.twitter || "";
        dom.profileOther.value = profile.socials?.other || "";

        if (!dom.profilePhotoUrl.value && profile.photo) {
            dom.profilePhotoUrl.value = profile.photo;
            state.photoUrl = profile.photo;
            updateProfilePreview();
        }
    } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
    }
});

dom.profilePhotoUrl.addEventListener("input", () => {
    state.photoUrl = dom.profilePhotoUrl.value.trim();
    state.photoSource = state.photoUrl ? "url" : (state.photoFileData ? "file" : "url");
    updateProfilePreview();
});

dom.profilePhotoFile.addEventListener("change", async () => {
    const file = dom.profilePhotoFile.files?.[0];
    if (!file) {
        return;
    }

    state.photoFileData = await readFileAsDataUrl(file);
    state.photoSource = "file";
    updateProfilePreview();
});

dom.profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.currentUser) {
        return;
    }

    const name = dom.profileName.value.trim();
    const location = dom.profileLocation.value.trim();
    const description = dom.profileDescription.value.trim();
    const meta = dom.profileMeta.value.trim();
    const twitter = dom.profileTwitter.value.trim();
    const other = dom.profileOther.value.trim();
    const finalPhoto = getFinalPhoto();

    if (!name) {
        showFeedback("El nombre público no puede quedarse vacío.", "error");
        return;
    }

    if (!description) {
        showFeedback("Añade una breve descripción del anunciante.", "error");
        return;
    }

    try {
        await updateProfile(state.currentUser, {
            displayName: name,
            photoURL: finalPhoto
        });

        await update(ref(db, `users/${state.currentUser.uid}`), {
            name,
            photo: finalPhoto,
            location,
            description,
            socials: {
                meta,
                twitter,
                other
            }
        });

        showFeedback("Perfil actualizado correctamente.", "success");
        window.setTimeout(() => {
            window.location.href = "../index.html";
        }, 850);
    } catch (error) {
        showFeedback(error.message || "No hemos podido guardar el perfil.", "error");
    }
});

function getFinalPhoto() {
    if (state.photoSource === "file" && state.photoFileData) {
        return state.photoFileData;
    }

    return state.photoUrl || "../img/image.png";
}

function updateProfilePreview() {
    dom.profilePhotoPreview.src = getFinalPhoto();
    dom.profilePhotoPreview.onerror = () => {
        dom.profilePhotoPreview.src = "../img/image.png";
    };
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
        reader.readAsDataURL(file);
    });
}

function showFeedback(message, tone = "info") {
    dom.profileFeedback.textContent = message;
    dom.profileFeedback.dataset.tone = tone;
    dom.profileFeedback.classList.remove("hidden");
}

function formatName(name) {
    const parts = String(name || "Usuario").trim().split(/\s+/);
    if (parts.length <= 1) {
        return parts[0];
    }

    return `${parts[0]} ${parts[1][0]}.`;
}
