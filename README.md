# Financial Dashboard

This project is a comprehensive full-stack web application built with the MERN (MongoDB, Express.js, React, Node.js) stack, designed to provide users with a robust financial dashboard experience. It features secure user authentication with OTP verification, a dynamic Indian Stock Market Dashboard, and an interactive IPO Calendar. The application emphasizes a responsive and intuitive user interface, with functionalities for managing account details, notification preferences, and profile images.

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
- **Real-time Ticker Bar**: Displays live updates of key stock prices and their changes.

### IPO Calendar
- **Comprehensive Listings**: View upcoming and past Initial Public Offerings (IPOs).
- **Filtering**: Filter IPOs by Mainboard and SME categories.
- **Search Functionality**: Easily search for IPOs by company name.
- **Recommendation System**: Provides recommendations based on premium and other factors.

### User Settings
- **Account Details Management**: Update personal information such as name and email.
- **Profile Image Upload**: Upload and manage user profile pictures.
- **Notification Preferences**: Customize notification settings.
- **Password Management**: Securely change your account password.

### General Features
- **Responsive Design**: The application is designed to be responsive across different screen sizes.

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
│   │   ├── components/     # Reusable React components (e.g., Login, Register, TickerBar)
│   │   ├── layout/
│   │   ├── pages/          # Page-level React components (e.g., Home, Auth, StockDashboard)
│   │   ├── styles/         # CSS files
│   │   ├── App.css
│   │   ├── App.jsx         # Main React application component and routing
│   │   └── main.jsx        # Entry point for the React application
│   └── package.json        # Frontend dependencies
├── scraper/                # Python-based web scraper for IPO data
│   ├── .env                # Environment variables for the scraper
│   ├── ipo_data_scraper.py # Main scraper script
│   └── requirements.txt    # Python dependencies
├── server/                 # Backend Node.js/Express application
│   ├── automation/         # Scheduled tasks (e.g., remove unverified accounts)
│   ├── config/             # Configuration files (e.g., multerConfig)
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
5.  **Explore Features**: After logging in, you can explore various features:
    -   **Stock Dashboard**: Navigate to `/stock-dashboard` to view NIFTY 50, SENSEX, Top Gainers, and Top Losers.
    -   **IPO Calendar**: Visit `/ipo-calendar` to see upcoming and past IPOs, with filtering and search options.
    -   **Settings**: Go to `/settings` to manage your account details, upload a profile image, update notification preferences, and change your password.