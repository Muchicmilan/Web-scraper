import { useContext } from 'react';
import { ScraperContext } from "../context/ScraperContext"

export const useScraperManager = () => {
    const context = useContext(ScraperContext);
    if (context === undefined) {
        throw new Error('useScraperManager must be used within a ScraperProvider');
    }
    return context;
};