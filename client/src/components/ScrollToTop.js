import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const scrollToTop = () => {
  window.scrollTo(0, 0);
  if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
  if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
};

/**
 * Scrolls the window to the top whenever the route (location) changes.
 * Runs immediately and again after paint so it wins over pages that scroll down in their own useEffect.
 */
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    scrollToTop();
    const t1 = setTimeout(scrollToTop, 0);
    const t2 = setTimeout(scrollToTop, 50);
    const t3 = setTimeout(scrollToTop, 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;
