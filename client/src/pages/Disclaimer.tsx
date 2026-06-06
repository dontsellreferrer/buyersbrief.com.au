import disclaimerHTML from './disclaimer.html?raw';

export default function Disclaimer() {
  return (
    <div dangerouslySetInnerHTML={{ __html: disclaimerHTML }} />
  );
}
