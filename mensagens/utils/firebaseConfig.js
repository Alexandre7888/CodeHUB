// Firebase configuration from user request (Updated)
const firebaseConfig = {
  apiKey: "AIzaSyBzRLpZJDMeFASIjje4SJBfTInIEO-GKVI",
  authDomain: "html-785e3.firebaseapp.com",
  databaseURL: "https://html-785e3-default-rtdb.firebaseio.com",
  projectId: "html-785e3",
  messagingSenderId: "389467952076",
  appId: "1:389467952076:web:3ca975c5e5844bca494369",
  measurementId: "G-DK4VKMHC1B"
};

// Initialize Firebase
let db = null;
let auth = null;

try {
    if (window.firebase) {
        // Prevent double initialization
        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
        }
        db = window.firebase.database();
        auth = window.firebase.auth();
        console.log("Firebase initialized successfully (New Config)");
    } else {
        console.error("Firebase SDK not loaded");
    }
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Function to backup logs ("looks")
window.backupLogToFirebase = (logData) => {
    if (db) {
        try {
            const logsRef = db.ref('logs');
            logsRef.push({
                ...logData,
                timestamp:  window.firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.error("Failed to backup log", e);
        }
    }
};

window.firebaseDB = db;