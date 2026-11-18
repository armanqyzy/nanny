import { useEffect, useRef, useState } from 'react';

// Returns [ref, visible]: visible turns true once the element scrolls near the screen and stays true.
// Used so long lists load each card's extra data only when someone can actually see it.
export default function useVisible(startVisible = false) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(startVisible);

  useEffect(() => {
    if (visible || !ref.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return [ref, visible];
}
