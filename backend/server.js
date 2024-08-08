const express = require('express');
const querystring = require('querystring');
const axios = require('axios');
require('dotenv').config();

const app = express();

const port = process.env.PORT;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

// global tokens variable to store tokens for local dev only
var tokens = {
    accessToken: null,
    refreshToken: null,
    expirationTime: null
}

function saveTokens(accessToken, refreshToken, expiresIn) {
    tokens.accessToken = accessToken;
    tokens.refreshToken = refreshToken;
    tokens.expirationTime = Date.now() + expiresIn * 1000; // expiresIn is in seconds, converting to milliseconds
}

function getTokens() {
    return tokens;
};

async function tokenMiddleware(req, res, next) {
    let { accessToken, refreshToken, expirationTime } = getTokens();

    if (!accessToken) {
        return res.status(401).send('Access token not available');
    }

    // Check if the token is expired or about to expire
    if (Date.now() > expirationTime - 60000) { // Refresh token 1 minute before expiration
        try {
            accessToken = await refreshAccessToken(refreshToken);
        } catch (error) {
            return res.status(500).send('Unable to refresh access token');
        }
    }

    // Attach the valid access token to the request object
    req.accessToken = accessToken;
    next();
};

// function that uses refresh token to get new access token
const refreshAccessToken = async (refreshToken) => {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        data: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
        }
    };

    try {
        const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
        console.log(response);
        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token || refreshToken;
        const expiresIn = response.data.expires_in;

        // Save the new tokens
        saveTokens(newAccessToken, newRefreshToken, expiresIn);
        return newAccessToken;
    } catch (error) {
        console.error('Error refreshing access token:', error.response.data);
        throw new Error('Unable to refresh access token');
    }
}

function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
};

// simpler version of /login -- does the stringify one actually change the url?
// app.get('/login', (req, res) => {
//     const spotifyAuthUrl = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=${scopes}`;
//     res.redirect(spotifyAuthUrl);
// });

app.get('/login', (req, res) => {

    var state = generateRandomString(16);
    var scope = 'user-read-private user-read-email';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));

});

app.get('/callback', async function (req, res) {

    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            data: querystring.stringify({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            }),
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        try {
            // exchange code for tokens
            const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
            const accessToken = response.data.access_token;
            const refreshToken = response.data.refresh_token;
            const expiresIn = response.data.expires_in;

            // save tokens
            saveTokens(accessToken, refreshToken, expiresIn);

            res.send('Tokens received and stored');
        } catch (error) {
            console.error('Error fetching access token:', error);
            res.status(500).send('Internal Server Error');
        }
    }
});

app.get('/profile', tokenMiddleware, async (req, res) => {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${req.accessToken}` },
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/search', tokenMiddleware, async (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).send('Query parameter is required');
    }

    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${req.accessToken}`,
            },
            params: {
                q: query,
                type: 'album',
                limit: 10, // Limit the number of results
            },
        });

        const albums = response.data.albums.items;
        // res.json(albums);
        const albumDetails = albums.map(album => ({
            name: album.name,
            artist: album.artists.map(artist => artist.name).join(', '),
            releaseYear: new Date(album.release_date).getFullYear()
        }));
        res.json(albumDetails);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
    console.log(`aux backend running on port ${port}`)
});

