const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// --- Variables de Spotify ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/spotify/callback';

// --- Variables de YouTube ---
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/auth/youtube/callback';

// ==========================================
// RUTAS DE YOUTUBE (Google)
// ==========================================

app.get('/auth/youtube', (req, res) => {
    if (!YOUTUBE_CLIENT_ID) {
        return res.status(500).send("Falta configurar YOUTUBE_CLIENT_ID en el archivo .env");
    }
    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: YOUTUBE_CLIENT_ID,
        scope: scope,
        redirect_uri: YOUTUBE_REDIRECT_URI,
        access_type: 'offline',
        prompt: 'consent'
    });
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + auth_query_parameters.toString());
});

app.get('/auth/youtube/callback', async (req, res) => {
    const code = req.query.code;
    
    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
            code: code,
            client_id: YOUTUBE_CLIENT_ID,
            client_secret: YOUTUBE_CLIENT_SECRET,
            redirect_uri: YOUTUBE_REDIRECT_URI,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const access_token = response.data.access_token;
        res.redirect('/?token=' + access_token + '&platform=youtube');
    } catch (error) {
        console.error("Error obteniendo token de YouTube:", error.response ? error.response.data : error.message);
        res.send('Error en la autenticación con YouTube.');
    }
});

app.get('/api/youtube/playlists', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', {
            headers: { 'Authorization': token }
        });
        res.json(response.data.items || []);
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch YouTube playlists' });
    }
});


// ==========================================
// RUTAS DE SPOTIFY
// ==========================================

app.get('/auth/spotify', (req, res) => {
    if (!SPOTIFY_CLIENT_ID) {
        return res.status(500).send("Falta configurar SPOTIFY_CLIENT_ID en el archivo .env");
    }
    const scope = 'playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public';
    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: SPOTIFY_REDIRECT_URI
    });
    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;
    
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
            code: code,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
            }
        });
        
        const access_token = response.data.access_token;
        res.redirect('/?token=' + access_token + '&platform=spotify');
    } catch (error) {
        console.error("Error obteniendo token:", error.response ? error.response.data : error.message);
        res.send('Error en la autenticación con Spotify. Revisa la consola.');
    }
});

app.get('/api/spotify/playlists', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: { 'Authorization': token }
        });
        res.json(response.data.items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

module.exports = app;
