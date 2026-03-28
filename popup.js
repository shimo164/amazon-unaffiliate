// Amazon Unaffiliate - popup script
const AMAZON_DOMAINS = [
  "amazon.com",
  "amazon.co.jp",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.ca"
];

function matchesAllowedHost(hostname, allowedHosts) {
  const normalizedHostname = hostname.toLowerCase();

  return allowedHosts.some((allowedHost) => {
    return (
      normalizedHostname === allowedHost ||
      normalizedHostname.endsWith(`.${allowedHost}`)
    );
  });
}

function isAmazonPage(url) {
  try {
    const urlObj = new URL(url);
    return matchesAllowedHost(urlObj.hostname, AMAZON_DOMAINS);
  } catch (error) {
    return false;
  }
}

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
      const isAmazon = isAmazonPage(activeTab.url);
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
      } else {
        document.getElementById('status').textContent = 'Inactive (not an Amazon page)';
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
