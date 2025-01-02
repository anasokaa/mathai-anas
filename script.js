const API_KEY = 'AIzaSyBya-gL9tn8Gp5Tl5Rzg3Dk5ke2yzWeGjY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Theme handling
document.addEventListener('DOMContentLoaded', () => {
    // Restore preferred theme
    const savedTheme = localStorage.getItem('preferred-theme') || 'cyberpunk';
    document.getElementById('theme').value = savedTheme;
    document.body.className = `theme-${savedTheme}`;

    // Setup theme change listener
    document.getElementById('theme').addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('preferred-theme', theme);
    });
});

document.getElementById('imageInput').addEventListener('change', handleImageSelect);

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

async function processEquation(file) {
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    
    loading.style.display = 'block';
    solution.innerHTML = '';

    try {
        const base64Image = await getBase64(file);
        const equation = await detectEquation(base64Image);
        const solvedEquation = await solveEquation(equation);
        
        solution.innerHTML = solvedEquation;
    } catch (error) {
        console.error('Error:', error);
        solution.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

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

async function solveEquation(equation) {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `Solve this mathematical equation step by step: ${equation}`
                }]
            }]
        })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
} 