import fetch from "node-fetch";

export async function handler(event, context) {
  const url = event.queryStringParameters.url;
  if (!url) {
    return { statusCode: 400, body: "Falta URL" };
  }

  try {
    const res = await fetch(url);
    const html = await res.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
      },
      body: html,
    };
  } catch (e) {
    return { statusCode: 500, body: e.toString() };
  }
}