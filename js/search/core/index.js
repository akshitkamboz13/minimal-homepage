import { initSearchEngine } from './SearchEngine.js';
import { initAutocomplete } from './Autocomplete.js';
import { initAiOptions, updateSlider } from './AiOptions.js';

export function initSearch() {
    initSearchEngine();
    initAutocomplete();
    initAiOptions();
}

// Expose updateSlider for panels or global UI resizes if needed
export { updateSlider };
