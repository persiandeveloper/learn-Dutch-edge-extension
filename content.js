let lastSelectionRect = null;
let loadingPanel = null;
let loadingActive = false;

// Track the position of the selection whenever the user finishes highlighting
document.addEventListener('mouseup', () => {
    if (loadingActive)
        return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && selection.toString().trim().length > 0) {
        lastSelectionRect = selection.getRangeAt(0).getBoundingClientRect();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "displayResult") {
        hideLoading();
        showPopUp(request.data);
    }

    if (request.action === "loadingAI") {
        showLoading(request.data);
    }
});


function showLoading() {
    loadingActive = true;
    // Remove existing loader if one is already showing
    if (loadingPanel) loadingPanel.remove();

    loadingPanel = document.createElement('div');
    loadingPanel.id = 'api-loading-panel';

    let top = 20;
    let left = 20;

    if (lastSelectionRect) {
        top = lastSelectionRect.bottom + window.scrollY + 10;
        left = lastSelectionRect.left + window.scrollX;
    }

    Object.assign(loadingPanel.style, {
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: '200px',
        backgroundColor: '#fff',
        border: '1px solid #333',
        boxShadow: '4px 4px 0px #000',
        zIndex: '2147483647',
        padding: '12px',
        borderRadius: '4px',
        fontFamily: 'Segoe UI, Tahoma, sans-serif'
    });

    loadingPanel.innerHTML = `
  <button id="cancel-btn" style="
    position: absolute;
    top: 6px;
    right: 6px;
    border: none;
    background: #000;
    color: #fff;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 12px;
    line-height: 18px;
    padding: 0;
  ">×</button>

  <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">
    Processing...
  </div>

  <div style="width: 100%; background: #eee; height: 4px; border-radius: 2px; overflow: hidden;">
    <div id="loading-bar-inner" style="width: 30%; height: 100%; background: #000; transition: width 0.3s;"></div>
  </div>
`;

    loadingPanel.querySelector('#cancel-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // prevents interfering with selection logic

        chrome.runtime.sendMessage({
            type: 'UPDATE_MENU',
            enabled: true
        });

        // Example:
        loadingPanel.remove();

        loadingPanel = null;
        loadingActive = false;
    });

    document.body.appendChild(loadingPanel);

    // Simple animation to make the bar move
    let width = 30;
    const interval = setInterval(() => {
        width = (width + 5) % 100;
        const bar = document.getElementById('loading-bar-inner');
        if (bar) bar.style.width = width + '%';
        else clearInterval(interval);
    }, 100);
}

// Function to remove the loader specifically
function hideLoading() {
    if (loadingPanel) {
        loadingPanel.remove();
        loadingPanel = null;
        loadingActive = false;
    }
}

function showPopUp(data) {
    const oldPanel = document.getElementById('api-popup-panel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'api-popup-panel';

    // Calculate position: Use stored rect or default to top-right
    let top = 20;
    let left = 20;

    if (lastSelectionRect) {
        // Position it 10px below the bottom of the selection
        top = lastSelectionRect.bottom + window.scrollY + 10;
        left = lastSelectionRect.left + window.scrollX;
    }

    Object.assign(panel.style, {
        position: 'absolute', // Absolute to the document
        top: `${top}px`,
        left: `${left}px`,
        width: '280px',
        backgroundColor: '#fff',
        border: '1px solid #333',
        boxShadow: '4px 4px 0px #000', // A nice "pop" shadow
        zIndex: '2147483647', // Maximum possible z-index
        padding: '12px',
        borderRadius: '4px',
        fontFamily: 'Segoe UI, Tahoma, sans-serif'
    });

    var replaceBr = data.replace(/\n/g, '<br/>');
    const finalContent = replaceBr.replace(
        /\[Verb:(.*?)\]/g,
        (_, word) => `<a href="#" class="verb-link" data-word="${word}"> - Conjugate</a>`
    );

    panel.innerHTML = `
    <div style="font-weight:bold; margin-bottom:8px; display:flex; justify-content:space-between;">
      <span>Result</span>
      <span id="close-api-popup" style="cursor:pointer;">✕</span>
    </div>
    <div style="font-size:13px; color:#444;">
      ${finalContent}
    </div>
    <div style="margin-top:8px; text-align:right;">
      <button id="copy-api-popup" style="
        cursor:pointer;
        border:1px solid #333;
        background:#f5f5f5;
        padding:4px 10px;
        border-radius:3px;
        font-size:12px;
      ">📋 Copy</button>
    </div>
  `;

    document.body.appendChild(panel);

    document.getElementById('close-api-popup').onclick = () => panel.remove();

    document.getElementById('copy-api-popup').onclick = () => {
        navigator.clipboard.writeText(data).then(() => {
            const btn = document.getElementById('copy-api-popup');
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
        });
    };

    document.addEventListener('click', (e) => {
        if (e.target.matches('.verb-link')) {
            e.preventDefault();
            const oldPanel = document.getElementById('api-popup-panel');
            if (oldPanel) oldPanel.remove();
            chrome.runtime.sendMessage({
                type: 'Request_Conjugate',
                data: e.target.dataset.word
            });
        }
    });
}