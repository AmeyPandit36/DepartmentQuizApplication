/* -------------------- Utilities & Persistence -------------------- */
const API_URL = 'http://localhost:5000/api';

// const API_URL = 'YOUR_LIVE_BACKEND_URL_WILL_GO_HERE';

// The storage helper is still useful for storing the currently logged-in user session.
const storage = {
  read(key){ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; },
  write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

// These helpers remain the same.
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2, 11); }
function genCode(){ return Math.random().toString(36).slice(2, 8).toUpperCase(); }


function showToast(message, type = 'info') {
    const options = {
        text: message,
        duration: 3000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
    };

    if (type === 'success') {
        options.style = { background: "linear-gradient(to right, #00b09b, #96c93d)" };
    } else if (type === 'error') {
        options.style = { background: "linear-gradient(to right, #ff5f6d, #ffc371)" };
    }

    Toastify(options).showToast();
}

/* -------------------- Page navigation -------------------- */
const pages = {
  landing: document.getElementById('landing'),
  teacherAuth: document.getElementById('teacherAuth'),
  studentAuth: document.getElementById('studentAuth'),
  adminAuth: document.getElementById('adminAuth'),
  teacherDash: document.getElementById('teacherDash'),
  studentDash: document.getElementById('studentDash'),
  adminDash: document.getElementById('adminDash'),
  overlay: document.getElementById('overlay')
};

function showPage(pageEl){
  Object.values(pages).forEach(p => p.classList ? p.classList.remove('active') : p.style.display='none');
  if(pageEl && pageEl.classList) {
    pageEl.classList.add('active');
  }
}

/* -------------------- Auth helpers -------------------- */
let currentUser = storage.read('qa_currentUser') || null;

function setCurrentUser(user){
  currentUser = user;
  storage.write('qa_currentUser', currentUser);
  updateHeaderBadge();
}

function logout(){
  currentUser = null;
  storage.write('qa_currentUser', null);
  updateHeaderBadge();
  showPage(pages.landing);
}

const userBadge = document.getElementById('userBadge');
function updateHeaderBadge(){
  userBadge.innerHTML = '';
  if(currentUser){
    const span = document.createElement('span');
    span.className = 'muted';
    span.innerText = `${currentUser.name || currentUser.email} (${currentUser.role})`;
    userBadge.appendChild(span);
  }
}

/* -------------------- Form & Auth Flow -------------------- */
document.getElementById('openTeacher').addEventListener('click', ()=> showPage(pages.teacherAuth));
document.getElementById('openStudent').addEventListener('click', ()=> showPage(pages.studentAuth));
document.getElementById('openAdmin').addEventListener('click', () => showPage(pages.adminAuth));
document.getElementById('t-back').addEventListener('click', ()=> showPage(pages.landing));
document.getElementById('s-back').addEventListener('click', ()=> showPage(pages.landing));
document.getElementById('admin-back').addEventListener('click', () => showPage(pages.landing));


async function handleLogin(e, role) {
    e.preventDefault();

    // Determine the correct IDs based on the role
    const emailId = role === 'admin' ? 'admin-login-email' : `${role[0]}-login-email`;
    const passwordId = role === 'admin' ? 'admin-login-password' : `${role[0]}-login-password`;

    const emailInput = document.getElementById(emailId);
    const passwordInput = document.getElementById(passwordId);
    
    if (!emailInput || !passwordInput) {
        console.error("Login form elements not found for role:", role);
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });

        if (!response.ok) {
            return alert(`Invalid credentials or not a ${role} account.`);
        }

        const user = await response.json();
        setCurrentUser(user);
        
        if (role === 'teacher') openTeacherDashboard();
        if (role === 'student') openStudentDashboard();
        if (role === 'admin') openAdminDashboard();

    } catch (error) {
        alert('Could not connect to the server.');
    }
}

document.getElementById('teacherLoginForm').addEventListener('submit', (e) => handleLogin(e, 'teacher'));
document.getElementById('studentLoginForm').addEventListener('submit', (e) => handleLogin(e, 'student'));
document.getElementById('adminLoginForm').addEventListener('submit', (e) => handleLogin(e, 'admin'));

document.getElementById('logoutTeacher').addEventListener('click', logout);
document.getElementById('logoutStudent').addEventListener('click', logout);
document.getElementById('logoutAdmin').addEventListener('click', logout);


/* -------------------- Admin Dashboard Logic -------------------- */
function openAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') return alert('Not authorized');
    document.getElementById('adminNameDisplay').innerText = currentUser.name;
    renderUserTables();
    loadAdminStats(); // <-- This ensures stats load when the page opens
    showPage(pages.adminDash);
}

// State variables to keep track of current page and search
let currentTeacherPage = 1;
let currentStudentPage = 1;
let teacherSearchQuery = '';
let studentSearchQuery = '';

async function renderUserTables() {
    // We'll fetch teachers and students separately to handle their pagination/search state
    await fetchAndRenderUsers('teacher', teacherSearchQuery, currentTeacherPage);
    await fetchAndRenderUsers('student', studentSearchQuery, currentStudentPage);
}

async function fetchAndRenderUsers(role, searchQuery, page) {
    const tableBody = document.getElementById(role === 'teacher' ? 'teachersTableBody' : 'studentsTableBody');
    const paginationControls = document.getElementById(role === 'teacher' ? 'teacherPagination' : 'studentPagination');
    
    tableBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;
    
    try {
        const response = await fetch(`${API_URL}/users?role=${role}&search=${searchQuery}&page=${page}&limit=5`); // Show 5 users per page
        const data = await response.json();
        
        tableBody.innerHTML = '';
        if (data.users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3">No users found.</td></tr>`;
        }

        data.users.forEach(user => {
            if (user.role === role) { // Ensure we only render the correct role
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:8px">${escapeHtml(user.name)}</td>
                    <td style="padding:8px">${escapeHtml(user.email)}</td>
                    <td style="padding:8px; display:flex; gap:10px;">
                        <button class="ghost" data-action="edit" data-id="${user.id}" title="Edit User" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-pencil-fill text-primary"></i></button>
                        <button class="ghost" data-action="delete" data-id="${user.id}" title="Delete User" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-trash-fill text-danger"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            }
        });
        
        // Render pagination controls
        const totalPages = Math.ceil(data.total / data.limit);
        paginationControls.innerHTML = `
            <span>Page ${page} of ${totalPages || 1}</span>
            <button class="btn-sm ghost" data-role="${role}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
            <button class="btn-sm ghost" data-role="${role}" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        `;

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="3">Failed to load users.</td></tr>`;
    }
}

// Add event listeners for search and pagination
document.getElementById('teacherSearch').addEventListener('input', (e) => {
    teacherSearchQuery = e.target.value;
    currentTeacherPage = 1; // Reset to first page on new search
    fetchAndRenderUsers('teacher', teacherSearchQuery, currentTeacherPage);
});

document.getElementById('studentSearch').addEventListener('input', (e) => {
    studentSearchQuery = e.target.value;
    currentStudentPage = 1;
    fetchAndRenderUsers('student', studentSearchQuery, currentStudentPage);
});

document.getElementById('adminDash').addEventListener('click', (e) => {
    if (e.target.parentElement.classList.contains('pagination-controls')) {
        const button = e.target;
        const role = button.dataset.role;
        const page = parseInt(button.dataset.page);

        if (role === 'teacher') {
            currentTeacherPage = page;
            fetchAndRenderUsers(role, teacherSearchQuery, currentTeacherPage);
        } else if (role === 'student') {
            currentStudentPage = page;
            fetchAndRenderUsers(role, studentSearchQuery, currentStudentPage);
        }
    }
});

async function loadAdminStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const stats = await res.json();
        document.getElementById('teacherCount').textContent = stats.teachers;
        document.getElementById('studentCount').textContent = stats.students;
        document.getElementById('subjectCount').textContent = stats.subjects;
    } catch (error) {
        console.error("Could not load stats", error);
    }
}


async function openUserEditorModal(userId) {
    try {
        // Fetch the latest user data from the CORRECT URL
        const res = await fetch(`${API_URL}/users/${userId}`);
        if (!res.ok) throw new Error('Could not fetch user data. Check the server logs for errors.');
        const user = await res.json();

        // Create the modal HTML with user's data pre-filled
        const modalHtml = `
            <h3>Edit User: ${escapeHtml(user.name)}</h3>
            <form id="editUserForm">
                <div class="form-grid">
                    <div class="full">
                        <label>Full Name</label>
                        <input id="edit-user-name" type="text" value="${escapeHtml(user.name)}" required>
                    </div>
                    <div class="full">
                        <label>Email</label>
                        <input id="edit-user-email" type="email" value="${escapeHtml(user.email)}" required>
                    </div>
                    <div class="full">
                        <label>Role</label>
                        <select id="edit-user-role" required>
                            <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                            <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn">Save Changes</button>
                    <button type="button" class="ghost" id="cancelEdit">Cancel</button>
                </div>
            </form>
        `;

        openModal(modalHtml, () => {
            document.getElementById('cancelEdit').addEventListener('click', closeModal);
            
            document.getElementById('editUserForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const updatedUser = {
                    name: document.getElementById('edit-user-name').value,
                    email: document.getElementById('edit-user-email').value,
                    role: document.getElementById('edit-user-role').value
                };

                try {
                    const updateRes = await fetch(`${API_URL}/users/${userId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedUser)
                    });

                    if (!updateRes.ok) throw new Error('Failed to update user.');
                    
                    closeModal();
                    renderUserTables();
                } catch (error) {
                    alert(error.message);
                }
            });
        });

    } catch (error) {
        alert(error.message);
    }
}

document.getElementById('addUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('add-user-name').value.trim();
    const email = document.getElementById('add-user-email').value.trim().toLowerCase();
    const password = document.getElementById('add-user-password').value;
    const role = document.getElementById('add-user-role').value;

    if (!name || !email || !password) return alert('Please fill all fields.');

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uid('u'), name, email, password, role })
        });

        if (!response.ok) {
            const err = await response.json();
            return alert(err.message);
        }

        alert(`User "${name}" created successfully as a ${role}.`);
        this.reset();
        renderUserTables(); // This refreshes the tables
        loadAdminStats();   // <-- This ensures stats refresh after adding a user
    } catch (error) {
        alert('Could not connect to the server to add user.');
    }
});

document.getElementById('adminDash').addEventListener('click', async function(e) {
    // We use .closest() to get the button even if the icon inside is clicked
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    const action = targetButton.dataset.action;
    const userId = targetButton.dataset.id;

    if (action === 'delete') {
        if (confirm(`Are you sure you want to delete this user?`)) {
            try {
                await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
                renderUserTables();
            } catch (error) {
                alert('Failed to delete user.');
            }
        }
    }
    
    if (action === 'edit') {
        openUserEditorModal(userId);
    }
});


/* -------------------- Teacher Dashboard Logic -------------------- */
const teacherSubjectsEl = document.getElementById('teacherSubjects');
const noSubjectsEl = document.getElementById('noSubjects');
const teacherNameDisplay = document.getElementById('teacherNameDisplay');

function openTeacherDashboard(){
  if(!currentUser || currentUser.role !== 'teacher') return alert('Not authorized');
  teacherNameDisplay.innerText = currentUser.name;
  renderTeacherSubjects();
  showPage(pages.teacherDash);
}

document.getElementById('createSubjectBtn').addEventListener('click', async () => {
    const name = prompt("Enter new subject name:");
    if (name && name.trim()) {
        const subjectData = {
            id: uid('s'),
            name: name.trim(),
            code: genCode(),
            teacherId: currentUser.id
        };

        try {
            await fetch(`${API_URL}/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subjectData)
            });
            renderTeacherSubjects();
            alert(`Subject "${subjectData.name}" created. Code: ${subjectData.code}`);
        } catch (error) {
            alert('Error: Could not create subject.');
        }
    }
});

async function renderTeacherSubjects() {
    teacherSubjectsEl.innerHTML = '<p class="muted">Loading subjects...</p>';
    try {
        const response = await fetch(`${API_URL}/subjects/${currentUser.id}`);
        const subjects = await response.json();

        teacherSubjectsEl.innerHTML = '';
        noSubjectsEl.style.display = subjects.length === 0 ? 'block' : 'none';

        subjects.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            const modules = sub.modules || [];
            card.innerHTML = `
              <div>
                <h3>${escapeHtml(sub.name)}</h3>
                <div class="subject-meta">Code: <strong class="badge">${sub.code}</strong></div>
                <div class="muted mt8">${modules.length} modules</div>
              </div>
              <div class="subject-actions">
                <button class="btn-sm btn" data-action="open" data-id="${sub.id}">Manage</button>
                <button class="btn-sm ghost" data-action="create-module" data-id="${sub.id}">+ Module</button>
                <button class="btn-sm ghost" data-action="view-scores" data-id="${sub.id}">Analytics</button>
              </div>
            `;
            teacherSubjectsEl.appendChild(card);
        });
    } catch (error) {
        teacherSubjectsEl.innerHTML = '<p class="muted">Error loading subjects.</p>';
    }
}

teacherSubjectsEl.addEventListener('click', async (ev)=>{
  const btn = ev.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action;
  const subjectId = btn.dataset.id;
  
  if (action === 'open') {
      openSubjectEditor(subjectId); // This will now open the module manager modal
  }

  if (action === 'create-module') {
      const modName = prompt("Enter module name:");
      if (modName && modName.trim()) {
          const newModule = { id: uid('m'), name: modName.trim(), quizzes: [] };
          try {
              await fetch(`${API_URL}/subjects/${subjectId}/modules`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ newModule })
              });
              alert("Module created!");
              renderTeacherSubjects();
          } catch (error) {
              alert('Error: Could not add module.');
          }
      }
  }

  if (action === 'view-scores') {
      openScoresViewer(subjectId);
  }
  // We will migrate 'view-scores' next
});

// This function opens the "Manage Subject" modal
async function openSubjectEditor(subjectId) {
    try {
        const response = await fetch(`${API_URL}/subjects/details/${subjectId}`);
        const subject = await response.json();

        openModal(`
            <h3>Manage: ${escapeHtml(subject.name)}</h3>
            <div id="moduleContainer"></div>
            <div style="margin-top:10px"><button id="closeSubjectEditor" class="ghost">Close</button></div>`,
            () => {
                renderModulesForSubject(subject, true); // 'true' for teacher view
                document.getElementById('closeSubjectEditor').addEventListener('click', closeModal);

                // document.getElementById('moduleContainer').addEventListener('click', (e) => {
                //     const el = e.target.closest('button');
                //     if (!el) return;
                //     const mid = el.dataset.mid;
                //     if (el.dataset.action === 'create-quiz') {
                //         openQuizCreator(subject, mid);
                //     }
                // });


                document.getElementById('moduleContainer').addEventListener('click', (e) => {
                    const el = e.target.closest('button');
                    if (!el) return;

                    const moduleId = el.dataset.mid;
                    const action = el.dataset.action;

                    if (action === 'create-quiz') {
                        openQuizCreator(subject, moduleId);
                    }

                    if (action === 'view-quiz') {
                        viewQuizModal(subject, moduleId);
                    }
                });
            }
        );
    } catch (error) {
        alert('Could not fetch subject details.');
    }
}

function viewQuizModal(subject, moduleId) {
    const module = subject.modules.find(m => m.id === moduleId);
    if (!module || !module.quizzes || module.quizzes.length === 0) {
        return alert('No quiz found for this module.');
    }
    // Always view the most recently created quiz for a module
    const quiz = module.quizzes[module.quizzes.length - 1];

    let html = `<h3>Quiz Review: ${escapeHtml(module.name)}</h3>
                <p class="text-muted">Created: ${new Date(quiz.createdAt).toLocaleString()}</p>
                <hr>`;

    quiz.questions.forEach((q, idx) => {
        html += `<div class="q-card mb-3 p-3">
                    <p class="fw-bold mb-2">Q${idx + 1}: ${escapeHtml(q.q)}</p>`;
        q.options.forEach((opt, o_idx) => {
            const isCorrect = o_idx === q.correct;
            // Apply green text and a badge to the correct answer
            const correctClass = isCorrect ? 'text-success fw-bold' : 'text-secondary';
            const correctBadge = isCorrect ? '<span class="badge bg-success-subtle text-success-emphasis rounded-pill ms-2">Correct</span>' : '';
            html += `<div class="ps-3 ${correctClass}">${escapeHtml(opt)} ${correctBadge}</div>`;
        });
        html += `</div>`;
    });

    html += `<div class="form-actions mt-4"><button id="closeViewQuiz" class="btn btn-outline-secondary">Close</button></div>`;
    
    openModal(html, () => {
        document.getElementById('closeViewQuiz').addEventListener('click', closeModal);
    });
}

// This function renders the list of modules inside the modal
function renderModulesForSubject(subject, isTeacherView) {
    const container = document.getElementById('moduleContainer');
    if (!container) return;
    
    const modules = subject.modules || [];
    if (modules.length === 0) {
        container.innerHTML = `<div class="muted">No modules yet. Add one from the dashboard.</div>`;
        return;
    }

    let html = '<div class="module-list">';
    modules.forEach(mod => {
        const quiz = mod.quizzes && mod.quizzes.length > 0 ? mod.quizzes[mod.quizzes.length - 1] : null;
        html += `<div class="module-item">
          <div>
            <div style="font-weight:600">${escapeHtml(mod.name)}</div>
          </div>
          <div style="display:flex;gap:8px">
            ${isTeacherView ? `<button class="btn btn-sm" data-action="create-quiz" data-mid="${mod.id}">Create Quiz</button>` : ''}
            ${quiz ? `<button class="ghost btn-sm" data-action="${isTeacherView ? 'view-quiz' : 'attempt-quiz'}" data-mid="${mod.id}" data-quizid="${quiz.id}">${isTeacherView ? 'View Quiz' : 'Attempt Quiz'}</button>` : '<span class="muted btn-sm">No Quiz</span>'}
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// This function opens the 5-question form to create a new quiz
function openQuizCreator(subject, moduleId) {
    const module = subject.modules.find(m => m.id === moduleId);
    if (!module) return alert('Module not found!');

    let formHtml = `<form id="quizCreatorForm">`;
    for (let i = 0; i < 5; i++) { // Create a 5-question form
        formHtml += `<div class="q-card">
            <label><b>Question ${i + 1}</b></label>
            <textarea name="q_text_${i}" required placeholder="Enter the question text"></textarea>
            <div style="margin-top:8px"><b>Options:</b></div>`;
        for (let j = 0; j < 4; j++) {
            formHtml += `<div class="option-group">
                <input type="radio" name="q_correct_${i}" value="${j}" required>
                <input type="text" name="q_option_${i}_${j}" placeholder="Option ${j + 1}" required>
            </div>`;
        }
        formHtml += `</div>`;
    }
    formHtml += `</form>`;

    openModal(`
        <h3>Create Quiz for ${escapeHtml(module.name)}</h3>
        ${formHtml}
        <div class="form-actions">
            <button id="saveQuizBtn" class="btn">Save Quiz</button>
            <button id="cancelQuizBtn" class="ghost" type="button">Cancel</button>
        </div>`,
        () => {
            document.getElementById('cancelQuizBtn').addEventListener('click', closeModal);
            document.getElementById('saveQuizBtn').addEventListener('click', async () => {
                const form = document.getElementById('quizCreatorForm');
                const formData = new FormData(form);
                const questions = [];

                for (let i = 0; i < 5; i++) {
                    const text = formData.get(`q_text_${i}`);
                    const correctIndex = formData.get(`q_correct_${i}`);
                    const options = [];
                    for (let j = 0; j < 4; j++) {
                        options.push(formData.get(`q_option_${i}_${j}`));
                    }
                    if (!text || correctIndex === null || options.some(o => !o)) {
                        return alert(`Please fill out all fields for Question ${i + 1}.`);
                    }
                    questions.push({
                        id: uid('q'),
                        q: text,
                        options: options,
                        correct: parseInt(correctIndex, 10)
                    });
                }
                const quiz = { id: uid('quiz'), questions, createdAt: new Date().toISOString() };

                // Send the new quiz to the backend
                try {
                    await fetch(`${API_URL}/quizzes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subjectId: subject.id, moduleId, quiz })
                    });
                    alert('Quiz created successfully!');
                    closeModal();
                    renderTeacherSubjects(); // Refresh dashboard to show updated module count
                } catch (error) {
                    alert('Error: Could not save quiz.');
                }
            });
        }
    );
}

async function openScoresViewer(subjectId) {
    openModal(`<h3>Loading Analytics...</h3>`, () => {}); // Show a loading modal immediately

    try {
        // Fetch both subject details (for quiz names) and scores at the same time
        const [subjectRes, scoresRes] = await Promise.all([
            fetch(`${API_URL}/subjects/details/${subjectId}`),
            fetch(`${API_URL}/scores/subject/${subjectId}`)
        ]);

        if (!subjectRes.ok || !scoresRes.ok) {
            throw new Error('Failed to load analytics data.');
        }

        const subject = await subjectRes.json();
        const scores = await scoresRes.json();

        let html = `<h3>Analytics for ${escapeHtml(subject.name)}</h3>`;
        
        if (!subject.modules || subject.modules.length === 0) {
            html += `<p class="muted">No modules or quizzes exist for this subject yet.</p>`;
        } else {
            // Group scores by quiz for easy display
            subject.modules.forEach(module => {
                (module.quizzes || []).forEach(quiz => {
                    const quizScores = scores.filter(s => s.quizId === quiz.id);
                    const totalAttempts = quizScores.length;
                    const avgScore = totalAttempts > 0 
                        ? (quizScores.reduce((acc, s) => acc + s.score, 0) / totalAttempts).toFixed(2) 
                        : 'N/A';

                    html += `<div style="margin-top:10px;border-top:1px dashed #eee;padding-top:8px">
                        <div style="font-weight:700">${escapeHtml(module.name)}</div>
                        <div class="muted"><b>${totalAttempts}</b> attempt(s) • Average Score: <b>${avgScore}</b></div>`;

                    if (quizScores.length > 0) {
                        html += `<table style="width:100%;border-collapse:collapse;margin-top:6px">
                                    <thead>
                                        <tr>
                                            <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Student</th>
                                            <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Score</th>
                                            <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;
                        quizScores.forEach(score => {
                            html += `<tr>
                                        <td style="padding:6px">${escapeHtml(score.studentName)} (${escapeHtml(score.studentRoll) || 'N/A'})</td>
                                        <td style="padding:6px">${score.score}</td>
                                        <td style="padding:6px">${new Date(score.submittedAt).toLocaleString()}</td>
                                     </tr>`;
                        });
                        html += `</tbody></table>`;
                    }
                    html += `</div>`;
                });
            });
        }

        html += `<div class="form-actions"><button id="closeScores" class="ghost">Close</button></div>`;
        
        // Now update the modal with the final content
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = html;
            document.getElementById('closeScores').addEventListener('click', closeModal);
        }

    } catch (error) {
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = `<p>Error loading analytics. Please try again.</p><div class="form-actions"><button id="closeScores" class="ghost">Close</button></div>`;
            document.getElementById('closeScores').addEventListener('click', closeModal);
        }
    }
}


/* -------------------- Student Dashboard Logic (NEWLY UPDATED) -------------------- */
function openStudentDashboard(){
  if(!currentUser || currentUser.role!=='student') return alert('Not authorized');
  document.getElementById('studentNameDisplay').innerText = currentUser.name;
  renderStudentSubjects(); // This will now fetch data from the server
  showPage(pages.studentDash);
}

document.getElementById('joinBtn').addEventListener('click', async () => {
    const codeInput = document.getElementById('joinCodeInput');
    const subjectCode = codeInput.value.trim().toUpperCase();
    if (!subjectCode) return alert('Please enter a subject code.');

    try {
        const response = await fetch(`${API_URL}/students/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: currentUser.id, subjectCode })
        });
        
        const result = await response.json();

        if (!response.ok) {
            return alert(`Error: ${result.message}`);
        }

        alert(result.message);
        codeInput.value = ''; // Clear the input field
        renderStudentSubjects(); // Refresh the dashboard

    } catch (error) {
        alert('Could not connect to the server.');
    }
});

async function renderStudentSubjects(){
  const studentSubjectsGrid = document.getElementById('studentSubjectsGrid');
  const noJoinedEl = document.getElementById('noJoined');
  studentSubjectsGrid.innerHTML = '<p class="muted">Loading your subjects...</p>';

  try {
      const response = await fetch(`${API_URL}/students/${currentUser.id}/subjects`);
      const subjects = await response.json();

      studentSubjectsGrid.innerHTML = '';
      noJoinedEl.style.display = subjects.length === 0 ? 'block' : 'none';

      subjects.forEach(subject => {
          const modules = subject.modules || [];
          const card = document.createElement('div');
          card.className = 'subject-card';
          card.innerHTML = `<div>
            <h3>${escapeHtml(subject.name)}</h3>
            <div class="subject-meta">Teacher: ${escapeHtml(subject.teacherName)}</div>
            <div class="muted mt8">${modules.length} modules</div>
          </div>
          <div class="subject-actions">
            <button class="btn-sm btn" data-action="open" data-id="${subject.id}">View Modules</button>
            <button class="btn-sm ghost" data-action="leave" data-id="${subject.id}">Leave</button>
          </div>`;
          studentSubjectsGrid.appendChild(card);
      });
  } catch (error) {
      studentSubjectsGrid.innerHTML = '<p class="muted">Could not load your subjects.</p>';
  }
}

const studentSubjectsGrid = document.getElementById('studentSubjectsGrid');

studentSubjectsGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const subjectId = btn.dataset.id;

    if (action === 'open') {
        openStudentSubjectView(subjectId);
    }
    
    if (action === 'leave') {
        if (!confirm('Are you sure you want to leave this subject?')) return;

        try {
            const response = await fetch(`${API_URL}/students/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: currentUser.id, subjectId })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            alert(result.message);
            renderStudentSubjects(); // Refresh the dashboard
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
});

// This function opens the modal for a student to view modules
async function openStudentSubjectView(subjectId) {
    try {
        const response = await fetch(`${API_URL}/subjects/details/${subjectId}`);
        if (!response.ok) throw new Error('Subject not found');
        const subject = await response.json();

        openModal(`
            <h3>Modules in ${escapeHtml(subject.name)}</h3>
            <div id="moduleContainer"></div>
            <div class="form-actions"><button id="closeSubView" class="ghost">Close</button></div>`,
            () => {
                renderModulesForSubject(subject, false); // 'false' for student view
                document.getElementById('closeSubView').addEventListener('click', closeModal);
                document.getElementById('moduleContainer').addEventListener('click', e => {
                    const button = e.target.closest('button');
                    if (button && button.dataset.action === 'attempt-quiz') {
                        // Pass the whole subject object to avoid another fetch
                        openQuizAttemptModal(subject, button.dataset.quizid);
                    }
                });
            }
        );
    } catch (error) {
        alert(error.message);
    }
}


// This function opens the quiz for a student to attempt it
let quizTimerInterval = null; // Keep this outside the function
function openQuizAttemptModal(subject, quizId) {
    let module, quiz;
    // Find the correct module and quiz from the subject data
    for (const m of subject.modules) {
        const q = (m.quizzes || []).find(x => x.id === quizId);
        if (q) { module = m; quiz = q; break; }
    }
    if (!quiz) return alert('Quiz not found');

    // Randomize question order for each attempt
    const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Quiz: ${escapeHtml(module.name)}</h3>
            <div id="quizTimer" class="badge" style="font-size:1.1rem; background:var(--accent); color:white;">05:00</div>
        </div>
        <form id="quizAttemptForm">`;
    shuffledQuestions.forEach((q, idx) => {
        html += `<div class="q-card">
            <div style="font-weight:700">Q${idx + 1}: ${escapeHtml(q.q)}</div>`;
        q.options.forEach((opt, o) => {
            html += `<div style="margin-top:6px"><label><input type="radio" name="${q.id}" value="${o}"> ${escapeHtml(opt)}</label></div>`;
        });
        html += `</div>`;
    });
    html += `</form>
        <div class="form-actions">
            <button id="submitQuiz" class="btn">Submit Quiz</button>
        </div>`;

    openModal(html, () => {
        const timerEl = document.getElementById('quizTimer');
        let timeLeft = 300; // 5 minutes

        const submitQuizAction = async () => {
            clearInterval(quizTimerInterval);
            let score = 0;
            quiz.questions.forEach(q => {
                const selected = document.querySelector(`input[name="${q.id}"]:checked`);
                if (selected && parseInt(selected.value) === q.correct) {
                    score += 2; // 2 points per correct answer
                }
            });

            // *** NEW: Send score to backend ***
            try {
                const response = await fetch(`${API_URL}/scores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: currentUser.id,
                        quizId: quiz.id,
                        subjectId: subject.id,
                        score: score
                    })
                });
                if (!response.ok) throw new Error('Failed to submit score');
                
                alert(`Quiz submitted! Your score: ${score} out of ${quiz.questions.length * 2}`);
            } catch (error) {
                alert('Error submitting your score. Please try again.');
            } finally {
                closeModal();
            }
        };
        
        quizTimerInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const seconds = (timeLeft % 60).toString().padStart(2, '0');
            timerEl.textContent = `${minutes}:${seconds}`;
            if (timeLeft <= 0) {
                alert("Time's up! Submitting your quiz automatically.");
                submitQuizAction();
            }
        }, 1000);
        
        document.getElementById('submitQuiz').addEventListener('click', submitQuizAction);
    });
}


/* -------------------- Utilities & Init -------------------- */
function escapeHtml(s){
  if(!s && s!==0) return '';
  return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function openModal(htmlContent, onOpen){
  const overlay = pages.overlay;
  overlay.innerHTML = `<div class="modal">${htmlContent}</div>`;
  overlay.style.display='flex';
  if(onOpen) onOpen();
}

function closeModal(){
  pages.overlay.style.display='none';
  pages.overlay.innerHTML='';
}

(function init(){
  const cu = storage.read('qa_currentUser');
  if (cu) {
    setCurrentUser(cu);
  }
  
  updateHeaderBadge();
  if (currentUser) {
    if (currentUser.role === 'teacher') openTeacherDashboard();
    else if (currentUser.role === 'student') openStudentDashboard();
    else if (currentUser.role === 'admin') openAdminDashboard();
  } else {
    showPage(pages.landing);
  }
})();