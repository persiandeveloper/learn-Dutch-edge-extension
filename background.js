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

// Handle the click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "loadingAI" });

    try {
        const selectedText = info.selectionText;

        if (info.menuItemId === "sendToApi_Words") {

            var requestBody = {
                "model": "ai/qwen2.5",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are gonna help me improve my dutch. When replying, only return what asked."
                    },
                    {
                        "role": "user",
                        "content": "Can you list (Each one in new line) the Dutch words used in the following text with their meaning in English? '{0}'"
                    }
                ]
            }
        }

        if (info.menuItemId === "sendToApi_Grammer") {
            var requestBody = {
                "model": "ai/qwen2.5",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are gonna help me improve my dutch. When replying, only return what asked."
                    },
                    {
                        "role": "user",
                        "content": "Can you help understand the grammer used in the following text? '{0}'"
                    }
                ]
            }
        }

        requestBody.messages[1].content = requestBody.messages[1].content.replace("{0}", selectedText);

        chrome.contextMenus.update("sendToApi_Words", { enabled: false });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: false });

        // Call your REST endpoint
        fetch('http://localhost:12434/engines/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
            .then(response => response.json())
            .then(data => {
                // Send the data back to the content script in the specific tab
                var finalResponse = data.choices[0].message.content;
                var replacedBr = data.choices[0].message.content.replace(/\n/g, '<br/>');
                chrome.tabs.sendMessage(tab.id, { action: "displayResult", data: replacedBr });

                chrome.contextMenus.update("sendToApi_Words", { enabled: true });
                chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
            })
            .catch(error => {
                chrome.contextMenus.update("sendToApi_Words", { enabled: true });
                chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });

                console.error('Error:', error)
            });
    }
    catch {
        chrome.contextMenus.update("sendToApi_Words", { enabled: true });
        chrome.contextMenus.update("sendToApi_Grammer", { enabled: true });
    }

});