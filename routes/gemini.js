const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * @route GET /api/gemini/analyze
 * @desc Analyze an image using Gemini AI
 * @access Public
 * @param {string} url - Image URL to analyze
 * @param {string} q - Question about the image
 */
router.get('/analyze', async (req, res) => {
    try {
        const { url, q } = req.query;
        
        // Validate parameters
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Image URL is required',
                example: '/api/gemini/analyze?url=https://example.com/image.jpg&q=What is this?'
            });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format',
                message: 'Please provide a valid image URL'
            });
        }

        // Call the Gemini API
        const apiUrl = `https://bk9.fun/ai/geminiimg?url=${encodeURIComponent(url)}${q ? '&q=' + encodeURIComponent(q) : ''}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'ThenuxAPI/1.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        // Process the response
        if (!response.data.status) {
            return res.status(500).json({
                success: false,
                error: 'API returned unsuccessful status',
                originalResponse: response.data
            });
        }

        // Return the processed response
        res.json({
            success: true,
            owner: '@thenux-AI',
            analysis: response.data.BK9 || response.data.response,
            imageUrl: url,
            question: q || 'General analysis',
            source: 'Gemini AI '
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to analyze image';

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data.message || `API returned ${statusCode}`;
        } else if (error.request) {
            errorMessage = 'No response from the Gemini API server';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Try again later or check the image URL',
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/ai', async (req, res) => {
    try {
        const { q } = req.query;
        
        // Validate parameters
        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Image URL is required',
                example: '/api/gemini/ai?q=Hi'
            });
        }

        // Validate URL format
        /*try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL format',
                message: 'Please provide a valid image URL'
            });
        }*/

        // Call the Gemini API
        const apiUrl = `https://bk9.fun/ai/gemini?q=${encodeURIComponent(q)} : ''}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'ThenuxAPI/1.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        // Process the response
        if (!response.data.status) {
            return res.status(500).json({
                success: false,
                error: 'API returned unsuccessful status',
                originalResponse: response.data
            });
        }

        // Return the processed response
        res.json({
            success: true,
            owner: '@thenux-AI',
            analysis: response.data.BK9 || response.data.response,
            question: q || 'General analysis',
            source: 'Gemini AI '
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to analyze image';

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data.message || `API returned ${statusCode}`;
        } else if (error.request) {
            errorMessage = 'No response from the Gemini API server';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Try again later or check the image URL',
            timestamp: new Date().toISOString()
        });
    }
});


module.exports = router;