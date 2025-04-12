const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * @route GET /api/ytmp3/download
 * @desc Download YouTube video as MP3
 * @access Public
 * @param {string} url - YouTube video URL
 */
router.get('/download', async (req, res) => {
    try {
        const { url } = req.query;

        // Validate URL
        if (!url || !url.match(/youtube\.com|youtu\.be/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid YouTube URL',
                example: '/api/ytmp3/download?url=https://youtube.com/watch?v=MwpMEbgC7DA'
            });
        }

        // Call the API
        const apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'ThenuxAPI/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        // Check if API response is successful
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to convert video');
        }

        // Return the processed data
        res.json({
            success: true,
            type: 'audio',
            service: 'YouTube MP3',
            title: response.data.result.title,
            thumbnail: response.data.result.thumbnail,
            download_url: response.data.result.download_url,
            quality: response.data.result.quality,
            note: 'This download link may expire after some time'
        });

    } catch (error) {
        console.error('YTMP3 Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to process YouTube video';

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data.message || `API returned ${statusCode}`;
        } else if (error.request) {
            errorMessage = 'No response from the conversion service';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Try again later or check the YouTube URL',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @route GET /api/ytmp3/proxy
 * @desc Proxy download to avoid CORS issues
 * @access Public
 * @param {string} url - YouTube video URL
 */
router.get('/proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'YouTube URL required' });
        }

        // First get the download URL
        const apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(url)}`;
        const apiResponse = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'ThenuxAPI/1.0'
            },
            timeout: 15000
        });

        if (!apiResponse.data.success) {
            throw new Error(apiResponse.data.message || 'Conversion failed');
        }

        const downloadUrl = apiResponse.data.result.download_url;
        const title = apiResponse.data.result.title.replace(/[^\w\s]/gi, '');

        // Stream the MP3 file with proper filename
        const mp3Response = await axios.get(downloadUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'ThenuxAPI/1.0'
            }
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
        mp3Response.data.pipe(res);

    } catch (error) {
        console.error('YTMP3 Proxy Error:', error);
        res.status(500).json({
            success: false,
            error: 'Download failed',
            details: error.message
        });
    }
});

module.exports = router;