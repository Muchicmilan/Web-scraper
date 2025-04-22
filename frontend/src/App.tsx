import React from 'react';
import './styles.css';
import { ScraperProvider } from './context/ScraperContext'
import ScraperDashboard from './views/ScraperDashboard';

function App() {
  return (
    <ScraperProvider>
        <main>
            <ScraperDashboard />
        </main>
    </ScraperProvider>
  );
}

export default App;