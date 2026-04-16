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

const controller = new AbortController();

// Handle the click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "loadingAI" });

    try {
        const selectedText = info.selectionText;

        var requestBody = makeRequestBody(info);

        requestBody.messages[1].content = requestBody.messages[1].content.replace("{0}", selectedText);

        chrome.contextMenus.update("sendToApi_Words", { enabled: false });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: false });

        var url = '';
        chrome.storage.sync.get(
            { chatUrl: '', featureEnabled: false },
            (items) => {
                url = items.chatUrl;

                // Call your REST endpoint
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                })
                    .then(response => response.json())
                    .then(data => {
                        // Send the data back to the content script in the specific tab
                        chrome.tabs.sendMessage(tab.id, { action: "displayResult", data: data.choices[0].message.content });

                        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
                        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
                    })
                    .catch(error => {
                        if (error.name === 'AbortError') {
                            console.log('Fetch cancelled');
                        }
                        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
                        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });

                        console.error('Error:', error)
                    });
            }
        );
    }
    catch {
        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
    }

});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_MENU') {
        controller.abort();
        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
    }
});

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
                    "content": "Can you list (Each one in new line) the Dutch words used in the following text with their meaning in English? '{0}'"
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
