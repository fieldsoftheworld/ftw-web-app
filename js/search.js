// Store the currently selected feature
let selectedFeature = null;
let currentMgrsTileId = null;
let nextPageToken = null;
let currentStacLayerId = null;

// References to DOM elements
const searchResults = document.getElementById('search-results');
const searchStatus = document.getElementById('search-status');
const nextPageBtn = document.getElementById('next-page-btn');

// Function to search the STAC API
async function searchStacApi(mgrsTileId, resetSearch = true) {
    // Store the current MGRS tile ID for pagination
    currentMgrsTileId = mgrsTileId;
    
    // Get values from the form
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const cloudCover = document.getElementById('cloud-cover').value || 10;
    
    // If resetting search, clear previous results and token
    if (resetSearch) {
        searchResults.innerHTML = '';
        nextPageToken = null;
    }
    
    // Show status
    searchStatus.innerHTML = resetSearch ? 
        `Searching for Sentinel-2 images in tile ${mgrsTileId}...` : 
        'Loading more results...';
    
    // Disable next button while loading
    nextPageBtn.disabled = true;
    
    try {
        // Build the date constraint if dates are provided
        let dateConstraint = '';
        if (startDate && endDate) {
            dateConstraint = `&datetime=${startDate}/${endDate}`;
        } else if (startDate) {
            dateConstraint = `&datetime=${startDate}/..`;
        } else if (endDate) {
            dateConstraint = `&datetime=../${endDate}`;
        }
        
        // Create the CQL filter and encode it for URL
        const cqlFilter = encodeURIComponent(`eo:cloud_cover<${cloudCover} AND s2:mgrs_tile='${mgrsTileId}'`);
        
        // Construct the URL with query parameters and a limit of 20 results
        let searchUrl = `https://planetarycomputer.microsoft.com/api/stac/v1/search?collections=sentinel-2-l2a${dateConstraint}&filter-lang=cql2-text&filter=${cqlFilter}&limit=20`;
        
        // Add the pagination token if we're loading more results
        if (!resetSearch && nextPageToken) {
            searchUrl += `&token=${encodeURIComponent(nextPageToken)}`;
        }
        
        console.log("Search URL:", searchUrl);
        
        // Make the GET request
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/geo+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Look for the "next" link which contains the pagination token
        let nextLink = null;
        if (data.links) {
            nextLink = data.links.find(link => link.rel === 'next');
        }
        
        // Store the pagination token if available
        if (nextLink && nextLink.href) {
            // Extract token from the URL
            const tokenMatch = nextLink.href.match(/token=([^&]+)/);
            if (tokenMatch && tokenMatch[1]) {
                nextPageToken = decodeURIComponent(tokenMatch[1]);
                console.log("Next page token:", nextPageToken);
                nextPageBtn.disabled = false;
            } else {
                nextPageToken = null;
                nextPageBtn.disabled = true;
            }
        } else {
            nextPageToken = null;
            nextPageBtn.disabled = true;
        }
        
        // Display the search results
        if (data.features && data.features.length > 0) {
            // Update status if this is the first page
            if (resetSearch) {
                searchStatus.innerHTML = `Found ${data.features.length} Sentinel-2 images:`;
                if (nextPageToken) {
                    searchStatus.innerHTML += ' (scroll for more)';
                }
            } else {
                // Append to existing status
                searchStatus.innerHTML = `Loaded ${data.features.length} more images`;
                if (nextPageToken) {
                    searchStatus.innerHTML += ' (scroll for more)';
                }
            }
            
            // Create HTML for each result
            data.features.forEach(item => {
                const date = new Date(item.properties.datetime).toLocaleDateString();
                const cloudCover = item.properties["eo:cloud_cover"] || "N/A";
                
                // Get the thumbnail URL from the rendered_preview asset
                let thumbnailUrl = '#';
                if (item.assets && item.assets.rendered_preview && item.assets.rendered_preview.href) {
                    thumbnailUrl = item.assets.rendered_preview.href;
                }
                
                // Get the item bounds if available
                let bounds = null;
                if (item.bbox && item.bbox.length === 6) {
                    // Converting 3D bbox [minx, miny, minz, maxx, maxy, maxz] to 2D [minx, miny, maxx, maxy]
                    bounds = [item.bbox[0], item.bbox[1], item.bbox[3], item.bbox[4]];
                } else if (item.bbox && item.bbox.length === 4) {
                    bounds = item.bbox;
                }
                
                const resultHtml = `
                    <div class="result-item">
                        <div class="result-thumbnail">
                            <img src="${thumbnailUrl}" alt="Preview" onerror="this.style.display='none'">
                        </div>
                        <div class="result-info">
                            <div class="result-title">${item.id}</div>
                            <div class="result-date">Date: ${date}</div>
                            <div class="result-cloud">Cloud cover: ${cloudCover}%</div>
                            <div class="result-actions">
                                <a class="result-link" href="${item.links.find(l => l.rel === 'self')?.href || '#'}" target="_blank">View STAC Item</a>
                                <button class="view-map-btn" onclick="viewOnMap('${item.id}', ${JSON.stringify(bounds)})">View on Map</button>
                                <div class="window-buttons">
                                    <button class="win-btn win-a-btn" onclick="selectWindow('a', '${item.id}')">Win A</button>
                                    <button class="win-btn win-b-btn" onclick="selectWindow('b', '${item.id}')">Win B</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                searchResults.innerHTML += resultHtml;
            });
        } else {
            if (resetSearch) {
                searchStatus.innerHTML = 'No images found for the selected criteria.';
            } else {
                searchStatus.innerHTML = 'No more images available.';
            }
            nextPageBtn.disabled = true;
        }
    } catch (error) {
        console.error("Error searching STAC API:", error);
        searchStatus.innerHTML = `Error searching STAC API: ${error.message}`;
        nextPageBtn.disabled = true;
    }
}

// Add event listener for the Next button
document.addEventListener('DOMContentLoaded', () => {
    nextPageBtn.addEventListener('click', () => {
        if (currentMgrsTileId) {
            searchStacApi(currentMgrsTileId, false);
        }
    });
    
    // Add event listeners for the date inputs (to trigger immediate search when changed)
    document.getElementById('start-date').addEventListener('change', () => {
        if (currentMgrsTileId) {
            searchStacApi(currentMgrsTileId, true);
        }
    });
    
    document.getElementById('end-date').addEventListener('change', () => {
        if (currentMgrsTileId) {
            searchStacApi(currentMgrsTileId, true);
        }
    });
    
    document.getElementById('cloud-cover').addEventListener('change', () => {
        if (currentMgrsTileId) {
            searchStacApi(currentMgrsTileId, true);
        }
    });
});

// Make searchStacApi globally available
window.searchStacApi = searchStacApi; 