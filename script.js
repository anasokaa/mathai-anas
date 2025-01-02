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
    
    setupMobilePreview();
    updateUILanguage(document.getElementById('language').value);
});

document.getElementById('imageInput').addEventListener('change', handleImageSelect);
document.getElementById('solveButton').addEventListener('click', solveEquation);

// Handle file selection
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

// Setup mobile preview
function setupMobilePreview() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        const dropZone = document.getElementById('dropZone');
        dropZone.style.display = 'none';
        document.getElementById('mobileUpload').style.display = 'block';
    }
}

// Update UI language
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

// Handle equation solving
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

// Convert file to base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Verify if image contains an equation
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
                        text: `Is there a clear mathematical equation in this image?
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

// Detect equation in image
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

// Solve detected equation
async function solveDetectedEquation(equation, base64Image = null) {
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    const verificationSection = document.getElementById('verificationSection');
    
    loading.style.display = 'block';
    solution.innerHTML = '';
    verificationSection.style.display = 'none';

    try {
        const language = document.getElementById('language').value;
        const promptText = language === 'french' 
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

// Format solution output
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