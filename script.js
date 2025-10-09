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

function getIconForSubject(subjectName) {
    const name = subjectName.toLowerCase();
    if (name.includes('html')) return 'devicon-html5-plain colored';
    if (name.includes('css')) return 'devicon-css3-plain colored';
    if (name.includes('javascript') || name.includes('js')) return 'devicon-javascript-plain colored';
    if (name.includes('cns')) return 'devicon-network-plain colored';
    // Default icon if no match is found
    return 'bi bi-journal-text'; 
}


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

function validatePassword(password) {
    // This regex checks for the rules defined in Step 1.
    const strongPasswordRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})");
    return strongPasswordRegex.test(password);
}


/* -------------------- Page navigation -------------------- */
const pages = {
  landing: document.getElementById('landing'),
  aboutPage: document.getElementById('aboutPage'),
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
document.getElementById('about-back-btn').addEventListener('click', () => {
    showPage(pages.landing);
});
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

document.getElementById('aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    showPage(pages.aboutPage);
});


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
                tr.innerHTML = `
                    <td style="padding:8px">${escapeHtml(user.name)}</td>
                    <td style="padding:8px">${escapeHtml(user.email)}</td>
                    <td class="admin-table-actions">
                        <button class="ghost btn-sm" data-action="edit" data-id="${user.id}" title="Edit User"><i class="bi bi-pencil-fill"></i> Edit</button>
                        <button class="ghost btn-sm" data-action="reset-password" data-id="${user.id}" title="Reset Password"><i class="bi bi-key-fill"></i> Reset</button>
                        <button class="ghost btn-sm" data-action="delete" data-id="${user.id}" title="Delete User"><i class="bi bi-trash-fill"></i> Delete</button>
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
            
            card.innerHTML = `
              <div>
                  <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <h3>${escapeHtml(sub.name)}</h3>
                        <div class="subject-meta">Code: <strong class="badge">${sub.code}</strong></div>
                      </div>
                      <div class="card-actions-menu">
                          <button class="ghost" data-action="toggle-menu" style="border:none; background:transparent; cursor:pointer;" title="More options"><i class="bi bi-three-dots-vertical"></i></button>
                          <ul class="dropdown-menu">
                              <li><a class="dropdown-item" data-action="edit" data-id="${sub.id}" data-name="${escapeHtml(sub.name)}"><i class="bi bi-pencil-fill"></i> Edit</a></li>
                              <li><a class="dropdown-item" data-action="delete" data-id="${sub.id}"><i class="bi bi-trash-fill"></i> Delete</a></li>
                          </ul>
                      </div>
                  </div>
                  <div class="subject-stats">
                    ${sub.quizCount} Quizzes &bull; ${sub.attemptCount} Attempts
                  </div>
              </div>
              <div class="subject-actions">
                <button class="btn-sm btn" data-action="open" data-id="${sub.id}">Manage Modules</button>
                <button class="btn-sm ghost" data-action="create-module" data-id="${sub.id}">Create Module</button>
                <button class="btn-sm ghost" data-action="view-students" data-id="${sub.id}" data-name="${escapeHtml(sub.name)}">View Students</button>
                <button class="btn-sm btn" data-action="view-report" data-id="${sub.id}">View Report</button>
              </div>
            `;
            teacherSubjectsEl.appendChild(card);
        });
    } catch (error) {
        showToast('Error loading subjects.', 'error');
        teacherSubjectsEl.innerHTML = '';
    }
}

// async function renderTeacherSubjects() {
//     teacherSubjectsEl.innerHTML = '<p class="muted">Loading subjects...</p>';
//     try {
//         const response = await fetch(`${API_URL}/subjects/${currentUser.id}`);
//         const subjects = await response.json();

//         // const response = await fetch(`${API_URL}/subjects/${currentUser.id}?search=${subjectSearchQuery}&sortBy=${subjectSortBy}`);
//         // const subjects = await response.json();

//         teacherSubjectsEl.innerHTML = '';
//         noSubjectsEl.style.display = subjects.length === 0 ? 'block' : 'none';

//         subjects.forEach(sub => {
//             const card = document.createElement('div');
//             card.className = 'subject-card';
            
//             // This is the updated card HTML with the new structure and classes
//             card.innerHTML = `
//               <div>
//                   <div class="d-flex justify-content-between align-items-start">
//                       <div>
//                         <h3>${escapeHtml(sub.name)}</h3>
//                         <div class="subject-meta">Code: <strong class="badge">${sub.code}</strong></div>
//                       </div>
//                       <div class="d-flex gap-2">
//                         <button class="ghost" data-action="edit" data-id="${sub.id}" data-name="${escapeHtml(sub.name)}" title="Edit Subject" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-pencil-fill text-primary"></i></button>
//                         <button class="ghost" data-action="delete" data-id="${sub.id}" title="Delete Subject" style="border:none; background:transparent; cursor:pointer;"><i class="bi bi-trash-fill text-danger"></i></button>
//                       </div>
//                   </div>
//                   <div class="subject-stats">
//                     ${sub.quizCount} Quizzes &bull; ${sub.attemptCount} Attempts
//                   </div>
//               </div>
//               <div class="subject-actions">
//                 <button class="btn-sm btn" data-action="open" data-id="${sub.id}">Manage Modules</button>
//                 <button class="btn-sm ghost" data-action="create-module" data-id="${sub.id}">Create Module</button>
//                 <button class="btn-sm btn" data-action="view-report" data-id="${sub.id}">View Report</button>
//               </div>
//             `;
//             teacherSubjectsEl.appendChild(card);
//         });
//     } catch (error) {
//         showToast('Error loading subjects.', 'error');
//         teacherSubjectsEl.innerHTML = '';
//     }
// }



// teacherSubjectsEl.addEventListener('click', async (ev) => {
//     const btn = ev.target.closest('button');
//     if (!btn) return;
//     const action = btn.dataset.action;
//     const subjectId = btn.dataset.id;

//     if (action === 'open') {
//         openSubjectEditor(subjectId);
//     }

//     if (action === 'create-module') {
//         const createModuleHtml = `
//             <h3>Create New Module</h3>
//             <form id="createModuleForm">
//                 <label>Module Name</label>
//                 <input type="text" id="newModuleName" required>
//                 <div class="form-actions">
//                     <button type="submit" class="btn">Create Module</button>
//                     <button type="button" class="ghost" id="cancelModuleCreate">Cancel</button>
//                 </div>
//             </form>
//         `;
//         openModal(createModuleHtml, () => {
//             document.getElementById('cancelModuleCreate').addEventListener('click', closeModal);
//             document.getElementById('createModuleForm').addEventListener('submit', async (submitEvent) => {
//                 submitEvent.preventDefault();
//                 const modName = document.getElementById('newModuleName').value.trim();
//                 if (modName) {
//                     const newModule = { id: uid('m'), name: modName, quizzes: [] };
//                     try {
//                         await fetch(`${API_URL}/subjects/${subjectId}/modules`, {
//                             method: 'POST',
//                             headers: { 'Content-Type': 'application/json' },
//                             body: JSON.stringify({ newModule })
//                         });
//                         showToast("Module created!", 'success');
//                         closeModal();
//                         renderTeacherSubjects();
//                     } catch (error) {
//                         showToast('Error: Could not add module.', 'error');
//                     }
//                 }
//             });
//         });
//     }

//     if (action === 'view-report') {
//         openScoresViewer(subjectId);
//     }

//     if (action === 'edit') {
//         const currentName = btn.dataset.name;
//         const newName = prompt("Enter the new subject name:", currentName);
//         if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
//             try {
//                 await fetch(`${API_URL}/subjects/${subjectId}`, {
//                     method: 'PUT',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({ name: newName.trim() })
//                 });
//                 showToast('Subject updated successfully!', 'success');
//                 renderTeacherSubjects();
//             } catch (error) {
//                 showToast('Could not update subject.', 'error');
//             }
//         }
//     }

//     if (action === 'delete') {
//         if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
//             try {
//                 await fetch(`${API_URL}/subjects/${subjectId}`, { method: 'DELETE' });
//                 showToast('Subject deleted successfully.', 'success');
//                 renderTeacherSubjects();
//             } catch (error) {
//                 showToast('Could not delete subject.', 'error');
//             }
//         }
//     }
// });


teacherSubjectsEl.addEventListener('click', async (ev) => {
    // This now looks for any element with a 'data-action', like a button or a link
    const actionTarget = ev.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;
    const subjectId = actionTarget.dataset.id;

    // --- NEW: Logic to show/hide the dropdown menu ---
    if (action === 'toggle-menu') {
        const menu = actionTarget.nextElementSibling;
        // This part closes any other open menus before opening a new one
        document.querySelectorAll('.dropdown-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
        return; 
    }

    // --- The rest of the actions ---
    if (action === 'open') {
        openSubjectEditor(subjectId);
    }

    if (action === 'create-module') {
        // ... (This logic is already correct in your provided code)
    }

    if (action === 'view-report') {
        openScoresViewer(subjectId);
    }

    if (action === 'edit') {
        const currentName = actionTarget.dataset.name;
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

    if (action === 'view-students') {
        const subjectName = actionTarget.dataset.name;
        openStudentListViewModal(subjectId, subjectName);
    }
});

// Also, add this listener to close the dropdown when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-actions-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
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
                    const quizId = el.dataset.qid;
                    const action = el.dataset.action;

                    if (action === 'create-quiz') {
                        openQuizCreator(subject, moduleId);
                    }

                    if (action === 'view-quiz') {
                        viewQuizModal(subject, moduleId);
                    }

                    if (action === 'edit-module') {
                        const currentName = el.dataset.mname;
                        const editModuleHtml = `
                            <h3>Edit Module Name</h3>
                            <form id="editModuleForm">
                                <label>Module Name</label>
                                <input type="text" id="newModuleName" value="${escapeHtml(currentName)}" required>
                                <div class="form-actions">
                                    <button type="submit" class="btn">Save Changes</button>
                                    <button type="button" class="ghost" id="cancelModuleEdit">Cancel</button>
                                </div>
                            </form>
                        `;
                        openModal(editModuleHtml, () => {
                            document.getElementById('cancelModuleEdit').addEventListener('click', () => openSubjectEditor(subjectId));
                            document.getElementById('editModuleForm').addEventListener('submit', async (submitEvent) => {
                                submitEvent.preventDefault();
                                const newName = document.getElementById('newModuleName').value.trim();
                                if (newName && newName !== '' && newName !== currentName) {
                                    try {
                                        await fetch(`${API_URL}/subjects/${subjectId}/modules/${moduleId}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ name: newName })
                                        });
                                        showToast('Module updated!', 'success');
                                        openSubjectEditor(subjectId);
                                    } catch (error) {
                                        showToast('Could not update module.', 'error');
                                    }
                                } else {
                                    openSubjectEditor(subjectId);
                                }
                            });
                        });
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
                    
                    if (action === 'toggle-quiz-activation') {
                        try {
                            await fetch(`${API_URL}/subjects/${subjectId}/modules/${moduleId}/quizzes/${quizId}/toggle`, { method: 'PUT' });
                            showToast('Quiz status updated!', 'success');
                            openSubjectEditor(subjectId); // Refresh the modal
                        } catch (error) {
                            showToast('Could not update quiz status.', 'error');
                        }
                    }

                    if (action === 'print-module-report') {
                        window.open(`teacher_report.html?moduleId=${moduleId}`, '_blank');
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
        container.innerHTML = `<div class="muted" style="padding: 20px; text-align:center;">No modules have been created for this subject yet.</div>`;
        return;
    }

    let tableHtml = `
        <table class="module-table">
            <thead>
                <tr>
                    <th>Module Name</th>
                    <th>Quiz Status</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>`;

    modules.forEach(mod => {
        const quiz = mod.quizzes && mod.quizzes.length > 0 ? mod.quizzes[mod.quizzes.length - 1] : null;
        
        let quizStatusHtml = '<span class="badge" style="background-color: #f0f3f7; color: var(--muted);">No Quiz</span>';
        let actionsHtml = '';

        if (isTeacherView) {
            // Base actions for every module
            actionsHtml = `
                <button class="ghost btn-sm" data-action="edit-module" data-mid="${mod.id}" data-mname="${escapeHtml(mod.name)}"><i class="bi bi-pencil-fill"></i> Edit</button>
                <button class="ghost btn-sm" data-action="delete-module" data-mid="${mod.id}"><i class="bi bi-trash-fill"></i> Delete</button>
                <button class="ghost btn-sm" data-action="print-module-report" data-mid="${mod.id}"><i class="bi bi-printer-fill"></i> Print</button>
             <button class="ghost btn-sm" data-action="view-quiz" data-mid="${mod.id}"><i class="bi bi-eye-fill"></i> View Quiz</button>
            `;

            // Quiz-specific actions
            if (quiz) {
                const isActive = quiz.isActive;
                const toggleText = isActive ? 'Deactivate' : 'Activate';
                const toggleIcon = isActive ? 'bi-toggle-off' : 'bi-toggle-on';
                quizStatusHtml = `<span class="badge" style="background-color: ${isActive ? '#e6f7ee' : '#fff8e1'}; color: ${isActive ? '#26a69a' : '#ffa000'};">${isActive ? 'Active' : 'Inactive'}</span>`;
                actionsHtml += `<button class="ghost btn-sm" data-action="toggle-quiz-activation" data-mid="${mod.id}" data-qid="${quiz.id}"><i class="bi ${toggleIcon}"></i> ${toggleText}</button>`;
            } else {
                actionsHtml += `<button class="btn-sm btn" data-action="create-quiz" data-mid="${mod.id}"><i class="bi bi-plus-circle-fill"></i> Create Quiz</button>`;
            }
        } else { // Student view
            if (quiz && quiz.isActive) {
                quizStatusHtml = '<span class="badge" style="background-color: #e6f7ee; color: #26a69a;">Available</span>';
                actionsHtml = `<button class="btn-sm btn" data-action="attempt-quiz" data-mid="${mod.id}" data-quizid="${quiz.id}"><i class="bi bi-play-circle-fill"></i> Attempt Quiz</button>`;
            } else if (quiz && !quiz.isActive) {
                quizStatusHtml = '<span class="badge" style="background-color: #fff8e1; color: #ffa000;">Not Active</span>';
            }
        }
        
        tableHtml += `
            <tr>
                <td>${escapeHtml(mod.name)}</td>
                <td>${quizStatusHtml}</td>
                <td class="module-actions">${actionsHtml}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

function openQuizCreator(subject, moduleId) {
    const module = subject.modules.find(m => m.id === moduleId);
    if (!module) return showToast('Module not found!', 'error');

    let questionCounter = 0; // To give each question a unique ID

    // A helper function to create the HTML for a new question card
    const createQuestionCardHtml = (index) => `
        <div class="q-card" data-question-index="${index}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="fw-bold">Question ${index + 1}</label>
                <div>
                    <select id="q-type-${index}" class="q-type-select" data-q-index="${index}" style="padding: 4px; border-radius: 6px;">
                        <option value="mc">Multiple Choice</option>
                        <option value="fib">Fill in the Blank</option>
                    </select>
                    <button type="button" class="btn-sm ghost remove-question-btn" style="border:none; color: #dc3545;" title="Remove Question"><i class="bi bi-x-circle-fill"></i></button>
                </div>
            </div>
            <textarea name="q_text_${index}" required placeholder="For 'Fill in the Blank', use __ (two underscores) for the blank."></textarea>
            
            <div id="mc-options-${index}">
                <div class="mt-2"><b>Options:</b></div>
                ${[0, 1, 2, 3].map(j => `
                    <div class="option-group">
                        <input type="radio" name="q_correct_${index}" value="${j}" required>
                        <input type="text" name="q_option_${index}_${j}" placeholder="Option ${j + 1}" required>
                    </div>`).join('')}
            </div>
            
            <div id="fib-answer-${index}" style="display:none; margin-top:8px;">
                <label>Correct Answer</label>
                <input type="text" name="q_answer_${index}" placeholder="Enter the exact answer for the blank">
            </div>
        </div>
    `;

    // The initial HTML for the modal, with a container for questions and an "Add" button
    const modalHtml = `
        <h3>Create Quiz for ${escapeHtml(module.name)}</h3>
        <form id="quizCreatorForm">
            <div class="q-card">
                <label for="quizTimeLimit"><b>Time Limit (in minutes)</b></label>
                <input type="number" id="quizTimeLimit" value="5" min="1" style="width: 100px; padding: 6px; border-radius: 8px; border: 1px solid #ddd;">
            </div>
            <div id="questions-container">
                </div>
            <button type="button" id="addQuestionBtn" class="btn ghost mt-2"><i class="bi bi-plus-circle"></i> Add Question</button>
        </form>
        <div class="form-actions mt-4">
            <button id="saveQuizBtn" class="btn">Save Quiz</button>
            <button id="cancelQuizBtn" class="ghost" type="button">Cancel</button>
        </div>
    `;

    openModal(modalHtml, () => {
        const questionsContainer = document.getElementById('questions-container');

        // Function to add a new question card to the DOM
        const addQuestion = () => {
            const newCardHtml = createQuestionCardHtml(questionCounter);
            questionsContainer.insertAdjacentHTML('beforeend', newCardHtml);
            questionCounter++;
        };
        
        // Start with one question
        addQuestion();

        // Event listener for the "Add Question" button
        document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);

        // Event delegation for dynamically added elements (type select and remove button)
        questionsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('q-type-select')) {
                const index = e.target.dataset.qIndex;
                document.getElementById(`mc-options-${index}`).style.display = e.target.value === 'mc' ? 'block' : 'none';
                document.getElementById(`fib-answer-${index}`).style.display = e.target.value === 'fib' ? 'block' : 'none';
            }
        });
        
        questionsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-question-btn')) {
                if (questionsContainer.children.length > 1) {
                    e.target.closest('.q-card').remove();
                } else {
                    showToast('A quiz must have at least one question.', 'error');
                }
            }
        });

        document.getElementById('cancelQuizBtn').addEventListener('click', closeModal);
        document.getElementById('saveQuizBtn').addEventListener('click', async () => {
            const questions = [];
            const questionCards = document.querySelectorAll('#questions-container .q-card');

            // NEW: Loop through the question cards that actually exist in the form
            for (const card of questionCards) {
                const index = card.dataset.questionIndex;
                const questionText = card.querySelector(`textarea[name="q_text_${index}"]`).value;
                const questionType = card.querySelector(`#q-type-${index}`).value;
                if (!questionText) return showToast(`Please enter text for all questions.`, 'error');

                let questionData = { id: uid('q'), type: questionType, q: questionText };

                if (questionType === 'mc') {
                    const correctIndex = card.querySelector(`input[name="q_correct_${index}"]:checked`);
                    if (!correctIndex) return showToast(`Please select a correct answer for all multiple-choice questions.`, 'error');
                    
                    const options = [];
                    for (let j = 0; j < 4; j++) {
                        const option = card.querySelector(`input[name="q_option_${index}_${j}"]`).value;
                        if (!option) return showToast(`Please fill all options for all multiple-choice questions.`, 'error');
                        options.push(option);
                    }
                    questionData.options = options;
                    questionData.correct = parseInt(correctIndex.value, 10);
                } else { // Fill in the Blank
                    const answer = card.querySelector(`input[name="q_answer_${index}"]`).value;
                    if (!answer) return showToast(`Please provide an answer for all fill-in-the-blank questions.`, 'error');
                    questionData.answer = answer;
                }
                questions.push(questionData);
            }

            const timeLimit = parseInt(document.getElementById('quizTimeLimit').value, 10);
            const quiz = { id: uid('quiz'), questions, createdAt: new Date().toISOString(), timeLimit: timeLimit, isActive: false };
            
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
    });
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

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3>Analytics for ${escapeHtml(subject.name)}</h3>
                <button class="ghost btn-sm" id="printReportFromModal"><i class="bi bi-printer-fill"></i> Print</button>
            </div>
        `;
        
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

                    let leaderboardHtml = '<p class="muted" style="font-size: 0.9rem;">No scores yet.</p>';
                    if (quizScores.length > 0) {
                        const topScores = [...quizScores].sort((a, b) => b.score - a.score).slice(0, 5);
                        leaderboardHtml = '<ol class="leaderboard-list">';
                        topScores.forEach((score, index) => {
                            leaderboardHtml += `<li>
                                <span><strong>#${index + 1}</strong> ${escapeHtml(score.studentName)}</span>
                                <span class="badge">${score.score} pts</span>
                            </li>`;
                        });
                        leaderboardHtml += '</ol>';
                    }
                    
                    let individualScoresHtml = '';
                    if (quizScores.length > 0) {
                        const scoresByTime = [...quizScores].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                        individualScoresHtml = `<table style="width:100%;">
                                    <thead><tr><th>Student</th><th>Score</th><th>Time</th></tr></thead>
                                    <tbody>`;
                        scoresByTime.forEach(score => {
                            individualScoresHtml += `<tr>
                                <td style="padding:6px;">${escapeHtml(score.studentName)}</td>
                                <td style="padding:6px;">${score.score}</td>
                                <td style="padding:6px;">${new Date(score.submittedAt).toLocaleString()}</td>
                             </tr>`;
                        });
                        individualScoresHtml += `</tbody></table>`;
                    } else {
                        individualScoresHtml = `<p class="muted">No individual scores to show.</p>`;
                    }

                    html += `<div class="card" style="margin-top:20px; border: 1px solid #eee;">
                        <div style="padding:15px;">
                            <h4 style="margin:0;">${escapeHtml(module.name)}</h4>
                            <div class="muted"><b>${totalAttempts}</b> attempt(s) • Average Score: <b>${avgScore}</b></div>
                            
                            <div class="analytics-grid">
                                <div class="chart-container">
                                    <canvas id="chart-for-quiz-${quiz.id}"></canvas>
                                </div>
                                <div class="leaderboard-container">
                                    <h5><i class="bi bi-trophy-fill"></i> Leaderboard</h5>
                                    ${leaderboardHtml}
                                </div>
                            </div>
                            
                            <p style="margin-top:15px; margin-bottom: 5px;">
                                <a href="#" class="link view-scores-toggle" data-target="#scores-table-${quiz.id}">
                                    View All Individual Scores &raquo;
                                </a>
                            </p>
                            <div id="scores-table-${quiz.id}" style="display: none;">
                                ${individualScoresHtml}
                            </div>
                        </div>
                    </div>`;
                });
            });
        }

        html += `<div class="form-actions"><button id="closeScores" class="ghost">Close</button></div>`;
        
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = html;
            
            document.getElementById('printReportFromModal').addEventListener('click', () => {
                window.open(`teacher_report.html?subjectId=${subjectId}`, '_blank');
            });
            document.getElementById('closeScores').addEventListener('click', closeModal);

            modalContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('view-scores-toggle')) {
                    e.preventDefault();
                    const targetId = e.target.dataset.target;
                    const tableDiv = document.querySelector(targetId);
                    if (tableDiv) {
                        tableDiv.style.display = tableDiv.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
            
            subject.modules.forEach(module => {
                (module.quizzes || []).forEach(quiz => {
                    const canvas = document.getElementById(`chart-for-quiz-${quiz.id}`);
                    if (!canvas) return;
                    
                    const quizScores = scores.filter(s => s.score !== undefined && s.quizId === quiz.id).map(s => s.score);
                    
                    const scoreBins = [0, 0, 0, 0];
                    quizScores.forEach(score => {
                        if (score <= 2) scoreBins[0]++;
                        else if (score <= 5) scoreBins[1]++;
                        else if (score <= 8) scoreBins[2]++;
                        else scoreBins[3]++;
                    });
                    
                    new Chart(canvas, {
                        type: 'bar',
                        data: {
                            labels: ['0-2', '3-5', '6-8', '9-10'],
                            datasets: [{
                                label: '# of Students',
                                data: scoreBins,
                                backgroundColor: 'rgba(30, 136, 229, 0.6)',
                                borderColor: 'rgba(30, 136, 229, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                            plugins: { legend: { display: false }, title: { display: true, text: 'Score Distribution' } },
                            maintainAspectRatio: false
                        }
                    });
                });
            });
        }

    } catch (error) {
        showToast('Could not load analytics.', 'error');
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = `<p>Error loading analytics. Please try again.</p><div class="form-actions"><button id="closeScores" class="ghost">Close</button></div>`;
            document.getElementById('closeScores').addEventListener('click', closeModal);
        }
    }
}

async function openStudentListViewModal(subjectId, subjectName) {
    openModal(`<h3>Loading students for ${subjectName}...</h3>`, () => {});

    try {
        const response = await fetch(`${API_URL}/subjects/${subjectId}/students`);
        const students = await response.json();

        let html = `<h3>Enrolled Students in ${subjectName}</h3>`;
        if (students.length === 0) {
            html += `<p class="muted">No students have joined this subject yet.</p>`;
        } else {
            html += `<table class="module-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Roll No.</th></tr></thead>
                        <tbody>`;
            students.forEach(student => {
                html += `<tr>
                            <td>${escapeHtml(student.name)}</td>
                            <td>${escapeHtml(student.email)}</td>
                            <td>${escapeHtml(student.roll) || 'N/A'}</td>
                         </tr>`;
            });
            html += `</tbody></table>`;
        }
        html += `<div class="form-actions"><button id="closeStudentList" class="ghost">Close</button></div>`;
        
        const modalContent = document.querySelector('.modal');
        if(modalContent) {
            modalContent.innerHTML = html;
            document.getElementById('closeStudentList').addEventListener('click', closeModal);
        }

    } catch (error) {
        showToast('Could not load student list.', 'error');
    }
}

/* -------------------- Student Dashboard Logic (NEWLY UPDATED) -------------------- */
function openStudentDashboard(){
  if(!currentUser || currentUser.role!=='student') return showToast('Not authorized', 'error');
  document.getElementById('studentNameDisplay').innerText = currentUser.name;
  renderStudentSubjects();
  loadStudentActivity();
  loadStudentStats(); // <-- ADD THIS LINE
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
          const card = document.createElement('div');
          card.className = 'subject-card'; // This will use the enhanced style
          const iconClass = getIconForSubject(subject.name); // Get the tech icon
          const modules = subject.modules || [];

          card.innerHTML = `
            <div>
                <i class="${iconClass} subject-card-icon"></i>
                <h3>${escapeHtml(subject.name)}</h3>
                <div class="subject-meta">Teacher: ${escapeHtml(subject.teacherName)}</div>
                <div class="subject-stats">${modules.length} Modules</div>
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

// let quizTimerInterval = null;
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
// Event listener for the "My Scores" button
// Event listener for the "My Scores" button
document.getElementById('viewMyScoresBtn').addEventListener('click', () => {
    openScoreHistoryModal(currentUser.id);
});

// Event listener for the "Print Report" button
document.getElementById('printReportBtn').addEventListener('click', () => {
    if (!currentUser) return;
    // Opens the report page in a new tab, passing the student's ID in the URL
    window.open(`report.html?studentId=${currentUser.id}`, '_blank');
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

        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = html;
            document.getElementById('closeScores').addEventListener('click', closeModal);
        }
    } catch (error) {
        showToast('Could not load score history.', 'error');
        // Also update the modal on error
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
             modalContent.innerHTML = `<h3>Error</h3><p>Could not load scores.</p><div class="form-actions"><button id="closeScoresErr" class="ghost">Close</button></div>`;
             document.getElementById('closeScoresErr').addEventListener('click', closeModal);
        }
    }
}



// This function fetches and displays the score history in a modal
async function openScoreHistoryModal(studentId) {
    openModal(`<h3>Loading Score History...</h3>`, () => {});

    try {
        const response = await fetch(`${API_URL}/scores/student/${studentId}`);
        const scores = await response.json();
        if (!response.ok) throw new Error("Server error"); // Trigger the catch block on server error

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
        
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = html;
            document.getElementById('closeScores').addEventListener('click', closeModal);
        }

    } catch (error) {
        showToast('Could not load score history.', 'error');
        // This is the new part that fixes the bug
        const modalContent = document.querySelector('.modal');
        if (modalContent) {
            modalContent.innerHTML = `
                <h3>Error</h3>
                <p class="muted">Could not load your score history. Please try again later.</p>
                <div class="form-actions">
                    <button id="closeErrorModal" class="ghost">Close</button>
                </div>
            `;
            document.getElementById('closeErrorModal').addEventListener('click', closeModal);
        }
    }
}

async function loadStudentActivity() {
    const feed = document.getElementById('activityFeed');
    feed.innerHTML = '<li>Loading activity...</li>';

    // NEW: Check if the user is enrolled in any subjects first.
    if (!currentUser.joinedSubjects || currentUser.joinedSubjects.length === 0) {
        feed.innerHTML = '<li class="muted">No recent activity.</li>';
        return; // Stop the function here
    }

    try {
        const response = await fetch(`${API_URL}/students/${currentUser.id}/activity`);
        const activities = await response.json();

        if (activities.length === 0) {
            feed.innerHTML = '<li class="muted">No recent activity.</li>';
            return;
        }

        feed.innerHTML = ''; // Clear loading message
        activities.forEach(activity => {
            let moduleName = 'Unknown Module';
            // Find the module name that contains this quiz
            const modules = activity.modules || [];
            for (const module of modules) {
                const quiz = (module.quizzes || []).find(q => q.id === activity.quizId);
                if (quiz) { moduleName = module.name; break; }
            }

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="activity-title">Completed quiz in ${escapeHtml(moduleName)}</div>
                <div class="activity-meta">
                    Scored ${activity.score} on ${new Date(activity.submittedAt).toLocaleDateString()}
                </div>
            `;
            feed.appendChild(li);
        });
    } catch (error) {
        feed.innerHTML = '<li class="muted">Could not load activity.</li>';
    }
}

async function loadStudentStats() {
    try {
        // This line ensures we fetch stats for the currently logged-in user
        const res = await fetch(`${API_URL}/students/${currentUser.id}/stats`);
        const stats = await res.json();

        document.getElementById('avgScore').textContent = stats.averageScore;
        document.getElementById('quizzesTaken').textContent = stats.quizzesTaken;
        document.getElementById('bestSubject').textContent = stats.bestSubject;
    } catch (error) {
        console.error("Could not load student stats", error);
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

    // --- NEW VALIDATION STEP ---
    if (!validatePassword(newPassword)) {
        const errorMessage = 'Password is not strong enough. It must be at least 8 characters and include an uppercase letter, a number, and a special character (!@#$%^&*).';
        // Show the toast for a longer duration so the user can read it
        const options = { duration: 7000, style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" } };
        showToast(errorMessage, 'error', options);
        return;
    }
    // --- END OF NEW STEP ---

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

// --- Intersection Observer for Animations ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });

    // Find all elements you want to animate and observe them
    const elementsToAnimate = document.querySelectorAll('.card, .role-card, .stat-card');
    elementsToAnimate.forEach(el => {
        el.classList.add('fade-in-element');
        observer.observe(el);
    });
});
