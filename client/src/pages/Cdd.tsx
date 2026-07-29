import { useEffect } from 'react';
import { trpc } from '../lib/trpc';
import cddHTML from './cdd.html?raw';

export default function Cdd() {
  const extractMutation = trpc.cdd.extractId.useMutation();
  const registerMutation = trpc.cdd.register.useMutation();
  const sendExplainerMutation = trpc.cdd.sendExplainer.useMutation();
  const approveMutation = trpc.cdd.approve.useMutation();

  useEffect(() => {
    // 1. Remove the demo shell tabs as requested in the HTML comments
    const demoTabs = document.querySelector('.demo-tabs');
    const demoNote = document.querySelector('.demo-note');
    if (demoTabs) demoTabs.remove();
    if (demoNote) demoNote.remove();

    // 2. Navigation logic for the prototype screens
    (window as any).showScreen = (num: any) => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const screens = ['screen-0', 'screen-1', 'screen-2', 'screen-3', 'screen-explainer'];
      const id = typeof num === 'number' ? screens[num] : num;
      const target = document.getElementById(id);
      if (target) target.classList.add('active');
    };

    // 3. Mock Capture -> Real OCR Integration
    (window as any).mockCapture = async () => {
      const camPlaceholder = document.getElementById('camPlaceholder');
      if (camPlaceholder) {
        camPlaceholder.innerHTML = '<div style="color:var(--mint);font-weight:600;">Processing ID...</div>';
      }

      // In a real build, we'd use getUserMedia here. 
      // For the test, we'll use a sample base64 image or just trigger the mutation with a placeholder.
      try {
        // Mocking a base64 image for the vision API
        const mockImage = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."; 
        const result = await extractMutation.mutateAsync({ image: mockImage });
        
        // Fill fields
        (document.getElementById('fDocType') as HTMLInputElement).value = result.documentType || 'Driver Licence';
        (document.getElementById('fFullName') as HTMLInputElement).value = result.fullName || '';
        (document.getElementById('fDob') as HTMLInputElement).value = result.dob || '';
        (document.getElementById('fAddress') as HTMLInputElement).value = result.address || '';
        
        const banner = document.getElementById('confirmBanner');
        if (banner) banner.style.display = 'flex';
        const seal = document.getElementById('stampSeal');
        if (seal) seal.classList.add('show');
        
        if (camPlaceholder) camPlaceholder.innerHTML = '<span>ID Captured</span>';
      } catch (err) {
        console.error("OCR Failed", err);
      }
    };

    // 4. Submit Registration
    (window as any).submitCapture = async () => {
      const payload = {
        propertyId: (document.getElementById('fPropertyId') as HTMLInputElement).value,
        agentName: (document.getElementById('fAgentName') as HTMLInputElement).value,
        documentType: (document.getElementById('fDocType') as HTMLInputElement).value,
        fullName: (document.getElementById('fFullName') as HTMLInputElement).value,
        dob: (document.getElementById('fDob') as HTMLInputElement).value,
        address: (document.getElementById('fAddress') as HTMLInputElement).value,
        phone: (document.getElementById('fPhone') as HTMLInputElement).value,
        email: (document.getElementById('fEmail') as HTMLInputElement).value,
        viewedOriginal: (document.getElementById('cViewed') as HTMLInputElement).checked,
        status: "direct" as const
      };

      await registerMutation.mutateAsync(payload);
      alert("Registration Successful");
      (window as any).showScreen(3); // Go to register
    };

    // 5. Send Explainer
    (window as any).sendExplainer = async () => {
      const propertyId = (document.getElementById('expPropertyId') as HTMLInputElement).value;
      const phone = (document.getElementById('expPhone') as HTMLInputElement).value;
      
      await sendExplainerMutation.mutateAsync({ propertyId, phone });
      alert("Explainer SMS Sent");
    };

  }, [extractMutation, registerMutation, sendExplainerMutation]);

  return (
    <div id="cdd-feature-root" dangerouslySetInnerHTML={{ __html: cddHTML }} />
  );
}
