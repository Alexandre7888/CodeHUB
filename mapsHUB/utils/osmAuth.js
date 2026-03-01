// Utilities for OpenStreetMap Authentication & API

const OSM_CLIENT_ID = "bS5NAv5ZAdGpZlbjv73oGwotdPWPy3A0l0OhOVvTeMI";
const TOKEN_ENDPOINT = "https://code-hub-eta.vercel.app/api/map.js";

// Helper to get clean redirect URL (current page without query params)
function getRedirectURI() {
    return window.location.origin + window.location.pathname;
}

// 1. Start Login Flow
function loginOSM() {
    const redirectUri = getRedirectURI();
    const url =
        "https://www.openstreetmap.org/oauth2/authorize" +
        "?response_type=code" +
        "&client_id=" + encodeURIComponent(OSM_CLIENT_ID) +
        "&redirect_uri=" + encodeURIComponent(redirectUri) +
        "&scope=read_prefs write_api";
    
    window.location.href = url;
}

// 2. Process Callback Code
async function processOSMCode(code) {
    const redirectUri = getRedirectURI();
    try {
        const response = await fetch(`${TOKEN_ENDPOINT}?redirectUri=${encodeURIComponent(redirectUri)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code: code })
        });
        
        if (!response.ok) throw new Error("Falha na troca do token");
        
        // The proxy might return text or JSON. We handle both.
        const textData = await response.text();
        let tokenData;
        
        try {
            tokenData = JSON.parse(textData);
        } catch (e) {
            // If it's not JSON, assume the text itself is the access token or error
            console.warn("Non-JSON response from token proxy", textData);
            tokenData = { access_token: textData };
        }

        // Validate if we actually got a token-like structure
        if (!tokenData || (!tokenData.access_token && !tokenData.access_token_secret && typeof tokenData !== 'string')) {
             throw new Error("Resposta de token inválida");
        }

        // Save to LocalStorage
        const session = {
            token: tokenData,
            timestamp: Date.now()
        };
        localStorage.setItem('osm_session', JSON.stringify(session));
        
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, document.title, url.toString());

        return session;
    } catch (e) {
        console.error("OSM Auth Error:", e);
        return null;
    }
}

// 3. Get Current OSM User Session
function getOSMSession() {
    const stored = localStorage.getItem('osm_session');
    if (!stored) return null;
    return JSON.parse(stored);
}

// 4. Logout
function logoutOSM() {
    localStorage.removeItem('osm_session');
    window.location.reload();
}

// 5. Fetch User Details (Optional, to show name)
async function fetchOSMUserDetails(token) {
    try {
        // This requires the XML response parsing usually, keeping it simple for now
        // Assuming we just use the token presence as "Logged In" status
        return { connected: true };
    } catch (e) {
        return null;
    }
}