import privacyHTML from './privacy.html?raw';

export default function Privacy() {
  return (
    <div dangerouslySetInnerHTML={{ __html: privacyHTML }} />
  );
}
