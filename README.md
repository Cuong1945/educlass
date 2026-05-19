# Project Name: EduClass - Classroom Management System

## 📝 Short Description
EduClass is a modern, comprehensive classroom management system designed to streamline interactions between teachers and students. It provides tools for user administration, classroom organization, student tracking, and features an integrated AI-powered chatbot (Gemini) for assistance, alongside automated email notifications.

## 👥 Member List
- Do Manh Cuong - 2301140015
- Vu Thuy Quynh - 2301140085
- Nguyen Thi Kim Yen - 2301140105

## 🚀 Tech Stack
- **Frontend:** React.js, Vite, Axios, React Router, Recharts (for statistics).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB with Mongoose ODM.
- **AI Integration:** Google Generative AI (Gemini API).
- **Authentication:** JSON Web Tokens (JWT).
- **Communication:** Nodemailer (SMTP for Gmail).

## ✨ Main Features
- **User Authentication:** Secure login/logout system with role-based access.
- **User Management:** Admin capability to manage teachers and students.
- **Classroom Management:** Create, update, and organize classes and student enrollments.
- **AI Chatbot:** Intelligent assistant powered by Gemini for quick queries and support.
- **Email Notifications:** Automated email system for account updates or notifications.
- **Statistics Dashboard:** Visual representation of system data using charts.
- **Search & Filter:** Advanced global search for users and classes.

## 📂 Overall Project Structure
```text
educlass/
├── backend/                # Node.js Express server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API endpoints
│   │   ├── utils/          # Helper functions (email, AI, etc.)
│   │   ├── seed/           # Database seeding scripts
│   │   └── app.js          # Server entry point
│   ├── .env.example        # Environment template
│   └── package.json        # Backend dependencies
├── frontend/               # React client (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Full page views
│   │   ├── css/            # Stylesheets
│   │   └── App.jsx         # Main React entry
│   └── package.json        # Frontend dependencies
└── README.md               # Project documentation
```

## 🛠 Installation Steps and Required Tools

### Prerequisites
- **Node.js:** version 18.x or higher.
- **npm:** version 9.x or higher.
- **MongoDB:** A running instance (Local or MongoDB Atlas).

### Installation
1. **Clone the project:**
   ```bash
   git clone <repository_url>
   cd educlass
   ```

2. **Install Backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

## ⚙️ Environment Variable Setup
The backend requires environment variables to function correctly. 

1. Go to the `backend/` folder.
2. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your credentials:
   - `MONGO_URI`: Your MongoDB connection string.
   - `JWT_SECRET`: A secure string for token encryption.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `EMAIL_USER`: Your Gmail address.
   - `EMAIL_PASS`: Your Gmail App Password.

## 🗄 Database Setup & Seeding
To initialize the database with sample data (Admin, Teachers, Classes):
```bash
cd backend
npm run seed
```

## 🚀 How to Run the Project

### Running Backend
```bash
cd backend
npm run dev
```
Server runs at `http://localhost:5000`.

### Running Frontend
```bash
cd frontend
npm run dev
```
Client runs at `http://localhost:5173`.

## 💻 Running the Full System from a Clean Machine
1. Install **Node.js** and **MongoDB**.
2. Extract the source code.
3. Open two terminals.
4. **Terminal 1 (Backend):**
   - `cd backend`
   - `npm install`
   - Setup `.env` (as described above).
   - `npm run seed` (to create the admin account).
   - `npm run dev`
5. **Terminal 2 (Frontend):**
   - `cd frontend`
   - `npm install`
   - `npm run dev`
6. Access the web app at `http://localhost:5173`.

## 👤 Demo Account
To access the system, use the following credentials (created after running the seed script):
- **Role:** Administrator
- **Username:** `admin`
- **Password:** `Admin@123`

## ⚠️ Known Issues
- Currently optimized for desktop view; mobile responsiveness is in progress.
- Email delivery requires a valid Gmail App Password and may be blocked by some firewalls.
