## Project Overview

This project is a comprehensive full-stack web application built with the MERN (MongoDB, Express.js, React, Node.js) stack, designed to provide users with a robust financial dashboard experience. It features secure user authentication with OTP verification, a dynamic Indian Stock Market Dashboard, and an interactive IPO Calendar. The application emphasizes a responsive and intuitive user interface, with functionalities for managing account details, notification preferences, and profile images.

### Key Features:
- **User Authentication**: Registration, Login, OTP Verification (email/phone), Forgot/Reset Password, Session Management.
- **Indian Stock Market Dashboard**: NIFTY 50, SENSEX, Top Gainers/Losers, Real-time Ticker Bar.
- **IPO Calendar**: Comprehensive listings, Filtering (Mainboard/SME), Search, Recommendation System.
- **User Settings**: Account Details, Profile Image Upload, Notification Preferences, Password Management.
- **General Features**: Responsive Design.

### Technologies Used:
- **Frontend (Client)**: React, React Router DOM, React Hook Form, Axios, React Toastify, Recharts, CSS.
- **Backend (Server)**: Node.js, Express.js, MongoDB, Mongoose, bcrypt, jsonwebtoken, cookie-parser, cors, dotenv, nodemailer, twilio, node-cron.
- **Scraper**: Python (for IPO data).

### Project Structure:
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

## Recent Conversation Summary:

1.  **Range Buttons to Radio Buttons:**
    *   **Feature:** Converted range selection buttons to radio buttons with a new, styled appearance.
    *   **Resolution:** Updated `client/src/pages/IndexDetailPage.jsx` to use radio button inputs and `client/src/styles/IndexDetailPage.css` with new styles for the radio buttons.

2.  **Radio Buttons Alignment:**
    *   **Feature:** Aligned the newly implemented radio buttons to the right side of the chart controls.
    *   **Resolution:** Modified `client/src/styles/IndexDetailPage.css` to adjust the alignment of the radio button container.

3.  **Chart Tooltip Enhancement:**
    *   **Feature:** Improved chart tooltip to display price and date clearly on hover.
    *   **Resolution:** Updated `chartOptions` in `client/src/pages/IndexDetailPage.jsx` with custom tooltip callbacks for better formatting of date and price.
