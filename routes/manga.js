const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * @route GET /api/manga/read
 * @desc Get manga chapter images from MangaDex
 * @access Public
 * @param {string} id - Manga chapter ID (e.g., "onepiece-chapter-1100")
 */
router.get('/read', async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Chapter ID is required',
                example: '/api/manga/read?id=onepiece-chapter-1100'
            });
        }

        // Step 1: Search MangaDex for the chapter
        const searchUrl = `https://mangadex.org/chapter/${id}`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);

        // Step 2: Extract chapter metadata
        const title = $('h6.mb-1').first().text().trim();
        const mangaTitle = $('a[href^="/title/"]').first().text().trim();
        const chapterNumber = $('span[title="Chapter number"]').text().trim();
        const pages = [];

        // Step 3: Extract image URLs (modern MangaDex)
        const imgElements = $('.page-container img.img-fluid');
        imgElements.each((i, el) => {
            const src = $(el).attr('data-src') || $(el).attr('src');
            if (src && !src.includes('data:image')) {
                pages.push({
                    page: i + 1,
                    url: src.startsWith('//') ? `https:${src}` : src,
                    referer: 'https://mangadex.org/'
                });
            }
        });

        // Alternative for older MangaDex format
        if (pages.length === 0) {
            const scriptContent = $('script').text();
            const imageDataMatch = scriptContent.match(/window\.__INITIAL_STATE__ = (\{.*?\});/);
            if (imageDataMatch) {
                try {
                    const imageData = JSON.parse(imageDataMatch[1]);
                    const server = imageData.reader.server;
                    const chapterData = imageData.reader.chapter;
                    
                    chapterData.data.forEach((page, i) => {
                        pages.push({
                            page: i + 1,
                            url: `${server}${chapterData.hash}/${page}`,
                            referer: 'https://mangadex.org/'
                        });
                    });
                } catch (e) {
                    console.error('Error parsing image data:', e);
                }
            }
        }

        if (pages.length === 0) {
            throw new Error('No pages found - MangaDex structure may have changed');
        }

        res.json({
            success: true,
            manga: mangaTitle,
            title: title || `Chapter ${chapterNumber}`,
            chapter: chapterNumber,
            pages,
            source: 'MangaDex',
            url: searchUrl
        });

    } catch (error) {
        console.error('Manga Scraper Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to fetch manga chapter';

        if (error.response) {
            statusCode = error.response.status;
            if (statusCode === 404) {
                errorMessage = 'Chapter not found';
            }
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Check the chapter ID or try again later'
        });
    }
});

module.exports = router;