const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// Search Movies
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchUrl = `https://example-search-site.com/search?q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const results = [];

    $('.movie-item').each((i, element) => {
      results.push({
        title: $(element).find('.title').text().trim(),
        year: $(element).find('.year').text().trim(),
        url: $(element).find('a').attr('href'),
        image: $(element).find('img').attr('src')
      });
    });

    res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;