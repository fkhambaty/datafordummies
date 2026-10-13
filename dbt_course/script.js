// Initialize syntax highlighting
document.addEventListener('DOMContentLoaded', function() {
    hljs.highlightAll();
    updateProgress();
    setDate();
    loadQuizData();
    initializeQuizzes();
});

// Load quiz data
function loadQuizData() {
    // Check if quiz-data.js is loaded
    if (typeof subsectionQuizzes === 'undefined') {
        console.warn('Quiz data not loaded yet');
        setTimeout(loadQuizData, 100);
    }
}

// Initialize all quizzes
function initializeQuizzes() {
    // Will be called after DOM is ready
    console.log('Quizzes initialized');
}

// Section Navigation
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Update progress
        updateProgress();
    }
}

// Progress Tracking
function updateProgress() {
    const checkboxes = document.querySelectorAll('.checkbox-label input[type="checkbox"]');
    const totalSteps = checkboxes.length;
    const completedSteps = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    // Update progress bar
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const finalProgress = document.getElementById('finalProgress');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = percentage + '% Complete';
    }
    
    if (finalProgress) {
        finalProgress.textContent = percentage + '%';
    }
    
    // Save progress to localStorage
    saveProgress();
    
    // Celebrate completion
    if (percentage === 100) {
        setTimeout(() => {
            showCelebration();
        }, 500);
    }
}

// Save Progress to localStorage
function saveProgress() {
    const checkboxes = document.querySelectorAll('.checkbox-label input[type="checkbox"]');
    const progress = {};
    const completedSections = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalSections = checkboxes.length;
    
    checkboxes.forEach((checkbox, index) => {
        progress[`step_${index}`] = checkbox.checked;
    });
    
    // Save detailed progress for this course
    localStorage.setItem('pythonLearningProgress', JSON.stringify(progress));
    
    // Save unified progress for hub
    const hubProgress = {
        completedSections: completedSections,
        totalSections: totalSections,
        percentage: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('fkti-python-progress', JSON.stringify(hubProgress));
}

// Load Progress from localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem('pythonLearningProgress');
    
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const checkboxes = document.querySelectorAll('.checkbox-label input[type="checkbox"]');
        
        checkboxes.forEach((checkbox, index) => {
            if (progress[`step_${index}`]) {
                checkbox.checked = true;
            }
        });
        
        updateProgress();
    }
}

// Load progress on page load
document.addEventListener('DOMContentLoaded', loadProgress);

// Quiz/Answer Checking
function checkAnswer(elementId, correctAnswer, successMessage) {
    const element = document.getElementById(elementId);
    const resultDiv = document.getElementById(elementId + '-result');
    
    if (!element || !resultDiv) return;
    
    const userAnswer = element.value.trim();
    
    if (userAnswer === '') {
        resultDiv.innerHTML = '<p style="color: orange;">Please enter an answer!</p>';
        return;
    }
    
    if (userAnswer === correctAnswer) {
        resultDiv.innerHTML = `<p class="quiz-result correct">✅ ${successMessage}</p>`;
        resultDiv.style.display = 'block';
    } else {
        resultDiv.innerHTML = `<p class="quiz-result incorrect">❌ Not quite! The correct answer is: ${correctAnswer}</p>`;
        resultDiv.style.display = 'block';
    }
}

// Check Subsection Quiz (Multiple Choice)
function checkSubsectionQuiz(quizName, correctAnswer) {
    const selectedOption = document.querySelector(`input[name="${quizName}"]:checked`);
    const feedbackDiv = document.getElementById(`${quizName}-feedback`);
    
    if (!selectedOption) {
        feedbackDiv.innerHTML = '<p class="quiz-feedback-warning">⚠️ Please select an answer!</p>';
        feedbackDiv.style.display = 'block';
        return;
    }
    
    const userAnswer = selectedOption.value;
    
    if (userAnswer === correctAnswer) {
        feedbackDiv.innerHTML = '<p class="quiz-feedback-correct">✅ Correct! Well done!</p>';
        selectedOption.parentElement.classList.add('correct-answer');
        
        // Save progress
        localStorage.setItem(`quiz_${quizName}`, 'correct');
        showToast('Great job! 🎉');
    } else {
        feedbackDiv.innerHTML = `<p class="quiz-feedback-incorrect">❌ Not quite. The correct answer is option ${correctAnswer}.</p>`;
        selectedOption.parentElement.classList.add('wrong-answer');
        
        // Highlight correct answer
        const correctOption = document.querySelector(`input[name="${quizName}"][value="${correctAnswer}"]`);
        if (correctOption) {
            correctOption.parentElement.classList.add('correct-answer');
        }
    }
    
    feedbackDiv.style.display = 'block';
    
    // Disable further selections
    document.querySelectorAll(`input[name="${quizName}"]`).forEach(input => {
        input.disabled = true;
    });
}

// Check Section Quiz (Major quiz at end of section)
let currentSectionQuiz = null;
let sectionQuizScore = 0;

function startSectionQuiz(sectionName) {
    if (typeof sectionQuizzes === 'undefined') {
        alert('Quiz data not loaded. Please refresh the page.');
        return;
    }
    
    const quizData = sectionQuizzes[sectionName];
    if (!quizData) return;
    
    currentSectionQuiz = sectionName;
    sectionQuizScore = 0;
    
    // Show quiz modal
    const modal = document.getElementById('sectionQuizModal');
    const quizContainer = document.getElementById('sectionQuizContainer');
    
    if (!modal || !quizContainer) return;
    
    // Build quiz HTML
    let quizHTML = `<h2>${quizData.title}</h2>`;
    quizHTML += `<p class="quiz-instructions">Select the best answer for each question.</p>`;
    
    quizData.questions.forEach((q, index) => {
        quizHTML += `
            <div class="section-quiz-question">
                <p class="question-number">Question ${index + 1} of ${quizData.questions.length}</p>
                <p class="question-text">${q.question}</p>
                <div class="quiz-options">
        `;
        
        q.options.forEach((option, optIndex) => {
            quizHTML += `
                <label class="quiz-option">
                    <input type="radio" name="section-q${index}" value="${optIndex}">
                    <span>${option}</span>
                </label>
            `;
        });
        
        quizHTML += `
                </div>
                <div class="quiz-explanation" id="explain-${index}" style="display: none;">
                    <strong>Explanation:</strong> ${q.explanation}
                </div>
            </div>
        `;
    });
    
    quizHTML += `
        <div class="quiz-actions">
            <button class="submit-quiz-btn" onclick="submitSectionQuiz()">Submit Quiz</button>
            <button class="cancel-quiz-btn" onclick="closeSectionQuiz()">Cancel</button>
        </div>
        <div id="section-quiz-result"></div>
    `;
    
    quizContainer.innerHTML = quizHTML;
    modal.style.display = 'block';
}

function submitSectionQuiz() {
    if (!currentSectionQuiz) return;
    
    const quizData = sectionQuizzes[currentSectionQuiz];
    let score = 0;
    let allAnswered = true;
    
    quizData.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="section-q${index}"]:checked`);
        
        if (!selected) {
            allAnswered = false;
            return;
        }
        
        const userAnswer = parseInt(selected.value);
        const questionDiv = selected.closest('.section-quiz-question');
        const explanationDiv = document.getElementById(`explain-${index}`);
        
        if (userAnswer === q.correct) {
            score++;
            questionDiv.classList.add('correct');
            selected.parentElement.classList.add('correct-answer');
        } else {
            questionDiv.classList.add('incorrect');
            selected.parentElement.classList.add('wrong-answer');
            
            // Highlight correct answer
            const correctInput = document.querySelector(`input[name="section-q${index}"][value="${q.correct}"]`);
            if (correctInput) {
                correctInput.parentElement.classList.add('correct-answer');
            }
        }
        
        // Show explanation
        if (explanationDiv) {
            explanationDiv.style.display = 'block';
        }
        
        // Disable inputs
        document.querySelectorAll(`input[name="section-q${index}"]`).forEach(input => {
            input.disabled = true;
        });
    });
    
    if (!allAnswered) {
        alert('Please answer all questions before submitting!');
        return;
    }
    
    // Show result
    const resultDiv = document.getElementById('section-quiz-result');
    const percentage = Math.round((score / quizData.questions.length) * 100);
    const passed = percentage >= 70;
    
    resultDiv.innerHTML = `
        <div class="section-quiz-score ${passed ? 'passed' : 'failed'}">
            <h3>${passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}</h3>
            <p class="score-display">Score: ${score} / ${quizData.questions.length} (${percentage}%)</p>
            <p>${passed ? 'You passed this section!' : 'Review the material and try again.'}</p>
            <button class="close-quiz-btn" onclick="closeSectionQuiz()">Continue Learning</button>
        </div>
    `;
    
    if (passed) {
        localStorage.setItem(`section_quiz_${currentSectionQuiz}`, score);
        showToast('Section completed! 🎊');
    }
    
    // Hide submit button
    document.querySelector('.submit-quiz-btn').style.display = 'none';
    document.querySelector('.cancel-quiz-btn').style.display = 'none';
}

function closeSectionQuiz() {
    const modal = document.getElementById('sectionQuizModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentSectionQuiz = null;
}

// Final Certification Quiz
let finalQuizAttempts = 0;

function startFinalQuiz() {
    if (typeof finalQuiz === 'undefined') {
        alert('Quiz data not loaded. Please refresh the page.');
        return;
    }
    
    finalQuizAttempts++;
    
    const modal = document.getElementById('finalQuizModal');
    const quizContainer = document.getElementById('finalQuizContainer');
    
    if (!modal || !quizContainer) return;
    
    let quizHTML = `<h2>${finalQuiz.title}</h2>`;
    quizHTML += `<p class="quiz-instructions">${finalQuiz.description}</p>`;
    quizHTML += `<p class="passing-score">Passing Score: ${finalQuiz.passingScore} / ${finalQuiz.questions.length} (80%)</p>`;
    
    finalQuiz.questions.forEach((q, index) => {
        quizHTML += `
            <div class="final-quiz-question" data-type="${q.type}">
                <p class="question-number">Question ${index + 1} of ${finalQuiz.questions.length}</p>
                <p class="question-text">${q.question}</p>
        `;
        
        if (q.type === 'multiple-choice') {
            quizHTML += `<div class="quiz-options">`;
            q.options.forEach((option, optIndex) => {
                quizHTML += `
                    <label class="quiz-option">
                        <input type="radio" name="final-q${index}" value="${optIndex}">
                        <span>${option}</span>
                    </label>
                `;
            });
            quizHTML += `</div>`;
        } else if (q.type === 'code') {
            quizHTML += `
                <div class="code-input-container">
                    <textarea class="code-input" name="final-q${index}" rows="4" 
                        placeholder="${q.placeholder}"></textarea>
                    <p class="code-hint">Expected: <code>${q.correctAnswer}</code></p>
                </div>
            `;
        }
        
        quizHTML += `</div>`;
    });
    
    quizHTML += `
        <div class="quiz-actions">
            <button class="submit-quiz-btn" onclick="submitFinalQuiz()">Submit Final Exam</button>
            <button class="cancel-quiz-btn" onclick="closeFinalQuiz()">Cancel</button>
        </div>
        <div id="final-quiz-result"></div>
    `;
    
    quizContainer.innerHTML = quizHTML;
    modal.style.display = 'block';
}

function submitFinalQuiz() {
    let score = 0;
    let allAnswered = true;
    
    finalQuiz.questions.forEach((q, index) => {
        const questionDiv = document.querySelector(`.final-quiz-question[data-type="${q.type}"]:nth-of-type(${index + 1})`);
        
        if (q.type === 'multiple-choice') {
            const selected = document.querySelector(`input[name="final-q${index}"]:checked`);
            
            if (!selected) {
                allAnswered = false;
                return;
            }
            
            const userAnswer = parseInt(selected.value);
            
            if (userAnswer === q.correct) {
                score++;
                questionDiv.classList.add('correct');
                selected.parentElement.classList.add('correct-answer');
            } else {
                questionDiv.classList.add('incorrect');
                selected.parentElement.classList.add('wrong-answer');
                
                const correctInput = document.querySelector(`input[name="final-q${index}"][value="${q.correct}"]`);
                if (correctInput) {
                    correctInput.parentElement.classList.add('correct-answer');
                }
            }
            
            document.querySelectorAll(`input[name="final-q${index}"]`).forEach(input => {
                input.disabled = true;
            });
            
        } else if (q.type === 'code') {
            const textarea = document.querySelector(`textarea[name="final-q${index}"]`);
            
            if (!textarea || !textarea.value.trim()) {
                allAnswered = false;
                return;
            }
            
            const userCode = textarea.value;
            const isCorrect = q.validateAnswer(userCode);
            
            if (isCorrect) {
                score++;
                questionDiv.classList.add('correct');
                textarea.style.borderColor = '#4caf50';
                textarea.style.backgroundColor = '#e8f5e9';
            } else {
                questionDiv.classList.add('incorrect');
                textarea.style.borderColor = '#f44336';
                textarea.style.backgroundColor = '#ffebee';
            }
            
            textarea.disabled = true;
            
            // Show feedback
            const feedback = document.createElement('div');
            feedback.className = 'code-feedback';
            feedback.innerHTML = isCorrect ? 
                '<p style="color: #4caf50; font-weight: bold;">✅ Correct!</p>' :
                `<p style="color: #f44336; font-weight: bold;">❌ Incorrect. Expected: <code>${q.correctAnswer}</code></p>`;
            textarea.parentElement.appendChild(feedback);
        }
    });
    
    if (!allAnswered) {
        alert('Please answer all questions before submitting!');
        return;
    }
    
    const resultDiv = document.getElementById('final-quiz-result');
    const percentage = Math.round((score / finalQuiz.questions.length) * 100);
    const passed = score >= finalQuiz.passingScore;
    
    resultDiv.innerHTML = `
        <div class="final-quiz-score ${passed ? 'passed' : 'failed'}">
            <h3>${passed ? '🏆 Congratulations!' : '📚 Not Quite Yet'}</h3>
            <p class="score-display">Score: ${score} / ${finalQuiz.questions.length} (${percentage}%)</p>
            <p>${passed ? 'You passed! Click below to get your FKTI certificate.' : `You need ${finalQuiz.passingScore} correct answers to pass. Review the material and try again!`}</p>
            ${passed ? '<button class="certificate-btn" onclick="closeFinalQuiz(); showCertificate()">🎓 Get FKTI Certificate</button>' : '<button class="retry-quiz-btn" onclick="location.reload()">Try Again</button>'}
            <button class="close-quiz-btn" onclick="closeFinalQuiz()">${passed ? 'Close' : 'Review Material'}</button>
        </div>
    `;
    
    if (passed) {
        localStorage.setItem('finalQuizPassed', 'true');
        localStorage.setItem('finalQuizScore', score);
        localStorage.setItem('finalQuizDate', new Date().toISOString());
        showToast('🎉 Congratulations! You earned your FKTI certificate!');
    }
    
    document.querySelector('.submit-quiz-btn').style.display = 'none';
    document.querySelector('.cancel-quiz-btn').style.display = 'none';
    
    // Scroll to results
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeFinalQuiz() {
    const modal = document.getElementById('finalQuizModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Simulate Code Execution (for demonstration)
function runCode(outputId) {
    const outputDiv = document.getElementById(outputId);
    if (!outputDiv) return;
    
    // Show loading
    outputDiv.innerHTML = '<p>Running code...</p>';
    outputDiv.classList.add('show');
    
    // Simulate execution delay
    setTimeout(() => {
        // Different outputs for different code blocks
        const outputs = {
            'code1': `Hello, Data Science!
Welcome to Python!`,
            'code2': `Alice scored 85 points
Temperature is 23.5 degrees`
        };
        
        const output = outputs[outputId] || 'Code executed successfully!';
        outputDiv.innerHTML = `<strong>Output:</strong><br>${output.replace(/\n/g, '<br>')}`;
    }, 1000);
}

// Certificate Modal
function showCertificate() {
    const modal = document.getElementById('certificateModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeCertificate() {
    const modal = document.getElementById('certificateModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('certificateModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Download Certificate (enhanced implementation)
function downloadCertificate() {
    alert('This page cannot create a certificate. Open your account page after every lesson in the course is saved. The status stays “requested” until a person issues it. There is no verification website.');
    window.location.href = '../auth/profile.html#certificates';
}



function generateCertificateId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `PY-DS-${timestamp}-${random}`;
}

function generateCertificateHTML(name, date, score, certId) {
    return '<!DOCTYPE html><title>Not issued</title><p>No certificate file is created. Check your account page.</p>';
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FKTI Certificate - ${name}</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .certificate {
            background: white;
            padding: 60px;
            max-width: 900px;
            width: 100%;
            border: 20px solid #667eea;
            border-radius: 10px;
            box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            text-align: center;
            position: relative;
        }
        .logo-container {
            margin-bottom: 20px;
        }
        .logo-svg {
            width: 100px;
            height: 100px;
        }
        .institute-name {
            font-size: 20px;
            color: #764ba2;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 2px;
        }
        .certificate-title {
            font-size: 48px;
            color: #667eea;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .certificate-subtitle {
            font-size: 24px;
            color: #666;
            margin-bottom: 40px;
        }
        .recipient-name {
            font-size: 42px;
            color: #764ba2;
            margin: 30px 0;
            font-weight: bold;
            text-decoration: underline;
            text-decoration-color: #667eea;
        }
        .course-name {
            font-size: 32px;
            color: #333;
            margin: 30px 0;
            font-weight: bold;
        }
        .details {
            margin: 40px 0;
            font-size: 18px;
            color: #555;
            line-height: 1.8;
        }
        .signature {
            margin-top: 60px;
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
        }
        .signature-line {
            border-top: 2px solid #333;
            min-width: 200px;
            padding-top: 10px;
        }
        .cert-id {
            margin-top: 40px;
            font-size: 12px;
            color: #999;
        }
        .print-button {
            margin-top: 30px;
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .print-button:hover {
            background: #5568d3;
            transform: scale(1.05);
        }
        @media print {
            body {
                background: white;
            }
            .print-button {
                display: none;
            }
        }
        @media (max-width: 768px) {
            .certificate {
                padding: 30px 20px;
            }
            .certificate-title {
                font-size: 32px;
            }
            .recipient-name {
                font-size: 28px;
            }
            .course-name {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="logo-container">
            <svg class="logo-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="95" fill="url(#grad1)" stroke="#667eea" stroke-width="3"/>
                <rect x="30" y="75" width="140" height="50" rx="8" fill="white" opacity="0.95"/>
                <text x="100" y="110" font-family="Arial, Helvetica, sans-serif" font-size="48" 
                    font-weight="bold" fill="#667eea" text-anchor="middle" letter-spacing="2">FKTI</text>
                <text x="100" y="145" font-family="Arial, Helvetica, sans-serif" font-size="12" 
                    font-weight="normal" fill="white" text-anchor="middle" letter-spacing="1">Training Institute</text>
                <circle cx="100" cy="40" r="6" fill="#FFD43B" stroke="white" stroke-width="2"/>
                <circle cx="100" cy="165" r="6" fill="#4B8BBE" stroke="white" stroke-width="2"/>
            </svg>
        </div>
        
        <div class="institute-name">FKTI - FAKHRUDDIN KHAMBATY TRAINING INSTITUTE</div>
        
        <div class="certificate-title">🏆 CERTIFICATE OF COMPLETION 🏆</div>
        <div class="certificate-subtitle">This is to certify that</div>
        
        <div class="recipient-name">${name}</div>
        
        <div class="certificate-subtitle">has successfully completed the</div>
        
        <div class="course-name">Python for Data Science<br>Interactive Learning Course</div>
        
        <div class="details">
            <p><strong>Completion Date:</strong> ${date}</p>
            <p><strong>Final Exam Score:</strong> ${score}/30 (${Math.round((score/30)*100)}%)</p>
            <p><strong>Skills Mastered:</strong></p>
            <p>Python Fundamentals • Data Structures • Control Flow<br>
            Functions • NumPy • Pandas • Matplotlib<br>
            Data Analysis • Machine Learning Basics</p>
        </div>
        
        <div class="signature">
            <div class="signature-line">
                <strong>Director</strong><br>
                FKTI
            </div>
            <div class="signature-line">
                <strong>Verified</strong><br>
                ${date}
            </div>
        </div>
        
        <div class="cert-id">
            Certificate ID: ${certId}<br>
            Issued by: Fakhruddin Khambaty Training Institute<br>
            Verify at: not-issued/${certId}
        </div>
        
        <button class="print-button" onclick="window.print()">🖨️ Print Certificate</button>
    </div>
</body>
</html>
    `;
}

function downloadHTMLCertificate(html, name) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Python_DS_Certificate_${name.replace(/\s/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function downloadTextCertificate(name, date, score, certId) {
    return;
    const percentage = Math.round((score/30)*100);
    const certificateContent = `
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                          F K T I                               ║
║        FAKHRUDDIN KHAMBATY TRAINING INSTITUTE                  ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║           🏆  CERTIFICATE OF COMPLETION  🏆                    ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║                    This certifies that                         ║
║                                                                ║
║                     ${name.toUpperCase().padStart(40)}                        
║                                                                ║
║              has successfully completed the                    ║
║                                                                ║
║              PYTHON FOR DATA SCIENCE                           ║
║              Interactive Learning Course                       ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Completion Date: ${date.padEnd(44)} ║
║  Final Exam Score: ${score}/30 (${percentage}%)${' '.repeat(37 - score.toString().length - percentage.toString().length)}║
║                                                                ║
║  Skills Mastered:                                              ║
║  ✓ Python Fundamentals                                         ║
║  ✓ Data Structures (Lists, Dictionaries)                       ║
║  ✓ Control Flow (Loops, Conditionals)                          ║
║  ✓ Functions & Reusable Code                                   ║
║  ✓ NumPy for Numerical Computing                               ║
║  ✓ Pandas for Data Analysis                                    ║
║  ✓ Matplotlib for Data Visualization                           ║
║  ✓ Machine Learning Basics                                     ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Certificate ID: ${certId}${' '.repeat(39 - certId.length)}║
║  Issued by: FKTI                                               ║
║  Verify at: not-issued/${certId}${' '.repeat(26 - certId.length)}║
║                                                                ║
║  "Empowering Data Scientists Worldwide" 🌍                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `;
    
    const blob = new Blob([certificateContent], { type: 'text/plain; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Python_DS_Certificate_${name.replace(/\s/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Print Certificate function
function printCertificate() {
    window.print();
}

// Set current date in certificate
function setDate() {
    const certDate = document.getElementById('certDate');
    if (certDate) {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        certDate.textContent = today.toLocaleDateString('en-US', options);
    }
}

// Celebration Animation
function showCelebration() {
    // Check if already shown in this session
    if (sessionStorage.getItem('celebrationShown')) {
        return;
    }
    
    // Create confetti effect
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 3000;
        text-align: center;
        animation: bounceIn 0.5s ease;
    `;
    
    celebration.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 1rem;">🎉🎊🎉</h1>
        <h2 style="margin-bottom: 1rem;">Congratulations!</h2>
        <p style="font-size: 1.2rem;">You've completed 100% of the course!</p>
        <button onclick="this.parentElement.remove()" style="
            background: white;
            color: #f5576c;
            border: none;
            padding: 1rem 2rem;
            border-radius: 30px;
            cursor: pointer;
            font-size: 1.1rem;
            margin-top: 1rem;
            font-weight: bold;
        ">Awesome! 🚀</button>
    `;
    
    document.body.appendChild(celebration);
    sessionStorage.setItem('celebrationShown', 'true');
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (celebration.parentElement) {
            celebration.remove();
        }
    }, 5000);
}

// Hub Navigation Functions
function goToHub() {
    // Save current progress before leaving
    saveProgress();
    // Navigate to hub
    window.location.href = '../index.html';
}

function goToAirflow() {
    // Save current progress before leaving
    saveProgress();
    // Navigate to Airflow course
    window.location.href = '../airflow_course/index.html';
}

// Add CSS animation for bounce
const style = document.createElement('style');
style.textContent = `
    @keyframes bounceIn {
        0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.05);
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Reset Progress Function (for testing)
function resetProgress() {
    if (confirm('Are you sure you want to reset all progress?')) {
        localStorage.removeItem('pythonLearningProgress');
        sessionStorage.removeItem('celebrationShown');
        location.reload();
    }
}

// Keyboard Navigation
document.addEventListener('keydown', function(event) {
    // Alt + R to reset progress (for testing)
    if (event.altKey && event.key === 'r') {
        resetProgress();
    }
    
    // Alt + 1-8 for quick navigation
    if (event.altKey && event.key >= '1' && event.key <= '8') {
        const sections = ['welcome', 'basics', 'data', 'control', 'functions', 'libraries', 'examples', 'exercises'];
        const index = parseInt(event.key) - 1;
        if (sections[index]) {
            showSection(sections[index]);
        }
    }
});

// Print Instructions
console.log('%c🐍 Welcome to Python for Data Science! 🐍', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cKeyboard Shortcuts:', 'color: #764ba2; font-size: 14px; font-weight: bold;');
console.log('Alt + 1-8: Quick navigation to sections');
console.log('Alt + R: Reset progress (use with caution!)');
console.log('\n%cYour progress is automatically saved!', 'color: #4CAF50; font-size: 14px;');

// Add smooth scrolling to all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Track time spent on page
let startTime = Date.now();
window.addEventListener('beforeunload', function() {
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
    console.log(`Time spent learning: ${timeSpent} minutes`);
});

// Add tooltips to navigation buttons
const navButtons = document.querySelectorAll('.nav-btn');
const tooltips = [
    'Start your learning journey',
    'Learn Python basics',
    'Master data structures',
    'Control program flow',
    'Write reusable functions',
    'Explore powerful libraries',
    'See real-world examples',
    'Practice what you learned'
];

navButtons.forEach((btn, index) => {
    if (tooltips[index]) {
        btn.title = tooltips[index];
    }
});

// Interactive code examples enhancement
document.querySelectorAll('pre code').forEach(block => {
    // Add copy button to code blocks
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy';
    copyBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #667eea;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.85rem;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const pre = block.parentElement;
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
    
    pre.addEventListener('mouseenter', () => {
        copyBtn.style.opacity = '1';
    });
    
    pre.addEventListener('mouseleave', () => {
        copyBtn.style.opacity = '0';
    });
    
    copyBtn.addEventListener('click', () => {
        const code = block.textContent;
        navigator.clipboard.writeText(code).then(() => {
            copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                copyBtn.textContent = '📋 Copy';
            }, 2000);
        });
    });
});

// Add encouragement messages
const encouragementMessages = [
    "Great job! Keep going! 🌟",
    "You're making excellent progress! 💪",
    "Learning is a journey, not a destination! 🚀",
    "Every expert was once a beginner! 👏",
    "You're doing amazing! Keep it up! ⭐",
    "Knowledge is power! 📚",
    "Stay curious, stay coding! 💻",
    "You're on fire! 🔥"
];

// Show random encouragement when completing a step
document.querySelectorAll('.checkbox-label input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            const message = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
            showToast(message);
        }
    });
});

// Toast notification function
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        z-index: 2000;
        animation: slideInRight 0.5s ease, slideOutRight 0.5s ease 2.5s;
        font-weight: bold;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add slide animations
const slideStyle = document.createElement('style');
slideStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(slideStyle);

// Add print functionality
function printCertificate() {
    window.print();
}

// Easter egg - Konami code
let konamiCode = [];
const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join('') === konamiPattern.join('')) {
        showEasterEgg();
    }
});

function showEasterEgg() {
    const egg = document.createElement('div');
    egg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 3000;
        text-align: center;
        animation: bounceIn 0.5s ease;
    `;
    
    egg.innerHTML = `
        <h1 style="font-size: 3rem;">🎮🐍🎮</h1>
        <h2>You found the Easter Egg!</h2>
        <p style="margin-top: 1rem;">Here's a Python joke:</p>
        <p style="font-style: italic; margin-top: 0.5rem;">"Why do programmers prefer dark mode?<br>Because light attracts bugs!"</p>
        <button onclick="this.parentElement.remove()" style="
            background: white;
            color: #f5576c;
            border: none;
            padding: 1rem 2rem;
            border-radius: 30px;
            cursor: pointer;
            font-size: 1.1rem;
            margin-top: 1rem;
            font-weight: bold;
        ">😄 Ha Ha!</button>
    `;
    
    document.body.appendChild(egg);
    
    setTimeout(() => {
        if (egg.parentElement) {
            egg.remove();
        }
    }, 8000);
}

console.log('%c🎮 Psst... Try the Konami Code! ↑↑↓↓←→←→BA', 'color: #f093fb; font-size: 12px;');



// Terraform-specific functions
function showTab(tabName) {
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach(content => {
        content.classList.remove("active");
    });
    
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(button => {
        button.classList.remove("active");
    });
    
    document.getElementById(tabName).classList.add("active");
    event.target.classList.add("active");
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification("Code copied to clipboard!", "success");
    }).catch(err => {
        console.error("Failed to copy: ", err);
        showNotification("Failed to copy code", "error");
    });
}

function showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "#4caf50" : "#f44336"};
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
