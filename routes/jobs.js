const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * @route GET /api/jobs/search
 * @desc Search job listings
 * @access Public
 * @param {string} q - Search query
 * @param {number} [limit=10] - Number of results
 */
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
                example: '/api/jobs/search?q=frontend+developer'
            });
        }

        // Scrape Indeed
        const indeedUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(q)}&limit=${limit}`;
        const indeedResponse = await axios.get(indeedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(indeedResponse.data);
        const jobs = [];

        $('.job_seen_beacon').each((i, element) => {
            if (jobs.length >= limit) return false;

            const $el = $(element);
            const title = $el.find('.jobTitle').text().trim();
            const company = $el.find('.companyName').text().trim();
            const location = $el.find('.companyLocation').text().trim();
            const salary = $el.find('.salary-snippet').text().trim();
            const date = $el.find('.date').text().trim();
            const link = 'https://www.indeed.com' + $el.find('a.jobTitle').attr('href');

            jobs.push({
                source: 'Indeed',
                title,
                company,
                location,
                salary: salary || 'Not specified',
                date,
                link
            });
        });

        res.json({
            success: true,
            query: q,
            count: jobs.length,
            results: jobs
        });

    } catch (error) {
        console.error('Job Scraper Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch job listings',
            note: 'Website structure may have changed'
        });
    }
});

module.exports = router;