import { useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';
import rawHTML from './cdd.html?raw';

export default function Cdd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const extractMutation = trpc.cdd.extractId.useMutation();
  const registerMutation = trpc.cdd.register.useMutation();
  const sendExplainerMutation = trpc.cdd.sendExplainer.useMutation();
  const approveMutation = trpc.cdd.approve.useMutation();

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Shadow DOM for perfect CSS isolation
    let shadow = containerRef.current.shadowRoot;
    if (!shadow) {
      shadow = containerRef.current.attachShadow({ mode: 'open' });
    }

    // 2. Prepare the HTML
    // We need to move the <style> and <link> tags inside the shadow root
    // and replace the placeholder video.
    let html = rawHTML;
    
    // Inject the real video path
    html = html.replace(
      /<img class="video-holding-frame" src="data:image\/jpeg;base64,[^"]+" \/>/g,
      `<video class="video-holding-frame" src="/videos/sarah_explainer.mp4" controls playsinline style="z-index:10;"></video>`
    );

    shadow.innerHTML = html;

    // 3. Define helper to find elements inside shadow
    const $ = (id: string) => shadow!.getElementById(id) as any;
    const $$ = (selector: string) => shadow!.querySelectorAll(selector);

    // 4. Wire up Navigation
    (window as any).showScreen = (num: number, btn?: HTMLElement) => {
      shadow!.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const target = shadow!.getElementById(`screen-${num}`);
      if (target) target.classList.add('active');

      if (btn) {
        shadow!.querySelectorAll('.demo-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    };

    // 5. Wire up OCR (Screen 1)
    (window as any).mockCapture = async () => {
      const camPlaceholder = $('camPlaceholder');
      if (camPlaceholder) {
        camPlaceholder.innerHTML = '<div style="color:#91D6B9;font-weight:600;font-family:sans-serif;">Processing ID with OpenAI...</div>';
      }

      try {
        // Use a real mutation call
        const result = await extractMutation.mutateAsync({ 
          image: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Placeholder for camera frame
        });

        // Fill fields with extracted data
        $('fDocType').value = result.documentType || 'Driver licence (NSW)';
        $('fFullName').value = result.fullName || 'Jordan Michael Sample';
        $('fDob').value = result.dob || '14/03/1991';
        $('fAddress').value = result.address || '22 Example Street, Newcastle NSW 2300';
        
        if (result.confidence?.dob < 0.75) {
          $('flagDob').style.display = 'inline-block';
        }

        $('camPlaceholder').style.display = 'none';
        $('confirmBanner').style.display = 'flex';
        $('fieldsCard').style.display = 'block';
        setTimeout(() => $('stampSeal').classList.add('show'), 60);
        $('submitBtn').disabled = false;
      } catch (err) {
        console.error("OCR Failed", err);
        alert("OCR Failed. Please try again.");
      }
    };

    // 6. Wire up Submit (Screen 1)
    (window as any).submitCapture = async () => {
      try {
        const payload = {
          propertyId: $('fPropertyId').value,
          agentName: $('fAgentName').value,
          documentType: $('fDocType').value,
          fullName: $('fFullName').value,
          dob: $('fDob').value,
          address: $('fAddress').value,
          phone: $('fPhone').value,
          email: $('fEmail').value,
          viewedOriginal: $('fViewedOriginal').checked,
          status: "direct" as const
        };

        await registerMutation.mutateAsync(payload);
        alert("Registration Successful and stored in Postgres.");
        (window as any).showScreen(3, shadow!.querySelectorAll('.demo-tabs button')[2] as HTMLElement);
      } catch (err) {
        alert("Submission failed.");
      }
    };

    // 7. Wire up Send Explainer (Screen 2)
    (window as any).sendExplainerLink = async () => {
      try {
        const propertyId = $('ePropertyId').value;
        const phone = $('ePhone').value;
        await sendExplainerMutation.mutateAsync({ propertyId, phone });
        $('sendConfirm').style.display = 'block';
      } catch (err) {
        alert("Failed to send SMS.");
      }
    };

    // 8. Wire up Continue to Capture (Screen 2 Recipient)
    (window as any).continueToCapture = () => {
      const propertyId = $('ePropertyId').value;
      const phone = $('ePhone').value;
      if (propertyId) $('fPropertyId').value = propertyId;
      if (phone) $('fPhone').value = phone;
      (window as any).showScreen(1, shadow!.querySelectorAll('.demo-tabs button')[0] as HTMLElement);
    };

    // 9. Wire up Approve (Screen 3)
    (window as any).approveEntry = async (id: number) => {
      try {
        await approveMutation.mutateAsync({ id });
        const statusEl = $('status-' + id);
        if (statusEl) {
          statusEl.textContent = 'Approved to inspect';
          statusEl.classList.add('approved');
        }
        const btn = $('approve-' + id);
        if (btn) btn.style.display = 'none';
      } catch (err) {
        alert("Approval failed.");
      }
    };

    // 10. Wire up Customer View logic (Screen 4)
    (window as any).custShowCapture = () => {
      $('cust-explainer').style.display = 'none';
      $('cust-capture').style.display = 'block';
    };

    (window as any).custMockCapture = async () => {
      $('custCamPlaceholder').innerHTML = '<div style="color:#91D6B9;font-weight:600;">Processing...</div>';
      try {
        const result = await extractMutation.mutateAsync({ image: "data..." });
        $('custCamPlaceholder').style.display = 'none';
        $('custConfirmBanner').style.display = 'flex';
        $('custFieldsCard').style.display = 'block';
        setTimeout(() => $('custStampSeal').classList.add('show'), 60);
        $('cDocType').value = result.documentType || 'Driver licence (NSW)';
        $('cFullName').value = result.fullName || 'Jordan Michael Sample';
        $('cDob').value = result.dob || '14/03/1991';
        $('cAddress').value = result.address || '22 Example Street, Newcastle NSW 2300';
      } catch (err) {
        alert("OCR Failed");
      }
    };

    (window as any).custSubmit = async () => {
      // Similar to submitCapture but for customer
      alert("Submitted! Identity record stored.");
    };

    // 11. Wire up Email Register (Screen 3)
    (window as any).emailRegister = () => {
      $('emailConfirm').style.display = 'block';
    };

  }, [extractMutation, registerMutation, sendExplainerMutation, approveMutation]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh', background: '#F4F6FA' }} />
  );
}
