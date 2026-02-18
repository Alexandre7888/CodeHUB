// api/redirect.js
export const config = { runtime: 'edge' };

export default function handler(req) {
  const headers = {
    'Location': 'https://html-785e3-default-rtdb.firebaseio.com/groups/2751/messages.json',
  };

  // Retorna 301 Moved Permanently
  return new Response(null, { status: 301, headers });
}