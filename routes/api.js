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

// Add this with your other route imports
const igdlRoutes = require('./igdl');

// Add this with your other route middleware
router.use('/igdl', igdlRoutes);

// Search API Routes
const searchRouter = require('./search');
router.use('/search', searchRouter);

const movieRoutes = require('./movie-search');
router.use('/movie', movieRoutes);

// Add this with your other route imports
const geminiRoutes = require('./gemini');

// Add this with your other route middleware
router.use('/gemini', geminiRoutes);


// Add this with your other route imports
const ytmp3Routes = require('./ytmp3');

// Add this with your other route middleware
router.use('/ytmp3', ytmp3Routes);

// Add this with your other route imports
const igstoryRoutes = require('./igstory');

// Add this with your other route middleware
router.use('/igstory', igstoryRoutes);


const amazonRoutes = require('./amazon');
const weatherRoutes = require('./weather');
const jobRoutes = require('./jobs');

// Add with other route middleware
router.use('/amazon', amazonRoutes);
router.use('/weather', weatherRoutes);
router.use('/jobs', jobRoutes);

const animeInfoRoutes = require('./anime-info');

// Add with other route middleware
router.use('/anime', animeInfoRoutes);

const mangaRoutes = require('./manga');
const streamingRoutes = require('./streaming');

// Add with other route middleware
router.use('/manga', mangaRoutes);
router.use('/netflix', streamingRoutes);
router.use('/disney', streamingRoutes);

module.exports = router;