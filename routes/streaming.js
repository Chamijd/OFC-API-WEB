const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheery');

// Cache trending shows for 6 hours
let trendingCache = {
    netflix: null,
    disney: null,
    lastUpdated: null
};

/**
 * @route GET /api/netflix/trending
 * @desc Get trending shows from Netflix
 * @access Public
 * @param {number} [limit=10] - Number of results
 */
router.get('/netflix/trending', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Use cache if available and recent
        if (trendingCache.netflix && trendingCache.lastUpdated && 
            Date.now() - trendingCache.lastUpdated < 21600000 /* 6 hours */) {
            return res.json({
                success: true,
                cached: true,
                results: trendingCache.netflix.slice(0, limit)
            });
        }

        // Scrape Netflix trending from FlixPatrol
        const { data } = await axios.get('https://flixpatrol.com/top10/netflix/world/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const shows = [];

        $('.table-today tbody tr').each((i, element) => {
            if (shows.length >= limit) return false;

            const $el = $(element);
            const title = $el.find('a.tooltip').text().trim();
            const url = $el.find('a.tooltip').attr('href');
            const rank = $el.find('td:nth-child(1)').text().trim();
            const change = $el.find('td:nth-child(3) span').text().trim();
            const daysInTop = $el.find('td:nth-child(4)').text().trim();
            const image = $el.find('img.poster').attr('src');

            if (title) {
                shows.push({
                    rank,
                    title,
                    change,
                    daysInTop,
                    image: image ? `https://flixpatrol.com${image}` : null,
                    url: url ? `https://flixpatrol.com${url}` : null,
                    type: $el.find('td:nth-child(2)').text().trim() || 'Unknown'
                });
            }
        });

        // Update cache
        trendingCache.netflix = shows;
        trendingCache.lastUpdated = Date.now();

        res.json({
            success: true,
            cached: false,
            results: shows.slice(0, limit)
        });

    } catch (error) {
        console.error('Netflix Scraper Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending shows',
            note: 'Website structure may have changed'
        });
    }
});

/**
 * @route GET /api/disney/trending
 * @desc Get trending shows from Disney+
 * @access Public
 * @param {number} [limit=10] - Number of results
 */
router.get('/disney/trending', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Use cache if available
        if (trendingCache.disney && trendingCache.lastUpdated && 
            Date.now() - trendingCache.lastUpdated < 21600000) {
            return res.json({
                success: true,
                cached: true,
                results: trendingCache.disney.slice(0, limit)
            });
        }

        // Scrape Disney+ trending from FlixPatrol
        const { data } = await axios.get('https://flixpatrol.com/top10/disney/world/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const shows = [];

        $('.table-today tbody tr').each((i, element) => {
            if (shows.length >= limit) return false;

            const $el = $(element);
            const title = $el.find('a.tooltip').text().trim();
            const url = $el.find('a.tooltip').attr('href');
            const rank = $el.find('td:nth-child(1)').text().trim();
            const change = $el.find('td:nth-child(3) span').text().trim();
            const daysInTop = $el.find('td:nth-child(4)').text().trim();
            const image = $el.find('img.poster').attr('src');

            if (title) {
                shows.push({
                    rank,
                    title,
                    change,
                    daysInTop,
                    image: image ? `https://flixpatrol.com${image}` : null,
                    url: url ? `https://flixpatrol.com${url}` : null,
                    type: $el.find('td:nth-child(2)').text().trim() || 'Unknown'
                });
            }
        });

        // Update cache
        trendingCache.disney = shows;
        trendingCache.lastUpdated = Date.now();

        res.json({
            success: true,
            cached: false,
            results: shows.slice(0, limit)
        });

    } catch (error) {
        console.error('Disney+ Scraper Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending shows',
            note: 'Website structure may have changed'
        });
    }
});

module.exports = router;