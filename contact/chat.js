import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const urlParams = new URLSearchParams(window.location.search);
const otherUid = urlParams.get('uid');
const otherName = urlParams.get('name');

document.getElementById('chat-partner-name').textContent = otherName || "Chat";

let chatId = null;
let myUid = null;

onAuthStateChanged(auth, (user) => {
    if (user && otherUid) {
        myUid = user.uid;
        // ID de sala única (alfabético para que ambos entren a la misma)
        chatId = myUid < otherUid ? `${myUid}_${otherUid}` : `${otherUid}_${myUid}`;
        loadMessages();
    } else if (!user) {
        window.location.href = "../index.html";
    }
});

function loadMessages() {
    const history = document.getElementById('chat-history');
    onValue(ref(db, `chats/${chatId}`), (snapshot) => {
        history.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.values(data).forEach(m => {
                const bubble = document.createElement('div');
                bubble.className = `chat-bubble ${m.senderUid === myUid ? 'me' : 'them'}`;
                
                const time = new Date(m.timestamp);
                const timeStr = `${time.getHours()}:${time.getMinutes().toString().padStart(2,'0')}`;
                
                // Usamos textContent para el mensaje (Seguridad XSS)
                const textNode = document.createElement('div');
                textNode.textContent = m.text;
                
                const timeNode = document.createElement('div');
                timeNode.className = 'chat-time';
                timeNode.textContent = timeStr;

                bubble.append(textNode, timeNode);
                history.appendChild(bubble);
            });
            history.scrollTop = history.scrollHeight;
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (text && chatId && otherUid) {
        input.value = ''; // Limpiar UI rápido
        const now = Date.now();

        // 1. Guardar en la sala de chat
        await push(ref(db, `chats/${chatId}`), {
            text: text,
            senderUid: myUid,
            timestamp: now
        });

        // 2. Notificar al receptor (Actualiza su buzón de entrada)
        // Usamos la ID del emisor como clave para no duplicar tarjetas de la misma persona
        await set(ref(db, `messages/${otherUid}/${myUid}`), {
            fromName: auth.currentUser.displayName || "Usuario",
            fromUid: myUid,
            message: "Nuevo mensaje de chat: " + text.substring(0, 30) + "...",
            service: "Chat en vivo",
            timestamp: now
        });
    }
}

document.getElementById('btn-send-chat').onclick = sendMessage;
document.getElementById('chat-input').onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
