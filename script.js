const API_KEY = 'AIzaSyBya-gL9tn8Gp5Tl5Rzg3Dk5ke2yzWeGjY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Restore preferred theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        document.getElementById('theme').value = savedTheme;
        document.body.className = `theme-${savedTheme}`;
    }
    
    // Setup language change
    document.getElementById('language').addEventListener('change', (e) => {
        updateUILanguage(e.target.value);
    });

    // Setup theme change
    document.getElementById('theme').addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('preferred-theme', theme);
    });
});

document.getElementById('imageInput').addEventListener('change', handleImageSelect);

// Handle file selection
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            alert('Image file is too large. Please use an image under 4MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            processEquation(file);
        }
        reader.readAsDataURL(file);
    }
}

// Update UI language
function updateUILanguage(language) {
    const isFrenchlanguage = language === 'french';
    
    // Update button text
    const uploadButton = document.querySelector('.upload-button');
    if (uploadButton) {
        uploadButton.textContent = isFrenchlanguage ? '📸 IMPORTER ÉQUATION' : '📸 UPLOAD EQUATION';
    }

    // Update loading text
    const loadingText = document.getElementById('loading');
    if (loadingText) {
        loadingText.textContent = isFrenchlanguage ? 'TRAITEMENT...' : 'PROCESSING...';
    }
}

// Process equation image
async function processEquation(file) {
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    
    loading.style.display = 'block';
    solution.innerHTML = '';

    try {
        const base64Image = await getBase64(file);
        const equation = await detectEquation(base64Image);
        const solvedEquation = await solveEquation(equation);
        
        solution.innerHTML = formatSolution(solvedEquation);
    } catch (error) {
        console.error('Error:', error);
        solution.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
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

// Detect equation in image
async function detectEquation(base64Image) {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: "What is the exact mathematical equation shown in this image? Respond with just the equation."
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
    return data.candidates[0].content.parts[0].text.trim();
}

// Solve equation
async function solveEquation(equation) {
    const language = document.getElementById('language').value;
    const promptText = language === 'french' 
        ? `Résous cette équation mathématique: ${equation}
           Montre chaque étape du calcul.`
        : `Solve this mathematical equation: ${equation}
           Show each step of the solution.`;

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: promptText
                }]
            }]
        })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Format solution
function formatSolution(text) {
    return `<div class="solution-text">${text}</div>`;
} 