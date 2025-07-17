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

## Recent Conversation Summary (Last 5-6 key tasks):

1.  **Sidebar Adjustments:**
    *   **Feature:** Added a top margin to the sidebar and fixed an issue where the logout button would go off-screen when the sidebar is collapsed.
    *   **Resolution:** Adjusted the `top` and `height` properties in `client/src/styles/Sidebar.css`. Implemented a `useEffect` hook in `client/src/components/Sidebar.jsx` to dynamically calculate and apply a `marginBottom` to the authentication navigation section. Removed an unused `client/src/components/Sidebar.css` file.

2.  **Conditional TickerBar Display:**
    *   **Feature:** Removed the `TickerBar` from all authentication-related pages.
    *   **Resolution:** Created a new `TickerBarLayout.jsx` component to conditionally render the `TickerBar` based on the current route. Updated `App.jsx` to use this new layout component, ensuring the ticker does not appear on pages like `/auth`, `/password/forgot`, etc.

3.  **"Remember Me" Login Functionality:**
    *   **Feature:** Implemented logic for the "Remember me" checkbox on the login page. If unchecked, the user's session expires when the browser is closed.
    *   **Resolution:** Modified the `sendToken` utility in `server/utils/sendToken.js` to accept a `rememberMe` flag, setting a session cookie if the flag is false. Updated `userController.js` and `Auth.jsx` to pass the `rememberMe` state from the client to the server.

4.  **Comprehensive Footer Redesign:**
    *   **Feature:** Overhauled the footer to include a "MarketMitra" title, important links, a "Meet the Team" section with social media links for five contributors, and a copyright notice.
    *   **Resolution:** Updated `client/src/layout/Footer.jsx` with the new structure and content. Installed and used the `react-icons` library for social media icons.

5.  **Footer Styling and Layout Refinements:**
    *   **Feature:** Styled the new footer, changed its background color to match the `TickerBar`, and adjusted the layout of the "Meet the Team" section.
    *   **Resolution:** Updated `client/src/styles/Footer.css` to change the background color to `#181e25`. Modified the flexbox layout to position the "Meet the Team" section below the other footer content and display team members in a single horizontal line.

6.  **Dynamic Footer-Sidebar Integration:**
    *   **Feature:** Made the footer responsive to the sidebar's collapsed state, preventing overlap.
    *   **Resolution:** Passed the `isSidebarCollapsed` state from `Layout.jsx` to `Footer.jsx`. Added dynamic CSS classes and styles in `Footer.css` to adjust the footer's width and margin based on whether the sidebar is collapsed or expanded.
