// MINI WEBRTC + ANALYTICS - 689 bytes
(function(){
  let id = new URL(document.currentScript.src).searchParams.get("projectid") || "default";
  let start = Date.now();
  let visits = localStorage.getItem(`v_${id}`) || 0;
  visits++;
  localStorage.setItem(`v_${id}`, visits);
  
  // WebRTC silencioso (só ativa se permitir)
  try {
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then(()=>{}).catch(()=>{});
  } catch(e) {}
  
  // Salvar no Firebase
  let dbUrl = `https://html-785e3-default-rtdb.firebaseio.com/activities/${id}.json`;
  fetch(dbUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, visits, url: location.href, ua: navigator.userAgent, lastSeen: Date.now() })
  });
  
  // Atualizar tempo a cada 5 segundos
  let interval = setInterval(() => {
    let elapsed = Math.floor((Date.now() - start) / 1000);
    fetch(`https://html-785e3-default-rtdb.firebaseio.com/activities/${id}/time.json`, {
      method: "PUT",
      body: elapsed
    });
  }, 5000);
  
  // Remover ao sair
  window.addEventListener("beforeunload", () => {
    clearInterval(interval);
    fetch(`https://html-785e3-default-rtdb.firebaseio.com/activities/${id}.json`, { method: "DELETE" });
  });
})();