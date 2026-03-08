import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const IMG_DEFAULT = "img/image.png"; // Asegúrate de que esta ruta existe

function formatName(name) {
    if (!name) return "Usuario";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        document.getElementById('user-display').innerText = formatName(user.displayName);
        document.getElementById('user-avatar').src = user.photoURL || IMG_DEFAULT;
        
        // Actualizar mis datos en la lista global de miembros al entrar
        update(ref(db, `users/${user.uid}`), {
            name: user.displayName || "Usuario",
            photo: user.photoURL || "",
            lastSeen: Date.now() // Opcional: para saber cuándo entró
        });

        loadServices();
        loadAllMembers(); // Carga a todos los registrados
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }
});

// NUEVA FUNCIÓN: Carga a TODOS los miembros registrados
function loadAllMembers() {
    const listUI = document.getElementById('suggested-users-list');
    onValue(ref(db, 'users'), (snapshot) => {
        listUI.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(uid => {
                const u = data[uid];
                // Saltamos nuestro propio perfil si queremos, o lo dejamos. 
                // Aquí lo dejamos para que veas la lista completa.
                const userPhoto = u.photo && u.photo !== "" ? u.photo : IMG_DEFAULT;
                listUI.innerHTML += `
                    <div class="user-item">
                        <img src="${userPhoto}" onerror="this.src='${IMG_DEFAULT}'">
                        <div class="user-item-info">
                            <strong>${formatName(u.name)}</strong>
                            <span>Miembro de ServiceHub</span>
                        </div>
                    </div>`;
            });
        }
    });
}

// Publicar Servicio
window.uploadService = () => {
    const sName = document.getElementById('service-name').value;
    const sTime = document.getElementById('service-time').value;
    if (sName && sTime) {
        push(ref(db, 'services'), {
            name: sName,
            time: sTime,
            ownerName: formatName(auth.currentUser.displayName),
            ownerPhoto: auth.currentUser.photoURL || "",
            uid: auth.currentUser.uid
        });
        document.getElementById('service-name').value = '';
        document.getElementById('service-time').value = '';
    }
};

// Cargar Servicios
function loadServices() {
    onValue(ref(db, 'services'), (snapshot) => {
        const list = document.getElementById('service-list');
        list.innerHTML = ''; // Limpiamos el contenedor
        
        const title = document.createElement('h3');
        title.textContent = "Servicios de la Comunidad";
        title.style.color = "white";
        list.appendChild(title);

        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const s = data[key];
                const pic = s.ownerPhoto || IMG_DEFAULT;

                // Creamos los elementos uno a uno para evitar XSS
                const card = document.createElement('div');
                card.className = 'service-card';
                card.style.display = 'flex';
                card.style.gap = '12px';

                const img = document.createElement('img');
                img.src = pic;
                img.style.width = '45px';
                img.style.height = '45px';
                img.style.borderRadius = '50%';
                img.onerror = () => { img.src = IMG_DEFAULT; };

                const infoDiv = document.createElement('div');
                
                const name = document.createElement('strong');
                name.textContent = s.name; // <--- SEGURO: No interpreta HTML

                const time = document.createElement('small');
                time.style.display = 'block';
                time.textContent = s.time; // <--- SEGURO

                const author = document.createElement('span');
                author.style.fontSize = '11px';
                author.style.color = 'var(--primary)';
                author.textContent = `Publicado por ${s.ownerName}`; // <--- SEGURO

                infoDiv.append(name, document.createElement('br'), time, author);
                card.append(img, infoDiv);
                list.appendChild(card);
            });
        }
    });
}

window.handleAuth = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('full-name').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        if(!name) return alert("Escribe tu nombre para el registro");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await set(ref(db, `users/${cred.user.uid}`), { name: name, photo: "" });
        location.reload();
    }
};
window.logout = () => signOut(auth);

