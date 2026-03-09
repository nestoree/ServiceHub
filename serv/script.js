import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let selectedTime = "";

// 1. Generar botones de 09:00 a 20:00
const timeGrid = document.getElementById('time-grid');
for (let h = 9; h <= 20; h++) {
    const timeStr = `${h.toString().padStart(2, '0')}:00`;
    const btn = document.createElement('button');
    btn.textContent = timeStr;
    btn.className = 'time-btn';
    btn.onclick = () => selectTime(timeStr, btn);
    timeGrid.appendChild(btn);
}

function selectTime(time, element) {
    // Quitar clase active de otros
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    // Activar este
    element.classList.add('active');
    selectedTime = time;
    document.getElementById('display-time').textContent = time;
}

// 2. Lógica de Publicación
document.getElementById('btn-post').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('service-name').value.trim();

    if (!user) return alert("Debes estar logueado");
    if (!name || !selectedTime) return alert("Completa el nombre y selecciona una hora");

    try {
        await push(ref(db, 'services'), {
            name: name, // Automáticamente protegido si usamos textContent al leer
            time: selectedTime,
            ownerName: user.displayName || "Usuario",
            ownerPhoto: user.photoURL || "",
            uid: user.uid,
            timestamp: Date.now()
        });
        alert("¡Servicio publicado!");
        window.location.href = "../index.html"; // Redirigir al inicio
    } catch (e) {
        alert("Error al publicar: " + e.message);
    }
};