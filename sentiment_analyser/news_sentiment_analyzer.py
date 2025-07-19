import os
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from dotenv import load_dotenv
from flask import Flask, request, jsonify

load_dotenv()

app = Flask(__name__)

class NewsSentimentAnalyzer:
    """
    A wrapper class for financial news sentiment analysis using NewsAPI.

    Features:
    - Fetch news articles for any ticker or company
    - Analyze sentiment (positive/negative/neutral)
    - Return comprehensive data in JSON format
    - Support for Indian and global companies
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the analyzer with NewsAPI key.

        Args:
            api_key: NewsAPI key. If None, will try to get from environment variable.
        """
        self.api_key = api_key or os.getenv("NEWS_API_KEY")
        self.base_url = "https://newsapi.org/v2/everything"

        if not self.api_key:
            raise ValueError("NewsAPI key is required. Set NEWS_API_KEY environment variable or pass api_key parameter.")

    def _sentiment_score(self, text: str) -> str:
        """
        Analyze sentiment of given text using keyword-based approach.

        Args:
            text: Text to analyze

        Returns:
            Sentiment: 'positive', 'negative', or 'neutral'
        """
        positive_words = [
            'good', 'great', 'excellent', 'positive', 'up', 'gain', 'profit', 'growth',
            'bullish', 'surge', 'rally', 'boom', 'strong', 'beat', 'outperform',
            'upgrade', 'buy', 'success', 'record', 'high', 'rise', 'increase',
            'breakthrough', 'innovation', 'expansion', 'revenue', 'earnings', 'win'
        ]

        negative_words = [
            'bad', 'poor', 'terrible', 'negative', 'down', 'loss', 'decline', 'drop',
            'bearish', 'crash', 'fall', 'weak', 'miss', 'underperform', 'downgrade',
            'sell', 'failure', 'low', 'decrease', 'concern', 'risk', 'warning',
            'lawsuit', 'investigation', 'scandal', 'debt', 'bankruptcy', 'cut'
        ]

        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"

    def _format_date(self, date_string: str) -> str:
        """Format date string from NewsAPI to readable format."""
        try:
            if date_string:
                dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
                return dt.strftime('%Y-%m-%d %H:%M UTC')
            return "Unknown"
        except:
            return date_string or "Unknown"

    def _fetch_news(self, query: str, days_back: int = 7, max_articles: int = 50) -> List[Dict]:
        """
        Fetch news articles from NewsAPI.

        Args:
            query: Search query (ticker or company name)
            days_back: Number of days to look back for news
            max_articles: Maximum number of articles to fetch

        Returns:
            List of article dictionaries
        """
        # Calculate date range
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days_back)

        # NewsAPI parameters
        params = {
            'q': query,
            'apiKey': self.api_key,
            'language': 'en',
            'sortBy': 'publishedAt',
            'from': from_date.strftime('%Y-%m-%d'),
            'to': to_date.strftime('%Y-%m-%d'),
            'pageSize': min(max_articles, 100)  # NewsAPI limit is 100
        }

        try:
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            if data.get('status') != 'ok':
                raise Exception(f"NewsAPI Error: {data.get('message', 'Unknown error')}")

            return data.get('articles', [])

        except requests.exceptions.RequestException as e:
            raise Exception(f"Error fetching news: {str(e)}")

    def analyze_sentiment(self,
                         ticker_or_company: str,
                         company_name: Optional[str] = None,
                         days_back: int = 7,
                         max_articles: int = 10) -> Dict:
        """
        Analyze news sentiment for a ticker or company.

        Args:
            ticker_or_company: Stock ticker symbol or company name
            company_name: Optional company name for better search results
            days_back: Number of days to look back for news (default: 7)
            max_articles: Maximum number of articles to analyze (default: 10)

        Returns:
            Dictionary containing:
            - query_info: Information about the search
            - sentiment_summary: Overall sentiment statistics
            - articles: List of analyzed articles with full data
            - metadata: Additional information about the analysis
        """
        # Create search query
        if company_name and company_name != ticker_or_company:
            search_query = f'{ticker_or_company} OR "{company_name}"'
            display_name = f"{ticker_or_company} ({company_name})"
        else:
            search_query = ticker_or_company
            display_name = ticker_or_company

        # Fetch articles
        raw_articles = self._fetch_news(search_query, days_back, max_articles)

        # Process articles
        processed_articles = []
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}

        for article in raw_articles:
            # Skip articles without title or description
            if not article.get('title') and not article.get('description'):
                continue

            # Analyze sentiment
            text_for_analysis = f"{article.get('title', '')}. {article.get('description', '')}"
            sentiment = self._sentiment_score(text_for_analysis)
            sentiment_counts[sentiment] += 1

            # Process article data
            processed_article = {
                "title": article.get('title', 'No title'),
                "description": article.get('description', 'No description'),
                "url": article.get('url', ''),
                "image_url": article.get('urlToImage', ''),
                "source": {
                    "name": article.get('source', {}).get('name', 'Unknown'),
                    "id": article.get('source', {}).get('id', '')
                },
                "author": article.get('author', 'Unknown'),
                "published_date": self._format_date(article.get('publishedAt', '')),
                "published_date_raw": article.get('publishedAt', ''),
                "sentiment": sentiment,
                "content_preview": article.get('content', '')[:200] + "..." if article.get('content') and len(article.get('content', '')) > 200 else article.get('content', '')
            }

            processed_articles.append(processed_article)

        # Calculate percentages
        total_articles = len(processed_articles)
        sentiment_percentages = {}
        if total_articles > 0:
            for sentiment, count in sentiment_counts.items():
                sentiment_percentages[sentiment] = round((count / total_articles) * 100, 1)
        else:
            sentiment_percentages = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}

        # Prepare result
        result = {
            "query_info": {
                "ticker_or_company": ticker_or_company,
                "company_name": company_name,
                "search_query": search_query,
                "display_name": display_name
            },
            "sentiment_summary": {
                "total_articles": total_articles,
                "sentiment_counts": sentiment_counts,
                "sentiment_percentages": sentiment_percentages,
                "overall_sentiment": max(sentiment_counts, key=sentiment_counts.get) if total_articles > 0 else "neutral"
            },
            "articles": processed_articles,
            "metadata": {
                "analysis_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
                "days_analyzed": days_back,
                "max_articles_requested": max_articles,
                "api_source": "NewsAPI"
            }
        }

        return result

    def get_sentiment_summary(self, ticker_or_company: str, company_name: Optional[str] = None) -> Dict:
        """
        Get just the sentiment summary without full article data.

        Args:
            ticker_or_company: Stock ticker symbol or company name
            company_name: Optional company name for better search results

        Returns:
            Dictionary with query info and sentiment summary only
        """
        full_result = self.analyze_sentiment(ticker_or_company, company_name)
        return {
            "query_info": full_result["query_info"],
            "sentiment_summary": full_result["sentiment_summary"],
            "metadata": full_result["metadata"]
        }

@app.route('/analyze-sentiment', methods=['GET'])
def analyze_sentiment_api():
    ticker_or_company = request.args.get('ticker_or_company')
    company_name = request.args.get('company_name')
    days_back = request.args.get('days_back', type=int, default=3)
    max_articles = request.args.get('max_articles', type=int, default=10)

    if not ticker_or_company:
        return jsonify({"error": "Missing 'ticker_or_company' parameter"}), 400

    try:
        analyzer = NewsSentimentAnalyzer()
        result = analyzer.analyze_sentiment(ticker_or_company, company_name, days_back, max_articles)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
