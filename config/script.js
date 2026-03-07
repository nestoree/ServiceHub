import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const imgDefault = "../img/image.png";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('new-name').value = user.displayName || "";
        document.getElementById('new-photo').value = user.photoURL || "";
        document.getElementById('prev-img').src = user.photoURL || imgDefault;
        
        const snap = await get(ref(db, `users/${user.uid}`));
        if (snap.exists()) document.getElementById('new-desc').value = snap.val().description || "";
    } else {
        window.location.href = '../index.html';
    }
});

window.save = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('new-name').value;
    const photo = document.getElementById('new-photo').value;
    const desc = document.getElementById('new-desc').value;

    try {
        await updateProfile(user, { displayName: name, photoURL: photo });
        await update(ref(db, `users/${user.uid}`), {
            name: name,
            photo: photo,
            description: desc
        });
        alert("¡Perfil actualizado con éxito!");
        window.location.href = '../index.html';
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
};