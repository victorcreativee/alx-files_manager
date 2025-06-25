# ALX Files Manager

A simple file management API built with Node.js, Express, Redis, MongoDB, and Bull. It provides user authentication, file storage (including image thumbnails), and background job processing.

---

## 📌 Description

This project is part of the **ALX Back-End Specialization**. It implements a file management service that includes:

- User authentication (via token stored in Redis)
- File upload (text, folder, image)
- File metadata storage in MongoDB
- Background thumbnail generation using Bull
- File access control (public/private)
- File listing and filtering

---

## 🚀 Technologies Used

- **Node.js** (Backend runtime)
- **Express** (HTTP server)
- **Redis** (Token/session management)
- **MongoDB** (File metadata storage)
- **Bull** (Background jobs for image processing)
- **Babel** (Transpilation of ES6+)
- **ESLint** (Code linting with Airbnb style)

---

## 🛠️ Installation

```bash
git clone https://github.com/victorcreativee/alx-files_manager.git
cd alx-files_manager
npm install
