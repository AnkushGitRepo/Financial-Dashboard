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

4.  **Market Indices Card and Chart Sizing:**
    *   **Feature:** Adjusted the size of the market indices cards and their embedded charts to be smaller without affecting the `IndexDetailPage`.
    *   **Resolution:** Modified `client/src/styles/MarketIndices.css` to reduce `grid-template-columns` for the grid and `height` for the chart container within the cards. Also, made the `.chart-container` selector more specific to `.index-card .chart-container` to avoid conflicts with `IndexDetailPage`.

5.  **Market Indices Chart Y-axis and Color Logic:**
    *   **Feature:** Removed the y-axis labels from the charts in `MarketIndices.jsx` and updated the chart line and fill color logic to be based on the index's overall change (positive/negative) instead of its relation to a moving average.
    *   **Resolution:** Modified `client/src/components/MarketIndices.jsx` to set `display: false` for the y-axis in `chartOptions` and updated the `getChartData` function to use `index.change` for determining `borderColor` and `fillColor`.

6.  **Index Detail Page - MAX Range Button Logic:**
    *   **Feature:** Added a "MAX" radio button to the range selection in `IndexDetailPage.jsx` to display the maximum available historical data.
    *   **Resolution:** Updated `client/src/pages/IndexDetailPage.jsx` to include the "MAX" radio button and adjusted the `handleRangeChange` logic to set `selectedRange` to 'max' and `maPeriod` to `null` when selected. Modified `server/controllers/marketController.js` to set `period1Date` to `new Date('1970-01-01')` for the 'max' range and simplified the `getHistoricalIndexData` function to always use `getDateRange`.

7.  **Removed `getTopMovers` function:**
    *   **Feature:** Removed the `getTopMovers` function from `server/controllers/marketController.js` and all its usages.
    *   **Resolution:** Deleted the function from `server/controllers/marketController.js` and removed its import and route definition from `server/routes/marketRoutes.js`.

8.  **Index Detail Page Table Display Issues:**
    *   **Feature:** Addressed issues where important fields were not displayed in the table on `IndexDetailPage.jsx` and "NA" was shown for Change/Change Percent.
    *   **Resolution:**
        *   Ensured `regularMarketPreviousClose` is sent from the backend in `server/controllers/marketController.js`.
        *   Modified `client/src/pages/IndexDetailPage.jsx` to display "N/A" for missing data and conditionally render rows to hide fields with `null` or `undefined` values.
        *   Corrected the calculation of `regularMarketChange` and `regularMarketChangePercent` in `server/controllers/marketController.js` to use `chartPreviousClose` and handle `null` values.

9.  **Removed Zero from Volume in Index Detail Page Table:**
    *   **Feature:** Prevented the display of "0" for Volume in the `IndexDetailPage` table when the value is zero.
    *   **Resolution:** Modified `client/src/pages/IndexDetailPage.jsx` to conditionally render the Volume row only if the value is not zero.

10. **Updated Last Update Time in Index Detail Page:**
    *   **Feature:** Changed "Last Update Time" to reflect the time the page data is loaded.
    *   **Resolution:** Modified `client/src/pages/IndexDetailPage.jsx` to use `new Date().toLocaleString()` for "Last Update Time".

11. **Data Refresh Rate for `IndexDetailPage`:**
    *   **Feature:** Changed data refresh rate for `IndexDetailPage` to 15 seconds.
    *   **Resolution:** Modified `client/src/pages/IndexDetailPage.jsx` to set `setInterval` to 15000ms.

12. **Data Refresh Rate for `MarketIndices.jsx`:**
    *   **Feature:** Changed data refresh rate for `MarketIndices.jsx` to 500ms.
    *   **Resolution:** Modified `client/src/components/MarketIndices.jsx` to set `setInterval` to 500ms.

13. **TickerBar Dynamic Data (Attempted and Reverted):**
    *   **Feature:** Attempted to implement dynamic Nifty 50 stock data for `TickerBar.jsx` using `yahoo-finance2`.
    *   **Resolution:**
        *   Added `getNifty50Tickers` to `server/controllers/marketController.js` and a route in `server/routes/marketRoutes.js`.
        *   Modified `client/src/components/TickerBar.jsx` to fetch data from the new API.
        *   Encountered "Too Many Requests" error from Yahoo Finance.
        *   Implemented caching for Nifty 50 tickers in `server/controllers/marketController.js`.
        *   **Reverted all TickerBar related changes** due to persistent issues and user request to avoid risk. This includes reverting changes in `server/controllers/marketController.js`, `server/routes/marketRoutes.js`, and `client/src/components/TickerBar.jsx`. Also, fixed a `SyntaxError` in `marketController.js` and a `ReferenceError` in `app.js` that arose during the TickerBar implementation and subsequent reverts.
