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
├── setup.md                # Setup and installation instructions
├── gemini.md               # Notes for Gemini CLI agent
└── README.md               # Project documentation
```

## Getting Started

To set up and run this project, please refer to the [Setup and Installation Guide](SETUP.md).

## Development Notes

For specific instructions and conventions related to developing with the Gemini CLI agent, please refer to [GEMINI.md](GEMINI.md).

## Usage

1.  **Access the Application**: Open your web browser and navigate to `http://localhost:5173`.
2.  **Register**: Click on the "Register" tab. Fill in your details, including a valid Indian phone number (starting with 6, 7, 8, or 9 and 10 digits long). Select your preferred verification method (Email or Phone).
3.  **Verify OTP**: After registration, you will be redirected to an OTP verification page. Enter the OTP received via email or phone.
4.  **Login**: Once verified, you can log in using your registered email and password.
5.  **Access Dashboard**: After logging in, you can navigate to the Indian Stock Market Dashboard by going to `http://localhost:5173/dashboard`.