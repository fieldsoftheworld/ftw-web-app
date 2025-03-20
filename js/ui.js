// Function to toggle map controls visibility
function toggleMapControls() {
    const controls = document.getElementById('map-controls');
    controls.classList.toggle('minimized');
    
    // Save preference in localStorage
    localStorage.setItem('mapControlsMinimized', controls.classList.contains('minimized'));
}

// Function to toggle sidebar filters visibility
function toggleSidebarFilters() {
    const searchForm = document.getElementById('search-form');
    const toggleIcon = document.getElementById('filters-toggle-icon');
    
    // Check if the form is visible by getting its computed style
    const isVisible = window.getComputedStyle(searchForm).display !== 'none';
    
    // Toggle visibility
    searchForm.style.display = isVisible ? 'none' : 'block';
    
    // Rotate the icon based on state
    toggleIcon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    
    // Save preference
    localStorage.setItem('filtersVisible', !isVisible);
}

// Function to copy window ID to clipboard
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.value;
    
    if (!text) return;
    
    navigator.clipboard.writeText(text)
        .then(() => {
            // Show toast notification
            const toast = document.getElementById('toast');
            toast.textContent = 'Copied to clipboard';
            toast.classList.add('show');
            
            // Hide toast after 2 seconds
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}

// Make UI functions globally available
window.toggleMapControls = toggleMapControls;
window.toggleSidebarFilters = toggleSidebarFilters;
window.copyToClipboard = copyToClipboard; 