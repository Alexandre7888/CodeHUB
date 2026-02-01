const fetch = require("node-fetch"); // CommonJS style

module.exports = async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.status(400).send("Missing url");
    return;
  }

  try {
    const response = await fetch(url);
    const html = await response.text();

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching URL: " + err.message);
  }
};