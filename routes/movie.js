const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

// Search endpoint
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ 
                error: 'Please provide a search query parameter "q"',
                example: '/api/movie/search?q=Deadpool'
            });
        }

        const url = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://sinhalasub.lk/',
            'DNT': '1',
            'Connection': 'keep-alive'
        };

        const { data } = await axios.get(url, { 
            headers,
            timeout: 10000
        });

        if (data.includes('No results found') || 
            data.includes('Nothing Found') || 
            data.includes('Sorry, but nothing matched')) {
            return res.json({
                query,
                count: 0,
                results: [],
                message: 'No results found on the website'
            });
        }

        const $ = cheerio.load(data);
        const results = [];

        const items = $('.movies-list .ml-item, .mlist, .item, .post');
        
        if (items.length === 0) {
            return res.json({
                query,
                count: 0,
                results: [],
                warning: 'No movie items found - website structure may have changed'
            });
        }

        items.each((index, element) => {
            const $item = $(element);
            
            const title = $item.find('.mli-info h2, .title, h2, .entry-title').text().trim();
            const url = $item.find('a').attr('href') || $item.attr('href');
            const image = $item.find('img[data-original], img').attr('data-original') || 
                          $item.find('img').attr('src') ||
                          $item.find('img').attr('data-src');
            const year = $item.find('.year, .metadata, .date').text().trim().match(/\d{4}/)?.[0] || '';
            
            if (title && url) {
                results.push({
                    title,
                    url,
                    image: image ? image.replace('-185x278', '') : null,
                    year
                });
            }
        });

        res.json({
            query,
            count: results.length,
            results
        });

    } catch (error) {
        console.error('Search Error:', error);
        
        let errorMessage = 'An error occurred while processing your request';
        let statusCode = 500;

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = `Website returned status ${statusCode}`;
        } else if (error.request) {
            errorMessage = 'No response received from the website';
        }

        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            query: req.query.q || 'Unknown'
        });
    }
});

// Download links endpoint
router.get('/download', async (req, res) => {
    try {
        const movieUrl = req.query.url;
        if (!movieUrl) {
            return res.status(400).json({ error: 'Please provide a movie URL parameter "url"' });
        }

        if (!movieUrl.includes('sinhalasub.lk/movies/')) {
            return res.status(400).json({ error: 'Invalid URL format. Please provide a valid sinhalasub.lk movie URL' });
        }

        const { data } = await axios.get(movieUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const downloadOptions = [];

        // Extract movie data
        const title = $('h1.entry-title').text().trim() || 'Unknown Title';
        
        $('.box_links .sbox').each((index, element) => {
            const serverName = $(element).attr('id');
            const serverTitle = $(element).prev('.linktabs').find(`a[href="#${serverName}"]`).text().trim();
            
            const links = [];
            $(element).find('tbody tr').each((i, row) => {
                const quality = $(row).find('.quality').text().trim();
                const size = $(row).find('td').eq(2).text().trim();
                const link = $(row).find('a').attr('href');
                const host = $(row).find('img').attr('src') || '';
                const hostName = host.includes('favicons') ? 
                    new URL(host).searchParams.get('domain') : 
                    host.split('/').pop().replace('.jpg', '').replace('.png', '');

                if (link && quality) {
                    links.push({
                        quality,
                        size,
                        url: link,
                        host: hostName
                    });
                }
            });

            if (serverTitle && links.length > 0) {
                downloadOptions.push({
                    server: serverName,
                    serverTitle,
                    links
                });
            }
        });

        // Extract additional movie info
        const info = {};
        $('.movie-info li').each((index, element) => {
            const label = $(element).find('b').text().trim().replace(':', '');
            const value = $(element).contents().filter(function() {
                return this.nodeType === 3;
            }).text().trim();
            if (label && value) {
                info[label.toLowerCase()] = value;
            }
        });

        res.json({
            success: true,
            title,
            info,
            downloadOptions,
            url: movieUrl
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'An error occurred while processing your request'
        });
    }
});

module.exports = router;