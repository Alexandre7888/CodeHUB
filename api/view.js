module.exports = async (req, res) => {
  try {
    const r = await fetch('https://api.vercel.com/v2/blob', {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });

    const data = await r.json();
    res.status(200).json(data.blobs || data);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};