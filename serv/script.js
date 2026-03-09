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

// AHORA ES UN ARRAY PARA GUARDAR VARIAS HORAS
let selectedTimes = []; 

// 1. Generar botones
const timeGrid = document.getElementById('time-grid');
for (let h = 9; h <= 20; h++) {
    const timeStr = `${h.toString().padStart(2, '0')}:00`;
    const btn = document.createElement('button');
    btn.textContent = timeStr;
    btn.className = 'time-btn';
    btn.onclick = () => toggleTime(timeStr, btn);
    timeGrid.appendChild(btn);
}

// 2. Lógica para SELECCIÓN MÚLTIPLE
function toggleTime(time, element) {
    element.classList.toggle('active'); // Alterna el color visualmente
    
    if (selectedTimes.includes(time)) {
        // Si ya estaba, lo quitamos
        selectedTimes = selectedTimes.filter(t => t !== time);
    } else {
        // Si no estaba, lo añadimos
        selectedTimes.push(time);
    }
    
    // Ordenamos las horas para que se vean bonitas (ej: 09:00, 10:00, 15:00)
    selectedTimes.sort();
    
    document.getElementById('display-time').textContent = selectedTimes.length > 0 ? selectedTimes.join(', ') : 'Ninguna';
}

// 3. Lógica de Publicación
document.getElementById('btn-post').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('service-name').value.trim();
    let imgUrl = document.getElementById('service-image').value.trim();

    if (!user) return alert("Debes estar logueado para publicar.");
    if (!name) return alert("Por favor, escribe el nombre del servicio.");
    if (selectedTimes.length === 0) return alert("Debes seleccionar al menos una hora del horario.");

    // LÓGICA DE LA IMAGEN POR DEFECTO
    // Nota: ponemos "../img/serv.png" porque estamos dentro de la carpeta /serv
    if (!imgUrl) {
        imgUrl = "../img/serv.png"; 
    }

    try {
        await push(ref(db, 'services'), {
            name: name,
            time: selectedTimes.join(', '), // Guarda "09:00, 10:00, 14:00"
            serviceImage: imgUrl,           // NUEVO: Guarda la imagen del servicio
            ownerName: user.displayName || "Usuario",
            ownerPhoto: user.photoURL || "",
            uid: user.uid,
            timestamp: Date.now()
        });
        alert("¡Servicio publicado con éxito!");
        window.location.href = "../index.html";
    } catch (e) {
        alert("Error al publicar: " + e.message);
    }
};
