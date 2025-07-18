# Server (Backend) Application

This directory contains the Node.js/Express.js backend application for the Financial Dashboard.

## Project Structure

```
server/
├── automation/         # Scheduled tasks (e.g., remove unverified accounts)
├── config/             # Configuration files (e.g., multerConfig)
├── controllers/        # Logic for handling API requests (e.g., userController, marketController)
├── database/           # Database connection setup
├── middlewares/        # Express middleware (e.g., error handling, authentication)
├── models/             # Mongoose schemas (e.g., userModel, stockModel)
├── routes/             # API routes (e.g., userRouter, marketRoutes)
├── utils/              # Utility functions (e.g., sendEmail, sendToken)
├── app.js              # Express application setup
├── server.js           # Server entry point
└── package.json        # Backend dependencies
```

## Setup

To set up the backend server, follow these steps:

1.  **Navigate to the server directory:**

    ```bash
    cd server
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create a `.env` file:**

    Create a `.env` file in the `server/` directory and add your environment variables (e.g., MongoDB URI, JWT Secret, Email credentials, Twilio credentials, Cloudinary credentials).

    Example `.env` content:
    ```
    PORT=4000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    SMTP_MAIL=your_email@example.com
    SMTP_PASSWORD=your_email_password
    TWILIO_ACCOUNT_SID=your_twilio_account_sid
    TWILIO_AUTH_TOKEN=your_twilio_auth_token
    TWILIO_PHONE_NUMBER=your_twilio_phone_number
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```

4.  **Start the server:**

    ```bash
    npm run start
    # or for development with nodemon
    npm run dev
    ```

## Dependencies

This project uses the following key dependencies:

| Package            | Version  | Reason                                      |
| :----------------- | :------- | :------------------------------------------ |
| `bcrypt`           | ^5.1.1   | For hashing passwords securely              |
| `cloudinary`       | ^2.7.0   | Cloud-based image and video management      |
| `cookie-parser`    | ^1.4.7   | Middleware to parse cookies                 |
| `cors`             | ^2.8.5   | For enabling Cross-Origin Resource Sharing  |
| `datauri`          | ^4.1.0   | Utility for converting file paths to data URIs |
| `dotenv`           | ^16.4.7  | To load environment variables from a `.env` file |
| `express`          | ^4.21.2  | Web framework for Node.js                   |
| `jsonwebtoken`     | ^9.0.2   | For implementing JSON Web Tokens            |
| `mongoose`         | ^8.9.1   | MongoDB object modeling for Node.js         |
| `multer`           | ^2.0.1   | Middleware for handling `multipart/form-data` |
| `node-cron`        | ^3.0.3   | For scheduling tasks                        |
| `nodemailer`       | ^6.9.16  | For sending emails                          |
| `twilio`           | ^5.4.0   | For sending SMS messages                    |
| `yahoo-finance2`   | ^2.13.3  | For fetching financial data                 |
