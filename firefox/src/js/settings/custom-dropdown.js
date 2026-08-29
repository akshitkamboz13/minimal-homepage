/**
 * Custom Dropdown modular component helper.
 * Manages the trigger, values, options, and outside clicking for styling drop-downs.
 */
export function initCustomDropdown(id, onChangeCallback) {
    const dropdownEl = document.getElementById(`dropdown-${id}`);
    if (!dropdownEl) {
        console.warn(`Dropdown with ID dropdown-${id} not found.`);
        return null;
    }
    
    const trigger = dropdownEl.querySelector('.dropdown-trigger');
    const menu = dropdownEl.querySelector('.dropdown-menu');
    const items = dropdownEl.querySelectorAll('.dropdown-item');
    const label = dropdownEl.querySelector('.dropdown-selected-label');
    
    let currentValue = '';
    
    // Close this dropdown
    const close = () => {
        dropdownEl.classList.remove('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    };
    
    // Toggle menu
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Close all other custom dropdowns
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdownEl) d.classList.remove('open');
            });
            
            const isOpen = dropdownEl.classList.toggle('open');
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }
    
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = item.getAttribute('data-value');
            setValue(val);
            close();
            if (onChangeCallback) {
                onChangeCallback(val);
            }
        });
    });
    
    function setValue(val) {
        currentValue = val;
        items.forEach(item => {
            // Compare as string to avoid type issues (e.g. integer history count vs string data-value)
            if (item.getAttribute('data-value') === String(val)) {
                item.classList.add('active');
                if (label) label.textContent = item.textContent;
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // Close on outside click
    document.addEventListener('click', () => {
        close();
    });
    
    return {
        setValue,
        getValue: () => currentValue
    };
}
