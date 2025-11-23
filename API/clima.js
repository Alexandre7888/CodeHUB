// api.js - API com localização atual e notificações próximas
(function() {
    const API_BASE_URL = 'https://html-15e80-default-rtdb.firebaseio.com';
    let currentToken = null;
    let mapData = null;
    let userLocation = null;
    let allReports = [];

    // Pega o token da URL do SCRIPT
    function getTokenFromScriptURL() {
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        const scriptUrl = currentScript.src;
        const urlParams = new URLSearchParams(scriptUrl.split('?')[1]);
        return urlParams.get('token');
    }

    // Função para validar token
    async function validateToken(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/tokens/${token}.json`);
            const tokenData = await response.json();
            if (tokenData && tokenData !== null) {
                currentToken = token;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            return false;
        }
    }

    // Função para buscar relatórios
    async function getReports() {
        try {
            const response = await fetch(`${API_BASE_URL}/reports.json`);
            const reports = await response.json();
            
            if (!reports) return [];
            
            const reportsArray = Object.entries(reports).map(([id, data]) => ({
                id,
                ...data
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return reportsArray;
        } catch (error) {
            throw new Error('Erro ao carregar dados');
        }
    }

    // Calcular distância entre duas coordenadas (Haversine)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distância em km
    }

    // Encontrar relatórios próximos
    function findNearbyReports(userLat, userLon, radiusKm = 5) {
        return allReports.filter(report => {
            if (typeof report.latitude !== 'number' || typeof report.longitude !== 'number') {
                return false;
            }
            const distance = calculateDistance(userLat, userLon, report.latitude, report.longitude);
            report.distance = distance; // Adiciona a distância ao relatório
            return distance <= radiusKm;
        }).sort((a, b) => a.distance - b.distance); // Ordena por distância
    }

    // Obter localização do usuário
    function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalização não suportada'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    userLocation = location;
                    resolve(location);
                },
                (error) => {
                    let errorMessage = 'Erro ao obter localização: ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Permissão negada';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Localização indisponível';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Tempo esgotado';
                            break;
                        default:
                            errorMessage += 'Erro desconhecido';
                    }
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    // Criar botão de localização
    function createLocationButton() {
        const button = document.createElement('button');
        button.innerHTML = '📍 Minha Localização';
        button.style.cssText = `
            position: absolute;
            top: 80px;
            right: 10px;
            z-index: 1000;
            background: #35a17b;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        
        button.onclick = async () => {
            try {
                button.innerHTML = '📍 Obtendo localização...';
                button.disabled = true;
                
                const location = await getUserLocation();
                
                // Mover mapa para a localização
                mapData.map.setView([location.lat, location.lng], 14);
                
                // Adicionar marcador da localização atual
                if (mapData.userLocationMarker) {
                    mapData.userLocationMarker.remove();
                }
                
                mapData.userLocationMarker = L.marker([location.lat, location.lng], {
                    icon: L.divIcon({
                        html: '<div style="background: #35a17b; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px;">📍</div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(mapData.markersLayer);
                
                mapData.userLocationMarker.bindPopup(`
                    <strong>Sua Localização</strong><br>
                    Lat: ${location.lat.toFixed(6)}<br>
                    Lng: ${location.lng.toFixed(6)}<br>
                    <small>Precisão: ±${Math.round(location.accuracy)}m</small>
                `).openPopup();
                
                // Mostrar notificações próximas
                showNearbyNotifications(location.lat, location.lng);
                
                button.innerHTML = '📍 Localização Atual';
                button.disabled = false;
                
            } catch (error) {
                alert(error.message);
                button.innerHTML = '📍 Minha Localização';
                button.disabled = false;
            }
        };
        
        return button;
    }

    // Mostrar notificações próximas
    function showNearbyNotifications(userLat, userLng) {
        const nearbyReports = findNearbyReports(userLat, userLng, 5); // 5km de raio
        
        if (nearbyReports.length === 0) {
            alert('✅ Nenhum relatório próximo encontrado em um raio de 5km.');
            return;
        }
        
        // Criar modal com notificações próximas
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2000;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #333;">📢 Relatórios Próximos</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <p style="margin: 0 0 15px 0; color: #666; font-size: 12px;">
                ${nearbyReports.length} relatório(s) encontrado(s) em um raio de 5km
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${nearbyReports.map(report => `
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px; background: #f9f9f9;">
                        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 5px;">
                            <strong style="flex: 1;">${report.resumoCurto || 'Sem título'}</strong>
                            <span style="font-size: 10px; color: #666; background: #e0e0e0; padding: 2px 6px; border-radius: 10px;">
                                ${report.distance.toFixed(1)}km
                            </span>
                        </div>
                        <div style="font-size: 11px; color: #666;">
                            ${climaToIcon(report.clima)} ${report.clima} • 
                            💧 ${report.riscoAlagamento || 'desconhecido'}
                        </div>
                        <div style="font-size: 10px; color: #888; margin-top: 5px;">
                            ${formatDate(report.createdAt)}
                        </div>
                        <button onclick="focusOnReport('${report.id}')" style="margin-top: 8px; background: #35a17b; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">
                            Ver no Mapa
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Focar no relatório no mapa
    window.focusOnReport = function(reportId) {
        const report = allReports.find(r => r.id === reportId);
        if (report && typeof report.latitude === 'number' && typeof report.longitude === 'number') {
            mapData.map.setView([report.latitude, report.longitude], 16);
            
            // Abrir popup do marcador
            mapData.markersLayer.getLayers().forEach(layer => {
                if (layer instanceof L.Marker) {
                    const latLng = layer.getLatLng();
                    if (latLng.lat === report.latitude && latLng.lng === report.longitude) {
                        layer.openPopup();
                    }
                }
            });
        }
        
        // Fechar modal
        const modal = document.querySelector('div[style*="position: fixed"]');
        if (modal) modal.remove();
    };

    // Carregar Leaflet
    function loadLeaflet() {
        return new Promise((resolve, reject) => {
            if (window.L) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            
            script.onload = () => setTimeout(resolve, 100);
            script.onerror = () => reject(new Error('Falha ao carregar Leaflet'));
            
            document.head.appendChild(script);
        });
    }

    // Inicializar mapa
    function initMap() {
        if (!window.L) {
            throw new Error('Leaflet não carregado');
        }

        const map = L.map("map", { zoomControl: false }).setView([-14.2350, -51.9253], 4);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: ""
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        
        return { map, markersLayer, userLocationMarker: null };
    }

    // Funções auxiliares
    function formatDate(ts) {
        if (!ts) return "";
        const d = new Date(ts);
        return isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit", 
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function climaToIcon(clima) {
        const icons = { "sol": "☀️", "chuva": "🌧️", "nublado": "☁️", "tempestade": "⛈️" };
        return icons[clima] || "🌤️";
    }

    function climaClass(clima) {
        const classes = { "sol": "sun", "chuva": "rain", "nublado": "cloud", "tempestade": "storm" };
        return classes[clima] || "cloud";
    }

    function riscoClass(risco) {
        const classes = { "baixo": "risk-low", "moderado": "risk-moderate", "alto": "risk-high", "crítico": "risk-critical" };
        return classes[risco] || "risk-low";
    }

    // Atualizar mapa
    function updateMapMarkers(mapData, reports) {
        if (!mapData) return;
        
        mapData.markersLayer.clearLayers();
        const coords = [];

        reports.forEach(r => {
            if (typeof r.latitude === "number" && typeof r.longitude === "number") {
                const lat = r.latitude;
                const lng = r.longitude;
                coords.push([lat, lng]);

                const icon = L.divIcon({
                    html: `<div class="map-emoji-icon">${climaToIcon(r.clima)}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                const marker = L.marker([lat, lng], { icon });
                const title = r.resumoCurto || (r.descricao || "").slice(0, 80);
                marker.bindPopup(`
                    <strong>${climaToIcon(r.clima)} ${title}</strong><br>
                    ${r.riscoAlagamento ? `Risco: ${r.riscoAlagamento}` : ""}<br>
                    <small>${formatDate(r.createdAt)}</small>
                `);
                marker.addTo(mapData.markersLayer);
            }
        });

        if (coords.length === 0) {
            mapData.map.setView([-14.2350, -51.9253], 4);
        } else if (coords.length === 1) {
            mapData.map.setView(coords[0], 14);
        } else {
            const bounds = L.latLngBounds(coords);
            mapData.map.fitBounds(bounds.pad(0.2));
        }
    }

    // Renderizar lista
    function renderList(reports) {
        const listEl = document.getElementById("list");
        if (!listEl) return;
        
        listEl.innerHTML = "";
        
        if (!reports.length) {
            listEl.innerHTML = '<div class="empty">Nenhum relatório disponível.</div>';
            return;
        }

        reports.forEach(r => {
            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${r.resumoCurto || (r.descricao || "").slice(0, 70)}</div>
                    <div class="card-meta">${formatDate(r.createdAt)}</div>
                </div>
                <div>
                    <div class="weather-chip ${climaClass(r.clima)}">
                        <span>${climaToIcon(r.clima)}</span>
                        <span style="text-transform:capitalize;">${r.clima || "indef."}</span>
                    </div>
                    <div class="risk-chip ${riscoClass(r.riscoAlagamento)}">
                        <span>💧</span>
                        <span>${r.riscoAlagamento || "desconhecido"}</span>
                    </div>
                </div>
                <div class="summary">${r.descricao || ""}</div>
                ${r.condicoesCeu ? `<div class="details">Céu: ${r.condicoesCeu}</div>` : ''}
                ${r.relatorioCompleto ? `<div class="details">${r.relatorioCompleto}</div>` : ''}
                <div class="location">
                    Localização: ${typeof r.latitude === "number" ? 
                        `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 
                        "Não informada"}
                </div>
                ${Array.isArray(r.photoUrls) && r.photoUrls.length > 0 ? `
                <div class="photos">
                    ${r.photoUrls.slice(0, 3).map(url => 
                        `<img src="${url}" alt="Foto do local" onerror="this.style.display='none'" />`
                    ).join('')}
                </div>
                ` : ''}
            `;

            listEl.appendChild(card);
        });
    }

    // Sincronização
    function startSync() {
        setInterval(async () => {
            try {
                const reports = await getReports();
                allReports = reports; // Salva todos os relatórios
                renderList(reports);
                updateMapMarkers(mapData, reports);
                
                const badgeText = document.getElementById('badgeText');
                if (badgeText) {
                    const now = new Date().toLocaleTimeString('pt-BR');
                    badgeText.textContent = `Atualizado • ${reports.length} relatórios • ${now}`;
                }
            } catch (error) {
                console.error('Erro na sincronização:', error);
            }
        }, 5000);
    }

    // Inicializar aplicação
    async function initApp() {
        try {
            const badgeText = document.getElementById('badgeText');
            if (badgeText) badgeText.textContent = 'Validando token...';

            const token = getTokenFromScriptURL();
            if (!token) {
                throw new Error('Token não encontrado na URL do script');
            }

            const isValid = await validateToken(token);
            if (!isValid) {
                throw new Error(`Token "${token}" inválido`);
            }

            if (badgeText) badgeText.textContent = 'Carregando mapa...';
            await loadLeaflet();
            
            if (badgeText) badgeText.textContent = 'Carregando dados...';
            mapData = initMap();
            
            // Adicionar botão de localização
            const locationButton = createLocationButton();
            document.getElementById('map').appendChild(locationButton);
            
            const reports = await getReports();
            allReports = reports; // Salva todos os relatórios
            
            renderList(reports);
            updateMapMarkers(mapData, reports);
            
            if (badgeText) {
                badgeText.textContent = `Atualizado • ${reports.length} relatórios`;
            }
            
            startSync();
            
        } catch (error) {
            console.error('Erro:', error);
            const badgeText = document.getElementById('badgeText');
            const listEl = document.getElementById("list");
            
            if (badgeText) badgeText.textContent = 'Erro';
            if (listEl) {
                listEl.innerHTML = `<div class="error">Erro: ${error.message}</div>`;
            }
        }
    }

    // Inicializar automaticamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();