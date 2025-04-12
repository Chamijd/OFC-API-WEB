const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration
const API_BASE_URL = 'https://apis.davidcyriltech.my.id/movies/search';
const CACHE = new Map();
const CACHE_TTL = 3600000; // 1 hour cache

/**
 * @route GET /api/movies/search
 * @desc Search movies with Sinhala subtitles
 * @access Public
 * @param {string} query - Search query
 * @param {number} [limit=10] - Maximum results to return
 * @param {boolean} [exact=false] - Match exact title
 */
router.get('/searchm', async (req, res) => {
  try {
    const { query, limit = 1000, exact = 'false' } = req.query;

    if (!query || query.trim().length < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query',
        message: 'Search query must be at least 1 characters long'
      });
    }

    // Create cache key
    const cacheKey = `${query}:${limit}:${exact}`;
    
    // Check cache first
    if (CACHE.has(cacheKey)) {
      const cached = CACHE.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({
          ...cached.data,
          cached: true,
          expiresIn: Math.round((CACHE_TTL - (Date.now() - cached.timestamp)) / 60000) + ' minutes'
        });
      }
    }

    // Call David Cyril API
    const apiUrl = `${API_BASE_URL}?query=${encodeURIComponent(query)}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MovieSearchAPI/1.0'
      },
      timeout: 8000
    });

    if (!response.data.status) {
      throw new Error(response.data.message || 'No results found');
    }

    // Process results
    let results = response.data.results || [];
    
    // Apply exact match filter if requested
    if (exact === 'true') {
      const queryLower = query.toLowerCase();
      results = results.filter(movie => 
        movie.title.toLowerCase().includes(queryLower)
      );
    }

    // Apply limit
    if (limit && !isNaN(limit)) {
      results = results.slice(0, parseInt(limit));
    }

    // Format results
    const formattedResults = results.map(movie => ({
      title: movie.title.replace(/Sinhala Subtitles \| සිංහල උපසිරසි සමඟ/g, '').trim(),
      year: movie.year,
      imdb: movie.imdb.replace('IMDB ', ''),
      image: movie.image.replace('-150x150.jpg', '.jpg'), // Get full size image
      url: movie.link,
      type: movie.type || 'Movie'
    }));

    // Create response
    const apiResponse = {
    web: 'sinhalasub.lk',
      success: true,
      query: query,
      count: formattedResults.length,
      results: formattedResults,
      owner: 'thenux'
    };

    // Cache the results
    CACHE.set(cacheKey, {
      timestamp: Date.now(),
      data: apiResponse
    });

    res.json(apiResponse);

  } catch (error) {
    console.error('Movie Search Error:', error);
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message || 'Search failed';

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      query: req.query.query || '',
      solution: statusCode === 429 ? 
        'You are being rate limited. Try again in a few minutes.' : 
        'Try a different search term or check back later',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/movies/details
 * @desc Get movie details by URL
 * @access Public
 * @param {string} url - Movie page URL from search results
 */
router.get('/details', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || !url.includes('sinhalasub.lk/movies/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        message: 'Please provide a valid movie URL from sinhalasub.lk'
      });
    }

    // Call David Cyril API or implement scraping here
    // For now we'll return a placeholder response
    res.json({
      success: true,
      url: url,
      details: {
        description: 'Movie details would be scraped from the provided URL',
        downloadLinks: [],
        cast: [],
        similarMovies: []
      },
      note: 'Implement actual scraping logic here'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      url: req.query.url || ''
    });
  }
});

module.exports = router;