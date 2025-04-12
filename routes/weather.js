const express = require('express');
const router = express.Router();
const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '3353c527b7ef757c25be3e021b06a96f';

/**
 * @route GET /api/weather
 * @desc Get weather data for a city
 * @access Public
 * @param {string} city - City name
 * @param {string} [units=metric] - Units (metric/imperial)
 */
router.get('/', async (req, res) => {
    try {
        const { city, units = 'metric' } = req.query;

        if (!city) {
            return res.status(400).json({
                success: false,
                error: 'City parameter is required',
                example: '/api/weather?city=Tokyo'
            });
        }

        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${OPENWEATHER_API_KEY}`;
        const response = await axios.get(apiUrl);

        const weatherData = {
            city: response.data.name,
            country: response.data.sys.country,
            temp: response.data.main.temp,
            feels_like: response.data.main.feels_like,
            humidity: response.data.main.humidity,
            wind: {
                speed: response.data.wind.speed,
                deg: response.data.wind.deg
            },
            conditions: response.data.weather[0].main,
            description: response.data.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${response.data.weather[0].icon}@2x.png`,
            units: units === 'metric' ? '°C' : '°F'
        };

        res.json({
            success: true,
            ...weatherData
        });

    } catch (error) {
        console.error('Weather API Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to fetch weather data';

        if (error.response) {
            statusCode = error.response.status;
            if (statusCode === 404) {
                errorMessage = 'City not found';
            } else if (statusCode === 401) {
                errorMessage = 'Invalid API key';
            }
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Check the city name or try again later'
        });
    }
});

module.exports = router;