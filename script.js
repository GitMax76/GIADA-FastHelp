document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 1;
    const totalSteps = 14;

    const homeScreen = document.getElementById('home-screen');
    const stepperSection = document.getElementById('stepper-section');

    const startGuideBtn = document.getElementById('start-guide-btn');
    const openSearchBtn = document.getElementById('open-search-btn');
    const openRulesBtn = document.getElementById('open-rules-btn');
    const openPunctuationToolBtn = document.getElementById('open-punctuation-tool-btn');
    const openReadmeBtn = document.getElementById('open-readme-btn'); // Nuovo pulsante README

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

    const punctuationToolModal = document.getElementById('punctuation-tool-modal');
    const closePunctuationToolModalBtn = document.getElementById('close-punctuation-tool-modal-btn');
    const inputTextarea = document.getElementById('inputText');
    const processTextBtn = document.getElementById('process-text-btn');
    const outputTextPre = document.getElementById('outputText');

    const readmeModal = document.getElementById('readme-modal'); // Nuovo modale README
    const closeReadmeModalBtn = document.getElementById('close-readme-modal-btn'); // Bottone chiudi README
    const readmeContentDiv = document.getElementById('readme-content'); // Contenuto README

    const progressBar = document.getElementById('progress-bar');
    const currentStepLabel = document.getElementById('current-step-label');

    const steps = Array.from({ length: totalSteps }, (_, i) => document.getElementById(`step-${i + 1}`));

    const backToHomeFromStepperBtn = document.getElementById('back-to-home-from-stepper');
    const backToHomeFromRulesBtn = document.getElementById('back-to-home-from-rules');
    const backToHomeFromSearchBtn = document.getElementById('back-to-home-from-search');
    const backToHomeFromPunctuationToolBtn = document.getElementById('back-to-home-from-punctuation-tool');
    const backToHomeFromReadmeBtn = document.getElementById('back-to-home-from-readme'); // Nuovo bottone per README

    let allRecipientsData = [];

    // Inizializza il converter Markdown
    const converter = new showdown.Converter();

    // Funzione per mostrare una sezione e nasconderne altre
    function showSection(sectionId) {
        // Nascondi tutte le sezioni e modali
        homeScreen.classList.add('hidden');
        stepperSection.classList.add('hidden');
        rulesModal.classList.add('hidden');
        searchModal.classList.add('hidden');
        punctuationToolModal.classList.add('hidden');
        readmeModal.classList.add('hidden');

        // Applica transizioni di uscita ai modali prima di nasconderli completamente
        // Questo è gestito dalle classi CSS 'opacity-0' e 'scale-95' applicate e rimosse
        // dalle singole funzioni close*Modal() quando l'utente clicca la 'X' o "Torna alla Home"
        // Quando showSection è chiamato direttamente (es. da pulsanti della home),
        // questi elementi vengono semplicemente nascosti.
        
        // Mostra la sezione desiderata
        if (sectionId === 'home-screen') {
            homeScreen.classList.remove('hidden');
        } else if (sectionId === 'stepper-section') {
            stepperSection.classList.remove('hidden');
            updateView();
        } else if (sectionId === 'rules-modal') {
            rulesModal.classList.remove('hidden');
            setTimeout(() => { // Applica transizione di entrata
                rulesModal.querySelector('.modal-content').classList.remove('scale-95');
                rulesModal.classList.remove('opacity-0');
            }, 10);
        } else if (sectionId === 'search-recipients-modal') {
            searchModal.classList.remove('hidden');
            setTimeout(() => { // Applica transizione di entrata
                searchModal.querySelector('.modal-content').classList.remove('scale-95');
                searchModal.classList.remove('opacity-0');
            }, 10);
        } else if (sectionId === 'punctuation-tool-modal') {
            punctuationToolModal.classList.remove('hidden');
            setTimeout(() => { // Applica transizione di entrata
                punctuationToolModal.querySelector('.modal-content').classList.remove('scale-95');
                punctuationToolModal.classList.remove('opacity-0');
            }, 10);
        } else if (sectionId === 'readme-modal') { // Mostra il nuovo modale README
            readmeModal.classList.remove('hidden');
            setTimeout(() => { // Applica transizione di entrata
                readmeModal.querySelector('.modal-content').classList.remove('scale-95');
                readmeModal.classList.remove('opacity-0');
            }, 10);
            loadReadmeContent(); // Carica il contenuto del README
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

        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            if (values.length === headers.length) {
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
                console.error('HTTP Error Response:', response);
                throw new Error(`Errore HTTP! Stato: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            console.log('Fetched CSV text (first 200 chars):', csvText.substring(0, 200));
            allRecipientsData = parseCSV(csvText);
            console.log('Parsed data:', allRecipientsData);
            filterRecipients();
        } catch (error) {
            console.error('Detailed error during fetch or parse:', error);
            errorMessage.innerText = `Errore nel caricamento del foglio. Controlla il link e le impostazioni di condivisione (CORS). Dettagli: ${error.message}`;
            errorMessage.classList.remove('hidden');
            recipientsResultsDiv.innerHTML = '<p class="text-red-500 text-center py-4">Impossibile caricare i dati.</p>';
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    // Function to render recipients data into a table
    function renderRecipients(data) {
        console.log('renderRecipients called with data:', data);
        recipientsResultsDiv.innerHTML = '';
        if (data.length === 0) {
            recipientsResultsDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Nessun destinatario trovato.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('min-w-full', 'divide-y', 'divide-slate-200', 'rounded-lg', 'overflow-hidden');
        
        const thead = document.createElement('thead');
        thead.classList.add('bg-slate-100', 'sticky', 'top-0', 'z-10', 'shadow-sm', 'border-b', 'border-slate-200');
        const headerRow = document.createElement('tr');
        const headers = Object.keys(data[0]);
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.classList.add('px-6', 'py-3', 'text-left', 'text-xs', 'font-medium', 'text-slate-500', 'uppercase', 'tracking-wider');
            th.innerText = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.classList.add('bg-white', 'divide-y', 'divide-slate-200');
        data.forEach(rowData => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-slate-700');
                td.innerText = rowData[header] || '';
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
            return Object.values(recipient).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
        renderRecipients(filteredData);
    }

    // Punctuation Tool Logic
    function processText() {
        let text = inputTextarea.value;
        text = text.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, "$1/$2/$3");
        text = text.replace(/(?<=[a-z0-9])\.\s*(?=[A-Z])/g, " - ");
        text = text.replace(/(?<=[a-z0-9])\.(?=\d)/g, " ");
        text = text.replace(/—/g, " - ");
        text = text.replace(/\b(\d{1,2}):(\d{2})\b/g, "@@$1:@@$2");
        text = text.replace(/[^\w\s'/\\|’:-]/g, "");
        text = text.replace(/@@(\d{1,2}):@@(\d{2})/g, "$1:$2");
        outputTextPre.innerText = text;
    }

    // Funzione per caricare il contenuto del README.md e convertirlo
    async function loadReadmeContent() {
        readmeContentDiv.innerHTML = 'Caricamento del README...';
        try {
            // Utilizza il percorso relativo che GitHub Pages può risolvere
            const response = await fetch('README.md'); 
            if (!response.ok) {
                // Se fetch fallisce con 404 (es. file non trovato) o altro errore HTTP
                if (response.status === 404) {
                    throw new Error("File README.md non trovato. Assicurati che il nome sia corretto e sia nella root del repository.");
                } else {
                    throw new Error(`Impossibile caricare README.md: ${response.status} ${response.statusText}`);
                }
            }
            const markdownText = await response.text();
            
            // Converti il Markdown in HTML usando Showdown.js
            const html = converter.makeHtml(markdownText);
            readmeContentDiv.innerHTML = html;

        } catch (error) {
            console.error('Errore nel caricamento o parsing del README:', error);
            readmeContentDiv.innerHTML = `<p class="text-red-500">Errore nel caricamento della guida completa: ${error.message}</p>`;
        }
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
    openPunctuationToolBtn.addEventListener('click', () => showSection('punctuation-tool-modal'));
    openReadmeBtn.addEventListener('click', () => showSection('readme-modal')); // Listener per il nuovo pulsante README

    // Back to Home buttons per i piedi dei modali
    backToHomeFromStepperBtn.addEventListener('click', () => {
        currentStep = 1;
        showSection('home-screen');
    });
    backToHomeFromRulesBtn.addEventListener('click', () => {
        // Nessuna chiamata a closeRulesModal() qui, perché showSection('home-screen') gestirà la transizione
        // Il click sull'overlay o sulla 'X' chiamerà le closeXModal appropriate
        showSection('home-screen');
    });
    backToHomeFromSearchBtn.addEventListener('click', () => {
        showSection('home-screen');
    });
    backToHomeFromPunctuationToolBtn.addEventListener('click', () => {
        showSection('home-screen');
    });
    backToHomeFromReadmeBtn.addEventListener('click', () => {
        showSection('home-screen');
    });

    // Funzioni per chiudere i modali (sia con la 'X' che cliccando sull'overlay)
    // Queste funzioni ora eseguono la transizione di uscita del modale e poi TORNANO ALLA HOME
    function closeRulesModal() {
        rulesModal.querySelector('.modal-content').classList.add('scale-95');
        rulesModal.classList.add('opacity-0');
        setTimeout(() => {
            rulesModal.classList.add('hidden');
            showSection('home-screen'); // <--- AGGIUNTO: Torna alla home dopo la chiusura
        }, 300); // Durata della transizione CSS
    }

    function closeSearchModal() {
        searchModal.querySelector('.modal-content').classList.add('scale-95');
        searchModal.classList.add('opacity-0');
        setTimeout(() => {
            searchModal.classList.add('hidden');
            recipientSearchInput.value = '';
            recipientsResultsDiv.innerHTML = '<p class="text-slate-500 text-center py-4">Carica il foglio per iniziare la ricerca.</p>';
            allRecipientsData = [];
            errorMessage.classList.add('hidden');
            showSection('home-screen'); // <--- AGGIUNTO: Torna alla home dopo la chiusura
        }, 300);
    }

    function closePunctuationToolModal() {
        punctuationToolModal.querySelector('.modal-content').classList.add('scale-95');
        punctuationToolModal.classList.add('opacity-0');
        setTimeout(() => {
            punctuationToolModal.classList.add('hidden');
            inputTextarea.value = '';
            outputTextPre.innerText = '';
            showSection('home-screen'); // <--- AGGIUNTO: Torna alla home dopo la chiusura
        }, 300);
    }

    function closeReadmeModal() { // Nuova funzione di chiusura per il README
        readmeModal.querySelector('.modal-content').classList.add('scale-95');
        readmeModal.classList.add('opacity-0');
        setTimeout(() => {
            readmeModal.classList.add('hidden');
            showSection('home-screen'); // <--- AGGIUNTO: Torna alla home dopo la chiusura
        }, 300);
    }

    // Event Listeners per la chiusura dei modali con la "X"
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

    closePunctuationToolModalBtn.addEventListener('click', closePunctuationToolModal);
    punctuationToolModal.addEventListener('click', (event) => {
        if (event.target === punctuationToolModal) {
            closePunctuationToolModal();
        }
    });

    closeReadmeModalBtn.addEventListener('click', closeReadmeModal); // Listener per la X del README
    readmeModal.addEventListener('click', (event) => { // Click sull'overlay del README
        if (event.target === readmeModal) {
            closeReadmeModal();
        }
    });

    // Event Listeners per la funzionalità di ricerca
    loadSheetBtn.addEventListener('click', fetchAndLoadRecipients);
    recipientSearchInput.addEventListener('input', filterRecipients);

    // Event Listener per la funzionalità del tool di punteggiatura
    processTextBtn.addEventListener('click', processText);

    // Initial view: show home screen
    showSection('home-screen');
});
