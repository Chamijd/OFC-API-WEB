const express = require('express');
const router = express.Router();
const axios = require('axios');

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

/**
 * @route GET /api/anime/search
 * @desc Search anime by title
 * @access Public
 * @param {string} q - Search query
 * @param {number} [limit=5] - Number of results
 */
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
                example: '/api/anime/search?q=Attack+on+Titan'
            });
        }

        // Search anime
        const searchUrl = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(q)}&limit=${limit}`;
        const searchResponse = await axios.get(searchUrl);

        // Process results
        const animeList = searchResponse.data.data.map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_english: anime.title_english,
            title_japanese: anime.title_japanese,
            type: anime.type,
            episodes: anime.episodes,
            status: anime.status,
            airing: anime.airing,
            score: anime.score,
            scored_by: anime.scored_by,
            rank: anime.rank,
            popularity: anime.popularity,
            synopsis: anime.synopsis,
            background: anime.background,
            season: anime.season,
            year: anime.year,
            images: {
                jpg: anime.images.jpg,
                webp: anime.images.webp
            },
            trailer: anime.trailer ? {
                youtube_id: anime.trailer.youtube_id,
                url: anime.trailer.url,
                embed_url: anime.trailer.embed_url
            } : null,
            genres: anime.genres.map(g => g.name),
            themes: anime.themes.map(t => t.name),
            demographics: anime.demographics.map(d => d.name)
        }));

        res.json({
            success: true,
            query: q,
            count: animeList.length,
            results: animeList
        });

    } catch (error) {
        console.error('Anime Search Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to search anime';

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data.message || `Jikan API returned ${statusCode}`;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Try again later or check your query'
        });
    }
});

/**
 * @route GET /api/anime/info/:id
 * @desc Get detailed anime information by MAL ID
 * @access Public
 * @param {number} id - MyAnimeList ID
 */
router.get('/info/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Valid MyAnimeList ID is required',
                example: '/api/anime/info/16498'
            });
        }

        // Get full anime info
        const infoUrl = `${JIKAN_BASE_URL}/anime/${id}/full`;
        const infoResponse = await axios.get(infoUrl);

        const anime = infoResponse.data.data;

        // Format relations
        const relations = anime.relations.map(rel => ({
            relation: rel.relation,
            entries: rel.entry.map(entry => ({
                mal_id: entry.mal_id,
                type: entry.type,
                name: entry.name,
                url: entry.url
            }))
        }));

        // Format statistics
        const statistics = anime.statistics ? {
            watching: anime.statistics.watching,
            completed: anime.statistics.completed,
            on_hold: anime.statistics.on_hold,
            dropped: anime.statistics.dropped,
            plan_to_watch: anime.statistics.plan_to_watch,
            total: anime.statistics.total,
            scores: anime.statistics.scores
        } : null;

        res.json({
            success: true,
            data: {
                mal_id: anime.mal_id,
                titles: {
                    default: anime.title,
                    english: anime.title_english,
                    japanese: anime.title_japanese,
                    synonyms: anime.title_synonyms
                },
                type: anime.type,
                source: anime.source,
                episodes: anime.episodes,
                status: anime.status,
                airing: anime.airing,
                aired: anime.aired,
                duration: anime.duration,
                rating: anime.rating,
                score: anime.score,
                scored_by: anime.scored_by,
                rank: anime.rank,
                popularity: anime.popularity,
                members: anime.members,
                favorites: anime.favorites,
                synopsis: anime.synopsis,
                background: anime.background,
                season: anime.season,
                year: anime.year,
                broadcast: anime.broadcast,
                producers: anime.producers.map(p => p.name),
                licensors: anime.licensors.map(l => l.name),
                studios: anime.studios.map(s => s.name),
                genres: anime.genres.map(g => g.name),
                themes: anime.themes.map(t => t.name),
                demographics: anime.demographics.map(d => d.name),
                relations,
                theme: {
                    openings: anime.theme && anime.theme.openings ? anime.theme.openings : [],
                    endings: anime.theme && anime.theme.endings ? anime.theme.endings : []
                },
                external: anime.external,
                streaming: anime.streaming,
                statistics,
                images: {
                    jpg: anime.images.jpg,
                    webp: anime.images.webp
                },
                trailer: anime.trailer ? {
                    youtube_id: anime.trailer.youtube_id,
                    url: anime.trailer.url,
                    embed_url: anime.trailer.embed_url
                } : null
            }
        });

    } catch (error) {
        console.error('Anime Info Error:', error);
        
        let statusCode = 500;
        let errorMessage = 'Failed to fetch anime details';

        if (error.response) {
            statusCode = error.response.status;
            if (statusCode === 404) {
                errorMessage = 'Anime not found';
            }
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            solution: 'Check the MyAnimeList ID or try again later'
        });
    }
});

module.exports = router;