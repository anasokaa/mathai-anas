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
            ? `Tu es un expert en reconnaissance d'équations mathématiques manuscrites et typographiées.

                RÈGLES DE RECONNAISSANCE:
                1. Analyse attentivement chaque symbole
                2. Distingue clairement:
                   - Les chiffres (0-9)
                   - Les variables (x, y, z)
                   - Les opérateurs (+, -, ×, ÷, =)
                   - Les exposants et indices
                   - Les fractions et racines
                3. En cas d'ambiguïté:
                   - Compare avec les symboles standards
                   - Utilise le contexte mathématique
                   - Vérifie la cohérence de l'équation

                FORMAT DE LA SOLUTION:
                1. Équation: [équation transcrite proprement]
                2. Niveau: [Facile/Moyen/Difficile]
                3. Pour chaque étape:
                   - Équation claire sur une ligne
                   - Explication sur la ligne suivante
                4. Solution: x = [valeur]

                IMPORTANT:
                - Vérifie deux fois la transcription
                - Assure-toi que l'équation a un sens mathématique
                - En cas de doute, demande une clarification

                Résous cette équation:`
            : `You are an expert in recognizing both handwritten and typed mathematical equations.

                RECOGNITION RULES:
                1. Carefully analyze each symbol
                2. Clearly distinguish:
                   - Numbers (0-9)
                   - Variables (x, y, z)
                   - Operators (+, -, ×, ÷, =)
                   - Exponents and subscripts
                   - Fractions and roots
                3. In case of ambiguity:
                   - Compare with standard symbols
                   - Use mathematical context
                   - Check equation consistency

                SOLUTION FORMAT:
                1. Equation: [properly transcribed equation]
                2. Level: [Easy/Medium/Hard]
                3. For each step:
                   - Clear equation on one line
                   - Explanation on next line
                4. Solution: x = [value]

                IMPORTANT:
                - Double-check the transcription
                - Ensure the equation makes mathematical sense
                - If in doubt, ask for clarification

                Solve this equation:`;

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
                        text: `Analyze this image carefully:
                        1. Is there a clear mathematical equation?
                        2. Are all symbols clearly visible?
                        3. Can you distinguish between:
                           - Numbers and variables
                           - Operation symbols
                           - Equality signs
                        4. Is the writing clear enough to solve?

                        Respond with:
                        - "yes" if everything is clear
                        - "no" if there's no equation
                        - Specific feedback if there are clarity issues`
                    }, {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image.split(',')[1]
                        }
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1
                }
            })
        });

        const data = await response.json();
        const response_text = data.candidates[0].content.parts[0].text.toLowerCase();
        
        if (response_text.includes('unclear') || response_text.includes('issue')) {
            const language = document.getElementById('language').value;
            throw new Error(language === 'french' 
                ? "Pour une meilleure reconnaissance:\n- Écrivez plus gros et plus clair\n- Assurez un bon contraste\n- Évitez les symboles ambigus\n- Utilisez un fond uni\n- Prenez la photo bien droite"
                : "For better recognition:\n- Write larger and clearer\n- Ensure good contrast\n- Avoid ambiguous symbols\n- Use a plain background\n- Take the photo straight on");
        }
        
        return response_text.includes('yes');
    } catch (error) {
        console.error('Error verifying image:', error);
        throw error;
    }
}

// Update the solution formatting
function formatSolution(solutionText) {
    // Remove any HTML or math tags
    solutionText = solutionText.replace(/<[^>]*>/g, '');
    
    // Split into lines and clean them
    let lines = solutionText.split('\n')
        .map(line => line.trim())
        .filter(line => line);
    
    // Format the solution with proper HTML structure
    let formattedHtml = '<div class="solution-container">';
    
    let isEquation = true; // Toggle between equation and explanation
    
    lines.forEach(line => {
        if (line.startsWith('Equation:') || line.startsWith('Équation:')) {
            formattedHtml += `<div class="equation-header">${line}</div>`;
        }
        else if (line.startsWith('Level:') || line.startsWith('Niveau:')) {
            formattedHtml += `<div class="difficulty-label">${line}</div>`;
        }
        else if (line.startsWith('Solution:')) {
            formattedHtml += `<div class="final-solution">${line}</div>`;
        }
        else {
            if (isEquation) {
                formattedHtml += `<div class="step-container">
                    <div class="step-equation">${line}</div>`;
            } else {
                formattedHtml += `<div class="step-explanation">${line}</div>
                </div>`;
            }
            isEquation = !isEquation;
        }
    });
    
    formattedHtml += '</div>';
    return formattedHtml;
} 