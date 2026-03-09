import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURACIÓN DE FIREBASE ---
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

// Imágenes por defecto
const IMG_DEFAULT_AVATAR = "img/image.png"; 
const IMG_DEFAULT_SERV = "img/serv.png";

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
        document.getElementById('user-avatar').src = user.photoURL || IMG_DEFAULT_AVATAR;
        
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

// --- CARGA DE SERVICIOS (Protegido contra XSS y con Imágenes) ---
function loadServices() {
    onValue(ref(db, 'services'), (snapshot) => {
        const list = document.getElementById('service-list');
        list.innerHTML = ''; 
        
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const s = data[key];
                
                const card = document.createElement('div');
                card.className = 'service-card';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.gap = '10px';

                // 1. Cabecera del Autor (Foto + Nombre)
                const authorHeader = document.createElement('div');
                authorHeader.style.display = 'flex';
                authorHeader.style.alignItems = 'center';
                authorHeader.style.gap = '10px';

                const authorAvatar = document.createElement('img');
                authorAvatar.src = s.ownerPhoto || IMG_DEFAULT_AVATAR;
                authorAvatar.onerror = () => { authorAvatar.src = IMG_DEFAULT_AVATAR; };
                authorAvatar.style.width = '35px';
                authorAvatar.style.height = '35px';
                authorAvatar.style.borderRadius = '50%';
                authorAvatar.style.objectFit = 'cover';

                const authorName = document.createElement('strong');
                authorName.textContent = s.ownerName;

                authorHeader.append(authorAvatar, authorName);

                // 2. Imagen del Servicio
                const servImg = document.createElement('img');
                // Si viene de /serv, la ruta de fallback en s.serviceImage podría ser "../img/serv.png", 
                // pero si s.serviceImage es un enlace web normal, funcionará perfecto.
                servImg.src = s.serviceImage && s.serviceImage.startsWith('http') ? s.serviceImage : IMG_DEFAULT_SERV; 
                servImg.onerror = () => { servImg.src = IMG_DEFAULT_SERV; };
                servImg.style.width = '100%';
                servImg.style.height = '180px';
                servImg.style.objectFit = 'cover';
                servImg.style.borderRadius = '8px';

                // 3. Info del Servicio
                const titleS = document.createElement('h3');
                titleS.textContent = s.name;
                titleS.style.margin = '5px 0 0 0';
                titleS.style.color = 'var(--dark)';

                const timeS = document.createElement('p');
                timeS.textContent = `🕒 Horarios: ${s.time}`;
                timeS.style.fontSize = '14px';
                timeS.style.color = '#555';
                timeS.style.margin = '0 0 10px 0';

                // 4. Botones de Acción
                const actionDiv = document.createElement('div');
                
                if (s.uid !== auth.currentUser.uid) {
                    const btnContact = document.createElement('button');
                    btnContact.textContent = "💬 Contactar";
                    btnContact.className = "btn-publish"; // Usa el estilo verde de tu CSS
                    btnContact.onclick = () => openModal(s.uid, s.ownerName, s.name);
                    actionDiv.appendChild(btnContact);
                } else {
                    const btnDel = document.createElement('button');
                    btnDel.textContent = "🗑️ Eliminar mi anuncio";
                    btnDel.style.background = "#e74c3c"; // Rojo para eliminar
                    btnDel.onclick = () => { if(confirm("¿Seguro que deseas borrar este servicio?")) remove(ref(db, `services/${key}`)); };
                    actionDiv.appendChild(btnDel);
                }

                // Ensamblar Tarjeta
                card.append(authorHeader, servImg, titleS, timeS, actionDiv);
                list.appendChild(card);
            });
        } else {
            list.innerHTML = '<p style="color:white; text-align:center;">Aún no hay servicios publicados. ¡Sé el primero!</p>';
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
        alert("Mensaje enviado con éxito");
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
                img.src = u.photo || IMG_DEFAULT_AVATAR;
                img.onerror = () => { img.src = IMG_DEFAULT_AVATAR; };

                const info = document.createElement('div');
                info.className = 'user-item-info';
                
                const name = document.createElement('strong');
                name.textContent = formatName(u.name);
                
                const status = document.createElement('span');
                status.textContent = "Miembro de la Red";

                info.append(name, status);
                item.append(img, info);
                listUI.appendChild(item);
            });
        } else {
            listUI.innerHTML = '<p style="color:#888; font-size:12px;">No hay miembros aún.</p>';
        }
    });
}
