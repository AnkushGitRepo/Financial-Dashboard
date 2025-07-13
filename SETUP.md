# Project Setup Guide

This guide will walk you through the steps to set up and run the financial dashboard project on your local machine.

## 1. Clone the Repository

First, clone the project repository from GitHub:

```bash
git clone https://github.com/AnkushGitRepo/Financial-Dashboard.git
cd financial-dashboard
```
Replace `https://github.com/AnkushGitRepo/Financial-Dashboard.git` with the actual URL of your GitHub repository.

## 2. Backend Setup (Node.js)

The backend is a Node.js application.

### 2.1 Navigate to the Backend Directory

```bash
cd server
```

### 2.2 Install Dependencies

Install the necessary Node.js packages for the backend:

```bash
npm install
```

### 2.3 Environment Variables

Create a `.env` file in the `server` directory and add the following environment variables. Replace the placeholder values with your actual credentials.

```
PORT=4000
MONGO_URI=<Your_MongoDB_Connection_String>
JWT_SECRET_KEY=<Your_JWT_Secret_Key>
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
CLOUDINARY_CLOUD_NAME=<Your_Cloudinary_Cloud_Name>
CLOUDINARY_API_KEY=<Your_Cloudinary_API_Key>
CLOUDINARY_API_SECRET=<Your_Cloudinary_API_Secret>
TWILIO_ACCOUNT_SID=<Your_Twilio_Account_SID>
TWILIO_AUTH_TOKEN=<Your_Twilio_Auth_Token>
TWILIO_PHONE_NUMBER=<Your_Twilio_Phone_Number>
SMPT_SERVICE=<Your_SMTP_Service> # e.g., gmail
SMPT_MAIL=<Your_SMTP_Email>
SMPT_PASSWORD=<Your_SMTP_Password>
FRONTEND_URL=http://localhost:5173

### 2.4 File Uploads and Image Storage

This project uses `multer` for handling `multipart/form-data` (file uploads) and `Cloudinary` for storing images.

*   **Multer:** The configuration for `multer` is located in `server/config/multerConfig.js`. No manual installation steps are required beyond `npm install` in the backend directory.
*   **Cloudinary:** Ensure you have set up your Cloudinary account and configured the `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` environment variables in your `.env` file as mentioned above.

### 2.5 Start the Backend Server

```bash
npm run start
```
The backend server should now be running on `http://localhost:4000`.

## 3. Frontend Setup (React with Vite)

The frontend is a React application built with Vite.

### 3.1 Navigate to the Frontend Directory

Open a new terminal window and navigate to the frontend directory:

```bash
cd ../client
```

### 3.2 Install Dependencies

Install the necessary Node.js packages for the frontend:

```bash
npm install
```

### 3.3 Start the Frontend Development Server

```bash
npm run dev
```
The frontend development server should now be running, typically on `http://localhost:5173`.

## 4. Access the Application

Open your web browser and navigate to `http://localhost:5173` to access the financial dashboard application.
