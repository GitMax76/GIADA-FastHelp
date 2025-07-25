document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 14;

    const homeScreen = document.getElementById('home-screen');
    const stepperSection = document.getElementById('stepper-section');

    const startGuideBtn = document.getElementById('start-guide-btn');
    const openSearchBtn = document.getElementById('open-search-btn');
    const openRulesBtn = document.getElementById('open-rules-btn');
    const openPunctuationToolBtn = document.getElementById('open-punctuation-tool-btn'); // New button

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    const rulesModal = document.getElementById('rules-modal');
    const closeRulesModalBtn = document.getElementById('close-rules-modal-btn');

    const searchModal = document.getElementById('search-recipients-modal');
    const closeSearchModalBtn = document.getElementById('close-search-modal-btn');
    const recipientSearchInput = document.getElementById('recipient-search-input');
    const recipientsResultsDiv = document.getElementById('recipients-results');
    const googleSheetCsvUrlInput = document.getElementById('google-sheet-csv-url');
    const loadSheetBtn = document.getElementById('load-sheet-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    const punctuationToolModal = document.getElementById('punctuation-tool-modal'); // New modal
    const closePunctuationToolModalBtn = document.getElementById('close-punctuation-tool-modal-btn'); // New close button
    const inputTextarea = document.getElementById('inputText'); // Textarea for punctuation tool
    const processTextBtn = document.getElementById('process-text-btn'); // Process button for punctuation tool
    const outputTextPre = document.getElementById('outputText'); // Output for punctuation tool

    const progressBar = document.getElementById('progress-bar');
    const currentStepLabel = document.getElementById('current-step-label');

    const steps = Array.from({ length: totalSteps }, (_, i) => document.getElementById(`step-${i + 1}`));

    const backToHomeFromStepperBtn = document.getElementById('back-to-home-from-stepper');
    const backToHomeFromRulesBtn = document.getElementById('back-to-home-from-rules');
    const backToHomeFromSearchBtn = document.getElementById('back-to-home-from-search');
    const backToHomeFromPunctuationToolBtn = document.getElementById('back-to-home-from-punctuation-tool'); // New back to home button

    let allRecipientsData = []; // To store the parsed data from Google Sheet

    // Function to show a specific section and hide others
    function showSection(sectionId) {
        homeScreen.classList.add('hidden');
        stepperSection.classList.add('hidden');
        rulesModal.classList.add('hidden');
        searchModal.classList.add('hidden');
        punctuationToolModal.classList.add('hidden'); // Hide new modal

        if (sectionId === 'home-screen') {
            homeScreen.classList.remove('hidden');
        } else if (sectionId === 'stepper-section') {
            stepperSection.classList.remove('hidden');
            updateView(); // Ensure stepper starts from current step
        } else if (sectionId === 'rules-modal') {
            rulesModal.classList.remove('hidden');
            setTimeout(() => {
                rulesModal.classList.remove('opacity-0');
                rulesModal.querySelector('.modal-content').classList.remove('scale-95');
            }, 10);
        } else if (sectionId === 'search-recipients-modal') {
            searchModal.classList.remove('hidden');
            setTimeout(() => {
                searchModal.classList.remove('opacity-0');
                searchModal.querySelector('.modal-content').classList.remove('scale-95');
            }, 10);
        } else if (sectionId === 'punctuation-tool-modal') { // Show new modal
            punctuationToolModal.classList.remove('hidden');
            setTimeout(() => {
                punctuationToolModal.classList.remove('opacity-0');
                punctuationToolModal.querySelector('.modal-content').classList.remove('scale-95');
            }, 10);
        }
    }

    function updateView() {
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.remove('hidden');
            } else {
                step.classList.add('hidden');
            }
        });

        prevBtn.disabled = currentStep === 1;
        nextBtn.disabled = currentStep === totalSteps;
        
        if (currentStep === totalSteps) {
            nextBtn.innerText = 'Fine';
        } else {
            nextBtn.innerText = 'Avanti';
        }

        const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        currentStepLabel.innerText = currentStep;
    }

    // Function to parse CSV text into an array of objects
    function parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        // Use the first line as headers
        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            if (values.length === headers.length) { // Ensure row has correct number of columns
                let row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }
        return data;
    }

    // Function to fetch and load data from Google Sheet CSV URL
    async function fetchAndLoadRecipients() {
        const csvUrl = googleSheetCsvUrlInput.value.trim();
        if (!csvUrl) {
            errorMessage.innerText = 'Inserisci un URL CSV valido.';
            errorMessage.classList.remove('hidden');
            return;
        }

        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        recipientsResultsDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Caricamento...</p>';

        try {
            const response = await fetch(csvUrl);
            if (!response.ok) {
                // Log full response for debugging HTTP errors
                console.error('HTTP Error Response:', response);
                throw new Error(`Errore HTTP! Stato: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            console.log('Fetched CSV text (first 200 chars):', csvText.substring(0, 200)); // Log part of text
            allRecipientsData = parseCSV(csvText);
            console.log('Parsed data:', allRecipientsData); // Log parsed data
            filterRecipients(); // Render all data initially after loading
        } catch (error) {
            console.error('Detailed error during fetch or parse:', error); // Log the full error object
            errorMessage.innerText = `Errore nel caricamento del foglio. Controlla il link e le impostazioni di condivisione (CORS). Dettagli: ${error.message}`;
            errorMessage.classList.remove('hidden');
            recipientsResultsDiv.innerHTML = '<p class="text-red-500 text-center py-4">Impossibile caricare i dati.</p>';
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    // Function to render recipients data into a table
    function renderRecipients(data) {
        console.log('renderRecipients called with data:', data); // Added log
        recipientsResultsDiv.innerHTML = ''; // Clear previous results
        if (data.length === 0) {
            recipientsResultsDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Nessun destinatario trovato.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('min-w-full', 'divide-y', 'divide-slate-200', 'rounded-lg', 'overflow-hidden');
        
        // Create table header
        const thead = document.createElement('thead');
        // Added sticky header classes: sticky, top-0, z-10, shadow-sm, border-b, border-slate-200
        thead.classList.add('bg-slate-100', 'sticky', 'top-0', 'z-10', 'shadow-sm', 'border-b', 'border-slate-200');
        const headerRow = document.createElement('tr');
        const headers = Object.keys(data[0]); // Get headers from the first data row
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.classList.add('px-6', 'py-3', 'text-left', 'text-xs', 'font-medium', 'text-slate-500', 'uppercase', 'tracking-wider');
            th.innerText = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        tbody.classList.add('bg-white', 'divide-y', 'divide-slate-200');
        data.forEach(rowData => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-slate-700');
                td.innerText = rowData[header] || ''; // Display value or empty string
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        recipientsResultsDiv.appendChild(table);
    }

    // Function to filter recipients based on search input
    function filterRecipients() {
        const searchTerm = recipientSearchInput.value.toLowerCase();
        const filteredData = allRecipientsData.filter(recipient => {
            // Search across all string values in the recipient object
            return Object.values(recipient).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
        renderRecipients(filteredData);
    }

    // Punctuation Tool Logic
    function processText() {
        let text = inputTextarea.value;

        // Convertire date gg.mm.aaaa in gg/mm/aaaa
        text = text.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, "$1/$2/$3");

        // Sostituire . seguito da spazi + lettera maiuscola e preceduto da minuscola o numero → " - "
        text = text.replace(/(?<=[a-z0-9])\.\s*(?=[A-Z])/g, " - ");

        // Sostituire . seguito da numero e preceduto da minuscola o numero → spazio
        text = text.replace(/(?<=[a-z0-9])\.(?=\d)/g, " ");

        // Sostituire — con " - "
        text = text.replace(/—/g, " - ");

        // Protezione orari hh:mm
        text = text.replace(/\b(\d{1,2}):(\d{2})\b/g, "@@$1:@@$2");

        // Rimuovere tutta la punteggiatura tranne ' / \ | ’ -
        text = text.replace(/[^\w\s'/\\|’:-]/g, "");

        // Ripristino orari
        text = text.replace(/@@(\d{1,2}):@@(\d{2})/g, "$1:$2");

        outputTextPre.innerText = text;
    }

    // Event Listeners for main navigation buttons
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateView();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            currentStep++;
            updateView();
        }
    });
    
    // Home screen button listeners
    startGuideBtn.addEventListener('click', () => showSection('stepper-section'));
    openSearchBtn.addEventListener('click', () => showSection('search-recipients-modal'));
    openRulesBtn.addEventListener('click', () => showSection('rules-modal'));
    openPunctuationToolBtn.addEventListener('click', () => showSection('punctuation-tool-modal')); // New button listener

    // Back to Home buttons
    backToHomeFromStepperBtn.addEventListener('click', () => {
        currentStep = 1; // Reset stepper to first step
        showSection('home-screen');
    });
    backToHomeFromRulesBtn.addEventListener('click', () => closeRulesModal() || showSection('home-screen'));
    backToHomeFromSearchBtn.addEventListener('click', () => closeSearchModal() || showSection('home-screen'));
    backToHomeFromPunctuationToolBtn.addEventListener('click', () => closePunctuationToolModal() || showSection('home-screen')); // New back to home listener


    // Functions to close modals
    function closeRulesModal() {
        rulesModal.classList.add('opacity-0');
        rulesModal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => {
            rulesModal.classList.add('hidden');
        }, 300);
    }

    function closeSearchModal() {
        searchModal.classList.add('opacity-0');
        searchModal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => {
            searchModal.classList.add('hidden');
            // Clear search input and results when closing
            recipientSearchInput.value = '';
            recipientsResultsDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Carica il foglio per iniziare la ricerca.</p>';
            allRecipientsData = []; // Clear data
            // googleSheetCsvUrlInput.value = ''; // Do not clear URL input
            errorMessage.classList.add('hidden');
        }, 300);
    }

    function closePunctuationToolModal() { // New close function
        punctuationToolModal.classList.add('opacity-0');
        punctuationToolModal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => {
            punctuationToolModal.classList.add('hidden');
            inputTextarea.value = ''; // Clear input
            outputTextPre.innerText = ''; // Clear output
        }, 300);
    }

    // Event Listeners for closing modals
    closeRulesModalBtn.addEventListener('click', closeRulesModal);
    rulesModal.addEventListener('click', (event) => {
        if (event.target === rulesModal) {
            closeRulesModal();
        }
    });

    closeSearchModalBtn.addEventListener('click', closeSearchModal);
    searchModal.addEventListener('click', (event) => {
        if (event.target === searchModal) {
            closeSearchModal();
        }
    });

    closePunctuationToolModalBtn.addEventListener('click', closePunctuationToolModal); // New close listener
    punctuationToolModal.addEventListener('click', (event) => { // New modal click listener
        if (event.target === punctuationToolModal) {
            closePunctuationToolModal();
        }
    });

    // Event Listeners for search modal functionality
    loadSheetBtn.addEventListener('click', fetchAndLoadRecipients);
    recipientSearchInput.addEventListener('input', filterRecipients);

    // Event Listener for punctuation tool functionality
    processTextBtn.addEventListener('click', processText); // New process button listener

    // Initial view: show home screen
    showSection('home-screen');
});