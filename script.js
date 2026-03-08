import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, set, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURACIÓN ---
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
const IMG_DEFAULT = "img/image.png";

let currentRecipient = null;

// --- UTILIDADES ---
function formatName(name) {
    if (!name) return "Usuario";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

// --- AUTENTICACIÓN Y ESTADO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        document.getElementById('user-display').textContent = formatName(user.displayName);
        document.getElementById('user-avatar').src = user.photoURL || IMG_DEFAULT;
        
        // Registro/Actualización de usuario en Directorio
        const userRef = ref(db, `users/${user.uid}`);
        await update(userRef, {
            name: user.displayName || "Usuario",
            photo: user.photoURL || ""
        });

        loadServices();
        loadMembers();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }
});

window.handleAuth = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const name = document.getElementById('full-name').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if(!name) return alert("Escribe tu nombre para crear cuenta");
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
        await set(ref(db, `users/${cred.user.uid}`), { name: name, photo: "" });
        location.reload();
    }
};

window.logout = () => signOut(auth);

// --- GESTIÓN DE SERVICIOS (PROTECCIÓN XSS) ---
window.uploadService = () => {
    const n = document.getElementById('service-name').value;
    const t = document.getElementById('service-time').value;
    if (n && t) {
        push(ref(db, 'services'), {
            name: n,
            time: t,
            ownerName: formatName(auth.currentUser.displayName),
            ownerPhoto: auth.currentUser.photoURL || "",
            uid: auth.currentUser.uid,
            timestamp: Date.now()
        });
        document.getElementById('service-name').value = '';
        document.getElementById('service-time').value = '';
    }
};

function loadServices() {
    onValue(ref(db, 'services'), (snapshot) => {
        const list = document.getElementById('service-list');
        list.innerHTML = ''; 
        
        const title = document.createElement('h3');
        title.textContent = "Servicios de la Comunidad";
        title.style.color = "white";
        list.appendChild(title);

        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const s = data[key];
                const card = document.createElement('div');
                card.className = 'service-card';

                // Imagen
                const img = document.createElement('img');
                img.className = 'service-avatar';
                img.src = s.ownerPhoto || IMG_DEFAULT;
                img.onerror = () => { img.src = IMG_DEFAULT; };

                // Contenido
                const info = document.createElement('div');
                info.className = 'service-info';

                const titleS = document.createElement('h4');
                titleS.textContent = s.name;

                const timeS = document.createElement('p');
                timeS.textContent = `📅 ${s.time}`;

                const authorS = document.createElement('span');
                authorS.className = 'author';
                authorS.textContent = `Publicado por ${s.ownerName}`;

                info.append(titleS, timeS, authorS);

                // Botón Contactar (XSS Safe)
                if (s.uid !== auth.currentUser.uid) {
                    const btn = document.createElement('button');
                    btn.textContent = "💬 Contactar";
                    btn.className = "btn-contact";
                    btn.onclick = () => openModal(s.uid, s.ownerName, s.name);
                    info.appendChild(btn);
                } else {
                    const btnDel = document.createElement('button');
                    btnDel.textContent = "Eliminar";
                    btnDel.style.background = "var(--danger)";
                    btnDel.onclick = () => { if(confirm("¿Borrar?")) remove(ref(db, `services/${key}`)); };
                    info.appendChild(btnDel);
                }

                card.append(img, info);
                list.appendChild(card);
            });
        }
    });
}

// --- MENSAJERÍA (MODAL) ---
window.openModal = (uid, name, service) => {
    currentRecipient = { uid, name };
    document.getElementById('msg-recipient-name').textContent = name;
    document.getElementById('msg-service-title').textContent = service;
    document.getElementById('message-modal').classList.remove('hidden');
};

window.closeModal = () => {
    document.getElementById('message-modal').classList.add('hidden');
    document.getElementById('msg-text').value = '';
};

window.sendMessage = async () => {
    const text = document.getElementById('msg-text').value;
    if (!text.trim()) return alert("Escribe un mensaje");

    try {
        await push(ref(db, `messages/${currentRecipient.uid}`), {
            fromName: auth.currentUser.displayName,
            fromUid: auth.currentUser.uid,
            message: text,
            service: document.getElementById('msg-service-title').textContent,
            timestamp: Date.now()
        });
        alert("Mensaje enviado");
        closeModal();
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// --- DIRECTORIO DE MIEMBROS ---
function loadMembers() {
    const listUI = document.getElementById('suggested-users-list');
    onValue(ref(db, 'users'), (snapshot) => {
        listUI.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(uid => {
                const u = data[uid];
                const item = document.createElement('div');
                item.className = 'user-item';

                const img = document.createElement('img');
                img.src = u.photo || IMG_DEFAULT;
                img.onerror = () => { img.src = IMG_DEFAULT; };

                const info = document.createElement('div');
                info.className = 'user-item-info';
                
                const name = document.createElement('strong');
                name.textContent = formatName(u.name);
                
                const status = document.createElement('span');
                status.textContent = "Miembro";

                info.append(name, status);
                item.append(img, info);
                listUI.appendChild(item);
            });
        }
    });
}
