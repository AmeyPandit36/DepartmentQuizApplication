// report.js

document.addEventListener('DOMContentLoaded', () => {
    // Get the studentId from the URL (e.g., report.html?studentId=student1)
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');

    if (!studentId) {
        document.body.innerHTML = '<h1>Error: No student ID provided.</h1>';
        return;
    }

    // Set the current date on the report
    document.getElementById('report-date').textContent = new Date().toLocaleDateString();

    // Fetch all necessary data
    fetchAllReportData(studentId);
});

async function fetchAllReportData(studentId) {
    const API_URL = 'http://localhost:5000/api'; // Make sure this matches your main script

    try {
        // Fetch user details, stats, and scores all at once
        const [userRes, statsRes, scoresRes] = await Promise.all([
            fetch(`${API_URL}/users/${studentId}`),
            fetch(`${API_URL}/students/${studentId}/stats`),
            fetch(`${API_URL}/scores/student/${studentId}`)
        ]);

        const user = await userRes.json();
        const stats = await statsRes.json();
        const scores = await scoresRes.json();

        // Populate the report with the fetched data
        populateReport(user, stats, scores);

    } catch (error) {
        document.body.innerHTML = `<h1>Error loading report data. Please try again.</h1>`;
        console.error(error);
    }
}

function populateReport(user, stats, scores) {
    // Populate Header
    document.getElementById('report-student-name').textContent = user.name;

    // Populate Summary Stat Cards
    const summaryContainer = document.querySelector('#report-summary .stats-grid');
    summaryContainer.innerHTML = `
        <div class="stat-card">
            <i class="bi bi-graph-up"></i>
            <div><div class="stat-value">${stats.averageScore}%</div><div class="stat-label">Average Score</div></div>
        </div>
        <div class="stat-card">
            <i class="bi bi-card-checklist"></i>
            <div><div class="stat-value">${stats.quizzesTaken}</div><div class="stat-label">Quizzes Taken</div></div>
        </div>
        <div class="stat-card">
            <i class="bi bi-trophy-fill"></i>
            <div><div class="stat-value">${stats.bestSubject}</div><div class="stat-label">Best Subject</div></div>
        </div>
    `;

    // Populate Detailed Score Table
    const tableContainer = document.getElementById('score-table-container');
    if (scores.length === 0) {
        tableContainer.innerHTML = `<p>No quizzes taken yet.</p>`;
        return;
    }

    let tableHtml = `<table style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Subject</th>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Module</th>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Score</th>
                                <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Date</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    scores.forEach(score => {
        let moduleName = 'Unknown';
        for (const module of (score.modules || [])) {
            if ((module.quizzes || []).some(q => q.id === score.quizId)) {
                moduleName = module.name;
                break;
            }
        }

        tableHtml += `<tr>
                        <td style="padding:8px;">${score.subjectName}</td>
                        <td style="padding:8px;">${moduleName}</td>
                        <td style="padding:8px;">${score.score} / 10</td>
                        <td style="padding:8px;">${new Date(score.submittedAt).toLocaleDateString()}</td>
                     </tr>`;
    });

    tableHtml += `</tbody></table>`;
    tableContainer.innerHTML = tableHtml;
}