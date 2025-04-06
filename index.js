const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Search endpoint
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ 
                error: 'Please provide a search query parameter "q"',
                example: '/api/search?q=Deadpool'
            });
        }

        const url = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}`;
        
        // Enhanced headers to mimic browser request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://sinhalasub.lk/',
            'DNT': '1',
            'Connection': 'keep-alive'
        };

        // Fetch the HTML content with timeout
        const { data, status } = await axios.get(url, { 
            headers,
            timeout: 10000 // 10 seconds timeout
        });

        // Check if the response contains "No results found" message
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

        // Load HTML into Cheerio
        const $ = cheerio.load(data);
        const results = [];

        // Updated selectors with multiple fallback options
        const items = $('.movies-list .ml-item, .mlist, .item, .post');
        
        if (items.length === 0) {
            console.log('Debug: Page HTML Structure', $.html().substring(0, 1000));
            return res.json({
                query,
                count: 0,
                results: [],
                warning: 'No movie items found - website structure may have changed',
                status: 'Please check selectors or try again later'
            });
        }

        items.each((index, element) => {
            const $item = $(element);
            
            // Multiple selector attempts for each field
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
                    image: image ? image.replace('-185x278', '') : null, // Remove thumbnail sizing if present
                    year
                });
            }
        });

        if (results.length === 0) {
            return res.json({
                query,
                count: 0,
                results: [],
                warning: 'Items were found but no valid results could be extracted',
                debug: {
                    items_found: items.length,
                    sample_item: items.first().html()?.substring(0, 200) || 'No sample available'
                }
            });
        }

        res.json({
            query,
            count: results.length,
            results
        });

    } catch (error) {
        console.error('Search Error:', error);
        
        let errorMessage = 'An error occurred while processing your request';
        let statusCode = 500;
        let details = error.message;

        if (error.response) {
            // The request was made and the server responded with a status code
            statusCode = error.response.status;
            errorMessage = `Website returned status ${statusCode}`;
            details = {
                status: error.response.status,
                headers: error.response.headers,
                data: error.response.data?.substring(0, 200) // First 200 chars of response
            };
        } else if (error.request) {
            // The request was made but no response was received
            errorMessage = 'No response received from the website';
            details = 'The request was made but no response was received';
        }

        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            details,
            query: req.query.q || 'Unknown',
            suggestion: 'Try again later or check if the website is available'
        });
    }
});

// Download links endpoint
app.get('/api/download-links', async (req, res) => {
    try {
        const movieUrl = req.query.url;
        if (!movieUrl) {
            return res.status(400).json({ error: 'Please provide a movie URL parameter "url"' });
        }

        // Validate URL format
        if (!movieUrl.includes('sinhalasub.lk/movies/')) {
            return res.status(400).json({ error: 'Invalid URL format. Please provide a valid sinhalasub.lk movie URL' });
        }

        // Fetch the HTML content
        const { data } = await axios.get(movieUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Load HTML into Cheerio
        const $ = cheerio.load(data);
        const downloadOptions = [];

        // Extract movie title
        const title = $('h1.entry-title').text().trim() || 'Unknown Title';

        // Extract download servers and links
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

        // Extract movie info
        const info = {};
        $('.movie-info li').each((index, element) => {
            const label = $(element).find('b').text().trim().replace(':', '');
            const value = $(element).contents().filter(function() {
                return this.nodeType === 3; // Text nodes only
            }).text().trim();
            if (label && value) {
                info[label.toLowerCase()] = value;
            }
        });

        // Extract cast
        const cast = [];
        $('.persons .person').each((index, element) => {
            const name = $(element).find('.name a').text().trim();
            const role = $(element).find('.caracter').text().trim();
            const image = $(element).find('img').attr('src');
            
            if (name) {
                cast.push({
                    name,
                    role,
                    image
                });
            }
        });

        // Extract similar movies
        const similarMovies = [];
        $('#single_relacionados article').each((index, element) => {
            const title = $(element).find('img').attr('alt');
            const url = $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
            
            if (title && url) {
                similarMovies.push({
                    title,
                    url,
                    image
                });
            }
        });

        res.json({
            success: true,
            title,
            info,
            downloadOptions,
            cast,
            similarMovies,
            url: movieUrl
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'An error occurred while processing your request',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: err.message 
    });
});