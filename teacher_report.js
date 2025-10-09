// teacher_report.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get('subjectId');
    const moduleId = urlParams.get('moduleId');
    const API_URL = 'http://localhost:5000/api';

    if (subjectId) {
        fetchSubjectReportData(subjectId, API_URL);
    } else if (moduleId) {
        fetchModuleReportData(moduleId, API_URL);
    } else {
        document.body.innerHTML = '<h1>Error: No subject or module ID provided.</h1>';
        return;
    }
    document.getElementById('report-date').textContent = new Date().toLocaleDateString();
});

async function fetchSubjectReportData(subjectId, API_URL) {
    try {
        const [subjectRes, scoresRes] = await Promise.all([
            fetch(`${API_URL}/subjects/details/${subjectId}`),
            fetch(`${API_URL}/scores/subject/${subjectId}`)
        ]);
        const subject = await subjectRes.json();
        const scores = await scoresRes.json();
        populateReport(subject, scores);
    } catch (error) {
        document.body.innerHTML = `<h1>Error loading report data.</h1>`;
        console.error(error);
    }
}

async function fetchModuleReportData(moduleId, API_URL) {
    try {
        const response = await fetch(`${API_URL}/reports/module/${moduleId}`);
        const data = await response.json();
        // Pass the single module to the populate function
        populateReport(data.subject, data.scores, data.module);
    } catch (error) {
        document.body.innerHTML = `<h1>Error loading report data.</h1>`;
        console.error(error);
    }
}

function populateReport(subject, scores, singleModule = null) {
    const reportTitle = singleModule 
        ? `Experiment Report: ${singleModule.name}` 
        : 'Subject Performance Report';
    
    document.querySelector('#report-header h1').textContent = reportTitle;
    document.getElementById('report-subject-name').textContent = subject.name;
    const reportBody = document.getElementById('report-body');
    reportBody.innerHTML = '';
    
    const modulesToReport = singleModule ? [singleModule] : (subject.modules || []);

    if (modulesToReport.length === 0) {
        reportBody.innerHTML = `<p class="muted">No modules or quizzes exist to report on.</p>`;
        return;
    }

    modulesToReport.forEach(module => {
        (module.quizzes || []).forEach(quiz => {
            const quizScores = scores.filter(s => s.quizId === quiz.id);
            const totalAttempts = quizScores.length;
            const avgScore = totalAttempts > 0 ? (quizScores.reduce((acc, s) => acc + s.score, 0) / totalAttempts).toFixed(2) : 'N/A';

            const quizSection = document.createElement('div');
            quizSection.className = 'quiz-section';
            
            let tableHtml = '';
            if (quizScores.length > 0) {
                tableHtml = `<table style="width:100%; border-collapse: collapse; margin-top: 15px;">
                                <thead>
                                    <tr>
                                        <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Student</th>
                                        <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Score</th>
                                        <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                quizScores.forEach(score => {
                    tableHtml += `<tr>
                                    <td style="padding:8px; border-bottom:1px solid #eee;">${score.studentName || 'Unknown'}</td>
                                    <td style="padding:8px; border-bottom:1px solid #eee;">${score.score}</td>
                                    <td style="padding:8px; border-bottom:1px solid #eee;">${new Date(score.submittedAt).toLocaleDateString()}</td>
                                  </tr>`;
                });
                tableHtml += `</tbody></table>`;
            } else {
                tableHtml = `<p class="muted">No attempts for this quiz yet.</p>`;
            }

            quizSection.innerHTML = `
                <div class="card" style="padding:15px;">
                    <h4>${module.name}</h4>
                    <p class="muted"><b>${totalAttempts}</b> attempt(s) • Average Score: <b>${avgScore}</b></p>
                    <div style="max-height: 250px; margin-bottom: 20px;"><canvas id="chart-for-${quiz.id}"></canvas></div>
                    ${tableHtml}
                </div>
            `;
            reportBody.appendChild(quizSection);

            const canvas = document.getElementById(`chart-for-${quiz.id}`);
            if (canvas) {
                const scoreValues = quizScores.map(s => s.score);
                const scoreBins = [0, 0, 0, 0]; // Bins for scores: 0-2, 3-5, 6-8, 9-10
                scoreValues.forEach(s => {
                    if (s <= 2) scoreBins[0]++;
                    else if (s <= 5) scoreBins[1]++;
                    else if (s <= 8) scoreBins[2]++;
                    else scoreBins[3]++;
                });

                new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: ['0-2', '3-5', '6-8', '9-10'],
                        datasets: [{ label: '# of Students', data: scoreBins, backgroundColor: 'rgba(30, 136, 229, 0.6)' }]
                    },
                    options: { 
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                        plugins: { legend: { display: false }, title: { display: true, text: 'Score Distribution' } }
                    }
                });
            }
        });
    });
}