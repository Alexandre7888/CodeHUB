export default async function handler(req, res) {

  const uid = req.query.uid;

  if (!uid) {
    return res.status(400).json({
      success: false,
      error: "uid não enviado"
    });
  }

  const API_KEY = "AIzaSyDon4WbCbe4kCkUq-OdLBRhzhMaUObbAfo";

  try {

    const response = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          localId: [uid]
        })
      }
    );

    const data = await response.json();

    if (!data.users || data.users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "usuário não encontrado"
      });
    }

    const user = data.users[0];

    return res.status(200).json({
      success: true,
      id: user.localId,
      username: user.displayName || null,
      email: user.email || null,
      photo: user.photoUrl || null
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      error: err.toString()
    });

  }

}