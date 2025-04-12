const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration
const API_BASE_URL = 'https://apis.davidcyriltech.my.id/instagram';
const CACHE = new Map();
const CACHE_TTL = 300000; // 5 minutes

// Middleware to handle rate limiting and caching
router.use((req, res, next) => {
  req.apiKey = req.headers['x-api-key'] || process.env.DEFAULT_API_KEY;
  next();
});

/**
 * @route GET /api/igdl/download
 * @desc Download Instagram media
 * @access Public
 * @param {string} url - Instagram URL
 * @param {string} [hd=true] - Prefer HD quality
 */
router.get('/download', async (req, res) => {
  try {
    const { url, hd = 'true' } = req.query;

    // Validate URL
    if (!url || !url.match(/https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[a-zA-Z0-9_-]+/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        message: 'Please provide a valid Instagram URL',
        example: 'https://www.instagram.com/reel/Cabc123/'
      });
    }

    // Check cache first
    const cacheKey = `${url}:${hd}`;
    if (CACHE.has(cacheKey)) {
      const cached = CACHE.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({ ...cached.data, cached: true });
      }
    }

    // Call David Cyril API
    const apiUrl = `${API_BASE_URL}?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ThenuxIGDL/1.0'
      },
      timeout: 10000
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch media');
    }

    // Process response
    const result = {
      success: true,
      type: response.data.type,
      title: (response.data.downloadurl),
      url: url,
      downloadUrl: response.data.downloadUrl,
      filename: extractFilename(response.data.downloadUrl),
      owner: 'thenux'
    };

    // Cache the result
    CACHE.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    res.json(result);

  } catch (error) {
    console.error('IGDL Error:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to download media';

    if (error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data.message || `API returned ${statusCode}`;
    } else if (error.request) {
      errorMessage = 'No response from the API server';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      solution: 'Try again later or contact support',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/igdl/proxy
 * @desc Proxy download to avoid CORS issues
 * @access Public
 * @param {string} url - Download URL from the API
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Download URL required' });
    }

    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'Referer': 'https://www.instagram.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Set headers
    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', `attachment; filename="${extractFilename(url)}"`);

    // Stream the file
    response.data.pipe(res);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Download failed',
      details: error.message
    });
  }
});

// Helper function to extract filename from URL
function extractFilename(url) {
  try {
    // Try to get from URL params
    const filenameMatch = url.match(/filename=([^&]+)/);
    if (filenameMatch) {
      return decodeURIComponent(filenameMatch[1]);
    }
    
    // Fallback to last part of URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || `instagram_${Date.now()}.mp4`;
  } catch {
    return `instagram_${Date.now()}.${url.includes('.mp4') ? 'mp4' : 'jpg'}`;
  }
}

module.exports = router;