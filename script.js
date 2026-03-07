import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDBbStIV1FTMfoGza12KoqstmBj_9sYpxo",
  authDomain: "slowcode-7596b.firebaseapp.com",
  databaseURL: "https://slowcode-7596b-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "slowcode-7596b",
  storageBucket: "slowcode-7596b.firebasestorage.app",
  messagingSenderId: "582717395006",
  appId: "1:582717395006:web:75e4e1f5afc1fcf62cc16f",
  measurementId: "G-KQFMQ4RJS7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Formatear Nombre (Ej: "Carlos Pérez" -> "Carlos P.")
function formatName(name) {
    if (!name) return "Usuario";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

// --- AUTENTICACIÓN ---
window.handleAuth = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full-name').value;

    if (!email || !password) return alert("Completa los campos");

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        if (!fullName) return alert("Para registrarte, introduce tu nombre completo primero.");
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCred.user, { displayName: fullName });
            location.reload();
        } catch (err) {
            alert("Error: " + err.message);
        }
    }
};

onAuthStateChanged(auth, (user) => {
    const main = document.getElementById('main-screen');
    const login = document.getElementById('login-screen');
    if (user) {
        login.classList.add('hidden');
        main.classList.remove('hidden');
        document.getElementById('user-display').innerText = formatName(user.displayName);
        loadServices();
    } else {
        login.classList.remove('hidden');
        main.classList.add('hidden');
    }
});

window.logout = () => signOut(auth);

// --- BASE DE DATOS ---
window.uploadService = () => {
    const name = document.getElementById('service-name').value;
    const time = document.getElementById('service-time').value;

    if (name && time) {
        const servicesRef = ref(db, 'services');
        push(servicesRef, {
            name,
            time,
            displayName: formatName(auth.currentUser.displayName),
            uid: auth.currentUser.uid
        });
        document.getElementById('service-name').value = '';
        document.getElementById('service-time').value = '';
    }
};

function loadServices() {
    const servicesRef = ref(db, 'services');
    onValue(servicesRef, (snapshot) => {
        const list = document.getElementById('service-list');
        list.innerHTML = '<h3>Servicios Disponibles</h3>';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const s = data[key];
                const isOwner = s.uid === auth.currentUser.uid;
                list.innerHTML += `
                    <div class="service-card">
                        <div class="service-info">
                            <strong>${s.name}</strong>
                            <span>${s.time}</span>
                            <small>Ofrecido por: ${s.displayName}</small>
                        </div>
                        ${isOwner 
                            ? `<button class="btn-delete" onclick="deleteService('${key}')">Borrar</button>` 
                            : `<button class="btn-hire" onclick="alert('Contactando con ${s.displayName}...')">Contratar</button>`}
                    </div>`;
            });
        } else {
            list.innerHTML += '<p>No hay servicios todavía.</p>';
        }
    });
}

window.deleteService = (id) => {
    if(confirm("¿Eliminar este servicio?")) remove(ref(db, `services/${id}`));
};