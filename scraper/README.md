# Python Scrapers for Financial Data

This directory contains Python scripts for scraping financial data from various web sources.

# Python Scrapers for Financial Data

This directory contains Python scripts for scraping financial data from various web sources.

## Scrapers

1.  **IPO Data Scraper (`ipo_data_scraper.py`)**:
    *   **Source**: [ipopremium.in](https://ipopremium.in/)
    *   **Function**: Scrapes data for upcoming and past Initial Public Offerings (IPOs).
    *   **Output**: Stores the scraped data into a MongoDB database.

2.  **Financial Data Scraper (`financial_data_scraper.py`)**:
    *   **Source**: [screener.in](https://www.screener.in/)
    *   **Function**: Scrapes detailed financial data for a specific company, including peer comparison, quarterly results, profit & loss statements, balance sheets, cash flow, and key ratios.
    *   **Output**: Runs as a Flask API server, providing financial data via HTTP requests.

## Prerequisites

*   Python 3.x
*   Google Chrome browser installed

## Setup

1.  **Navigate to the `scraper` directory:**
    ```bash
    cd scraper
    ```

2.  **Create and activate a virtual environment (recommended):**
    This helps to isolate project dependencies.
    ```bash
    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install the required dependencies:**
    The `requirements.txt` file includes `webdriver-manager`, which will automatically download and manage the correct ChromeDriver for your version of Google Chrome, avoiding manual setup issues. It also includes `flask-cors` for handling cross-origin requests.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up Environment Variables (for IPO Scraper):**
    Create a `.env` file in this `scraper` directory. This file is used by the `ipo_data_scraper.py` to connect to your MongoDB database.
    ```
    MONGO_URI="your_mongodb_connection_string_here"
    ```

## Usage

Ensure you are in the `scraper` directory and your virtual environment is activated.

### Running the IPO Data Scraper

This script will scrape IPO data and save it to your MongoDB database.

```bash
python ipo_data_scraper.py
```

### Running the Financial Data Scraper (API Server)

This script runs a Flask API server that provides financial data. It needs to be running for the frontend to fetch financial data.

```bash
python financial_data_scraper.py
```

The API will be accessible at `http://127.0.0.1:5001/api/financial_data/<TICKER>`, where `<TICKER>` is the stock symbol (e.g., `TCS`).

