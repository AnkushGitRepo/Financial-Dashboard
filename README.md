# Financial Dashboard

This project is a full-stack web application built with the MERN (MongoDB, Express.js, React, Node.js) stack. It provides a robust user authentication system with email and phone (Twilio) based OTP verification, and a newly integrated Indian Stock Market Dashboard.

## Features

### User Authentication
- **User Registration**: Allows new users to sign up with name, email, phone, and password.
- **User Login**: Secure login for registered users.
- **OTP Verification**: Supports both email and phone (via Twilio) for one-time password verification during registration.
- **Forgot Password**: Functionality to reset password via email.
- **Reset Password**: Secure password reset using a token sent to the user's email.
- **Session Management**: Uses cookies for maintaining user sessions.

### Indian Stock Market Dashboard
- **NIFTY 50 Overview**: Displays current NIFTY 50 value and a trend line chart.
- **SENSEX Overview**: Displays current SENSEX value and a trend line chart.
- **Top Gainers**: Lists top performing stocks.
- **Top Losers**: Lists worst performing stocks.
- **Responsive Design**: The dashboard is designed to be responsive across different screen sizes.

## Technologies Used

### Frontend (Client)
- **React**: A JavaScript library for building user interfaces.
- **React Router DOM**: For declarative routing in React applications.
- **React Hook Form**: For efficient and flexible form validation.
- **Axios**: Promise-based HTTP client for making API requests.
- **React Toastify**: For displaying toast notifications.
- **Recharts**: A composable charting library built on React components.
- **CSS**: For styling and layout.

### Backend (Server)
- **Node.js**: JavaScript runtime environment.
- **Express.js**: A fast, unopinionated, minimalist web framework for Node.js.
- **MongoDB**: A NoSQL database for storing application data.
- **Mongoose**: An ODM (Object Data Modeling) library for MongoDB and Node.js.
- **bcrypt**: For hashing passwords securely.
- **jsonwebtoken**: For implementing JSON Web Tokens for authentication.
- **cookie-parser**: Middleware to parse cookies attached to the client request.
- **cors**: Middleware for enabling Cross-Origin Resource Sharing.
- **dotenv**: To load environment variables from a `.env` file.
- **nodemailer**: For sending emails (e.g., OTP, password reset).
- **twilio**: For sending SMS messages (e.g., OTP via phone call).
- **node-cron**: For scheduling tasks (e.g., removing unverified accounts).

## Project Structure

```
financial-dashboard/
├── client/                 # Frontend React application
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/     # Reusable React components (e.g., Login, Register)
│   │   ├── layout/
│   │   ├── pages/          # Page-level React components (e.g., Home, Auth, StockDashboard)
│   │   ├── styles/         # CSS files
│   │   ├── App.css
│   │   ├── App.jsx         # Main React application component and routing
│   │   └── main.jsx        # Entry point for the React application
│   └── package.json        # Frontend dependencies
├── server/                 # Backend Node.js/Express application
│   ├── automation/         # Scheduled tasks (e.g., remove unverified accounts)
│   ├── config.env          # Environment variables for the server
│   ├── controllers/        # Logic for handling API requests (e.g., userController)
│   ├── database/           # Database connection setup
│   ├── middlewares/        # Express middleware (e.g., error handling, authentication)
│   ├── models/             # Mongoose schemas (e.g., userModel)
│   ├── routes/             # API routes (e.g., userRouter)
│   ├── utils/              # Utility functions (e.g., sendEmail, sendToken)
│   ├── app.js              # Express application setup
│   ├── server.js           # Server entry point
│   └── package.json        # Backend dependencies
└── README.md               # Project documentation
```

## Setup and Installation

To get this project up and running on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AnkushGitRepo/Financial-Dashboard.git
    ```

2.  **Navigate into the project directory:**
    ```bash
    cd financial-dashboard
    ```

3.  **Install Backend Dependencies:**
    Navigate to the `server` directory and install the Node.js dependencies:
    ```bash
    cd server
    npm install
    cd .. # Go back to the financial-dashboard root
    ```

4.  **Install Frontend Dependencies:**
    Navigate to the `client` directory and install the React dependencies:
    ```bash
    cd client
    npm install
    cd .. # Go back to the financial-dashboard root
    ```

5.  **Configure Environment Variables:**
    Create a `.env` file inside the `server` directory (`financial-dashboard/server/.env`) and add the following environment variables. Replace the placeholder values with your actual credentials:

    ```env
    PORT=4000
    FRONTEND_URL=http://localhost:5173
    MONGO_URI='YOUR_MONGODB_CONNECTION_STRING' # e.g., mongodb+srv://user:password@cluster.mongodb.net/
    JWT_EXPIRE=7d
    JWT_SECRET_KEY=YOUR_JWT_SECRET_KEY
    COOKIE_EXPIRE=7
    SMTP_SERVICE=gmail
    SMTP_MAIL='YOUR_EMAIL@gmail.com'
    SMTP_PASSWORD='YOUR_EMAIL_APP_PASSWORD' # For Gmail, use an App Password
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
    TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER # Your Twilio phone number (e.g., +1234567890)
    ```
    **Note on `SMTP_PASSWORD`**: If you are using Gmail, you will need to generate an "App password" for your account, as direct password usage is often blocked for security reasons. Refer to Google's documentation on how to generate an App password.

6.  **Start the Backend Server:**
    From the `financial-dashboard` root directory, start the server:
    ```bash
    cd server
    npm start
    # Or for development with nodemon:
    # npm run dev
    cd ..
    ```
    The server will typically run on `http://localhost:4000`.

7.  **Start the Frontend Application:**
    From the `financial-dashboard` root directory, start the client:
    ```bash
    cd client
    npm start
    cd ..
    ```
    The client application will typically open in your browser at `http://localhost:5173`.

## Usage

1.  **Access the Application**: Open your web browser and navigate to `http://localhost:5173`.
2.  **Register**: Click on the "Register" tab. Fill in your details, including a valid Indian phone number (starting with 6, 7, 8, or 9 and 10 digits long). Select your preferred verification method (Email or Phone).
3.  **Verify OTP**: After registration, you will be redirected to an OTP verification page. Enter the OTP received via email or phone.
4.  **Login**: Once verified, you can log in using your registered email and password.
5.  **Access Dashboard**: After logging in, you can navigate to the Indian Stock Market Dashboard by going to `http://localhost:5173/dashboard`.

## API Endpoints

The backend provides the following key API endpoints:

-   `POST /api/v1/user/register`: Register a new user.
-   `POST /api/v1/user/otp-verification`: Verify OTP for registration.
-   `POST /api/v1/user/login`: Log in a user.
-   `GET /api/v1/user/logout`: Log out a user.
-   `GET /api/v1/user/me`: Get details of the authenticated user.
-   `POST /api/v1/user/password/forgot`: Request a password reset.
-   `PUT /api/v1/user/password/reset/:token`: Reset password using a token.

---
