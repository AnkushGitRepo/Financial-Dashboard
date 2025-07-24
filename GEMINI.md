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
├── api/                    # Django REST Framework application for financial data and news sentiment
│   ├── core/               # Django project core settings
│   ├── financials/         # Django app for financial data scraping
│   ├── sentiment/          # Django app for news sentiment analysis
│   ├── manage.py           # Django project management utility
│   └── requirements.txt    # Python dependencies for Django
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
33. **Flask to Django Migration & API Consolidation:**
    *   **Feature:** Migrated existing Flask applications (`financial_data_scraper.py` and `news_sentiment_analyzer.py`) into a new Django REST Framework project (`api/`) to consolidate backend APIs.
    *   **Resolution:**
        *   Created a new `api/` directory with a Django project (`core/`) and two Django apps (`financials/` for financial data and `sentiment/` for news sentiment).
        *   Transferred relevant logic from old Flask apps to their respective Django views and utility files.
        *   Configured Django `settings.py` and `urls.py` to include the new apps and their API endpoints.
        *   Updated `client/src/pages/IndexDetailPage.jsx` and `client/src/pages/StockDetailPage.jsx` to consume data from the new Django API endpoints (`/api/financials/` and `/api/sentiment/`).
        *   Corrected `client/vite.config.js` to properly proxy requests: `/api/financials` and `/api/sentiment` to `http://localhost:8000` (Django), and a general `/api` to `http://localhost:4000` (Express).
        *   Fixed a `TypeError` in `api/sentiment/views.py` by explicitly converting `days_back` and `max_articles` to integers.
        *   Created `api/README.md` for the new Django project.
        *   Updated the main `README.md` to reflect the new project structure and API changes.
        *   Removed the deprecated `sentiment_analyser/` directory and `scraper/financial_data_scraper.py` file.
34. **Django API Home Page & Interactive Testing:**
    *   **Feature:** Implemented a professional and user-friendly home page for the Django API backend.
    *   **Resolution:**
        *   Created a new `index.html` template with a modern design, improved typography, and a clear layout.
        *   Added interactive forms to the home page, allowing users to test the `/api/financials/` and `/api/sentiment/` endpoints directly from the browser.
        *   Implemented asynchronous JavaScript to handle form submissions, fetch data from the API, and display the JSON response without reloading the page.
        *   Fixed a `django.db.utils.OperationalError: no such table: django_session` by running `python manage.py migrate`.
        *   Updated `api/README.md` and the main `README.md` to reflect the new API home page and its features.
