import termsHTML from './terms.html?raw';

export default function Terms() {
  return (
    <div dangerouslySetInnerHTML={{ __html: termsHTML }} />
  );
}
