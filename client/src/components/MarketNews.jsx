import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/MarketSection.css';

const MarketNews = () => {
  const [newsArticles, setNewsArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data } = await axios.get('/api/v1/market/global-news');
        setNewsArticles(data.articles);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch global news.');
        setLoading(false);
        console.error(err);
      }
    };

    fetchNews();
  }, []);

  if (loading) return <div className="market-section-loading">Loading Global News...</div>;
  if (error) return <div className="market-section-error">Error: {error}</div>;

  const mainArticle = newsArticles[0];
  const secondaryArticles = newsArticles.slice(1, 3);
  const otherArticles = newsArticles.slice(3, 10);

  return (
    <div className="market-section market-news-section">
      <h2>Global News</h2>
      <div className="news-grid-container">
        {mainArticle && (
          <a href={mainArticle.url} target="_blank" rel="noopener noreferrer" className="news-card-large">
            {mainArticle.urlToImage && <img src={mainArticle.urlToImage} alt={mainArticle.title} className="news-image-large" />}
            <div className="news-content-large">
              <h3>{mainArticle.title}</h3>
              <p>{mainArticle.description}</p>
              <span className="news-source">{mainArticle.source.name}</span>
            </div>
          </a>
        )}
        <div className="secondary-news-container">
          {secondaryArticles.map((article, index) => (
            <a href={article.url} target="_blank" rel="noopener noreferrer" key={index} className="news-card-medium">
              {article.urlToImage && <img src={article.urlToImage} alt={article.title} className="news-image-medium" />}
              <div className="news-content-medium">
                <h4>{article.title}</h4>
                <span className="news-source">{article.source.name}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
      {otherArticles.length > 0 && (
        <div className="other-news-list">
          <h3>More News</h3>
          <ul>
            {otherArticles.map((article, index) => (
              <li key={index}>
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  {article.title}
                  <span className="news-source-list">{article.source.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
export default MarketNews;
