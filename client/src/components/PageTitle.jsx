import { useEffect } from 'react';

const PageTitle = ({ title }) => {
  useEffect(() => {
    document.title = `MarketMitra - ${title}`;
  }, [title]);

  return null;
};

export default PageTitle;