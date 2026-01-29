import Peer from "simple-peer";

const SIGNALING_SERVER = ""; // Configure your signaling server (WebSocket) here if available

// Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const myIdEl = document.getElementById("myId");
const avatarImg = document.getElementById("avatarImg");
const avatarInput = document.getElementById("avatarInput");
const changeAvatar = document.getElementById("changeAvatar");
const displayNameEl = document.getElementById("displayName");
const statusText = document.getElementById("statusText");
const addContactBtn = document.getElementById("addContactBtn");
const createBtn = document.getElementById("createBtn");
const roomsList = document.getElementById("roomsList");
const chatTitle = document.getElementById("chatTitle");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const fileInput = document.getElementById("fileInput");
const attachBtn = document.getElementById("attachBtn");
const sendBtn = document.getElementById("sendBtn");
const callBtn = document.getElementById("callBtn");
const videoCallBtn = document.getElementById("videoCallBtn");
const callUI = document.getElementById("callUI");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const hangupBtn = document.getElementById("hangupBtn");
const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");

// New UI elements: invite id display and members modal
const inviteIdEl = document.getElementById("inviteId");
const membersBtn = document.getElementById("membersBtn");
const membersModal = document.getElementById("membersModal");
const membersClose = document.getElementById("membersClose");
const membersList = document.getElementById("membersList");
const inviteCopy = document.getElementById("inviteCopy");
const reportGroup = document.getElementById("reportGroup");
const chatSub = document.getElementById("chatSub");

// Mention autocomplete container (dynamically created)
let mentionBox = null;

 // State
let myId = null; // 5-digit ID string
let userKey = null;
let userName = null;
let currentRoom = null;
let peers = {}; // peerId -> simple-peer instance
let localStream = null;
let isMuted = false;
let camOff = false;

// Helper: generate 5-digit ID
function makeId() {
  return (Math.floor(10000 + Math.random() * 90000)).toString();
}

// Authentication integration using provided API from user
function updateUIAuth() {
  const name = localStorage.getItem("userName");
  const key = localStorage.getItem("userKey");
  if (name && key) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    displayNameEl.textContent = name;
    statusText.textContent = "Autenticado";
    userName = name; userKey = key;
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    displayNameEl.textContent = "Convidado";
    statusText.textContent = "Offline";
  }
}

// Assign or restore ID
function ensureMyId() {
  myId = localStorage.getItem("myId");
  if (!myId) {
    myId = makeId();
    localStorage.setItem("myId", myId);
  }
  myIdEl.textContent = "ID: " + myId;
}

// Basic UI actions
loginBtn.onclick = () => {
  // Use the same redirect pattern as sample code
  window.location.href = "https://code.codehub.ct.ws/API/continuar-conta?token=K9QwL0qP1bXmUuapLAvc";
};
logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

changeAvatar.onclick = () => avatarInput.click();
avatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  avatarImg.src = url;
  // store small preview in localStorage (not base64 heavy)
  const reader = new FileReader();
  reader.onload = () => {
    try { localStorage.setItem("avatarData", reader.result); } catch(e){}
  };
  reader.readAsDataURL(file);
};

// Rooms (in this frontend demo rooms are just UI groups; signaling is required for real P2P)
function addRoom(id, title) {
  const el = document.createElement("div");
  el.className = "item";
  el.textContent = title || id;
  el.onclick = () => openRoom(id, title);
  roomsList.prepend(el);
}

function openRoom(id, title) {
  currentRoom = id;
  chatTitle.textContent = (title || id);
  messagesEl.innerHTML = "";
  // show invite ID (fixed ID used to join room)
  inviteIdEl.textContent = "ID: " + id;
  // show room subtitle (owner or members count)
  const metaRaw = localStorage.getItem('room:' + id);
  let meta = null;
  try{ meta = metaRaw ? JSON.parse(metaRaw) : null; }catch(e){ meta = null; }
  if(meta){
    // ensure roles structure exists
    meta.roles = meta.roles || {}; // roles: {userId: 'member'|'moderator'|'admin'}
    const owner = meta.owner || '—';
    const memberCount = (meta.members && meta.members.length) || 0;
    chatSub.textContent = `${meta.name || 'Grupo'} • Criador: ${owner} • ${memberCount} membros`;
    // persist updated meta if roles were missing
    localStorage.setItem('room:' + id, JSON.stringify(meta));
  } else {
    chatSub.textContent = (title || id) + " • Conversa privada / contato";
  }

  // render messages
  const history = JSON.parse(localStorage.getItem("chat:" + id) || "[]");
  history.forEach(m => addMessage(m.text, m.me, m.name || null, m.avatar || null, m.mentions || []));
}

// Messaging storage
function saveMessage(room, text, me, mentions = []) {
  const key = "chat:" + room;
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  arr.push({text, me, ts:Date.now(), mentions});
  localStorage.setItem(key, JSON.stringify(arr));
}

function addMessage(text, me, senderName = null, avatarData = null, mentions = []) {
  const node = document.createElement("div");
  node.className = "msg" + (me ? " me" : "");
  // build header with avatar + name when available
  if(senderName || avatarData){
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.style.marginBottom = "6px";
    if(avatarData){
      const img = document.createElement("img");
      img.src = avatarData;
      img.style.width = "28px";
      img.style.height = "28px";
      img.style.borderRadius = "8px";
      img.style.objectFit = "cover";
      header.appendChild(img);
    }
    const nameEl = document.createElement("div");
    nameEl.style.fontSize = "13px";
    nameEl.style.fontWeight = "600";
    nameEl.textContent = senderName || "";
    header.appendChild(nameEl);

    // add small report button per message (only for non-me)
    if(!me){
      const rpt = document.createElement("button");
      rpt.textContent = "Denunciar";
      rpt.className = "btn small";
      rpt.style.marginLeft = "8px";
      rpt.onclick = (e) => {
        e.stopPropagation();
        const reason = prompt("Motivo da denúncia (spam, abuso, etc):", "spam");
        if(reason){
          // store a simple report record locally (in a real app send to server)
          const reports = JSON.parse(localStorage.getItem('reports') || '[]');
          reports.unshift({room: currentRoom, fromName: senderName, text, reason, ts:Date.now()});
          localStorage.setItem('reports', JSON.stringify(reports));
          alert('Denúncia enviada (salva localmente).');
        }
      };
      header.appendChild(rpt);
    }

    node.appendChild(header);
  }

  // highlight mentions (simple)
  let body = document.createElement("div");
  // replace occurrences like @USERID or @name with bold
  let safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  mentions.forEach(m => {
    const esc = m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    safe = safe.replace(new RegExp("@" + esc, "g"), `<strong style="color:var(--accent)">@${m}</strong>`);
  });
  body.innerHTML = safe;
  node.appendChild(body);
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Sending message (local UI + DataChannel to peers if connected)
sendBtn.onclick = sendMessage;
msgInput.addEventListener("keydown", (e)=>{ if(e.key==="Enter") sendMessage(); });

function parseMentions(text){
  // simple parse for tokens starting with @ followed by non-space up to punctuation
  const matches = [];
  const re = /@([^\s@,;:.!?)]+)/g;
  let m;
  while((m = re.exec(text)) !== null){
    matches.push(m[1]);
  }
  return matches;
}

function sendMessage(){
  const txt = msgInput.value.trim();
  if(!currentRoom) return;
  if(txt){
    // prepare display and payload including sender info + avatar preview (base64 if available)
    const avatarData = localStorage.getItem("avatarData") || null;
    const mentions = parseMentions(txt);
    addMessage(txt, true, userName || "Você", avatarData, mentions);
    saveMessage(currentRoom, txt, true, mentions);
    const payload = { type:"msg", room: currentRoom, text: txt, from: myId, name: userName || ("User " + myId), avatar: avatarData, mentions };
    // Broadcast text to peers
    Object.values(peers).forEach(p => {
      try { p.send(JSON.stringify(payload)); } catch(e){}
    });
    msgInput.value = "";
    hideMentionBox();
  }
}

 // Attach / send file as base64 over datachannels
attachBtn.onclick = () => fileInput.click();
fileInput.onchange = async (e) => {
  const f = e.target.files && e.target.files[0];
  if(!f || !currentRoom) return;
  // check permission in room meta: only allow if role permits (admins/mods allowed, members allowed if meta.allowFiles)
  const metaRaw = localStorage.getItem('room:' + currentRoom);
  let meta = null;
  try{ meta = metaRaw ? JSON.parse(metaRaw) : null; }catch(e){ meta = null; }
  const role = (meta && meta.roles && meta.roles[myId]) || (meta && meta.members && meta.members.includes(myId) ? 'member' : 'member');
  const allowFiles = meta ? (meta.allowFiles !== undefined ? meta.allowFiles : true) : true;
  if(!allowFiles && role === 'member'){ alert('Você não tem permissão para enviar arquivos neste grupo.'); fileInput.value = ""; return; }

  const reader = new FileReader();
  reader.onload = () => {
    const data = reader.result; // base64 data URL
    // show locally
    addFileMessage({name: f.name, size: f.size, data}, true);
    saveMessage(currentRoom, "[file] " + f.name, true);
    // send to peers
    Object.values(peers).forEach(p => {
      try {
        p.send(JSON.stringify({type:"file", room:currentRoom, name: f.name, size: f.size, data, from: myId}));
      } catch(e){}
    });
  };
  reader.readAsDataURL(f);
  // clear input for next selection
  fileInput.value = "";
};

// helper to render file messages (images show inline)
function addFileMessage(fileObj, me){
  const node = document.createElement("div");
  node.className = "msg" + (me ? " me" : "");
  const title = document.createElement("div");
  title.style.fontSize = "13px";
  title.style.marginBottom = "6px";
  title.textContent = (me ? "Você: " : "") + fileObj.name + " (" + Math.round((fileObj.size||0)/1024) + " KB)";
  node.appendChild(title);

  if(fileObj.data && fileObj.data.startsWith && fileObj.data.startsWith("data:image")){
    const img = document.createElement("img");
    img.src = fileObj.data;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "10px";
    node.appendChild(img);
  } else if(fileObj.data){
    const link = document.createElement("a");
    link.href = fileObj.data;
    link.download = fileObj.name;
    link.textContent = "Baixar " + fileObj.name;
    link.style.color = "inherit";
    node.appendChild(link);
  } else {
    node.textContent = fileObj.name;
  }

  // report for files (non-me)
  if(!me){
    const rpt = document.createElement("button");
    rpt.textContent = "Denunciar";
    rpt.className = "btn small";
    rpt.style.display = "block";
    rpt.style.marginTop = "8px";
    rpt.onclick = () => {
      const reason = prompt("Motivo da denúncia (spam, abuso, etc):", "spam");
      if(reason){
        const reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.unshift({room: currentRoom, file: fileObj.name, reason, ts:Date.now()});
        localStorage.setItem('reports', JSON.stringify(reports));
        alert('Denúncia enviada (salva localmente).');
      }
    };
    node.appendChild(rpt);
  }

  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// update data handler to support incoming files

// Basic call flow using Simple-Peer and local getUserMedia
async function startLocalMedia(withVideo=false){
  try{
    localStream = await navigator.mediaDevices.getUserMedia({audio:true, video:withVideo});
    localVideo.srcObject = localStream;
    isMuted = false; camOff = !withVideo;
    updateCallButtons();
  }catch(e){
    alert("Permissão de microfone/câmera negada.");
  }
}

// Create a peer and attach stream
function createPeer(initiator, remoteId, opts={video:false}) {
  const peer = new Peer({ initiator, trickle: true, stream: (localStream || undefined) });
  peer.on('signal', data => {
    // In a full app you'd send this signal to the remote peer via your signaling server.
    // For this demo we save local signals to localStorage keyed by both IDs so a developer can copy/paste when testing.
    const key = `signal:${myId}:${remoteId}`;
    localStorage.setItem(key, JSON.stringify(data));
    console.log("Signal stored:", key);
  });
  peer.on('connect', () => console.log('peer connected', remoteId));
  peer.on('data', d => {
    try{
      const msg = JSON.parse(d.toString());
      if(msg.room !== currentRoom) return;
      if(msg.type === "msg"){
        // show sender name + avatar when provided
        addMessage(msg.text, false, msg.name || ("User " + (msg.from||"")), msg.avatar || null);
        saveMessage(currentRoom, msg.text, false);
      } else if(msg.type === "file"){
        // received file/base64
        addFileMessage({name: msg.name, size: msg.size, data: msg.data}, false);
        saveMessage(currentRoom, "[file] " + msg.name, false);
      }
    }catch(e){}
  });
  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });
  peer.on('close', ()=>{ delete peers[remoteId]; });
  peer.on('error', ()=>{});
  peers[remoteId] = peer;
  return peer;
}

// UI call actions
callBtn.onclick = async () => {
  if(!currentRoom){ alert("Abra ou crie um chat primeiro."); return;}
  await startLocalMedia(false);
  callUI.classList.remove('hidden');
  // For demo: create peer with imaginary remoteId = currentRoom (replace with real signaling)
  createPeer(true, currentRoom, {video:false});
};

videoCallBtn.onclick = async () => {
  if(!currentRoom){ alert("Abra ou crie um chat primeiro."); return;}
  await startLocalMedia(true);
  callUI.classList.remove('hidden');
  createPeer(true, currentRoom, {video:true});
};

hangupBtn.onclick = () => {
  Object.values(peers).forEach(p=>{ try{ p.destroy(); }catch(e){} });
  peers = {};
  callUI.classList.add('hidden');
  if(localStream){
    localStream.getTracks().forEach(t=>t.stop());
    localStream = null;
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
  }
};

muteBtn.onclick = () => {
  if(!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(t=>t.enabled = !isMuted);
  updateCallButtons();
};

camBtn.onclick = () => {
  if(!localStream) return;
  camOff = !camOff;
  localStream.getVideoTracks().forEach(t=>t.enabled = !camOff);
  updateCallButtons();
};

function updateCallButtons(){
  muteBtn.textContent = isMuted ? "🔇 Desligar mudo" : "Mudo";
  camBtn.textContent = camOff ? "Câmera" : "📷";
}

// Rooms creation/join (UI only in this demo)
createBtn.onclick = () => {
  // navigate to a dedicated group creation page
  window.location.href = "group.html";
};

const groupAvatarBtn = document.getElementById("groupAvatarBtn");
const groupAvatarInput = document.getElementById("groupAvatarInput");
const groupAvatarPreview = document.getElementById("groupAvatarPreview");
const groupCreateConfirm = document.getElementById("groupCreateConfirm");
const groupCreateCancel = document.getElementById("groupCreateCancel");
const groupClose = document.getElementById("groupClose");

groupAvatarBtn.onclick = () => groupAvatarInput.click();
groupAvatarInput.onchange = (e) => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const url = URL.createObjectURL(f);
  groupAvatarPreview.src = url;
  const reader = new FileReader();
  reader.onload = () => {
    try { groupAvatarPreview.dataset.preview = reader.result; } catch(e){}
  };
  reader.readAsDataURL(f);
};

function closeGroupModal(){
  const modal = document.getElementById("groupModal");
  modal.style.display = "none";
}

groupCreateCancel.onclick = closeGroupModal;
groupClose.onclick = closeGroupModal;

groupCreateConfirm.onclick = () => {
  const name = (document.getElementById("groupNameInput").value || "").trim() || ("Grupo " + makeId());
  const id = makeId();
  // choose avatar: user-picked preview data URL or default local avatar
  const avatarData = (groupAvatarPreview.dataset && groupAvatarPreview.dataset.preview) || localStorage.getItem("avatarData") || null;
  // store room metadata: owner, created, name, avatar, admins, members
  const meta = { owner: myId, created: Date.now(), name, avatar: avatarData, admins: [myId], members: [myId] };
  localStorage.setItem("room:" + id, JSON.stringify(meta));
  // also store a friendly mapping for display
  addRoom(id, name);
  openRoom(id, name);
  closeGroupModal();
};

addContactBtn.onclick = () => {
  // open the dedicated add friend / group page
  window.location.href = "add.html";
};

 // members modal behavior
membersBtn.onclick = () => {
  if(!currentRoom){ alert("Abra um chat primeiro."); return; }
  renderMembers();
  membersModal.style.display = "block";
};
membersClose.onclick = () => membersModal.style.display = "none";
inviteCopy.onclick = () => {
  if(!currentRoom) return;
  navigator.clipboard && navigator.clipboard.writeText(currentRoom);
  alert('ID do convite copiado: ' + currentRoom);
};
reportGroup.onclick = () => {
  if(!currentRoom) return;
  const reason = prompt("Motivo da denúncia do grupo (spam, abuso):", "spam");
  if(reason){
    const rep = JSON.parse(localStorage.getItem('groupReports') || '[]');
    rep.unshift({room: currentRoom, reason, ts:Date.now()});
    localStorage.setItem('groupReports', JSON.stringify(rep));
    alert('Denúncia de grupo salva localmente.');
  }
};

function renderMembers(){
  membersList.innerHTML = '';
  const metaRaw = localStorage.getItem('room:' + currentRoom);
  let meta = null;
  try{ meta = metaRaw ? JSON.parse(metaRaw) : null; }catch(e){ meta = null; }
  meta = meta || {members: [], roles:{}, owner: null, name: '', admins: []};
  meta.roles = meta.roles || {};
  const members = (meta && meta.members && meta.members.slice()) || [];
  if(members.length === 0){
    const no = document.createElement('div');
    no.className = 'muted';
    no.textContent = 'Nenhum membro listado';
    membersList.appendChild(no);
    return;
  }
  members.forEach(m => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '8px';
    row.style.padding = '6px';
    row.style.borderRadius = '8px';
    row.style.background = '#fbfcff';
    // avatar small if available (public avatars saved per user key)
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';
    const img = document.createElement('img');
    const avatarKey = 'avatar:' + m;
    const avatarData = localStorage.getItem(avatarKey) || localStorage.getItem('avatarData') || null;
    img.src = avatarData || 'assets/default-avatar.png';
    img.style.width = '36px';
    img.style.height = '36px';
    img.style.borderRadius = '8px';
    img.style.objectFit = 'cover';
    left.appendChild(img);
    const name = document.createElement('div');
    name.textContent = m;
    name.style.fontWeight = '600';
    left.appendChild(name);

    // role label
    const role = meta.roles[m] || (meta.owner === m ? 'owner' : (meta.admins && meta.admins.includes(m) ? 'admin' : 'member'));
    const roleBadge = document.createElement('div');
    roleBadge.textContent = role;
    roleBadge.style.fontSize = '12px';
    roleBadge.style.padding = '4px 8px';
    roleBadge.style.borderRadius = '8px';
    roleBadge.style.background = role === 'owner' ? '#ffd7a8' : (role === 'admin' ? '#e6f3ff' : '#f1f4f8');
    roleBadge.style.marginLeft = '6px';
    left.appendChild(roleBadge);

    row.appendChild(left);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    // open private chat
    const pm = document.createElement('button');
    pm.className = 'btn small';
    pm.textContent = 'Abrir';
    pm.onclick = () => { membersModal.style.display='none'; openRoom(m, 'Contato ' + m); };

    actions.appendChild(pm);

    // role management buttons: promote/demote if current user is owner/admin
    const myMetaRaw = localStorage.getItem('room:' + currentRoom);
    let myMeta = null;
    try{ myMeta = myMetaRaw ? JSON.parse(myMetaRaw) : null; }catch(e){ myMeta = null; }
    const myRole = (myMeta && myMeta.roles && myMeta.roles[myId]) || (myMeta && myMeta.admins && myMeta.admins.includes(myId) ? 'admin' : (myMeta && myMeta.owner === myId ? 'owner' : 'member'));
    if(myRole === 'owner' || myRole === 'admin'){
      const promote = document.createElement('button');
      promote.className = 'btn small';
      promote.textContent = role === 'admin' ? 'Rebaixar' : 'Promover';
      promote.onclick = () => {
        if(!meta.roles) meta.roles = {};
        if(role === 'admin'){
          delete meta.roles[m];
          meta.admins = (meta.admins || []).filter(x=>x!==m);
        } else {
          meta.roles[m] = 'admin';
          meta.admins = meta.admins || [];
          if(!meta.admins.includes(m)) meta.admins.push(m);
        }
        localStorage.setItem('room:' + currentRoom, JSON.stringify(meta));
        renderMembers();
      };
      actions.appendChild(promote);

      // permission toggle: allowFiles
      const fileToggle = document.createElement('button');
      fileToggle.className = 'btn small';
      fileToggle.textContent = (meta.allowFiles === false && role === 'member') ? 'Sem Arquivos' : 'Arquivos';
      fileToggle.onclick = () => {
        meta.allowFiles = meta.allowFiles === false ? true : false;
        localStorage.setItem('room:' + currentRoom, JSON.stringify(meta));
        alert('Permissão de envio de arquivos atualizada para o grupo (afeta membros).');
        renderMembers();
      };
      actions.appendChild(fileToggle);
    }

    row.appendChild(actions);
    membersList.appendChild(row);
  });
  // persist any meta changes
  localStorage.setItem('room:' + currentRoom, JSON.stringify(meta));
}

// On load: restore UI and attempt automatic validation via provided validarLogin()
window.addEventListener("load", ()=>{
  updateUIAuth();
  ensureMyId();
  const avatarData = localStorage.getItem("avatarData");
  if(avatarData) avatarImg.src = avatarData;

  // integrate with provided API if available
  if(typeof validarLogin === "function"){
    validarLogin(res=>{
      if(res.success){
        localStorage.setItem("userName", res.userName);
        localStorage.setItem("userKey", res.userKey);
        updateUIAuth();
      }
    });
  }

  // Quick demo: restore last rooms
  for(let k in localStorage){
    if(k.startsWith("room:")){
      try{
        const id = k.split(":")[1];
        // prefer stored room metadata name if available
        const storedName = (localStorage.getItem('room:' + id) && JSON.parse(localStorage.getItem('room:' + id)).name) || localStorage.getItem('roomname:' + id) || ("Grupo " + id);
        addRoom(id, storedName);
      }catch(e){}
    }
  }

  // If navigated back from group.html with an open=ID param, open that room
  const params = new URLSearchParams(window.location.search);
  const openId = params.get('open');
  if(openId && /^\d{5}$/.test(openId)){
    const metaRaw = localStorage.getItem('room:' + openId);
    const display = (metaRaw && JSON.parse(metaRaw).name) || localStorage.getItem('roomname:' + openId) || ("Grupo " + openId);
    addRoom(openId, display);
    openRoom(openId, display);
    // clear param history (avoid opening again on reload)
    history.replaceState(null, '', location.pathname);
  }

  // Create mention box for @ autocomplete
  function ensureMentionBox(){
    if(mentionBox) return;
    mentionBox = document.createElement('div');
    mentionBox.style.position = 'absolute';
    mentionBox.style.zIndex = 120;
    mentionBox.style.background = 'var(--card)';
    mentionBox.style.border = '1px solid #eee';
    mentionBox.style.borderRadius = '8px';
    mentionBox.style.boxShadow = '0 6px 18px rgba(10,10,10,0.08)';
    mentionBox.style.maxHeight = '160px';
    mentionBox.style.overflow = 'auto';
    mentionBox.style.minWidth = '160px';
    mentionBox.style.display = 'none';
    document.body.appendChild(mentionBox);
  }

  function showMentionBox(items, rect){
    ensureMentionBox();
    mentionBox.innerHTML = '';
    items.forEach(it=>{
      const el = document.createElement('div');
      el.textContent = it;
      el.style.padding = '8px';
      el.style.cursor = 'pointer';
      el.onmousedown = (e)=>{
        e.preventDefault();
        insertMention(it);
      };
      mentionBox.appendChild(el);
    });
    mentionBox.style.left = (rect.left) + 'px';
    mentionBox.style.top = (rect.bottom + 6) + 'px';
    mentionBox.style.display = items.length ? 'block' : 'none';
  }

  function hideMentionBox(){ if(mentionBox) mentionBox.style.display = 'none'; }

  function insertMention(name){
    const pos = msgInput.selectionStart || msgInput.value.length;
    // find last @ before caret
    const left = msgInput.value.slice(0,pos);
    const m = left.match(/@([^\s@,;:.!?)]*)$/);
    if(m){
      const start = pos - m[0].length;
      const before = msgInput.value.slice(0,start);
      const after = msgInput.value.slice(pos);
      msgInput.value = before + '@' + name + ' ' + after;
      msgInput.focus();
      hideMentionBox();
    } else {
      msgInput.value = msgInput.value + ' @' + name + ' ';
      msgInput.focus();
      hideMentionBox();
    }
  }

  msgInput.addEventListener('input', ()=>{
    const pos = msgInput.selectionStart || msgInput.value.length;
    const left = msgInput.value.slice(0,pos);
    const m = left.match(/@([^\s@,;:.!?)]{0,20})$/);
    if(!m){ hideMentionBox(); return; }
    const query = m[1].toLowerCase();
    // gather candidate list from current room members
    const metaRaw2 = localStorage.getItem('room:' + currentRoom);
    let meta2 = null;
    try{ meta2 = metaRaw2 ? JSON.parse(metaRaw2) : null; }catch(e){ meta2 = null; }
    const members = (meta2 && meta2.members) || [];
    const candidates = members.filter(u => (u+'').toLowerCase().includes(query)).slice(0,20);
    // position mention box near input caret (approx)
    const rect = msgInput.getBoundingClientRect();
    showMentionBox(candidates, rect);
  });

  // hide mention box on outside click
  document.addEventListener('click', (e)=>{ if(mentionBox && !mentionBox.contains(e.target)) hideMentionBox(); });

  // Allow manual signal exchange: show guidance in console
  console.log("Demo signaling: this frontend stores generated 'signal' blobs in localStorage keys 'signal:YOUR_ID:REMOTE_ID'. For P2P you must exchange those blobs with the other user (copy/paste) or install a signaling server and set SIGNALING_SERVER in app.js.");

  // register simple service worker to cache app shell and allow offline retrieval of sent/received base64 assets
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').then(()=>console.log('sw registered')).catch(()=>console.log('sw failed'));
  }
});

  // Allow manual signal exchange: show guidance in console
  console.log("Demo signaling: this frontend stores generated 'signal' blobs in localStorage keys 'signal:YOUR_ID:REMOTE_ID'. For P2P you must exchange those blobs with the other user (copy/paste) or install a signaling server and set SIGNALING_SERVER in app.js.");

  // register simple service worker to cache app shell and allow offline retrieval of sent/received base64 assets
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').then(()=>console.log('sw registered')).catch(()=>console.log('sw failed'));
  }
});