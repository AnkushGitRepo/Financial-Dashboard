# News Sentiment Analyzer

This directory contains a Python-based news sentiment analyzer designed to fetch financial news articles and determine their sentiment.

## Project Structure

```
sentimentAnalyser/
├── news_sentiment_analyzer.py  # Main script for fetching news and analyzing sentiment
├── requirements.txt            # Python dependencies for the analyzer
└── README.md                   # This file
```

## Setup

To set up and run the news sentiment analyzer, follow these steps:

1.  **Navigate to the `sentimentAnalyser` directory:**

    ```bash
    cd sentiment_analyser
    ```

2.  **Create a virtual environment (recommended):**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Obtain a NewsAPI Key:**

    This analyzer uses [NewsAPI](https://newsapi.org/) to fetch news articles. You will need to obtain a free API key from their website.

5.  **Set the NewsAPI Key as an Environment Variable:**

    Set the `NEWS_API_KEY` environment variable with your obtained API key. This script will automatically pick it up.

    On Linux/macOS:
    ```bash
    export NEWS_API_KEY="YOUR_NEWS_API_KEY"
    ```

    On Windows (Command Prompt):
    ```cmd
    set NEWS_API_KEY=YOUR_NEWS_API_KEY
    ```

    On Windows (PowerShell):
    ```powershell
    $env:NEWS_API_KEY="YOUR_NEWS_API_KEY"
    ```

    *Replace `YOUR_NEWS_API_KEY` with your actual NewsAPI key.*

## Dependencies

This project uses the following Python dependencies:

| Package    | Version | Reason                                      |
| :--------- | :------ | :------------------------------------------ |
| Package         | Version | Reason                                      |
| :-------------- | :------ | :------------------------------------------ |
| `requests`      |         | Used for making HTTP requests to the NewsAPI. |
| `python-dotenv` |         | For loading environment variables from a `.env` file. |

*Note: The exact versions will be installed based on the `requirements.txt` file.*

## Usage

To run the sentiment analysis for a specific stock ticker or company, execute the `news_sentiment_analyzer.py` script. You can modify the `if __name__ == "__main__":` block in the script for example usage.

Example (after setting `NEWS_API_KEY`):

```bash
python news_sentiment_analyzer.py
```

This will fetch news for "TCS" (Tata Consultancy Services) and print a sentiment summary, saving the full analysis to `tcs_sentiment_analysis.json`.