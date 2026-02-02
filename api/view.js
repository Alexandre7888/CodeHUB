export const config = {
  runtime: 'nodejs'
};

const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  try {
    const data = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    res.status(200).json(data.blobs);
  } catch (err) {
    console.error('BLOB ERROR:', err);
    res.status(500).json({
      error: 'Blob falhou',
      message: err.message
    });
  }
};