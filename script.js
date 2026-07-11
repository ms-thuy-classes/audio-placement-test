// Initialize EmailJS
(function() {
    emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your EmailJS public key
})();

// Global variables
let studentInfo = {};
let listeningAnswers = {};
let readingAnswers = {};
let writingTask1 = '';
let writingTask2 = '';
let timers = {
    listening: 30 * 60, // 30 minutes in seconds
    reading: 60 * 60,   // 60 minutes
    writing: 60 * 60    // 60 minutes
};
let timerIntervals = {};
let listeningStarted = false;
let listeningQuestions = [];
let readingQuestions = [];

// Load questions from JSON files
async function loadQuestions() {
    try {
        const listeningResponse = await fetch('/assets/data/listening.json');
        listeningQuestions = await listeningResponse.json();
        
        const readingResponse = await fetch('/assets/data/reading.json');
        readingQuestions = await readingResponse.json();
        
        renderListeningQuestions();
        renderReadingQuestions();
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Student form submission
document.getElementById('student-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    studentInfo = {
        name: document.getElementById('student-name').value,
        email: document.getElementById('student-email').value,
        phone: document.getElementById('student-phone').value
    };
    
    // Save to localStorage
    localStorage.setItem('studentInfo', JSON.stringify(studentInfo));
    
    // Hide student info, show test navigation
    document.getElementById('student-info').classList.add('hidden');
    document.getElementById('test-nav').classList.remove('hidden');
    document.getElementById('display-name').textContent = studentInfo.name;
    
    // Show first test section
    showTestSection('listening');
    startTimer('listening');
});

// Tab navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const test = this.dataset.test;
        showTestSection(test);
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

function showTestSection(testName) {
    // Hide all test sections
    document.querySelectorAll('.test-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected test
    document.getElementById(`${testName}-test`).classList.remove('hidden');
    
    // Start timer if not already started
    if (!timerIntervals[testName]) {
        startTimer(testName);
    }
}

// Timer functions
function startTimer(testName) {
    const timerElement = document.getElementById(`${testName}-timer`);
    const progressElement = document.getElementById(`${testName}-progress`);
    const totalSeconds = timers[testName];
    let remainingSeconds = totalSeconds;
    
    timerIntervals[testName] = setInterval(() => {
        remainingSeconds--;
        
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        const progress = (remainingSeconds / totalSeconds) * 100;
        progressElement.style.width = `${progress}%`;
        
        // Auto submit when time is up
        if (remainingSeconds <= 0) {
            clearInterval(timerIntervals[testName]);
            autoSubmit(testName);
        }
    }, 1000);
}

// Listening test controls
document.getElementById('start-listening').addEventListener('click', function() {
    if (listeningStarted) return;
    
    listeningStarted = true;
    const audio = document.getElementById('listening-audio');
    audio.play();
    
    // Disable button
    this.disabled = true;
    this.textContent = 'Listening in Progress...';
    
    // Prevent audio controls
    audio.controls = false;
    
    // Prevent seeking
    audio.addEventListener('seeking', function() {
        if (this.currentTime < this.duration) {
            this.pause();
        }
    });
    
    // Show submit button after audio ends
    audio.addEventListener('ended', function() {
        document.getElementById('submit-listening').classList.remove('hidden');
    });
});

// Render listening questions
function renderListeningQuestions() {
    const container = document.getElementById('listening-answers');
    container.innerHTML = '';
    
    listeningQuestions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        let questionHTML = `
            <div class="question-number">Question ${index + 1}</div>
            <div class="question-text">${question.text}</div>
        `;
        
        if (question.type === 'multiple-choice') {
            questionHTML += '<div class="options">';
            question.options.forEach((option, optIndex) => {
                questionHTML += `
                    <label class="option-label">
                        <input type="radio" name="listening-q${index}" value="${option}">
                        ${option}
                    </label>
                `;
            });
            questionHTML += '</div>';
        } else if (question.type === 'fill-blank') {
            questionHTML += `
                <input type="text" name="listening-q${index}" placeholder="Your answer">
            `;
        }
        
        questionDiv.innerHTML = questionHTML;
        container.appendChild(questionDiv);
    });
}

// Render reading questions
function renderReadingQuestions() {
    const container = document.getElementById('reading-answers');
    container.innerHTML = '';
    
    readingQuestions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        
        let questionHTML = `
            <div class="question-number">Question ${index + 1}</div>
            <div class="question-text">${question.text}</div>
        `;
        
        if (question.type === 'multiple-choice') {
            questionHTML += '<div class="options">';
            question.options.forEach((option, optIndex) => {
                questionHTML += `
                    <label class="option-label">
                        <input type="radio" name="reading-q${index}" value="${option}">
                        ${option}
                    </label>
                `;
            });
            questionHTML += '</div>';
        } else if (question.type === 'fill-blank') {
            questionHTML += `
                <input type="text" name="reading-q${index}" placeholder="Your answer">
            `;
        } else if (question.type === 'matching') {
            questionHTML += `
                <input type="text" name="reading-q${index}" placeholder="Match (e.g., A, B, C)">
            `;
        }
        
        questionDiv.innerHTML = questionHTML;
        container.appendChild(questionDiv);
    });
}

// Initialize PDF viewer
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function loadPDF() {
    try {
        const pdf = await pdfjsLib.getDocument('/assets/pdf/reading-test.pdf').promise;
        const canvas = document.getElementById('pdf-canvas');
        const context = canvas.getContext('2d');
        
        // Render first page
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
}

// Writing word count
document.getElementById('task1-text').addEventListener('input', function() {
    const wordCount = this.value.trim().split(/\s+/).filter(word => word.length > 0).length;
    document.getElementById('task1-count').textContent = wordCount;
    writingTask1 = this.value;
    localStorage.setItem('writingTask1', writingTask1);
});

document.getElementById('task2-text').addEventListener('input', function() {
    const wordCount = this.value.trim().split(/\s+/).filter(word => word.length > 0).length;
    document.getElementById('task2-count').textContent = wordCount;
    writingTask2 = this.value;
    localStorage.setItem('writingTask2', writingTask2);
});

// Auto-save answers
function autoSaveAnswers() {
    // Save listening answers
    document.querySelectorAll('#listening-answers input').forEach(input => {
        if (input.checked || input.value) {
            listeningAnswers[input.name] = input.type === 'radio' ? input.value : input.value;
        }
    });
    
    // Save reading answers
    document.querySelectorAll('#reading-answers input').forEach(input => {
        if (input.checked || input.value) {
            readingAnswers[input.name] = input.type === 'radio' ? input.value : input.value;
        }
    });
    
    localStorage.setItem('listeningAnswers', JSON.stringify(listeningAnswers));
    localStorage.setItem('readingAnswers', JSON.stringify(readingAnswers));
}

// Auto-save every 30 seconds
setInterval(autoSaveAnswers, 30000);

// Submit functions
document.getElementById('submit-listening').addEventListener('click', function() {
    autoSaveAnswers();
    submitListening();
});

document.getElementById('submit-reading').addEventListener('click', function() {
    autoSaveAnswers();
    submitReading();
});

document.getElementById('submit-writing').addEventListener('click', function() {
    submitWriting();
});

function submitListening() {
    clearInterval(timerIntervals.listening);
    const score = calculateListeningScore();
    showResults();
}

function submitReading() {
    clearInterval(timerIntervals.reading);
    const score = calculateReadingScore();
    showResults();
}

function submitWriting() {
    clearInterval(timerIntervals.writing);
    showResults();
}

function autoSubmit(testName) {
    if (testName === 'listening') {
        submitListening();
    } else if (testName === 'reading') {
        submitReading();
    } else if (testName === 'writing') {
        submitWriting();
    }
}

// Calculate scores
function calculateListeningScore() {
    let correct = 0;
    const total = listeningQuestions.length;
    
    listeningQuestions.forEach((question, index) => {
        const userAnswer = listeningAnswers[`listening-q${index}`];
        if (userAnswer && userAnswer.toLowerCase() === question.answer.toLowerCase()) {
            correct++;
        }
    });
    
    return {
        correct: correct,
        total: total,
        percentage: ((correct / total) * 100).toFixed(2)
    };
}

function calculateReadingScore() {
    let correct = 0;
    const total = readingQuestions.length;
    
    readingQuestions.forEach((question, index) => {
        const userAnswer = readingAnswers[`reading-q${index}`];
        if (userAnswer && userAnswer.toLowerCase() === question.answer.toLowerCase()) {
            correct++;
        }
    });
    
    return {
        correct: correct,
        total: total,
        percentage: ((correct / total) * 100).toFixed(2)
    };
}

// Show results
async function showResults() {
    const listeningScore = calculateListeningScore();
    const readingScore = calculateReadingScore();
    
    // Display results
    document.getElementById('result-name').textContent = studentInfo.name;
    document.getElementById('result-email').textContent = studentInfo.email;
    
    document.getElementById('listening-correct').textContent = `${listeningScore.correct}/${listeningScore.total}`;
    document.getElementById('listening-percentage').textContent = `${listeningScore.percentage}%`;
    
    document.getElementById('reading-correct').textContent = `${readingScore.correct}/${readingScore.total}`;
    document.getElementById('reading-percentage').textContent = `${readingScore.percentage}%`;
    
    // Calculate overall recommendation
    const averagePercentage = (parseFloat(listeningScore.percentage) + parseFloat(readingScore.percentage)) / 2;
    let recommendation = '';
    
    if (averagePercentage < 45) {
        recommendation = 'Beginner (0-4.5)';
    } else if (averagePercentage < 55) {
        recommendation = 'Elementary (5.0-5.5)';
    } else if (averagePercentage < 65) {
        recommendation = 'Intermediate (6.0-6.5)';
    } else {
        recommendation = 'Advanced (7.0+)';
    }
    
    document.getElementById('recommendation-level').textContent = recommendation;
    
    // Send email
    await sendEmail(listeningScore, readingScore);
    
    // Hide test sections, show results
    document.getElementById('test-nav').classList.add('hidden');
    document.querySelectorAll('.test-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById('results-dashboard').classList.remove('hidden');
}

// Send email via EmailJS
async function sendEmail(listeningScore, readingScore) {
    const templateParams = {
        to_email: 'sokieua@gmail.com',
        subject: `IELTS Placement Test Submission - ${studentInfo.name}`,
        message: `
Student Information:
Name: ${studentInfo.name}
Email: ${studentInfo.email}
Phone: ${studentInfo.phone}

Listening Score:
Correct Answers: ${listeningScore.correct}/${listeningScore.total}
Percentage: ${listeningScore.percentage}%

Reading Score:
Correct Answers: ${readingScore.correct}/${readingScore.total}
Percentage: ${readingScore.percentage}%

Writing Task 1:
${writingTask1}

Writing Task 2:
${writingTask2}

Submission Time: ${new Date().toLocaleString()}
        `
    };
    
    try {
        await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Restart test
document.getElementById('restart-test').addEventListener('click', function() {
    localStorage.clear();
    location.reload();
});

// Initialize
window.addEventListener('load', function() {
    loadQuestions();
    loadPDF();
    
    // Check if student info exists
    const savedInfo = localStorage.getItem('studentInfo');
    if (savedInfo) {
        studentInfo = JSON.parse(savedInfo);
    }
});
