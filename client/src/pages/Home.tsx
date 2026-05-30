import { useEffect } from 'react';
import { useLocation } from 'wouter';
import indexHTML from './index.html?raw';

export default function Home() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Scroll reveal
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    // Nav scroll effect
    const nav = document.querySelector('nav');
    if (nav) {
      const handleScroll = () => {
        nav.style.boxShadow = window.scrollY > 20 
          ? '0 2px 20px rgba(0,0,0,0.08)' 
          : 'none';
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    // Inject global functions
    (window as any).setIntent = (val: string) => {
      const intentInput = document.getElementById('hp-intent') as HTMLInputElement;
      if (intentInput) intentInput.value = val;
      document.querySelectorAll('.intent-btn').forEach(b => b.classList.remove('active'));
      const intentBtn = document.getElementById('intent-' + val);
      if (intentBtn) intentBtn.classList.add('active');
    };

    (window as any).goToBrief = () => {
      const suburbs = (document.getElementById('hp-suburbs') as HTMLInputElement)?.value.trim() || '';
      const type = (document.getElementById('hp-type') as HTMLSelectElement)?.value || '';
      const beds = (document.getElementById('hp-beds') as HTMLSelectElement)?.value || '';
      const baths = (document.getElementById('hp-baths') as HTMLSelectElement)?.value || '';
      const parking = (document.getElementById('hp-parking') as HTMLSelectElement)?.value || '';
      const budget = (document.getElementById('hp-budget') as HTMLInputElement)?.value.trim() || '';
      const intent = (document.getElementById('hp-intent') as HTMLInputElement)?.value || '';

      const params = new URLSearchParams();
      if (suburbs) params.set('suburbs', suburbs);
      if (type) params.set('type', type);
      if (beds) params.set('beds', beds);
      if (baths) params.set('baths', baths);
      if (parking) params.set('parking', parking);
      if (budget) params.set('budget', budget);
      if (intent) params.set('intent', intent);

      navigate(`/brief?${params.toString()}`);
    };
  }, [navigate]);

  return (
    <div dangerouslySetInnerHTML={{ __html: indexHTML }} />
  );
}
