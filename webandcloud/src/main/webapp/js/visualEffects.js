var VisualEffects = {
    scrollToTop: function() {
        var resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    },

    scrollToBottom: function() {
        var resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.scrollTo({
                top: resultsContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    },

    highlightResults: function() {
        var results = document.querySelectorAll('.search-result');
        results.forEach(function(result) {
            result.classList.add('highlight');
            setTimeout(function() {
                result.classList.add('highlight-transition');
            }, 0); // Apply the transition immediately
        });
    },

    showLoadingSpinner: function() {
        var spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    },

    hideLoadingSpinner: function() {
        var spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    },

    scrollToTopInput: function() {
        var inputElement = document.querySelector('.navbar .input');
        if (inputElement) {
            inputElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
};
