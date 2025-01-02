const API_KEY = 'AIzaSyBya-gL9tn8Gp5Tl5Rzg3Dk5ke2yzWeGjY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Theme handling
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        document.getElementById('theme').value = savedTheme;
        document.body.className = `theme-${savedTheme}`;
    }

    document.getElementById('theme').addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('preferred-theme', theme);
    });
});

document.getElementById('imageInput').addEventListener('change', handleImageSelect);
document.getElementById('solveButton').addEventListener('click', startSolving);
document.getElementById('confirmEquation').addEventListener('click', handleConfirmation);
document.getElementById('correctEquation').addEventListener('click', showCorrectionInput);
document.getElementById('submitCorrection').addEventListener('click', handleCorrection);

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
            document.getElementById('solveButton').disabled = false;
        }
        reader.readAsDataURL(file);
    }
}

async function startSolving() {
    const imageInput = document.getElementById('imageInput');
    const file = imageInput.files[0];
    const loading = document.getElementById('loading');
    
    loading.style.display = 'block';
    document.querySelector('.verification-section').style.display = 'none';
    document.getElementById('solution').innerHTML = '';

    try {
        const base64Image = await getBase64(file);
        const equation = await detectEquation(base64Image);
        showVerification(equation);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('solution').innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
    }
}

function showVerification(equation) {
    const verificationSection = document.querySelector('.verification-section');
    document.getElementById('detectedEquation').textContent = equation;
    verificationSection.style.display = 'block';
}

function showCorrectionInput() {
    document.querySelector('.correction-input').style.display = 'block';
    document.getElementById('equationInput').value = document.getElementById('detectedEquation').textContent;
}

function handleConfirmation() {
    const equation = document.getElementById('detectedEquation').textContent;
    solveEquation(equation);
}

function handleCorrection() {
    const equation = document.getElementById('equationInput').value;
    solveEquation(equation);
}

async function solveEquation(equation) {
    const loading = document.getElementById('loading');
    const solution = document.getElementById('solution');
    
    loading.style.display = 'block';
    document.querySelector('.verification-section').style.display = 'none';
    solution.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Solve this mathematical equation step by step:
                        ${equation}
                        
                        Format your response like this:
                        1. First step:
                        [Show the equation]
                        This simplifies to:
                        [Show the result]
                        
                        2. Next step:
                        [Continue with the equation]
                        This leads to:
                        [Show the result]
                        
                        Therefore, the solution is [final answer]`
                    }]
                }]
            })
        });

        const data = await response.json();
        solution.innerHTML = formatSolution(data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error:', error);
        solution.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
    }
}

function formatSolution(text) {
    const steps = text.split('\n').filter(line => line.trim());
    let html = '<div class="solution-container">';
    
    let currentStep = null;
    
    for (const line of steps) {
        if (line.match(/^\d+\./)) {
            if (currentStep) {
                html += '</div>';
            }
            currentStep = line;
            html += `<div class="step">
                    <div class="step-number">${line}</div>`;
        } else if (line.includes('Therefore')) {
            html += `<div class="final-solution">${line}</div>`;
        } else if (line.includes('simplifies to') || line.includes('leads to')) {
            html += `<div class="step-explanation">${line}</div>`;
        } else {
            html += `<div class="step-equation">${line}</div>`;
        }
    }
    
    if (currentStep) {
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// Helper functions remain the same
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