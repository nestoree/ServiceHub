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

// Verificar si el usuario está conectado
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadMyMessages(user.uid);
    } else {
        // Si alguien intenta entrar sin loguearse, lo echamos al inicio
        window.location.href = "../index.html"; 
    }
});

function loadMyMessages(myUid) {
    const list = document.getElementById('messages-list');
    
    // Solo leemos de la ruta donde están MIS mensajes
    const myMessagesRef = ref(db, `messages/${myUid}`);

    onValue(myMessagesRef, (snapshot) => {
        list.innerHTML = '';
        const data = snapshot.val();

        if (data) {
            // Recorremos los mensajes al revés para ver los más nuevos primero
            Object.keys(data).reverse().forEach(key => {
                const msg = data[key];
                
                const card = document.createElement('div');
                card.className = 'message-card';

                // --- CABECERA (Remitente y Asunto) ---
                const header = document.createElement('div');
                header.className = 'msg-header';

                const senderInfo = document.createElement('div');
                const senderName = document.createElement('span');
                senderName.className = 'msg-sender';
                senderName.textContent = msg.fromName; // XSS Safe
                
                const dateText = document.createElement('div');
                dateText.className = 'msg-date';
                const dateObj = new Date(msg.timestamp);
                dateText.textContent = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString();

                senderInfo.append(senderName, dateText);

                const serviceTag = document.createElement('span');
                serviceTag.className = 'msg-service';
                serviceTag.textContent = `Asunto: ${msg.service}`; // XSS Safe

                header.append(senderInfo, serviceTag);

                // --- CUERPO DEL MENSAJE ---
                const body = document.createElement('div');
                body.className = 'msg-body';
                body.textContent = msg.message; // XSS Safe

                // --- BOTÓN ELIMINAR ---
                const btnDel = document.createElement('button');
                btnDel.className = 'btn-delete';
                btnDel.textContent = '🗑️ Borrar Mensaje';
                btnDel.onclick = () => {
                    if(confirm("¿Seguro que quieres borrar este mensaje?")) {
                        remove(ref(db, `messages/${myUid}/${key}`));
                    }
                };

                card.append(header, body, btnDel);
                list.appendChild(card);
            });
        } else {
            list.innerHTML = `
                <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 10px; text-align: center;">
                    <h3 style="color: white;">Buzón vacío</h3>
                    <p style="color: #aaa; margin-top: 10px;">Aún no has recibido ningún mensaje. ¡Publica más servicios!</p>
                </div>`;
        }
    });
}