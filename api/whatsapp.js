export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { numero, mensagem } = req.body;

  const response = await fetch(
    "https://graph.facebook.com/v19.0/SEU_PHONE_NUMBER_ID/messages",
    {
      method: "POST",
      headers: {
        "Authorization": "Bearer EAAUHGYqLaqMBQkCyY2EvodHtK5ZCh4EPrpqKYv6LpBL7j6yBwaEj24QaSGDOVjjpt5jwKxE9W3hpY53OSxvg5YRxIajxRGWDJZCfAllg9gqMcCuo8KTWYuTwt8mVrhDG0hQSSZA6nC352ZB1xdNtyXgdXlmAEST7IEGYqufkVlrBNgieYKSe8YD52MwOPTXG9LYr8kxZAsYMGu6yFTDblhH2OkH95xwtRRoPhmVjKZA3uzh5ZA3ukoZAo5YWcByZCY9hR9xZAi9ZA0QcljgizImpRGD1ybd",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: mensagem }
      })
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}