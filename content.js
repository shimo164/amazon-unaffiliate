// Amazon Unaffiliate - content script
// Cleans Amazon links on the page before they are clicked

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

// Counter for cleaned links
let cleanedLinksCount = 0;

// Function to check if a URL is from Amazon
function isAmazonUrl(url) {
  try {
    const urlObj = new URL(url);
    return AMAZON_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

// Function to check if a URL is a shortener
function isShortenerUrl(url) {
  try {
    const urlObj = new URL(url);
    return URL_SHORTENERS.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
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
        
        // If URL was changed, increment counter
        if (cleanUrl !== originalUrl) {
          cleanedLinksCount++;
          // Notify background script
          chrome.runtime.sendMessage({action: "linkCleaned"});
        }
        
        return cleanUrl;
      }
    }
    
    // If it's not a product page or we couldn't extract the ID properly,
    // at least remove the affiliate tag
    if (urlObj.searchParams.has("tag")) {
      urlObj.searchParams.delete("tag");
      
      // URL was changed, increment counter
      cleanedLinksCount++;
      // Notify background script
      chrome.runtime.sendMessage({action: "linkCleaned"});
      
      return urlObj.toString();
    }
    
    return url;
  } catch (e) {
    return url;
  }
}

// Process all links on the page
function processLinks() {
  const links = document.getElementsByTagName('a');
  
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const href = link.getAttribute('href');
    
    if (!href) continue;
    
    // Handle Amazon links
    if (isAmazonUrl(href)) {
      const cleanUrl = cleanAmazonUrl(href);
      if (cleanUrl !== href) {
        link.setAttribute('href', cleanUrl);
        link.setAttribute('data-unaffiliated', 'true');
      }
    }
    // Handle potential shortened URLs
    else if (isShortenerUrl(href)) {
      // Mark shortened URLs for special handling on click
      link.setAttribute('data-shortened', 'true');
    }
  }
}

// Add a listener for click events on all links - this runs before the browser processes the click
document.addEventListener('click', function(event) {
  // Check if the clicked element is a link
  let target = event.target;
  while (target && target.tagName !== 'A') {
    target = target.parentElement;
  }
  
  if (target && target.tagName === 'A') {
    const href = target.getAttribute('href');
    
    if (!href) return;
    
    // Handle Amazon links
    if (isAmazonUrl(href)) {
      const cleanUrl = cleanAmazonUrl(href);
      if (cleanUrl !== href) {
        // Prevent the default action
        event.preventDefault();
        event.stopPropagation();
        
        // Update the link
        target.setAttribute('href', cleanUrl);
        
        // Navigate to the clean URL
        window.location.href = cleanUrl;
      }
    }
  }
}, true); // true for capture phase - this runs before the browser processes the click

// Run when the DOM is ready
function onReady() {
  // Process links
  processLinks();
  
  // Set up a MutationObserver to watch for dynamically added links
  const observer = new MutationObserver(function(mutations) {
    let shouldProcess = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
      }
    });
    
    if (shouldProcess) {
      processLinks();
    }
  });
  
  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // If we're on an Amazon page, clean the current URL
  if (isAmazonUrl(window.location.href)) {
    const cleanUrl = cleanAmazonUrl(window.location.href);
    if (cleanUrl !== window.location.href) {
      // Replace the current URL without reloading the page
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
}

// Run as soon as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}

// Process links as soon as possible, even before the DOM is fully loaded
processLinks();

// Also process links periodically
setInterval(processLinks, 1000);

// Log that the content script is running
console.log("Amazon Unaffiliate content script is running");
