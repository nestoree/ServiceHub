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
            list.innerHTML = '<div style="text-align:center; color:white; padding:50px;"><h3>Tu buzón está limpio</h3><p>No tienes mensajes ni chats pendientes.</p></div>';
            return;
        }

        Object.keys(data).forEach(key => {
            const m = data[key];
            const card = document.createElement('div');
            card.className = 'message-card';

            // Construcción segura de la tarjeta
            const header = document.createElement('div');
            header.className = 'msg-header';
            header.innerHTML = `<span class="msg-sender">${m.fromName}</span><span class="msg-service">${m.service}</span>`;

            const body = document.createElement('div');
            body.className = 'msg-body';
            body.textContent = m.message;

            const actions = document.createElement('div');
            actions.className = 'btn-group';

            const btnChat = document.createElement('button');
            btnChat.className = 'btn-chat';
            btnChat.textContent = "💬 Abrir Chat";
            btnChat.onclick = () => {
                window.location.href = `chat.html?uid=${m.fromUid}&name=${encodeURIComponent(m.fromName)}`;
            };

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-delete';
            btnDel.textContent = "🗑️ Borrar";
            btnDel.onclick = () => {
                if(confirm("¿Eliminar esta conversación del buzón?")) {
                    remove(ref(db, `messages/${myUid}/${key}`));
                }
            };

            actions.append(btnChat, btnDel);
            card.append(header, body, actions);
            list.appendChild(card);
        });
    });
}
