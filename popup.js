// Amazon Unaffiliate - popup script
document.addEventListener('DOMContentLoaded', function() {
  console.log("Popup opened");
  
  // Get stored statistics
  chrome.storage.local.get(['totalCleaned', 'lastPageCleaned'], function(result) {
    const totalCleaned = result.totalCleaned || 0;
    const lastPageCleaned = result.lastPageCleaned || 0;
    
    console.log("Stats retrieved:", { totalCleaned, lastPageCleaned });
    
    // Update the popup with statistics
    document.getElementById('total-count').textContent = totalCleaned;
    document.getElementById('cleaned-count').textContent = lastPageCleaned;
  });
  
  // Query the active tab to get current page stats
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      const activeTab = tabs[0];
      console.log("Active tab:", activeTab.url);
      
      // Check if the current page is Amazon
      const isAmazon = activeTab.url.includes('amazon.');
      if (isAmazon) {
        document.getElementById('status').textContent = 'Active (Amazon page detected)';
        
        // Add debug info
        const debugInfo = document.createElement('div');
        debugInfo.className = 'debug-info';
        debugInfo.innerHTML = `
          <p><strong>Debug Info:</strong></p>
          <p>Current URL: ${activeTab.url}</p>
        `;
        document.querySelector('.container').appendChild(debugInfo);
      }
    }
  });
  
  // Add a manual clean button
  const cleanButton = document.createElement('button');
  cleanButton.textContent = "Clean Current Page";
  cleanButton.style.marginTop = "10px";
  cleanButton.style.padding = "5px 10px";
  cleanButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab.url) {
          chrome.runtime.sendMessage({
            action: "cleanUrl",
            url: activeTab.url
          }, function(response) {
            if (response && response.cleanUrl && response.cleanUrl !== activeTab.url) {
              chrome.tabs.update(activeTab.id, { url: response.cleanUrl });
            } else {
              alert("URL is already clean or not an Amazon product URL");
            }
          });
        }
      }
    });
  });
  document.querySelector('.container').appendChild(cleanButton);
});
