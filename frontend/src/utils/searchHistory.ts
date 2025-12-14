import { safeStorage } from './safeStorage';

/**
 * Adds a search term to the search history and saves it to localStorage
 * @param term The search term to add
 * @param currentHistory Optional current history array
 * @returns The updated search history
 */
export function addToSearchHistory(term: string, currentHistory: string[] = []): string[] {
  // Don't add empty terms
  if (!term.trim()) {
    return currentHistory;
  }

  // Load history from localStorage if no currentHistory is provided
  let history = currentHistory;
  if (history.length === 0 && typeof window !== 'undefined') {
    try {
      const savedHistory = safeStorage.getItem('searchHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          history = parsedHistory;
        }
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }

  // Add term to history if not already present
  if (!history.includes(term)) {
    // Add to beginning and limit to 10 items
    history = [term, ...history].slice(0, 10);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      safeStorage.setItem('searchHistory', JSON.stringify(history));
    }
  }

  return history;
}

/**
 * Clears the search history
 */
export function clearSearchHistory(): void {
  if (typeof window !== 'undefined') {
    safeStorage.removeItem('searchHistory');
  }
}

/**
 * Gets the search history from localStorage
 * @returns The search history array
 */
export function getSearchHistory(): string[] {
  if (typeof window !== 'undefined') {
    try {
      const savedHistory = safeStorage.getItem('searchHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          return parsedHistory;
        }
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }
  return [];
} 