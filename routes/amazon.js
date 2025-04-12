const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * @route GET /api/amazon/price
 * @desc Scrape Amazon product details including variants and specs
 * @access Public
 * @param {string} url - Amazon product URL
 */
router.get('/price', async (req, res) => {
    try {
        const { url } = req.query;

        // Validate URL
        if (!url || !url.includes('amazon.')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Amazon URL',
                example: '/api/amazon/price?url=https://www.amazon.com/dp/B08N5KWB9H'
            });
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        };

        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);

        // Extract basic product info
        const title = $('#productTitle').text().trim();
        const priceWhole = $('.a-price-whole').first().text().replace(/,/g, '');
        const priceFraction = $('.a-price-fraction').first().text();
        const price = priceWhole && priceFraction ? `$${priceWhole}${priceFraction}` : null;
        const availability = $('#availability span').first().text().trim();
        const rating = $('#acrPopover').attr('title') || 'Not rated';
        const reviewCount = $('#acrCustomerReviewText').text().trim();
        
        // Extract high-res image (use data-old-hires if available)
        let image = $('#landingImage').attr('data-old-hires') || 
                   $('#landingImage').attr('src') || 
                   $('#imgBlkFront').attr('src');
        
        // Extract all available image resolutions
        const imageResolutions = [];
        const imageData = $('#landingImage').attr('data-a-dynamic-image');
        if (imageData) {
            try {
                const imageObj = JSON.parse(imageData);
                Object.keys(imageObj).forEach(imgUrl => {
                    imageResolutions.push({
                        url: imgUrl,
                        width: imageObj[imgUrl][0],
                        height: imageObj[imgUrl][1]
                    });
                });
            } catch (e) {
                console.error('Error parsing image data:', e);
            }
        }

        // Extract color variants with prices
        const colorVariants = [];
        $('.inline-twister-swatch').each((i, element) => {
            const $el = $(element);
            const colorName = $el.find('img').attr('alt') || 'Unknown';
            const colorImage = $el.find('img').attr('src');
            const priceText = $el.find('.twister_swatch_price').text().trim();
            
            colorVariants.push({
                color: colorName,
                image: colorImage,
                priceOptions: priceText || 'Not available',
                asin: $el.closest('li').attr('data-asin') || null
            });
        });

        // Extract product specifications
        const specifications = {};
        $('.po-brand, .po-model_name, .po-display\\.size, .po-color, .po-hard_disk\\.size, .po-cpu_model\\.family, .po-ram_memory\\.installed_size, .po-operating_system, .po-special_feature, .po-graphics_description').each((i, element) => {
            const key = $(element).find('td:first-child span').text().trim().replace(/\s+/g, '_').toLowerCase();
            const value = $(element).find('td:last-child span').text().trim();
            specifications[key] = value;
        });

        // Extract bullet points/features
        const features = [];
        $('#feature-bullets ul li').each((i, element) => {
            const feature = $(element).text().trim();
            if (feature) features.push(feature);
        });

        if (!title) {
            throw new Error('Product details not found - Amazon may have changed their HTML structure');
        }

        res.json({
            owner: '@thenux',
            success: true,
            product: {
                title,
                price,
                availability: availability || 'In Stock',
                rating,
                reviewCount,
                image,
                imageResolutions,
                url
            },
            variants: {
                colors: colorVariants,
                count: colorVariants.length
            },
            specifications,
            features,
            metadata: {
                scrapedAt: new Date().toISOString(),
                note: 'Prices may vary by color option. Check availability for specific variants.'
            }
        });

    } catch (error) {
        console.error('Amazon Scraper Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product details',
            solution: 'Try again later or check the URL',
            note: 'Amazon may block scrapers - consider using rotating proxies'
        });
    }
});

module.exports = router;