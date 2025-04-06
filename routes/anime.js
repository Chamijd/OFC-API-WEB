const express = require('express');
const router = express.Router();
const axios = require('axios');

const cheerio = require('cheerio');

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'BESFRiz4o2zHpYHdBbBy7wEAohLb6IrDtFpDVw6GpFcFvmnPtCmD7J1K';

// Random Anime Image from Pexels
router.get('/random', async (req, res) => {
  try {
    const response = await axios.get('https://api.pexels.com/v1/search?query=anime&per_page=80', {
      headers: { 'Authorization': PEXELS_API_KEY }
    });
    
    const photos = response.data.photos;
    if (photos.length === 0) {
      return res.status(404).json({ error: 'No anime images found' });
    }

    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    res.json({
      image_url: randomPhoto.src.original,
      photographer: randomPhoto.photographer,
      photographer_url: randomPhoto.photographer_url,
      source: 'Pexels'
    });
  } catch (error) {
    console.error('Pexels API Error:', error);
    res.status(500).json({ error: 'Failed to fetch anime image' });
  }
});

// Anime Girl Images
router.get('/girls', async (req, res) => {
  try {
    const response = await axios.get('https://api.pexels.com/v1/search?query=anime+girl&per_page=80', {
      headers: { 'Authorization': PEXELS_API_KEY }
    });

    const photos = response.data.photos;
    if (photos.length === 0) {
      return res.status(404).json({ error: 'No anime girl images found' });
    }

    if (req.query.redirect === 'true') {
      const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
      return res.redirect(randomPhoto.src.medium);
    }

    res.json({
      count: photos.length,
      photos: photos.map(photo => ({
        url: photo.src.medium,
        original: photo.src.original,
        photographer: photo.photographer
      }))
    });

    
  } catch (error) {
    console.error('Pexels API Error:', error);
    res.status(500).json({ error: 'Failed to fetch anime girls' });
  }
});

router.get('/api/random-anime-image', async (req, res) => {
  try {
      // Fetch the random anime page
      const response = await axios.get('https://animeartbooks.net/random/');
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Extract all image URLs
      const imageUrls = [];
      $('.images img').each((i, element) => {
          const imgSrc = $(element).attr('src');
          if (imgSrc) {
              imageUrls.push(imgSrc);
          }
      });
      
      // Select a random image
      if (imageUrls.length > 0) {
          const randomIndex = Math.floor(Math.random() * imageUrls.length);
          const randomImageUrl = imageUrls[randomIndex];
          
          // Redirect to the random image
          res.redirect(randomImageUrl);
      } else {
          res.status(404).json({ error: 'No images found' });
      }
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch random anime image' });
  }
});

module.exports = router;