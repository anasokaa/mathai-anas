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
            ? `Tu es un professeur de mathématiques expérimenté qui explique les solutions de manière claire et pédagogique.

                Pour résoudre cette équation:

                1. Commence par écrire l'équation clairement
                2. Indique le niveau (Facile/Moyen/Difficile)
                3. Explique la solution étape par étape, comme dans un manuel scolaire
                4. Utilise un langage naturel et pédagogique

                RÈGLES:
                - Pas de numérotation avec "xx"
                - Pas de titres en majuscules
                - Écris naturellement, comme si tu expliquais à un élève
                - Utilise des phrases complètes
                - Pour les équations, utilise les balises <math>
                - Évite le jargon technique inutile

                Voici l'équation à résoudre:`
            : `You are an experienced math teacher explaining solutions in a clear and educational way.

                To solve this equation:

                1. Start by writing the equation clearly
                2. Indicate the level (Easy/Medium/Hard)
                3. Explain the solution step by step, as in a textbook
                4. Use natural and educational language

                RULES:
                - No "xx" numbering
                - No uppercase titles
                - Write naturally, as if explaining to a student
                - Use complete sentences
                - For equations, use <math> tags
                - Avoid unnecessary technical jargon

                Here's the equation to solve:`;

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
    const uploadButton = document.querySelector('#uploadButton .button-text');
    if (uploadButton) {
        uploadButton.textContent = isFrenchlanguage ? 'Importer Image' : 'Upload Image';
    }
    
    const solveButton = document.querySelector('#solveButton');
    if (solveButton) {
        solveButton.textContent = isFrenchlanguage ? 'Résoudre' : 'Decode Equation';
    }
    
    // Update loading text
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = isFrenchlanguage ? 'Décodage...' : 'Decoding...';
    }
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
                }]
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
        '\\*': '×',
        '\\/': '÷',
        '\\+-': '±',
        'sqrt': '√',
        '\\^2': '²',
        '\\^3': '³',
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