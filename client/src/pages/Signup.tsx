import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import signupHTML from './signup.html?raw';

export default function Signup() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Inject the global functions that the HTML expects
    (window as any).goStep = (n: number) => {
      // Hide all steps
      document.querySelectorAll('.step-page').forEach(p => p.classList.remove('active'));

      if (n === 3) {
        // Show correct step 3
        if ((window as any).selectedPathType === 'pay') {
          const step3pay = document.getElementById('step3pay');
          if (step3pay) step3pay.classList.add('active');
        } else {
          const step3afford = document.getElementById('step3afford');
          if (step3afford) step3afford.classList.add('active');
          const brokerNextItem = document.getElementById('brokerNextItem');
          if (brokerNextItem) brokerNextItem.style.display = 'flex';
        }
      } else {
        const step = document.getElementById('step' + n);
        if (step) step.classList.add('active');
      }

      (window as any).currentStep = n;
      (window as any).updateNav(n);
      window.scrollTo(0, 0);
    };

    (window as any).updateNav = (n: number) => {
      const steps = [1, 2, 3, 4];
      steps.forEach(s => {
        const el = document.getElementById('ns' + s);
        const num = document.getElementById('nsn' + s);
        if (el && num) {
          el.classList.remove('active', 'done');
          if (s < n) {
            el.classList.add('done');
            num.textContent = '✓';
          } else if (s === n) {
            el.classList.add('active');
            num.textContent = String(s);
          } else {
            num.textContent = String(s);
          }
        }
      });
    };

    (window as any).selectPath = (type: string) => {
      (window as any).selectedPathType = type;
      document.querySelectorAll('.path-card').forEach(c => c.classList.remove('selected-path'));
      const card = document.querySelector('.path-card.' + type);
      if (card) card.classList.add('selected-path');

      const btn = document.getElementById('pathBtn') as HTMLButtonElement;
      const note = document.getElementById('pathNote');
      if (btn && note) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';

        if (type === 'pay') {
          btn.innerHTML = 'Continue to payment <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:inline;vertical-align:middle;margin-left:8px;"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          btn.style.background = 'var(--sky)';
          btn.style.color = 'white';
          note.textContent = '$99/month · cancel anytime from your dashboard';
        } else {
          btn.innerHTML = 'Continue to book my call <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="display:inline;vertical-align:middle;margin-left:8px;"><path d="M3 8h10M9 4l4 4-4 4" stroke="var(--charcoal)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          btn.style.background = 'var(--rose)';
          btn.style.color = 'var(--charcoal)';
          note.textContent = 'Brief Active free · one 30-min broker call · no obligation';
        }
      }
    };

    (window as any).selectSlot = (el: HTMLElement) => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected-slot'));
      el.classList.add('selected-slot');
    };

    // Initialize
    (window as any).currentStep = 1;
    (window as any).selectedPathType = null;
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: signupHTML }} />
  );
}
