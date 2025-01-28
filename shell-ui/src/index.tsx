import { createRoot } from 'react-dom/client';
import App from './FederatedApp';

const rootElement = document.getElementById('app');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
