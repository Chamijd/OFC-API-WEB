require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Serve Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html', 'styles.css'));
});
// Force correct MIME type
app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'styles.css'), {
      headers: {
        'Content-Type': 'text/css'
      }
    });
  });
// 404 Handler
/*app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});*/



// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});
app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'style.css'), {
      headers: {
        'Content-Type': 'text/css'
      }
    });
  });
// Add this after all your routes but before error handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  });
// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Thenux API Server running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});