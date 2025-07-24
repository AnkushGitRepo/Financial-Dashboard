# Django API Backend

This directory contains the Django REST Framework application that serves as the consolidated backend for financial data and news sentiment analysis.

## Features
- **Interactive API Home Page**: A user-friendly interface to explore and test API endpoints directly from the browser.
- **Financial Data API**: Provides detailed financial data for companies, scraped from `screener.in`.
- **News Sentiment API**: Analyzes and provides sentiment for financial news articles using NewsAPI.

## Setup

1.  **Navigate to the `api` directory**:
    ```bash
    cd api
    ```

2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Apply database migrations**:
    ```bash
    python manage.py migrate
    ```

4.  **Set up NewsAPI Key**:
    Create a `.env` file in this directory and add your NewsAPI key:
    ```
    NEWS_API_KEY="YOUR_NEWS_API_KEY"
    ```

## Running the Server

To start the Django development server:

```bash
python manage.py runserver
```

The API will be accessible at `http://127.0.0.1:8000/`.

### API Home Page

Navigate to the root URL (`http://127.0.0.1:8000/`) in your browser to access the API home page. This page provides:
- A brief introduction to the API.
- Detailed information about each endpoint.
- Interactive forms to test the endpoints in real-time and see the JSON responses.
- A direct link to the frontend application.

### Endpoints

-   **Financial Data**: `GET /api/financials/financial_data/<TICKER>/`
-   **News Sentiment**: `GET /api/sentiment/analyze-sentiment/?ticker_or_company=<TICKER>`
