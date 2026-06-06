import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import partnersHTML from './partners.html?raw';

type PartnerFormPayload = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  businessName: string;
};

function getPartnerFormPayload(root: HTMLElement): PartnerFormPayload {
  const formSection = root.querySelector<HTMLElement>('.form-section');
  const inputs = Array.from(formSection?.querySelectorAll<HTMLInputElement>('.field-input') ?? []);
  const roleSelect = formSection?.querySelector<HTMLSelectElement>('.field-select');

  return {
    firstName: inputs[0]?.value.trim() ?? '',
    lastName: inputs[1]?.value.trim() ?? '',
    email: inputs[2]?.value.trim() ?? '',
    mobile: inputs[3]?.value.trim() ?? '',
    role: roleSelect?.value.trim() ?? '',
    businessName: inputs[4]?.value.trim() ?? '',
  };
}

function setFieldError(input: HTMLInputElement | HTMLSelectElement | undefined, message: string) {
  if (!input) return;
  input.setCustomValidity(message);
  input.reportValidity();
  input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
  input.addEventListener('change', () => input.setCustomValidity(''), { once: true });
}

function ensureStatusElement(root: HTMLElement): HTMLDivElement | null {
  const formSection = root.querySelector<HTMLElement>('.form-section');
  const submitButton = formSection?.querySelector<HTMLButtonElement>('.btn-submit');
  if (!formSection || !submitButton) return null;

  const existing = formSection.querySelector<HTMLDivElement>('[data-partner-submit-status="true"]');
  if (existing) return existing;

  const status = document.createElement('div');
  status.dataset.partnerSubmitStatus = 'true';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.marginTop = '12px';
  status.style.fontFamily = "'Figtree', sans-serif";
  status.style.fontSize = '13px';
  status.style.lineHeight = '1.45';
  submitButton.insertAdjacentElement('afterend', status);
  return status;
}

function setStatus(status: HTMLDivElement | null, message: string, tone: 'info' | 'success' | 'error') {
  if (!status) return;
  status.textContent = message;
  status.style.color = tone === 'error' ? '#B42318' : tone === 'success' ? '#067647' : '#475467';
}

export default function Partners() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const registerPartner = trpc.partner.register.useMutation();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const formSection = root.querySelector<HTMLElement>('.form-section');
    const submitButton = formSection?.querySelector<HTMLButtonElement>('.btn-submit');
    const inputs = Array.from(formSection?.querySelectorAll<HTMLInputElement>('.field-input') ?? []);
    const roleSelect = formSection?.querySelector<HTMLSelectElement>('.field-select');
    const status = ensureStatusElement(root);

    if (!formSection || !submitButton) return;

    const handleSubmit = async (event: Event) => {
      event.preventDefault();

      const payload = getPartnerFormPayload(root);
      const emailInput = inputs[2];

      if (!payload.firstName) {
        setFieldError(inputs[0], 'Please enter your first name.');
        return;
      }
      if (!payload.email) {
        setFieldError(emailInput, 'Please enter your email address.');
        return;
      }
      if (emailInput && !emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }
      if (!payload.role) {
        setFieldError(roleSelect ?? undefined, 'Please select your role.');
        return;
      }

      const originalText = submitButton.textContent ?? 'Submit application';
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting…';
      setStatus(status, 'Submitting your partner application…', 'info');

      try {
        await registerPartner.mutateAsync(payload);
        setStatus(status, "Thanks — your partner application has been submitted. We'll be in touch within one business day.", 'success');
        inputs.forEach((input) => {
          input.value = '';
        });
        if (roleSelect) roleSelect.value = '';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to submit your application right now.';
        setStatus(status, message, 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    };

    submitButton.addEventListener('click', handleSubmit);

    return () => {
      submitButton.removeEventListener('click', handleSubmit);
    };
  }, [registerPartner]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: partnersHTML }} />
  );
}
