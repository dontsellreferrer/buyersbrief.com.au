import { useEffect } from 'react';
import cmaHtml from './cma.html?raw';

export default function CMA() {
  useEffect(() => {
    // Extract and run the JavaScript from the HTML
    // The HTML contains a <script> tag with CMA_DATA and rendering functions
    const scriptMatch = cmaHtml.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      try {
        // eslint-disable-next-line no-eval
        eval(scriptMatch[1]);
      } catch (e) {
        console.error('Error executing CMA script:', e);
      }
    }
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: cmaHtml }} />
  );
}
