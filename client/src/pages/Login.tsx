import { useEffect } from 'react';
import loginHTML from './login.html?raw';

export default function Login() {
  useEffect(() => {
    // Extract and run the JavaScript from the HTML
    const scriptMatch = loginHTML.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      try {
        // eslint-disable-next-line no-eval
        eval(scriptMatch[1]);
      } catch (e) {
        console.error('Error executing login script:', e);
      }
    }
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: loginHTML }} />
  );
}
