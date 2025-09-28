//  -------------------- Utilities & Persistence --------------------

let API_URL = 'http://localhost:5000/api';


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

function updateHeaderBadge(){
    const userBadge = document.getElementById('userBadge');
    userBadge.innerHTML = ''; // Clear the area first

    if (currentUser) {
        // --- This part runs when a user IS LOGGED IN ---
        const nameSpan = document.createElement('span');
        nameSpan.className = 'nav-item';
        nameSpan.style.marginRight = '10px';
        nameSpan.textContent = `Welcome, ${currentUser.name}`;

        const logoutButton = document.createElement('button');
        logoutButton.className = 'ghost btn-sm'; // Using your existing button style
        logoutButton.textContent = 'Logout';
        logoutButton.onclick = logout; // Attaches the existing logout function

        userBadge.appendChild(nameSpan);
        userBadge.appendChild(logoutButton);

    } else {
        // --- This part runs when a user IS LOGGED OUT ---
        const loginButton = document.createElement('button');
        loginButton.className = 'btn btn-sm'; // Using your existing button style
        loginButton.textContent = 'Login';
        loginButton.onclick = () => showPage(pages.landing); // Takes user to the role selection

        userBadge.appendChild(loginButton);
    }
}

/* -------------------- Form & Auth Flow -------------------- */
document.getElementById('openTeacher').addEventListener('click', ()=> showPage(pages.teacherAuth));
document.getElementById('openStudent').addEventListener('click', ()=> showPage(pages.studentAuth));
document.getElementById('openAdmin').addEventListener('click', () => showPage(pages.adminAuth));
document.getElementById('t-back').addEventListener('click', ()=> showPage(pages.landing));
document.getElementById('s-back').addEventListener('click', ()=> showPage(pages.landing));
document.getElementById('admin-back').addEventListener('click', () => showPage(pages.landing));

document.getElementById('homeLink').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent the link from trying to navigate
    showPage(pages.landing);
});

async function handleLogin(e, role) {
    e.preventDefault();

    const emailId = role === 'admin' ? 'admin-login-email' : `${role[0]}-login-email`;
    const passwordId = role === 'admin' ? 'admin-login-password' : `${role[0]}-login-password`;

    const emailInput = document.getElementById(emailId);
    const passwordInput = document.getElementById(passwordId);
    
    if (!emailInput || !passwordInput) {
        return console.error("Login form elements not found for role:", role);
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
            return showToast(`Invalid credentials or not a ${role} account.`, 'error');
        }

        const user = await response.json();
        setCurrentUser(user);
        
        if (role === 'teacher') openTeacherDashboard();
        if (role === 'student') openStudentDashboard();
        if (role === 'admin') openAdminDashboard();

    } catch (error) {
        showToast('Could not connect to the server.', 'error');
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
    if (!currentUser || currentUser.role !== 'admin') return showToast('Not authorized', 'error');
    document.getElementById('adminNameDisplay').innerText = currentUser.name;
    renderUserTables();
    loadAdminStats();
    showPage(pages.adminDash);
}

let currentTeacherPage = 1;
let currentStudentPage = 1;
let teacherSearchQuery = '';
let studentSearchQuery = '';

async function renderUserTables() {
    await fetchAndRenderUsers('teacher', teacherSearchQuery, currentTeacherPage);
    await fetchAndRenderUsers('student', studentSearchQuery, currentStudentPage);
}

async function fetchAndRenderUsers(role, searchQuery, page) {
    const tableBody = document.getElementById(role === 'teacher' ? 'teachersTableBody' : 'studentsTableBody');
    const paginationControls = document.getElementById(role === 'teacher' ? 'teacherPagination' : 'studentPagination');
    
    tableBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;
    
    try {
        const response = await fetch(`${API_URL}/users?role=${role}&search=${searchQuery}&page=${page}&limit=5`);
        const data = await response.json();
        
        tableBody.innerHTML = '';
        if (data.users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3">No users found.</td></tr>`;
        }

        data.users.forEach(user => {
            if (user.role === role) {
                const tr = document.createElement('tr');
                // Inside the fetchAndRenderUsers function...
                tr.innerHTML = `
                    <td style="padding:8px">${escapeHtml(user.name)}</td>
                    <td style="padding:8px">${escapeHtml(user.email)}</td>
                    <td style="padding:8px; display:flex; gap:10px;">
                        <button class="ghost" data-action="edit" data-id="${user.id}" title="Edit User" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-pencil-fill text-primary"></i></button>
                        <button class="ghost" data-action="reset-password" data-id="${user.id}" title="Reset Password" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-key-fill text-warning"></i></button>
                        <button class="ghost" data-action="delete" data-id="${user.id}" title="Delete User" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-trash-fill text-danger"></i></button>
                    </td>
`;
                tableBody.appendChild(tr);
            }
        });
        
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

document.getElementById('teacherSearch').addEventListener('input', (e) => {
    teacherSearchQuery = e.target.value;
    currentTeacherPage = 1;
    fetchAndRenderUsers('teacher', teacherSearchQuery, currentTeacherPage);
});

document.getElementById('studentSearch').addEventListener('input', (e) => {
    studentSearchQuery = e.target.value;
    currentStudentPage = 1;
    fetchAndRenderUsers('student', studentSearchQuery, currentStudentPage);
});

document.getElementById('adminDash').addEventListener('click', async function(e) {
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    const action = targetButton.dataset.action;
    const userId = targetButton.dataset.id;

    if (action === 'delete') {
        if (confirm(`Are you sure you want to delete this user?`)) {
            try {
                await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
                showToast('User deleted successfully.', 'success');
                renderUserTables();
                loadAdminStats();
            } catch (error) {
                showToast('Failed to delete user.', 'error');
            }
        }
    }
    
    if (action === 'edit') {
        openUserEditorModal(userId);
    }

    if (action === 'reset-password') {
        if (!confirm('Are you sure you want to reset the password for this user? A new password will be generated.')) return;

        try {
            const response = await fetch(`${API_URL}/users/${userId}/reset-password`, { method: 'POST' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            // Show a success toast with the new password for the admin to copy
            showToast(`Password reset! New password: ${result.newPassword}`, 'success');

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
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
        const res = await fetch(`${API_URL}/users/${userId}`);
        if (!res.ok) throw new Error('Could not fetch user data. Check the server logs for errors.');
        const user = await res.json();

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
                    
                    showToast('User updated successfully!', 'success');
                    closeModal();
                    renderUserTables();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        });

    } catch (error) {
        showToast(error.message, 'error');
    }
}

document.getElementById('addUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('add-user-name').value.trim();
    const email = document.getElementById('add-user-email').value.trim().toLowerCase();
    const password = document.getElementById('add-user-password').value;
    const role = document.getElementById('add-user-role').value;

    if (!name || !email || !password) return showToast('Please fill all fields.', 'error');

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: uid('u'), name, email, password, role })
        });

        if (!response.ok) {
            const err = await response.json();
            return showToast(err.message, 'error');
        }

        showToast(`User "${name}" created successfully as a ${role}.`, 'success');
        this.reset();
        renderUserTables();
        loadAdminStats();
    } catch (error) {
        showToast('Could not connect to the server to add user.', 'error');
    }
});

document.getElementById('adminDash').addEventListener('click', async function(e) {
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    const action = targetButton.dataset.action;
    const userId = targetButton.dataset.id;

    if (action === 'delete') {
        if (confirm(`Are you sure you want to delete this user?`)) {
            try {
                await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
                showToast('User deleted successfully.', 'success');
                renderUserTables();
                loadAdminStats();
            } catch (error) {
                showToast('Failed to delete user.', 'error');
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
  if(!currentUser || currentUser.role !== 'teacher') return showToast('Not authorized.', 'error');
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
            showToast(`Subject "${subjectData.name}" created. Code: ${subjectData.code}`, 'success');
        } catch (error) {
            showToast('Error: Could not create subject.', 'error');
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
              <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h3>${escapeHtml(sub.name)}</h3>
                    <div class="subject-meta">Code: <strong class="badge">${sub.code}</strong></div>
                    <div class="muted mt8">${modules.length} modules</div>
                  </div>
                  <div class="d-flex gap-2">
                    <button class="ghost" data-action="edit" data-id="${sub.id}" data-name="${escapeHtml(sub.name)}" title="Edit Subject" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-pencil-fill text-primary"></i></button>
                    <button class="ghost" data-action="delete" data-id="${sub.id}" title="Delete Subject" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-trash-fill text-danger"></i></button>
                  </div>
              </div>
              <div class="subject-actions">
                <button class="btn-sm btn" data-action="open" data-id="${sub.id}">Manage Modules</button>
                <button class="btn-sm ghost" data-action="create-module" data-id="${sub.id}">Create Module</button>
                <button class="btn-sm ghost" data-action="view-scores" data-id="${sub.id}">Analytics</button>
              </div>
            `;
            teacherSubjectsEl.appendChild(card);
        });
    } catch (error) {
        teacherSubjectsEl.innerHTML = '<p class="muted">Error loading subjects.</p>';
    }
}

teacherSubjectsEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const subjectId = btn.dataset.id;

    if (action === 'open') {
        openSubjectEditor(subjectId);
    }

    if (action === 'create-module') {
        const modName = prompt("Enter new module name:");
        if (modName && modName.trim()) {
            const newModule = { id: uid('m'), name: modName.trim(), quizzes: [] };
            try {
                await fetch(`${API_URL}/subjects/${subjectId}/modules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newModule })
                });
                showToast("Module created successfully!", 'success');
                renderTeacherSubjects(); // Refresh cards to update module count
            } catch (error) {
                showToast('Error: Could not add module.', 'error');
            }
        }
    }

    if (action === 'view-scores') {
        openScoresViewer(subjectId);
    }

    if (action === 'edit') {
        const currentName = btn.dataset.name;
        const newName = prompt("Enter the new subject name:", currentName);
        if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
            try {
                await fetch(`${API_URL}/subjects/${subjectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() })
                });
                showToast('Subject updated successfully!', 'success');
                renderTeacherSubjects();
            } catch (error) {
                showToast('Could not update subject.', 'error');
            }
        }
    }

    if (action === 'delete') {
        if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
            try {
                await fetch(`${API_URL}/subjects/${subjectId}`, { method: 'DELETE' });
                showToast('Subject deleted successfully.', 'success');
                renderTeacherSubjects();
            } catch (error) {
                showToast('Could not delete subject.', 'error');
            }
        }
    }
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

                document.getElementById('moduleContainer').addEventListener('click', async (e) => {
                    const el = e.target.closest('button');
                    if (!el) return;

                    const moduleId = el.dataset.mid;
                    const quizId = el.dataset.qid; // For the toggle action
                    const action = el.dataset.action;

                    if (action === 'create-quiz') {
                        openQuizCreator(subject, moduleId);
                    }

                    if (action === 'view-quiz') {
                        viewQuizModal(subject, moduleId);
                    }

                    if (action === 'edit-module') {
                        const currentName = el.dataset.mname;
                        const newName = prompt("Enter new module name:", currentName);
                        if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
                            try {
                                await fetch(`${API_URL}/subjects/${subjectId}/modules/${moduleId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: newName.trim() })
                                });
                                showToast('Module updated!', 'success');
                                openSubjectEditor(subjectId); // Refresh the modal
                            } catch (error) {
                                showToast('Could not update module.', 'error');
                            }
                        }
                    }

                    if (action === 'delete-module') {
                        if (confirm('Are you sure you want to delete this module?')) {
                            try {
                                await fetch(`${API_URL}/subjects/${subjectId}/modules/${moduleId}`, { method: 'DELETE' });
                                showToast('Module deleted!', 'success');
                                openSubjectEditor(subjectId); // Refresh the modal
                            } catch (error) {
                                showToast('Could not delete module.', 'error');
                            }
                        }
                    }
                    
                    // This is the new part that was missing
                    if (action === 'toggle-quiz-activation') {
                        try {
                            await fetch(`${API_URL}/subjects/${subjectId}/modules/${moduleId}/quizzes/${quizId}/toggle`, { method: 'PUT' });
                            showToast('Quiz status updated!', 'success');
                            openSubjectEditor(subjectId); // Refresh the modal
                        } catch (error) {
                            showToast('Could not update quiz status.', 'error');
                        }
                    }
                });
            }
        );
    } catch (error) {
        showToast('Could not fetch subject details.', 'error');
    }
}

function viewQuizModal(subject, moduleId) {
    const module = subject.modules.find(m => m.id === moduleId);
    if (!module || !module.quizzes || module.quizzes.length === 0) {
        return showToast('No quiz found for this module.', 'error');
    }
    const quiz = module.quizzes[module.quizzes.length - 1];

    let html = `<h3>Quiz Review: ${escapeHtml(module.name)}</h3>
                <p class="text-muted">Created: ${new Date(quiz.createdAt).toLocaleString()}</p>
                <hr>`;

    quiz.questions.forEach((q, idx) => {
        html += `<div class="q-card mb-3 p-3">
                    <p class="fw-bold mb-2">Q${idx + 1}: ${escapeHtml(q.q)}</p>`;
        q.options.forEach((opt, o_idx) => {
            const isCorrect = o_idx === q.correct;
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
        container.innerHTML = `<div class="muted">No modules yet.</div>`;
        return;
    }

    let html = '<div class="module-list">';
    modules.forEach(mod => {
        const quiz = mod.quizzes && mod.quizzes.length > 0 ? mod.quizzes[mod.quizzes.length - 1] : null;
        
        let quizActionsHtml = '<span class="muted btn-sm">No Quiz</span>'; // Default text
        if (quiz) {
            if (isTeacherView) {
                const isActive = quiz.isActive;
                const toggleText = isActive ? 'Deactivate' : 'Activate';
                const toggleClass = isActive ? 'btn-outline-warning' : 'btn-outline-success';
                quizActionsHtml = `
                    <button class="btn btn-sm ${toggleClass}" data-action="toggle-quiz-activation" data-mid="${mod.id}" data-qid="${quiz.id}">${toggleText}</button>
                    <button class="ghost btn-sm" data-action="view-quiz" data-mid="${mod.id}">View Quiz</button>
                `;
            } else { // Student view
                if (quiz.isActive) {
                    quizActionsHtml = `<button class="btn btn-sm btn-primary" data-action="attempt-quiz" data-mid="${mod.id}" data-quizid="${quiz.id}">Attempt Quiz</button>`;
                } else {
                    quizActionsHtml = '<span class="muted btn-sm">Quiz Inactive</span>';
                }
            }
        } else if (isTeacherView) {
            quizActionsHtml = `<button class="btn btn-sm" data-action="create-quiz" data-mid="${mod.id}">Create Quiz</button>`;
        }

        html += `<div class="module-item">
          <div class="d-flex align-items-center gap-2">
            <button class="ghost" data-action="edit-module" data-mid="${mod.id}" data-mname="${escapeHtml(mod.name)}" title="Edit Module" style="border:none; padding:2px; background:transparent; cursor:pointer;"><i class="bi bi-pencil-fill text-primary"></i></button>
            <button class="ghost" data-action="delete-module" data-mid="${mod.id}" title="Delete Module" style="border:none; padding:2px; background:transparent; cursor:pointer;"><i class="bi bi-trash-fill text-danger"></i></button>
            <div style="font-weight:600">${escapeHtml(mod.name)}</div>
          </div>
          <div style="display:flex;gap:8px">${quizActionsHtml}</div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function openQuizCreator(subject, moduleId) {
    const module = subject.modules.find(m => m.id === moduleId);
    if (!module) return showToast('Module not found!', 'error');

    let formHtml = `<form id="quizCreatorForm">`;
    // Add the new Time Limit input field here
    formHtml += `
        <div class="q-card">
            <label for="quizTimeLimit"><b>Time Limit (in minutes)</b></label>
            <input type="number" id="quizTimeLimit" value="5" min="1" class="form-control" style="width: 100px;">
        </div>
    `;

    for (let i = 0; i < 5; i++) {
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
                        return showToast(`Please fill out all fields for Question ${i + 1}.`, 'error');
                    }
                    questions.push({ id: uid('q'), q: text, options: options, correct: parseInt(correctIndex, 10) });
                }

                // Get the time limit and add it to the quiz object
                const timeLimit = parseInt(document.getElementById('quizTimeLimit').value, 10);
                const quiz = { id: uid('quiz'), questions, createdAt: new Date().toISOString(), timeLimit: timeLimit };

                try {
                    await fetch(`${API_URL}/quizzes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subjectId: subject.id, moduleId, quiz })
                    });
                    showToast('Quiz created successfully!', 'success');
                    closeModal();
                    renderTeacherSubjects();
                } catch (error) {
                    showToast('Error: Could not save quiz.', 'error');
                }
            });
        }
    );
}

async function openScoresViewer(subjectId) {
    openModal(`<h3>Loading Analytics...</h3>`, () => {});

    try {
        const [subjectRes, scoresRes] = await Promise.all([
            fetch(`${API_URL}/subjects/details/${subjectId}`),
            fetch(`${API_URL}/scores/subject/${subjectId}`)
        ]);
        if (!subjectRes.ok || !scoresRes.ok) throw new Error('Failed to load analytics data.');

        const subject = await subjectRes.json();
        const scores = await scoresRes.json();

        let html = `<h3>Analytics for ${escapeHtml(subject.name)}</h3>`;
        
        if (!subject.modules || subject.modules.length === 0) {
            html += `<p class="muted">No modules or quizzes exist for this subject yet.</p>`;
        } else {
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
                        html += `<table style="width:100%;border-collapse:collapse;margin-top:6px"><thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Student</th><th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Score</th><th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Time</th></tr></thead><tbody>`;
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
  if(!currentUser || currentUser.role!=='student') return showToast('Not authorized', 'error');
  document.getElementById('studentNameDisplay').innerText = currentUser.name;
  renderStudentSubjects();
  showPage(pages.studentDash);
}

document.getElementById('joinBtn').addEventListener('click', async () => {
    const codeInput = document.getElementById('joinCodeInput');
    const subjectCode = codeInput.value.trim().toUpperCase();
    if (!subjectCode) return showToast('Please enter a subject code.', 'error');

    try {
        const response = await fetch(`${API_URL}/students/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: currentUser.id, subjectCode })
        });
        
        const result = await response.json();

        if (!response.ok) {
            return showToast(`Error: ${result.message}`, 'error');
        }

        showToast(result.message, 'success');
        codeInput.value = '';
        renderStudentSubjects();

    } catch (error) {
        showToast('Could not connect to the server.', 'error');
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

            showToast(result.message, 'success');
            renderStudentSubjects();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    }
});

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
                renderModulesForSubject(subject, false);
                document.getElementById('closeSubView').addEventListener('click', closeModal);
                document.getElementById('moduleContainer').addEventListener('click', e => {
                    const button = e.target.closest('button');
                    if (button && button.dataset.action === 'attempt-quiz') {
                        openQuizAttemptModal(subject, button.dataset.quizid);
                    }
                });
            }
        );
    } catch (error) {
        showToast(error.message, 'error');
    }
}

let quizTimerInterval = null;
function openQuizAttemptModal(subject, quizId) {
    let module, quiz;
    for (const m of subject.modules) {
        const q = (m.quizzes || []).find(x => x.id === quizId);
        if (q) { module = m; quiz = q; break; }
    }
    if (!quiz) return showToast('Quiz not found', 'error');

    // Use the custom time limit from the quiz object, or default to 5 minutes
    const timeLimitInMinutes = quiz.timeLimit || 5;
    let timeLeft = timeLimitInMinutes * 60;
    const initialMinutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const initialSeconds = (timeLeft % 60).toString().padStart(2, '0');

    const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Quiz: ${escapeHtml(module.name)}</h3>
            <div id="quizTimer" class="badge" style="font-size:1.1rem; background:var(--accent); color:white;">${initialMinutes}:${initialSeconds}</div>
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
        
        const submitQuizAction = async () => {
            clearInterval(quizTimerInterval);
            let score = 0;
            quiz.questions.forEach(q => {
                const selected = document.querySelector(`input[name="${q.id}"]:checked`);
                if (selected && parseInt(selected.value) === q.correct) { score += 2; }
            });

            try {
                const response = await fetch(`${API_URL}/scores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: currentUser.id, quizId: quiz.id, subjectId: subject.id, score: score })
                });
                if (!response.ok) throw new Error('Failed to submit score');
                showToast(`Quiz submitted! Your score: ${score} out of ${quiz.questions.length * 2}`, 'success');
            } catch (error) {
                showToast('Error submitting your score. Please try again.', 'error');
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
                showToast("Time's up! Submitting your quiz automatically.", 'info');
                submitQuizAction();
            }
        }, 1000);
        
        document.getElementById('submitQuiz').addEventListener('click', submitQuizAction);
    });
}


// Add event listener for the "My Scores" button
document.getElementById('viewMyScoresBtn').addEventListener('click', () => {
    openScoreHistoryModal(currentUser.id);
});

// This function fetches and displays the score history in a modal
async function openScoreHistoryModal(studentId) {
    openModal(`<h3>Loading Score History...</h3>`, () => {});

    try {
        const response = await fetch(`${API_URL}/scores/student/${studentId}`);
        const scores = await response.json();

        let html = `<h3>My Scores</h3>`;

        if (scores.length === 0) {
            html += `<p class="muted">You haven't taken any quizzes yet.</p>`;
        } else {
            html += `<table style="width:100%; border-collapse: collapse;">
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
                const modules = score.modules || [];
                // Find the module name that contains the quizId
                for (const module of modules) {
                    const quiz = (module.quizzes || []).find(q => q.id === score.quizId);
                    if (quiz) {
                        moduleName = module.name;
                        break;
                    }
                }

                html += `<tr>
                            <td style="padding:8px;">${escapeHtml(score.subjectName)}</td>
                            <td style="padding:8px;">${escapeHtml(moduleName)}</td>
                            <td style="padding:8px;">${score.score}</td>
                            <td style="padding:8px;">${new Date(score.submittedAt).toLocaleDateString()}</td>
                         </tr>`;
            });

            html += `</tbody></table>`;
        }

        html += `<div class="form-actions"><button id="closeScores" class="ghost">Close</button></div>`;

        // Update the modal with the final content
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = html;
            document.getElementById('closeScores').addEventListener('click', closeModal);
        }
    } catch (error) {
        showToast('Could not load score history.', 'error');
    }
}
/* -------------------- Utilities & Init -------------------- */
function escapeHtml(s){
  if(!s && s!==0) return '';
  return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function openModal(htmlContent, onOpen){
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `<div class="modal">${htmlContent}</div>`;
  overlay.style.display='flex';
  if(onOpen) onOpen();
}

function closeModal(){
  const overlay = document.getElementById('overlay');
  overlay.style.display='none';
  overlay.innerHTML='';
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


/* -------------------- User Profile Logic -------------------- */

// Opens the profile page and fills it with user data
function openProfilePage() {
    if (!currentUser) return;
    // Add the new page to our pages object if it's not already there
    if (!pages.profilePage) {
        pages.profilePage = document.getElementById('profilePage');
    }
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-role').textContent = currentUser.role;
    showPage(pages.profilePage);
}

// Event listener for the "Profile" button on the student dash
document.getElementById('profileBtn').addEventListener('click', openProfilePage);

// Event listener to go back to the correct dashboard from the profile page
document.getElementById('profile-back-btn').addEventListener('click', () => {
    if (currentUser.role === 'student') {
        openStudentDashboard();
    }
    // We can add logic for other roles later
});

// Event listener for the "Change Password" form submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        return showToast('New passwords do not match.', 'error');
    }
    if (newPassword.length < 6) {
        return showToast('New password must be at least 6 characters long.', 'error');
    }

    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showToast(result.message, 'success');
        document.getElementById('changePasswordForm').reset();

    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
});
