# Department Quiz Application

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

A full-stack web application designed as a quiz management system for an educational department. It supports three distinct user roles—Admin, Teacher, and Student—each with a dedicated dashboard and set of permissions, allowing for a complete workflow from user creation to quiz completion and analysis.

## Core Features 🚀

### 👨‍💼 Administrator Dashboard
* **User Management**: Create, read, update, and delete Teacher and Student accounts.
* **Password Reset**: Securely reset any user's password.
* **Statistical Overview**: View dashboard cards with live counts of total teachers, students, and subjects.
* **User Search & Pagination**: Easily find users and navigate through long lists of records.

### 👩‍🏫 Teacher Dashboard
* **Subject Management**: Create, edit, and delete subjects.
* **Module Management**: Add, edit, and delete modules (e.g., chapters, topics) within each subject.
* **Quiz Creation**: Build 5-question multiple-choice quizzes for any module.
* **Quiz Settings**: Set a custom time limit and activate/deactivate quizzes to control student access.
* **Analytics**: View detailed results for each quiz, including the number of attempts, average score, and a list of individual student scores.

### ուսանող Student Dashboard
* **Subject Enrollment**: Join subjects using a unique code provided by a teacher and leave subjects at any time.
* **Quiz Access**: View and access only the quizzes that have been activated by a teacher.
* **Quiz Attempt**: Take quizzes within the custom time limit set by the teacher.
* **Score History**: View a complete history of all previously taken quizzes and the scores received.

## Technology Stack 💻

* **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), Fetch API, Toastify.js, Bootstrap Icons
* **Backend**: Node.js, Express.js
* **Database**: MySQL
* **Key Libraries**: `mysql2`, `bcrypt`, `cors`, `dotenv`

## Technical Architecture 🏛️

* **Client-Server Model**: The application is architected with a clear separation between the frontend (UI) and the backend (server-side logic and database).
* **REST API**: The frontend and backend communicate via a RESTful API. The frontend sends HTTP requests (GET, POST, PUT, DELETE), and the backend responds with JSON data.
* **Security**: User passwords are never stored as plain text. They are securely processed using **bcrypt hashing**, a critical industry-standard practice.
* **Single-Page Application (SPA) Experience**: The app functions like a SPA. Pages are shown and hidden dynamically with JavaScript, providing a fast and smooth user experience without requiring full page reloads.

## Getting Started ⚙️

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

* Node.js and npm installed (`v16` or higher recommended).
* MySQL Server installed and running.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git)
    cd YOUR_REPOSITORY_NAME
    ```

2.  **Install backend dependencies:**
    *Navigate into the `backend` directory (or wherever your `package.json` is located).*
    ```sh
    npm install
    ```

3.  **Set up the Database:**
    * Log in to your MySQL server.
    * Create a new database for the project (e.g., `quiz_app`).
    * Import the database schema from the `database.sql` file (you will need to create this file by exporting your current database structure).

4.  **Configure Environment Variables:**
    * Create a `.env` file in the backend's root directory.
    * Add the following variables, replacing the values with your MySQL credentials:
    ```env
    DB_HOST=localhost
    DB_USER=your_mysql_username
    DB_PASSWORD=your_mysql_password
    DB_DATABASE=quiz_app_db
    ```

5.  **Run the Server:**
    ```sh
    node server.js
    ```
    The backend server should now be running on `http://localhost:5000`.

6.  **Launch the Frontend:**
    Open the `index.html` file in your browser, and the application should be fully functional.
