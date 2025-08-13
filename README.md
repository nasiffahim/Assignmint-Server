# ⚙️ Assignmint - Online Group Study Portal (Backend)

Assignmint is a web-based assignment management platform where users can log in, create assignments, attempt assignments created by others, and get marks after review.  
This repository contains the **backend** API, built with **Node.js**, **Express**, and **MongoDB**, following RESTful principles.

---

## 📖 About the Project
The backend provides secure and structured data handling for the Assignmint platform.  
It handles:
- **Authentication** (Register/Login)
- **Assignment CRUD operations**
- **Submissions** (Answers to assignments)
- **Marking and reviewing**
- **User-specific assignment tracking**

The API ensures secure communication using **JWT authentication** and **role-based access control** for grading.

---

## 🛠 Tech Stack
- **Node.js** – Server runtime environment.
- **Express.js** – Web application framework.
- **MongoDB** – NoSQL database for storing data.
- **Mongoose** – Object Data Modeling (ODM) for MongoDB.
- **JWT** – Authentication and authorization.
- **bcrypt.js** – Password hashing for security.
- **dotenv** – Environment variable management.

---

## 🔄 Assignment Lifecycle
1. **Create Assignment** – A logged-in user posts a new assignment.
2. **View Assignments** – Anyone can see all available assignments.
3. **Attempt Assignment** – A user submits answers for a chosen assignment.
4. **Pending Review** – The submission waits for a reviewer to mark it.
5. **Grade Assignment** – Reviewer assigns marks and updates the submission.
6. **View Marks** – The attempting user can see their score in the "Attempted Assignments" section.

---
