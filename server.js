const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add this route to serve index.html explicitly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const API_KEY = 'AIzaSyBya-gL9tn8Gp5Tl5Rzg3Dk5ke2yzWeGjY';
// Use gemini-1.5-flash model
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

app.post('/solve', async (req, res) => {
    console.log('Received solve request');
    try {
        // Log the request body size
        console.log('Request body size:', JSON.stringify(req.body).length);

        // Extract language from the request
        const isFrenchlanguage = req.body.contents[0].parts[0].text.includes('français');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: isFrenchlanguage 
                            ? `Tu es un expert en mathématiques qui parle français. Analyse d'abord la difficulté de l'équation (facile/moyen/difficile).

                            RÈGLES DE RÉPONSE:
                            - Pour une équation FACILE:
                              * Indique "Niveau: Facile"
                              * Donne uniquement les étapes essentielles
                              * Maximum 3 étapes
                              * Sois direct et concis
                              * Pas d'explications détaillées

                            - Pour une équation MOYENNE ou DIFFICILE:
                              * Indique le niveau approprié
                              * Fournis des explications détaillées
                              * Explique chaque étape
                              * Ajoute des clarifications si nécessaire

                            Utilise <math> pour encadrer les termes mathématiques.
                            Voici l'équation à résoudre:`
                            : `You are a mathematics expert. First analyze the difficulty of the equation (easy/medium/hard).

                            RESPONSE RULES:
                            - For an EASY equation:
                              * Indicate "Level: Easy"
                              * Provide only essential steps
                              * Maximum 3 steps
                              * Be direct and concise
                              * No detailed explanations

                            - For a MEDIUM or HARD equation:
                              * Indicate appropriate level
                              * Provide detailed explanations
                              * Explain each step
                              * Add clarifications when needed

                            Use <math> tags around mathematical terms.
                            Here's the equation to solve:`
                    }, {
                        inline_data: {
                            mime_type: req.body.contents[0].parts[1].inline_data.mime_type,
                            data: req.body.contents[0].parts[1].inline_data.data
                        }
                    }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                },
                safetySettings: [{
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }]
            })
        });

        const data = await response.json();
        
        // Log the complete response for debugging
        console.log('Full API Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}: ${JSON.stringify(data)}`);
        }

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from API');
        }

        res.json(data);
    } catch (error) {
        console.error('Error in /solve endpoint:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

app.post('/verify-image', async (req, res) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Is this image a mathematical equation? Respond with only 'yes' or 'no'."
                    }, {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: req.body.image
                        }
                    }]
                }]
            })
        });

        const data = await response.json();
        const answer = data.candidates[0].content.parts[0].text.toLowerCase();
        res.json({ isEquation: answer.includes('yes') });
    } catch (error) {
        console.error('Error verifying image:', error);
        res.json({ isEquation: true }); // Fail open
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
}); 