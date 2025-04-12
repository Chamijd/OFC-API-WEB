const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * @route GET /api/igstory/download
 * @desc Download Instagram stories by username
 * @access Public
 * @param {string} username - Instagram username
 */
router.get('/download', async (req, res) => {
    try {
        const { username } = req.query;

        // Validate username
        if (!username || !username.match(/^[a-zA-Z0-9._]+$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Instagram username',
                example: '/api/igstory/download?username=mr_darkwolf1'
            });
        }

        // Call the BK9 API
        const apiUrl = `https://bk9.fun/download/igs?username=${encodeURIComponent(username)}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'ThenuxAPI/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        // Check if API response is successful
        if (!response.data.status) {
            throw new Error(response.data.message || 'Failed to fetch stories');
        }

        // Process the stories
        const stories = Array.isArray(response.data.BK9) ? 
            response.data.BK9.map(story => ({
                type: story.type || 'unknown',
                url: story.url,
                download_url: `/api/igstory/proxy?url=${encodeURIComponent(story.url)}`
            })) : [];

        res.json({
            success: true,
            username,
            count: stories.length,
            stories,
            note: 'Stories may disappear after 24 hours'
        });

    } catch (error) {
        console.error('IG Story Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to fetch Instagram stories';

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data.message || `API returned ${statusCode}`;
        } else if (error.request) {
            errorMessage = 'No response from the Instagram story service';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Try again later or check the username',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @route GET /api/igstory/proxy
 * @desc Proxy download to avoid CORS issues
 * @access Public
 * @param {string} url - Story download URL
 */
router.get('/proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'Story URL required' });
        }

        // Stream the story file with proper filename
        const response = await axios.get(url, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'ThenuxAPI/1.0',
                'Referer': 'https://www.instagram.com/'
            }
        });

        // Determine content type
        const contentType = response.headers['content-type'] || 
                          (url.includes('.mp4') ? 'video/mp4' : 'image/jpeg');
        
        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="instagram_story_${Date.now()}.${contentType.includes('video') ? 'mp4' : 'jpg'}"`);

        // Pipe the data
        response.data.pipe(res);

    } catch (error) {
        console.error('IG Story Proxy Error:', error);
        res.status(500).json({
            success: false,
            error: 'Download failed',
            details: error.message
        });
    }
});

module.exports = router;