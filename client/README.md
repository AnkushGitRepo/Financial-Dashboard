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
│   │   ├── MarketIndices.jsx # Displays key market indices with charts
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
│   │   ├── IndexDetailPage.jsx # Detailed page for individual market indices
│   │   ├── IpoCalendar.jsx # IPO Calendar page
│   │   ├── Markets.jsx     # Markets overview page
│   │   ├── NotFound.jsx    # 404 Not Found page
│   │   ├── OtpVerification.jsx # OTP verification page
│   │   ├── Performance.jsx # Performance tracking page
│   │   ├── Portfolio.jsx   # User portfolio page
│   │   ├── ResetPassword.jsx # Reset password page
│   │   ├── Settings.jsx    # User settings page
│   │   ├── StockDashboard.jsx # Stock dashboard page
│   │   ├── Stocks.jsx      # Stocks listing page with real-time data
│   ├── styles/             # Global and component-specific CSS files
│   │   ├── ActionBar.css
│   │   ├── Auth.css
│   │   ├── Footer.css
│   │   ├── ForgotPassword.css
│   │   ├── Hero.css
│   │   ├── Home.css
│   │   ├── IndexDetailPage.css # Styles for the IndexDetailPage component
│   │   ├── Instructor.css
│   │   ├── IpoCalendar.css
│   │   ├── MarketIndices.css # Styles for the MarketIndices component
│   │   ├── Navbar.css
│   │   ├── NotFound.css
│   │   ├── OtpVerification.css
│   │   ├── ResetPassword.css
│   │   ├── Settings.css
│   │   ├── Sidebar.css
│   │   ├── MarketSection.css
│   │   ├── Markets.css
│   │   ├── StockDashboard.css
│   │   ├── StockDetailPage.css
│   │   ├── Stocks.css
│   │   ├── Technologies.css
│   │   └── TickerBar.css
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

## Dependencies

This project uses the following key dependencies:

| Package            | Version  | Reason                                      |
| :----------------- | :------- | :------------------------------------------ |
| `axios`            | ^1.7.9   | Promise-based HTTP client for API requests  |
| `chart.js`         | ^4.5.0   | Flexible JavaScript charting library        |
| `clsx`             | ^2.1.1   | Utility for conditionally joining class names |
| `framer-motion`    | ^12.23.6 | Library for animations                      |
| `lucide-react`     | ^0.525.0 | Collection of beautiful & customizable React icons |
| `react`            | ^18.3.1  | Core library for building user interfaces   |
| `react-chartjs-2`  | ^5.3.0   | React wrapper for Chart.js                  |
| `react-dom`        | ^18.3.1  | Provides DOM-specific methods for React     |
| `react-hook-form`  | ^7.54.2  | Library for efficient form validation       |
| `react-icons`      | ^5.5.0   | Popular icon library for React applications |
| `react-router-dom` | ^7.1.0   | Declarative routing for React applications  |
| `react-toastify`   | ^11.0.2  | Library for toast notifications             |
| `recharts`         | ^3.0.2   | Composable charting library built with React |
| `tailwind-merge`   | ^3.3.1   | Utility for merging Tailwind CSS classes    |

## Development Dependencies

| Package                      | Version   | Reason                                      |
| :--------------------------- | :-------- | :------------------------------------------ |
| `@eslint/js`                 | ^9.17.0   | ESLint core functionality                   |
| `@types/react`               | ^18.3.17  | TypeScript type definitions for React       |
| `@types/react-dom`           | ^18.3.5   | TypeScript type definitions for React DOM   |
| `@vitejs/plugin-react`       | ^4.3.4    | Vite plugin for React support               |
| `eslint`                     | ^9.17.0   | Pluggable JavaScript linter                 |
| `eslint-plugin-react`        | ^7.37.2   | ESLint plugin for React specific linting rules |
| `eslint-plugin-react-hooks`  | ^5.0.0    | ESLint plugin for React Hooks specific linting rules |
| `eslint-plugin-react-refresh`| ^0.4.16   | ESLint plugin for React Fast Refresh        |
| `globals`                    | ^15.13.0  | Global variables for ESLint configuration   |
| `vite`                       | ^6.0.3    | Next generation frontend tooling            |

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