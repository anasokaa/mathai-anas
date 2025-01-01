const API_KEY = 'AIzaSyBya-gL9tn8Gp5Tl5Rzg3Dk5ke2yzWeGjY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const VALID_EQUATION_CONFIDENCE = 0.7;
const FUNNY_MESSAGES = [
    "That's a lovely picture... but MathAI Anas needs equations! 🤔",
    "Unless you're trying to calculate the cuteness of that image, I need an equation! 📐",
    "Nice shot! But my mathematical powers are useless here. Try an equation! ✨",
    "I'm MathAI Anas, not an art critic! Let's see some equations! 🎨➗"
];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Restore preferred theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        document.getElementById('theme').value = savedTheme;
        document.body.className = `theme-${savedTheme}`;
    }
    
    setupMobilePreview();
    updateUILanguage(document.getElementById('language').value);
    
    // Add mobile-specific handling
    const uploadButton = document.getElementById('uploadButton');
    const imageInput = document.getElementById('imageInput');

    // Handle both click and touch events
    uploadButton.addEventListener('click', (e) => {
        e.preventDefault();
        imageInput.click();
    });

    uploadButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        imageInput.click();
    });

    // Make sure the input is properly handled
    imageInput.addEventListener('change', handleImageSelect);
    
    // Prevent default behavior on mobile
    imageInput.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });
});

document.getElementById('imageInput').addEventListener('change', handleImageSelect);
document.getElementById('solveButton').addEventListener('click', solveEquation);

async function solveEquation() {
    const imageInput = document.getElementById('imageInput');
    const file = imageInput.files[0];
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    const language = document.getElementById('language').value;

    if (!file) {
        alert('Please select an image first!');
        return;
    }

    loading.style.display = 'block';
    solution.innerHTML = '';

    try {
        if (file.size > 4 * 1024 * 1024) {
            throw new Error('Image file is too large. Please use an image under 4MB.');
        }

        const base64Image = await getBase64(file);
        
        // First, verify if the image contains an equation
        const isEquation = await verifyEquationImage(base64Image);
        
        if (!isEquation) {
            const funnyMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
            throw new Error(funnyMessage);
        }

        const promptText = language === 'french' 
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
            Here's the equation to solve:`;

        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: promptText
                    }, {
                        inline_data: {
                            mime_type: file.type,
                            data: base64Image.split(',')[1]
                        }
                    }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content) {
            let solutionText = data.candidates[0].content.parts[0].text;
            
            // Parse difficulty level from the first line
            const firstLine = solutionText.split('\n')[0].toLowerCase();
            let difficultyClass = 'difficulty-medium';
            
            if (firstLine.includes('easy') || firstLine.includes('facile')) {
                difficultyClass = 'difficulty-easy';
            } else if (firstLine.includes('hard') || firstLine.includes('difficile')) {
                difficultyClass = 'difficulty-hard';
            }

            // Format the solution with proper styling
            const formattedSolution = marked.parse(solutionText)
                .replace(/<math>/g, '<span class="math">')
                .replace(/<\/math>/g, '</span>');

            solution.innerHTML = `
                <h3>${language === 'french' ? 'Solution:' : 'Solution:'}</h3>
                <div class="${difficultyClass}">
                    ${formattedSolution}
                </div>
            `;
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        console.error('Error:', error);
        solution.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
    }
}

function handleImageSelect(event) {
    event.preventDefault();
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('solveButton').disabled = false;
            
            // Scroll to preview on mobile
            if (window.innerWidth <= 768) {
                preview.scrollIntoView({ behavior: 'smooth' });
            }
        }
        reader.readAsDataURL(file);
    }
}

// Helper functions
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Mobile preview handling
function setupMobilePreview() {
    const preview = document.getElementById('imagePreview');
    const previewSection = document.querySelector('.preview-section');

    if (window.innerWidth <= 768) {
        previewSection.innerHTML += '<span class="preview-close">×</span>';
        
        preview.addEventListener('click', () => {
            previewSection.classList.add('active');
        });

        document.querySelector('.preview-close').addEventListener('click', () => {
            previewSection.classList.remove('active');
        });
    }
}

// Language handling
function updateUILanguage(language) {
    const isFrenchlanguage = language === 'french';
    
    // Update button texts
    document.querySelector('#uploadButton .button-text').textContent = 
        isFrenchlanguage ? 'Importer Image' : 'Upload Image';
    
    document.querySelector('#solveButton').textContent = 
        isFrenchlanguage ? 'Résoudre' : 'Decode Equation';
    
    // Update loading text
    document.getElementById('loadingText').textContent = 
        isFrenchlanguage ? 'Décodage...' : 'Decoding...';
}

// Theme handling
document.getElementById('theme').addEventListener('change', function(e) {
    document.body.className = `theme-${e.target.value}`;
    localStorage.setItem('preferred-theme', e.target.value);
});

// Language change handler
document.getElementById('language').addEventListener('change', function(e) {
    updateUILanguage(e.target.value);
});

// Add equation verification
async function verifyEquationImage(base64Image) {
    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
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
                            data: base64Image.split(',')[1]
                        }
                    }]
                }]
            })
        });

        const data = await response.json();
        return data.candidates[0].content.parts[0].text.toLowerCase().includes('yes');
    } catch (error) {
        console.error('Error verifying image:', error);
        return true;
    }
} 