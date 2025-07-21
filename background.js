// Amazon Unaffiliate - background script
// Uses declarativeNetRequest to block and redirect Amazon affiliate links

// List of Amazon domains to monitor
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

// Common URL shorteners
const URL_SHORTENERS = [
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "amzn.to",
  "amzn.asia",
  "t.co",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "rb.gy",
  "tiny.cc"
];

// Statistics tracking
let stats = {
  totalCleaned: 0,
  lastPageCleaned: 0
};

// Load saved statistics
chrome.storage.local.get(['totalCleaned'], function(result) {
  if (result.totalCleaned) {
    stats.totalCleaned = result.totalCleaned;
  }
});

// Function to update statistics
function updateStats(increment = 1) {
  stats.totalCleaned += increment;
  stats.lastPageCleaned += increment;
  
  // Save to storage
  chrome.storage.local.set({
    'totalCleaned': stats.totalCleaned,
    'lastPageCleaned': stats.lastPageCleaned
  });
}

// Reset page stats when navigating to a new page
chrome.webNavigation.onBeforeNavigate.addListener(function() {
  stats.lastPageCleaned = 0;
  chrome.storage.local.set({ 'lastPageCleaned': 0 });
});

// Function to check if a URL is from Amazon
function isAmazonUrl(url) {
  try {
    const urlObj = new URL(url);
    return AMAZON_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    console.error("Error parsing URL:", e);
    return false;
  }
}

// Function to check if a URL is a shortener
function isShortenerUrl(url) {
  try {
    const urlObj = new URL(url);
    return URL_SHORTENERS.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    console.error("Error parsing URL:", e);
    return false;
  }
}

// Function to clean Amazon URL by removing all query parameters
function cleanAmazonUrl(url) {
  try {
    const urlObj = new URL(url);
    const originalUrl = url;
    
    // Check if this is a product page URL (contains /dp/ or /gp/)
    if (urlObj.pathname.includes('/dp/') || urlObj.pathname.includes('/gp/')) {
      // Extract the base product URL without query parameters
      let productId = '';
      let pathPrefix = '';
      
      // Extract product ID from URL path
      if (urlObj.pathname.includes('/dp/')) {
        const dpIndex = urlObj.pathname.indexOf('/dp/');
        pathPrefix = '/dp/';
        const pathAfterDp = urlObj.pathname.substring(dpIndex + 4); // +4 to skip '/dp/'
        productId = pathAfterDp.split('/')[0];
      } else if (urlObj.pathname.includes('/gp/')) {
        const gpIndex = urlObj.pathname.indexOf('/gp/');
        pathPrefix = '/gp/product/';
        const pathAfterGp = urlObj.pathname.substring(gpIndex + 12); // +12 to skip '/gp/product/'
        if (pathAfterGp && pathAfterGp.length > 0) {
          productId = pathAfterGp.split('/')[0];
        }
      }
      
      // If we found a product ID, construct a clean URL
      if (productId) {
        const cleanUrl = `${urlObj.protocol}//${urlObj.host}${pathPrefix}${productId}/`;
        
        // If URL was changed, update stats
        if (cleanUrl !== originalUrl) {
          updateStats();
          console.log("Cleaned URL:", cleanUrl);
        }
        
        return cleanUrl;
      }
    }
    
    // If it's not a product page or we couldn't extract the ID properly,
    // at least remove the affiliate tag
    if (urlObj.searchParams.has("tag")) {
      urlObj.searchParams.delete("tag");
      
      // URL was changed, update stats
      updateStats();
      console.log("Removed affiliate tag:", urlObj.toString());
      
      return urlObj.toString();
    }
    
    return url;
  } catch (e) {
    console.error("Error cleaning URL:", e);
    return url;
  }
}

// Listen for rule matches (for statistics)
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
    function(info) {
      console.log("Rule matched:", info);
      updateStats();
    }
  );
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "linkCleaned") {
    updateStats();
    sendResponse({success: true});
  } else if (message.action === "cleanUrl") {
    const cleanUrl = cleanAmazonUrl(message.url);
    sendResponse({cleanUrl: cleanUrl});
  }
  return true; // Keep the message channel open for async response
});

// Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("Amazon Unaffiliate extension installed/updated:", details.reason);
});
