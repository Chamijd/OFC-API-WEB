const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// API Status Check
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Anime API Routes
const animeRouter = require('./anime');
router.use('/anime', animeRouter);

// Movie API Routes
const movieRouter = require('./movie');
router.use('/movie', movieRouter);

// Search API Routes
const searchRouter = require('./search');
router.use('/search', searchRouter);

module.exports = router;