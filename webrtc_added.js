
// Basic WebRTC + signaling using Firebase RTDB
let localStream;
let peers = {};
async function startLive(){
  try{
    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    document.getElementById("localVideo").srcObject = localStream;
  } catch(e){
    alert("WebRTC not supported");
    return;
  }
}
startLive();

// Basic cursor sync
document.addEventListener("mousemove", e=>{
  // placeholder for cursor sync
});
