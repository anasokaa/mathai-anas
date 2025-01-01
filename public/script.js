const API_KEY = 'AIzaSyBya-gL9tn8Gp5Tl5Rzg3Dk5ke2yzWeGjY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const VALID_EQUATION_CONFIDENCE = 0.7;
const FUNNY_MESSAGES = [
    "That's a lovely picture... but MathAI Anas needs equations! 🤔",
    "Unless you're trying to calculate the cuteness of that image, I need an equation! 📐",
    "Nice shot! But my mathematical powers are useless here. Try an equation! ✨",
    "I'm MathAI Anas, not an art critic! Let's see some equations! 🎨➗",
    "Hmm... I can't quite make out the equation. Could you try a clearer photo? 📸",
    "The equation seems a bit blurry. A clearer shot would help me solve it better! 🔍"
];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Restore preferred theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        document.getElementById('theme').value = savedTheme;
        document.body.className = `theme-${savedTheme}`;
    }
    
    const uploadButton = document.getElementById('uploadButton');
    const imageInput = document.getElementById('imageInput');

    // Handle file input for both mobile and desktop
    uploadButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // For mobile devices, trigger native file picker
            imageInput.click();
        } else {
            // For desktop
            imageInput.click();
        }
    });

    // Handle file selection
    imageInput.addEventListener('change', function(e) {
        handleImageSelect(e);
    });

    // Initialize other features
    setupMobilePreview();
    updateUILanguage(document.getElementById('language').value);

    // Add drag and drop handling
    const dropZone = document.getElementById('dropZone');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Handle drop zone highlighting
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
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
            ? `Tu es un expert en mathématiques qui analyse et résout des équations avec une précision de livre scolaire.

                ÉTAPES D'ANALYSE:
                1. VÉRIFICATION DE LISIBILITÉ:
                   * Si l'écriture n'est pas parfaitement claire, indique immédiatement les caractères ambigus
                   * Pour chaque symbole ambigu, liste toutes les interprétations possibles
                   * Demande une confirmation si nécessaire

                2. TRANSCRIPTION:
                   * Réécris l'équation en utilisant une notation mathématique standard
                   * Utilise les symboles mathématiques appropriés:
                     - Multiplier: ×
                     - Diviser: ÷
                     - Moins: −
                     - Plus ou moins: ±
                     - Racine carrée: √
                     - Puissance: exposant en petit (²,³)
                     - Fraction: avec barre horizontale

                3. RÉSOLUTION:
                   * Niveau: (Facile/Moyen/Difficile)
                   * Présente la solution comme dans un manuel scolaire
                   * Utilise des symboles mathématiques propres
                   * Chaque étape doit être clairement numérotée
                   * Inclus les propriétés mathématiques utilisées

                Si tu as un doute sur un symbole, écris:
                ⚠️ ATTENTION: [Décris l'ambiguïté et demande une clarification]

                Utilise <math> pour les expressions mathématiques.
                Voici l'équation à analyser:`
            : `You are a mathematics expert who analyzes and solves equations with textbook precision.

                ANALYSIS STEPS:
                1. LEGIBILITY CHECK:
                   * If the writing isn't perfectly clear, immediately indicate ambiguous characters
                   * For each ambiguous symbol, list all possible interpretations
                   * Ask for confirmation if needed

                2. TRANSCRIPTION:
                   * Rewrite the equation using standard mathematical notation
                   * Use proper mathematical symbols:
                     - Multiply: ×
                     - Divide: ÷
                     - Minus: −
                     - Plus/Minus: ±
                     - Square root: √
                     - Powers: superscript (²,³)
                     - Fractions: with horizontal bar

                3. SOLUTION:
                   * Level: (Easy/Medium/Hard)
                   * Present the solution like a textbook
                   * Use clean mathematical symbols
                   * Each step should be clearly numbered
                   * Include mathematical properties used

                If you have any doubt about a symbol, write:
                ⚠️ WARNING: [Describe the ambiguity and ask for clarification]

                Use <math> tags for mathematical expressions.
                Here's the equation to analyze:`;

        const generationConfig = {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        };

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
                generationConfig: generationConfig,
                safetySettings: [{
                    category: "HARM_CATEGORY_DANGEROUS",
                    threshold: "BLOCK_NONE"
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content) {
            let solutionText = data.candidates[0].content.parts[0].text;
            solutionText = formatSolution(solutionText);
            
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
    const file = event.target.files[0];
    if (file) {
        // Check file size
        if (file.size > 4 * 1024 * 1024) {
            alert('Image file is too large. Please use an image under 4MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('solveButton').disabled = false;
            
            // Scroll to preview on mobile
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
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
    
    // Update drop zone text
    document.querySelector('.drop-text').textContent = 
        isFrenchlanguage ? 'ou déposez votre image ici' : 'or drag and drop your image here';
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
                        text: "Can you see a mathematical equation in this image (either handwritten or typed)? Respond with 'yes', 'no', or 'unclear'. If unclear, explain what makes it hard to read."
                    }, {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image.split(',')[1]
                        }
                    }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1
                }
            })
        });

        const data = await response.json();
        const response_text = data.candidates[0].content.parts[0].text.toLowerCase();
        
        if (response_text.includes('unclear')) {
            const language = document.getElementById('language').value;
            throw new Error(language === 'french' 
                ? "L'écriture n'est pas très lisible. Essayez de :\n- Écrire plus gros\n- Améliorer l'éclairage\n- Utiliser un fond plus clair\n- Éviter les plis dans le papier"
                : "The writing isn't very clear. Try to:\n- Write larger\n- Improve lighting\n- Use a lighter background\n- Avoid paper folds");
        }
        
        return response_text.includes('yes');
    } catch (error) {
        if (error.message.includes("isn't very clear") || error.message.includes("n'est pas très lisible")) {
            throw error;
        }
        console.error('Error verifying image:', error);
        return true;
    }
}

// Update the solution formatting
function formatSolution(solutionText) {
    // Replace basic math symbols with proper Unicode characters
    const replacements = {
        '*': '×',
        '/': '÷',
        '+-': '±',
        'sqrt': '√',
        '^2': '²',
        '^3': '³',
        '->': '→',
        '<=': '≤',
        '>=': '≥',
        '!=': '≠',
        '==': '='
    };

    Object.entries(replacements).forEach(([key, value]) => {
        solutionText = solutionText.replace(new RegExp(key, 'g'), value);
    });

    // Add warning styling
    solutionText = solutionText.replace(/⚠️ WARNING:/g, '<span class="warning">⚠️ WARNING:</span>');
    solutionText = solutionText.replace(/⚠️ ATTENTION:/g, '<span class="warning">⚠️ ATTENTION:</span>');

    return solutionText;
}

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    document.getElementById('dropZone').classList.add('drag-over');
}

function unhighlight(e) {
    document.getElementById('dropZone').classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            // Create a new File object from the dropped file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // Update the file input
            const fileInput = document.getElementById('imageInput');
            fileInput.files = dataTransfer.files;
            
            // Trigger the handleImageSelect function
            handleImageSelect({ target: { files: [file] } });
        } else {
            alert('Please drop an image file');
        }
    }
} 