# Client (Frontend) Application

This directory contains the React frontend application for the Financial Dashboard, built with Vite.

## Project Structure

```
client/
├── public/                 # Static assets (e.g., vite.svg)
│   └── vite.svg            # Vite logo
├── src/                    # Source code for the React application
│   ├── assets/             # Static assets like images and icons
│   │   ├── favicon.png
│   │   ├── fb.png
│   │   ├── FourZeroFour.png
│   │   ├── git.png
│   │   ├── img.png
│   │   ├── img1.png
│   │   ├── linkedin.png
│   │   ├── react.svg
│   │   └── yt.png
│   ├── components/         # Reusable React components
│   │   ├── ActionBar.jsx   # Component for mobile action bar
│   │   ├── Hero.jsx        # Hero section component
│   │   ├── Navbar.jsx      # Navigation bar component
│   │   ├── Notification.jsx# Notification display component
│   │   ├── PageTitle.jsx   # Component to dynamically set page titles
│   │   ├── Security.jsx    # Security settings component
│   │   ├── Sidebar.css     # Styles for the Sidebar component
│   │   ├── Sidebar.jsx     # Sidebar navigation component
│   │   ├── TickerBar.jsx   # Real-time stock ticker bar component
│   │   └── TickerBar.css   # Styles for the TickerBar component
│   ├── layout/             # Layout components for consistent page structure
│   │   ├── Footer.jsx      # Footer component
│   │   ├── Layout.jsx      # Main layout component that wraps pages
│   │   ├── PageLayout.css  # Styles for PageLayout
│   │   └── PageLayout.jsx  # Component for consistent page layout
│   ├── lib/                # Utility functions and libraries
│   │   └── utils.js        # General utility functions
│   ├── pages/              # Page-level React components (views)
│   │   ├── Analysis.jsx    # Analysis page
│   │   ├── Auth.jsx        # Authentication page (Login/Register)
│   │   ├── ForgotPassword.jsx # Forgot password page
│   │   ├── Global.jsx      # Global market data page
│   │   ├── Home.jsx        # Home page
│   │   ├── IpoCalendar.jsx # IPO Calendar page
│   │   ├── Markets.jsx     # Markets overview page
│   │   ├── NotFound.jsx    # 404 Not Found page
│   │   ├── OtpVerification.jsx # OTP verification page
│   │   ├── Performance.jsx # Performance tracking page
│   │   ├── Portfolio.jsx   # User portfolio page
│   │   ├── ResetPassword.jsx # Reset password page
│   │   ├── Settings.jsx    # User settings page
│   │   ├── StockDashboard.jsx # Stock dashboard page
│   │   └── Stocks.jsx      # Stocks listing page
│   ├── styles/             # Global and component-specific CSS files
│   │   ├── ActionBar.css
│   │   ├── Auth.css
│   │   ├── Footer.css
│   │   ├── ForgotPassword.css
│   │   ├── Hero.css
│   │   ├── Home.css
│   │   ├── Instructor.css
│   │   ├── IpoCalendar.css
│   │   ├── Navbar.css
│   │   ├── NotFound.css
│   │   ├── OtpVerification.css
│   │   ├── ResetPassword.css
│   │   ├── Settings.css
│   │   ├── Sidebar.css
│   │   ├── StockDashboard.css
│   │   └── Technologies.css
│   ├── App.css             # Main application-wide CSS
│   ├── App.jsx             # Main React application component and routing setup
│   └── main.jsx            # Entry point for the React application (ReactDOM.render)
├── eslint.config.js        # ESLint configuration
├── index.html              # Main HTML file
├── package.json            # Frontend dependencies and scripts
├── package-lock.json       # Locked versions of dependencies
├── README.md               # This file
└── vite.config.js          # Vite build configuration
```

## Available Scripts

In the project directory, you can run:

### `npm install`

Installs all necessary frontend dependencies.

### `npm run dev`

Runs the app in development mode.\
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm run lint`

Runs ESLint to check for code quality and style issues.

```