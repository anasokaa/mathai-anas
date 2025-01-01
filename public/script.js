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

    // Ajouter l'event listener pour le bouton de soumission de correction
    document.getElementById('submitCorrection').addEventListener('click', () => {
        const correctedEquation = document.getElementById('equationInput').value.trim();
        if (correctedEquation) {
            solveDetectedEquation(correctedEquation);
        }
    });

    // Ajouter l'event listener pour la touche Enter dans le champ de texte
    document.getElementById('equationInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const correctedEquation = e.target.value.trim();
            if (correctedEquation) {
                solveDetectedEquation(correctedEquation);
            }
        }
    });
});

document.getElementById('imageInput').addEventListener('change', handleImageSelect);
document.getElementById('solveButton').addEventListener('click', solveEquation);

async function solveEquation() {
    const imageInput = document.getElementById('imageInput');
    const file = imageInput.files[0];
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    const verificationSection = document.getElementById('verificationSection');
    
    loading.style.display = 'block';
    solution.innerHTML = '';
    verificationSection.style.display = 'none';

    try {
        const base64Image = await getBase64(file);
        const isEquation = await verifyEquationImage(base64Image);
        
        if (!isEquation) {
            throw new Error(FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]);
        }

        // Detect the equation
        const detectedEquation = await detectEquation(base64Image);
        
        // Show verification section
        loading.style.display = 'none';
        verificationSection.style.display = 'block';
        document.querySelector('.detected-equation').textContent = detectedEquation;
        
        // Handle verification buttons
        document.getElementById('confirmEquation').onclick = () => {
            solveDetectedEquation(detectedEquation, base64Image);
        };
        
        document.getElementById('correctEquation').onclick = () => {
            document.querySelector('.verification-container').style.display = 'none';
            document.querySelector('.correction-container').style.display = 'block';
        };
        
        document.getElementById('submitCorrection').onclick = () => {
            const correctedEquation = document.getElementById('equationInput').value.trim();
            if (correctedEquation) {
                solveDetectedEquation(correctedEquation);
            }
        };

    } catch (error) {
        console.error('Error:', error);
        loading.style.display = 'none';
        solution.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Add this function to create the solution prompt
function createSolutionPrompt(language, equation) {
    return language === 'french' 
        ? `Résous cette équation mathématique:
            ${equation}

            FORMAT:
            1. Commence par "Niveau: (Facile/Moyen/Difficile)"
            2. Pour chaque étape:
               - Montre l'équation complète
               - Explique brièvement l'opération
            3. Termine par la solution finale

            EXEMPLE:
            Niveau: Facile
            2x + 4 = 10
            → 2x = 10 - 4    (soustraction)
            → 2x = 6         (simplification)
            → x = 3          (division par 2)
            ∴ x = 3          (solution finale)`
        : `Solve this mathematical equation:
            ${equation}

            FORMAT:
            1. Start with "Level: (Easy/Medium/Hard)"
            2. For each step:
               - Show the complete equation
               - Briefly explain the operation
            3. End with the final solution

            EXAMPLE:
            Level: Easy
            2x + 4 = 10
            → 2x = 10 - 4    (subtraction)
            → 2x = 6         (simplification)
            → x = 3          (divide by 2)
            ∴ x = 3          (final solution)`;
}

// Update solveDetectedEquation function to include response handling
async function solveDetectedEquation(equation, base64Image = null) {
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    const verificationSection = document.getElementById('verificationSection');
    
    loading.style.display = 'block';
    solution.innerHTML = '';
    verificationSection.style.display = 'none';

    try {
        const language = document.getElementById('language').value;
        const promptText = createSolutionPrompt(language, equation);
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: promptText
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 1
            }
        };

        // If we have the original image, include it
        if (base64Image) {
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image.split(',')[1]
                }
            });
        }

        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content) {
            let solutionText = data.candidates[0].content.parts[0].text;
            solutionText = formatSolution(solutionText);
            solution.innerHTML = solutionText;
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
        reader.onload = async function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            
            // Show loading state
            const loading = document.getElementById('loading');
            const solution = document.getElementById('solution');
            loading.style.display = 'block';
            solution.innerHTML = '';

            try {
                // Verify and detect equation automatically
                const base64Image = e.target.result;
                const isEquation = await verifyEquationImage(base64Image);
                
                if (!isEquation) {
                    throw new Error(FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]);
                }

                // Detect the equation
                const detectedEquation = await detectEquation(base64Image);
                
                // Show verification section
                loading.style.display = 'none';
                const verificationSection = document.getElementById('verificationSection');
                verificationSection.style.display = 'block';
                document.querySelector('.detected-equation').textContent = detectedEquation;
                
                // Scroll to verification section
                verificationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
            } catch (error) {
                console.error('Error:', error);
                loading.style.display = 'none';
                solution.innerHTML = `<div class="error">Error: ${error.message}</div>`;
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
    
    // Update verification texts
    const verificationTitle = document.querySelector('.verification-title');
    if (verificationTitle) {
        verificationTitle.textContent = isFrenchlanguage 
            ? 'Est-ce la bonne équation ?' 
            : 'Is this the correct equation?';
    }

    const confirmButton = document.getElementById('confirmEquation');
    if (confirmButton) {
        confirmButton.textContent = isFrenchlanguage ? 'Oui, résoudre' : 'Yes, solve it';
    }

    const correctButton = document.getElementById('correctEquation');
    if (correctButton) {
        correctButton.textContent = isFrenchlanguage ? 'Non, corriger' : 'No, fix it';
    }

    const correctionTitle = document.querySelector('.correction-title');
    if (correctionTitle) {
        correctionTitle.textContent = isFrenchlanguage 
            ? 'Entrez l\'équation correcte :' 
            : 'Enter the correct equation:';
    }

    const submitCorrection = document.getElementById('submitCorrection');
    if (submitCorrection) {
        submitCorrection.textContent = isFrenchlanguage 
            ? 'Résoudre celle-ci' 
            : 'Solve this instead';
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
    // Nettoyer le texte
    solutionText = solutionText.replace(/<[^>]*>/g, '');
    
    let formattedHtml = '<div class="solution-container">';
    
    // Séparer les lignes
    const lines = solutionText.split('\n').map(line => line.trim()).filter(line => line);
    
    lines.forEach(line => {
        if (line.startsWith('Level:') || line.startsWith('Niveau:')) {
            formattedHtml += `<div class="difficulty-label">${line}</div>`;
        }
        else if (line.includes('→') || line.includes('∴')) {
            // Séparer l'équation et l'explication
            const [equation, explanation] = line.split('(').map(part => part.trim());
            formattedHtml += `
                <div class="step-container">
                    <div class="step-equation">${equation}</div>
                    <div class="step-explanation">(${explanation || ''}</div>
                </div>`;
        }
        else if (!line.startsWith('FORMAT:') && !line.startsWith('EXEMPLE:')) {
            formattedHtml += `<div class="step-equation">${line}</div>`;
        }
    });
    
    formattedHtml += '</div>';
    return formattedHtml;
}

// Add after verifyEquationImage function
async function detectEquation(base64Image) {
    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "What is the exact mathematical equation shown in this image? Respond with just the equation, using proper mathematical symbols (×, ÷, −, =)."
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
        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        console.error('Error detecting equation:', error);
        throw error;
    }
} 