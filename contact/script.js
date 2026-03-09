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

onAuthStateChanged(auth, (user) => {
    if (user) { loadMyMessages(user.uid); }
    else { window.location.href = "../index.html"; }
});

function loadMyMessages(myUid) {
    const list = document.getElementById('messages-list');
    onValue(ref(db, `messages/${myUid}`), (snapshot) => {
        list.innerHTML = '';
        const data = snapshot.val();
        if (!data) {
            list.innerHTML = '<p style="color:white; text-align:center;">No tienes mensajes nuevos.</p>';
            return;
        }

        Object.keys(data).reverse().forEach(key => {
            const m = data[key];
            const card = document.createElement('div');
            card.className = 'message-card';

            card.innerHTML = `
                <div class="msg-header">
                    <span class="msg-sender">${m.fromName}</span>
                    <span class="msg-service">${m.service}</span>
                </div>
                <div class="msg-body">${m.message}</div>
                <div class="btn-group">
                    <button class="btn-chat" onclick="window.location.href='chat.html?uid=${m.fromUid}&name=${encodeURIComponent(m.fromName)}'">💬 Responder / Chat</button>
                    <button class="btn-delete" id="del-${key}">🗑️ Borrar</button>
                </div>
            `;
            list.appendChild(card);

            document.getElementById(`del-${key}`).onclick = () => {
                if(confirm("¿Eliminar este mensaje?")) remove(ref(db, `messages/${myUid}/${key}`));
            };
        });
    });
}
