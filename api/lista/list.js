const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  const data = await list({
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  res.json(data.blobs);
};