import { initSearchEngine } from './search-engine.js';
import { initAutocomplete } from './autocomplete.js';
import { initAiOptions, updateSlider } from './ai-options.js';

export function initSearch() {
    initSearchEngine();
    initAutocomplete();
    initAiOptions();
}

// Expose updateSlider for panels or global UI resizes if needed
export { updateSlider };
