let apiUrl = '';

function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(
            { chatUrl: '', featureEnabled: false },
            (items) => {
                apiUrl = items.chatUrl;
                debugger;
                resolve();

            }
        );
    });
}

// Load when service worker starts
const initPromise = loadSettings();


// Create the context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "sendToApi_Words",
        title: "Ask for words", // %s automatically inserts the selected text
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "sendToApi_Grammer",
        title: "Ask for grammer", // %s automatically inserts the selected text
        contexts: ["selection"]
    });
});

let controller = new AbortController();

// Handle the click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "loadingAI" });
    try {
        const selectedText = info.selectionText;

        var requestBody = makeRequestBody(info);

        requestBody.messages[1].content = requestBody.messages[1].content.replace("{0}", selectedText);

        callOpenAI(requestBody, tab.id);
    }
    catch {
        
    }

});

function callOpenAI(requestBody, tabId) {

    try {

        controller = new AbortController();


        chrome.contextMenus.update("sendToApi_Words", { enabled: false });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: false });

        // Call your REST endpoint
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        })
            .then(response => response.json())
            .then(data => {
                // Send the data back to the content script in the specific tab
                chrome.tabs.sendMessage(tabId, { action: "displayResult", data: data.choices[0].message.content });

                chrome.contextMenus.update("sendToApi_Words", { enabled: true });
                chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    console.log('Fetch cancelled');
                }
                chrome.contextMenus.update("sendToApi_Words", { enabled: true });
                chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
                controller = new AbortController();
                console.error('Error:', error)
            });

    }
    catch {
        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_MENU') {
        controller.abort();
        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
    }
    if (message.type === 'Request_Conjugate') {
        canjugate(message.data, sender.tab.id);
    }
});

function canjugate(data, tabId) {
    controller = new AbortController();
    chrome.tabs.sendMessage(tabId, { action: "loadingAI" });

    var requestBody = {
        "model": "ai/qwen2.5",
        "messages": [
            {
                "role": "system",
                "content": "You are gonna help me improve my dutch. When replying, only return what asked. Do not start the reply with 'Certainly!'."
            },
            {
                "role": "user",
                "content": "Conjugate the word in Dutch in different times and forms. I only need Present, Past and Perfect Tense. Here is an example:\n* Present Tense (Noodzakelijke zinsvormen)\nIk eet (I eat)\nJij eet (You eat)\nWe eten (We eat)\n\n* Past Tense (Verleden tijd)\nIk at (I ate)\nJij at (You ate)\nWe aten (We ate)\n\n* Perfect Tense (Voltooid verleden tijd)\nIk heb gegeten (I have eaten)\nJij hebt gegeten (You have eaten)\nWe hebben gegeten (We have eaten)\n. Word : '{0}'"
            }
        ]
    };

    requestBody.messages[1].content = requestBody.messages[1].content.replace("{0}", data);

    callOpenAI(requestBody, tabId);
}

function makeRequestBody(info) {
    if (info.menuItemId === "sendToApi_Words") {

        var requestBody = {
            "model": "ai/qwen2.5",
            "messages": [
                {
                    "role": "system",
                    "content": "You are gonna help me improve my dutch. When replying, only return what asked. Do not start the reply with 'Certainly!'."
                },
                {
                    "role": "user",
                    "content": "Extract each Dutch word from the following text and provide its English meaning. Output format rules: Each word must be on a new line Format: word: meaning If the word is a verb, append [VERB:word] after the meaning. Example: “Ze kocht “ then your reply would be: 'Ze: she \n kocht: bought[Verb:kocht]'. Text: '{0}'"
                }
            ]
        };
    }

    if (info.menuItemId === "sendToApi_Grammer") {
        var requestBody = {
            "model": "ai/qwen2.5",
            "messages": [
                {
                    "role": "system",
                    "content": "You are gonna help me improve my dutch. When replying, only return what asked. Do not start the reply with 'Certainly!'."
                },
                {
                    "role": "user",
                    "content": "Can you help understand the grammer used in the following text? '{0}'"
                }
            ]
        };
    }
    return requestBody;
}
