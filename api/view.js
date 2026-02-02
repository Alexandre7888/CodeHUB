const { list } = require('@vercel/blob');

module.exports = async function (req, res) {
  try {
    const blobs = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    res.status(200).json(blobs.blobs);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar arquivos', detalhe: e.message });
  }
};