// 1. IMPORT REQUIRED MODULES
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

// 2. INITIALIZE EXPRESS APP
const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse incoming JSON requests

// This line tells Express to serve the frontend files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// 3. SET UP DATABASE CONNECTION
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
}).promise(); // Use promises for async/await syntax

// 4. DEFINE API ENDPOINTS (ROUTES)

// ===================================
// User & Authentication Routes
// ===================================

// POST /api/login - Handle user login
// POST /api/login - Handle user login
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password); // Compares password to the hash
        if (match) {
            delete user.password;
            res.json(user);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// GET /api/users - Get all users (for Admin Dashboard)
// GET /api/users - Get all users with search and pagination
app.get('/api/users', async (req, res) => {
    try {
        // Get query params for pagination and search, with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        const searchTerm = `%${search}%`; // For SQL LIKE query

        // Query to get the total count of users matching the search
        const countSql = 'SELECT COUNT(*) as total FROM users WHERE name LIKE ? OR email LIKE ?';
        const [countRows] = await db.query(countSql, [searchTerm, searchTerm]);
        const totalUsers = countRows[0].total;

        // Query to get the paginated list of users matching the search
        const usersSql = 'SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? LIMIT ? OFFSET ?';
        const [userRows] = await db.query(usersSql, [searchTerm, searchTerm, limit, offset]);
        
        res.json({
            users: userRows,
            total: totalUsers,
            page: page,
            limit: limit
        });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// POST /api/users - Add a new user (for Admin Dashboard)
// POST /api/users - Add a new user (for Admin Dashboard)
// POST /api/users - Add a new user (for Admin Dashboard)
app.post('/api/users', async (req, res) => {
    const { id, name, email, password, role } = req.body;
    try {
        // Hash the password before saving it
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.query(
            'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [id, name, email, hashedPassword, role] // Use the hashed password
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(409).json({ message: 'Error: User with this email already exists.' });
    }
});

// DELETE /api/users/:id - Delete a user (for Admin Dashboard)
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// GET /api/users/:id - Get a single user's data for editing
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// PUT /api/users/:id - Update a user's data
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    try {
        await db.query(
            'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
            [name, email, role, id]
        );
        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// POST /api/users/:id/reset-password - Reset a user's password
app.post('/api/users/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    try {
        // Generate a new simple, random password
        const newPassword = Math.random().toString(36).slice(2, 10); // e.g., "4k2j5n9x"

        // Hash the new password before saving it
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the user's password in the database
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

        // Send the plain-text new password back to the admin to see
        res.status(200).json({ message: 'Password reset successfully.', newPassword: newPassword });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// GET /api/stats - Get dashboard statistics
app.get('/api/stats', async (req, res) => {
    try {
        const [teacherRows] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
        const [studentRows] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
        const [subjectRows] = await db.query("SELECT COUNT(*) as count FROM subjects");

        const stats = {
            teachers: teacherRows[0].count,
            students: studentRows[0].count,
            subjects: subjectRows[0].count
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});


// ===================================
// Subject & Module Routes
// ===================================

// GET /api/subjects/:teacherId - Get all subjects for a specific teacher
app.get('/api/subjects/:teacherId', async (req, res) => {
    const { teacherId } = req.params;
    try {
        const [subjects] = await db.query('SELECT * FROM subjects WHERE teacherId = ?', [teacherId]);
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// POST /api/subjects - Create a new subject
app.post('/api/subjects', async (req, res) => {
    const { id, name, code, teacherId } = req.body;
    try {
        await db.query(
            'INSERT INTO subjects (id, name, code, teacherId, modules) VALUES (?, ?, ?, ?, ?)',
            [id, name, code, teacherId, '[]'] // Initialize modules as an empty JSON array
        );
        res.status(201).json({ message: 'Subject created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create subject' });
    }
});

// POST /api/subjects/:subjectId/modules - Add a module to a subject
app.post('/api/subjects/:subjectId/modules', async (req, res) => {
    const { subjectId } = req.params;
    const { newModule } = req.body;
    try {
        const sql = "UPDATE subjects SET modules = JSON_ARRAY_APPEND(modules, '$', CAST(? AS JSON)) WHERE id = ?";
        await db.query(sql, [JSON.stringify(newModule), subjectId]);
        res.status(200).json({ message: 'Module added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add module' });
    }
});

// PUT /api/subjects/:id - Update a subject's name
app.put('/api/subjects/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await db.query('UPDATE subjects SET name = ? WHERE id = ?', [name, id]);
        res.status(200).json({ message: 'Subject updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// DELETE /api/subjects/:id - Delete a subject
app.delete('/api/subjects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM subjects WHERE id = ?', [id]);
        res.status(200).json({ message: 'Subject deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// Add a simple welcome message for the root route
app.get('/', (req, res) => {
    res.send('<h1>Welcome to the Quiz App Backend!</h1><p>The server is running correctly.</p>');
});

// ===================================
// Student-Specific Routes
// ===================================

// GET /api/subjects - Get a list of all subjects for students to see
app.get('/api/subjects', async (req, res) => {
    try {
        // We join with the users table to get the teacher's name for each subject
        const sql = `
            SELECT s.id, s.name, s.code, u.name AS teacherName 
            FROM subjects s 
            JOIN users u ON s.teacherId = u.id
        `;
        const [subjects] = await db.query(sql);
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// POST /api/students/join - Allow a student to join a subject
app.post('/api/students/join', async (req, res) => {
    const { studentId, subjectCode } = req.body;
    
    try {
        // 1. Find the subject by its code
        const [subjects] = await db.query('SELECT id FROM subjects WHERE code = ?', [subjectCode]);
        if (subjects.length === 0) {
            return res.status(404).json({ message: 'Invalid subject code.' });
        }
        const subjectId = subjects[0].id;

        // 2. Get the student's current joined subjects
        const [students] = await db.query('SELECT joinedSubjects FROM users WHERE id = ?', [studentId]);
        let joinedSubjects = students[0].joinedSubjects || [];

        // 3. Check if already joined
        if (joinedSubjects.includes(subjectId)) {
            return res.status(409).json({ message: 'You have already joined this subject.' });
        }

        // 4. Add the new subject and update the user
        const sql = "UPDATE users SET joinedSubjects = JSON_ARRAY_APPEND(IFNULL(joinedSubjects, '[]'), '$', ?) WHERE id = ?";
        await db.query(sql, [subjectId, studentId]);

        res.status(200).json({ message: 'Successfully joined subject!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database server error' });
    }
});

// POST /api/students/leave - Allow a student to leave a subject
app.post('/api/students/leave', async (req, res) => {
    const { studentId, subjectId } = req.body;
    try {
        // 1. Get the student's current joined subjects
        const [students] = await db.query('SELECT joinedSubjects FROM users WHERE id = ?', [studentId]);
        if (students.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        let joinedSubjects = students[0].joinedSubjects || [];

        // 2. Find the index of the subject to remove
        const subjectIndex = joinedSubjects.findIndex(id => id === subjectId);
        if (subjectIndex === -1) {
            return res.status(404).json({ message: 'You are not enrolled in this subject.' });
        }

        // 3. Use JSON_REMOVE to update the array in the database
        const sql = "UPDATE users SET joinedSubjects = JSON_REMOVE(joinedSubjects, '$[?]') WHERE id = ?";
        await db.query(sql, [subjectIndex, studentId]);

        res.status(200).json({ message: 'Successfully left the subject.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database server error.' });
    }
});

// GET /api/students/:studentId/subjects - Get all subjects a specific student has joined
app.get('/api/students/:studentId/subjects', async (req, res) => {
    const { studentId } = req.params;
    try {
        // 1. Get the list of subject IDs from the user's JSON array
        const [rows] = await db.query('SELECT joinedSubjects FROM users WHERE id = ?', [studentId]);
        const subjectIds = rows[0].joinedSubjects || [];

        if (subjectIds.length === 0) {
            return res.json([]); // Return empty array if no subjects are joined
        }

        // 2. Fetch the details for those subjects, including the teacher's name
        const sql = `
            SELECT s.id, s.name, s.code, u.name AS teacherName, s.modules
            FROM subjects s
            JOIN users u ON s.teacherId = u.id
            WHERE s.id IN (?)
        `;
        const [subjects] = await db.query(sql, [subjectIds]);
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});


// ===================================
// Quiz & Module Management Routes
// ===================================

// GET a single subject's details, including modules and quizzes
app.get('/api/subjects/details/:subjectId', async (req, res) => {
    const { subjectId } = req.params;
    try {
        const [subjects] = await db.query('SELECT * FROM subjects WHERE id = ?', [subjectId]);
        if (subjects.length > 0) {
            res.json(subjects[0]);
        } else {
            res.status(404).json({ message: 'Subject not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// PUT /api/subjects/:subjectId/modules/:moduleId - Update a module's name
app.put('/api/subjects/:subjectId/modules/:moduleId', async (req, res) => {
    const { subjectId, moduleId } = req.params;
    const { name } = req.body;
    try {
        const [subjects] = await db.query('SELECT modules FROM subjects WHERE id = ?', [subjectId]);
        let modules = subjects[0].modules || [];
        const moduleIndex = modules.findIndex(m => m.id === moduleId);

        if (moduleIndex === -1) return res.status(404).json({ message: 'Module not found' });

        modules[moduleIndex].name = name; // Update the name
        await db.query('UPDATE subjects SET modules = ? WHERE id = ?', [JSON.stringify(modules), subjectId]);
        res.status(200).json({ message: 'Module updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// DELETE /api/subjects/:subjectId/modules/:moduleId - Delete a module
app.delete('/api/subjects/:subjectId/modules/:moduleId', async (req, res) => {
    const { subjectId, moduleId } = req.params;
    try {
        const [subjects] = await db.query('SELECT modules FROM subjects WHERE id = ?', [subjectId]);
        let modules = subjects[0].modules || [];
        const updatedModules = modules.filter(m => m.id !== moduleId); // Filter out the module to delete

        if (modules.length === updatedModules.length) {
            return res.status(404).json({ message: 'Module not found' });
        }

        await db.query('UPDATE subjects SET modules = ? WHERE id = ?', [JSON.stringify(updatedModules), subjectId]);
        res.status(200).json({ message: 'Module deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});


// POST (add) a new quiz to a module within a subject
app.post('/api/quizzes', async (req, res) => {
    const { subjectId, moduleId, quiz } = req.body;
    try {
        const [subjects] = await db.query('SELECT modules FROM subjects WHERE id = ?', [subjectId]);
        let modules = subjects[0].modules || [];

        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) {
            return res.status(404).json({ message: 'Module not found' });
        }
        
        if (!modules[moduleIndex].quizzes) modules[moduleIndex].quizzes = [];

        quiz.isActive = false; // Set the quiz to inactive by default
        modules[moduleIndex].quizzes.push(quiz);

        await db.query('UPDATE subjects SET modules = ? WHERE id = ?', [JSON.stringify(modules), subjectId]);
        res.status(201).json({ message: 'Quiz created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create quiz' });
    }
});

// POST /api/scores - Save a student's quiz score to the database
app.post('/api/scores', async (req, res) => {
    const { studentId, quizId, subjectId, score } = req.body;
    try {
        const sql = 'INSERT INTO scores (studentId, quizId, subjectId, score) VALUES (?, ?, ?, ?)';
        await db.query(sql, [studentId, quizId, subjectId, score]);
        res.status(201).json({ message: 'Quiz score saved successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to save score.' });
    }
});

// GET /api/scores/subject/:subjectId - Get all scores for a given subject
app.get('/api/scores/subject/:subjectId', async (req, res) => {
    const { subjectId } = req.params;
    try {
        const sql = `
            SELECT 
                sc.score, 
                sc.submittedAt, 
                sc.quizId,
                u.name AS studentName,
                u.roll AS studentRoll
            FROM scores sc
            JOIN users u ON sc.studentId = u.id
            WHERE sc.subjectId = ?
            ORDER BY sc.submittedAt DESC
        `;
        const [scores] = await db.query(sql, [subjectId]);
        res.json(scores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database server error' });
    }
});


// PUT /api/quizzes/:quizId/toggle - Toggle a quiz's active status
app.put('/api/subjects/:subjectId/modules/:moduleId/quizzes/:quizId/toggle', async (req, res) => {
    const { subjectId, moduleId, quizId } = req.params;
    try {
        const [subjects] = await db.query('SELECT modules FROM subjects WHERE id = ?', [subjectId]);
        let modules = subjects[0].modules || [];

        const moduleIndex = modules.findIndex(m => m.id === moduleId);
        if (moduleIndex === -1) return res.status(404).json({ message: 'Module not found' });

        const quizIndex = modules[moduleIndex].quizzes.findIndex(q => q.id === quizId);
        if (quizIndex === -1) return res.status(404).json({ message: 'Quiz not found' });

        // Toggle the isActive status
        modules[moduleIndex].quizzes[quizIndex].isActive = !modules[moduleIndex].quizzes[quizIndex].isActive;
        
        await db.query('UPDATE subjects SET modules = ? WHERE id = ?', [JSON.stringify(modules), subjectId]);
        res.status(200).json({ message: 'Quiz status updated.' });
    } catch (error) {
        res.status(500).json({ message: 'Database server error' });
    }
});

// 5. START THE SERVER
const PORT = 5000;
// const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});