# Django API Backend

This directory contains the Django REST Framework application that serves as the consolidated backend for financial data and news sentiment analysis.

## Features
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

3.  **Apply database migrations** (optional, but good practice for Django projects):
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