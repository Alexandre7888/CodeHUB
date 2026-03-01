// OSM API Utilities
const OSM_API_BASE = "https://api.openstreetmap.org/api/0.6";
// Use Trickle Proxy to avoid CORS on PUT/POST if needed, or direct if allowed. 
// OSM API usually supports CORS, but sometimes simple requests are better.
// We will try direct first, but for 'PUT' requests from browser, preflight might fail or be strict.
// Using Trickle Proxy for write operations to be safe.
const PROXY_PREFIX = "https://proxy-api.trickle-app.host/?url=";

async function createChangeset(comment, token) {
    const xml = `
    <osm>
        <changeset>
            <tag k="created_by" v="mapsHUB Web v1.0"/>
            <tag k="comment" v="${comment}"/>
        </changeset>
    </osm>`;

    const url = `${OSM_API_BASE}/changeset/create`;
    
    // Note: We use the proxy for the PUT request to ensure it goes through
    const proxyUrl = `${PROXY_PREFIX}${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/xml',
            'Authorization': `Bearer ${token}`
        },
        body: xml
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Erro ao abrir Changeset: ${txt}`);
    }

    // Returns the ID of the new changeset
    return await response.text();
}

async function closeChangeset(changesetId, token) {
    const url = `${OSM_API_BASE}/changeset/${changesetId}/close`;
    const proxyUrl = `${PROXY_PREFIX}${encodeURIComponent(url)}`;
    
    await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
}

// Create a simple Node (POI)
async function createOsmNode(changesetId, lat, lon, tags, token) {
    let tagsXml = '';
    for (const [k, v] of Object.entries(tags)) {
        if (v) tagsXml += `<tag k="${k}" v="${v}"/>`;
    }

    const xml = `
    <osm>
        <node changeset="${changesetId}" lat="${lat}" lon="${lon}">
            ${tagsXml}
        </node>
    </osm>`;

    const url = `${OSM_API_BASE}/node/create`;
    const proxyUrl = `${PROXY_PREFIX}${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/xml',
            'Authorization': `Bearer ${token}`
        },
        body: xml
    });

    if (!response.ok) {
        throw new Error("Erro ao criar Nó");
    }

    return await response.text(); // Returns new Node ID
}

// Create a Way (Street/Path) from a list of coordinates
async function createOsmWay(changesetId, points, tags, token) {
    // 1. Create Nodes for each point first
    const nodeIds = [];
    for (const point of points) {
        const nodeId = await createOsmNode(changesetId, point.lat, point.lon, {}, token);
        nodeIds.push(nodeId);
    }

    // 2. Create Way referencing these nodes
    let tagsXml = '';
    for (const [k, v] of Object.entries(tags)) {
        if (v) tagsXml += `<tag k="${k}" v="${v}"/>`;
    }
    
    let ndXml = '';
    for (const nid of nodeIds) {
        ndXml += `<nd ref="${nid}"/>`;
    }

    const xml = `
    <osm>
        <way changeset="${changesetId}">
            ${ndXml}
            ${tagsXml}
        </way>
    </osm>`;

    const url = `${OSM_API_BASE}/way/create`;
    const proxyUrl = `${PROXY_PREFIX}${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/xml',
            'Authorization': `Bearer ${token}`
        },
        body: xml
    });

    if (!response.ok) {
        throw new Error("Erro ao criar Via");
    }

    return await response.text(); // Returns new Way ID
}

// Check status of an object
async function fetchOsmObject(type, id) {
    // type: 'node' or 'way'
    const url = `${OSM_API_BASE}/${type}/${id}`;
    
    // We can use direct fetch for GET usually
    try {
        const response = await fetch(url);
        if (response.ok) {
            const text = await response.text();
            return { exists: true, data: text };
        } else if (response.status === 410) {
             return { exists: false, status: 'deleted' };
        }
        return { exists: false, status: 'unknown' };
    } catch (e) {
        console.warn("Error fetching OSM object", e);
        return { exists: false, error: e };
    }
}