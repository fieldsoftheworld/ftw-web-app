// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {
            // Add the Sentinel-2 cloudless imagery as a raster source
            'sentinel-cloudless': {
                type: 'raster',
                tiles: [
                    'https://tiles.maps.eox.at/wmts?layer=s2cloudless-2024_3857&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'
                ],
                tileSize: 256,
                attribution: 'Sentinel-2 cloudless imagery by <a href="https://eox.at">EOX</a>'
            }
        },
        layers: [
            // Add the Sentinel-2 cloudless imagery as a layer
            {
                id: 'sentinel-cloudless-layer',
                type: 'raster',
                source: 'sentinel-cloudless',
                minzoom: 0,
                maxzoom: 18
            }
        ]
    },
    center: [0, 0],
    zoom: 2
});

// Update the layer state to include an active property
let layerState = {
    'window-a': {
        layerId: null,
        itemId: null,
        visible: false,
        opacity: 1.0,
        active: false
    },
    'window-b': {
        layerId: null,
        itemId: null,
        visible: false,
        opacity: 1.0,
        active: false
    },
    'current': {
        layerId: null,
        itemId: null,
        visible: true,
        opacity: 1.0,
        active: false
    }
};

// Function to add a STAC item as a layer to the map
function addStacLayerToMap(itemId, bounds, target = 'current') {
    try {
        // Show loading status
        searchStatus.innerHTML = `Loading ${target} layer...`;
        
        // If the target already has a layer, remove it
        if (layerState[target].layerId) {
            if (map.getLayer(layerState[target].layerId)) {
                map.removeLayer(layerState[target].layerId);
            }
            if (map.getSource(layerState[target].layerId)) {
                map.removeSource(layerState[target].layerId);
            }
        }
        
        // Create the tile URL template with the item ID
        const tileUrlTemplate = `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&item=${itemId}&assets=visual&asset_bidx=visual%7C1%2C2%2C3&nodata=0&format=png`;
        
        // Create a new layer ID
        const newLayerId = `stac-layer-${target}-${Date.now()}`;
        layerState[target].layerId = newLayerId;
        layerState[target].itemId = itemId;
        layerState[target].active = true;
        
        // Add the source
        map.addSource(newLayerId, {
            type: 'raster',
            tiles: [tileUrlTemplate],
            tileSize: 256,
            attribution: 'Sentinel-2 imagery from <a href="https://planetarycomputer.microsoft.com/">Planetary Computer</a>'
        });
        
        // Add the layer - set visibility based on current state
        map.addLayer({
            id: newLayerId,
            type: 'raster',
            source: newLayerId,
            paint: {
                'raster-opacity': layerState[target].opacity
            },
            layout: {
                visibility: layerState[target].visible ? 'visible' : 'none'
            }
        });
        
        // If bounds are available, zoom to them
        if (bounds && target === 'current') {
            map.fitBounds([
                [bounds[0], bounds[1]], // Southwest corner
                [bounds[2], bounds[3]]  // Northeast corner
            ], {
                padding: 50,
                duration: 1000
            });
        }
        
        // Update the layer controls
        updateLayerControls();
        
        // Update status
        searchStatus.innerHTML = `Added ${itemId} to ${target} layer`;
        
        return true;
    } catch (error) {
        console.error(`Error adding STAC layer to ${target}:`, error);
        searchStatus.innerHTML = `Error loading ${target} layer: ${error.message}`;
        return false;
    }
}

// Function to update layer controls based on active layers
function updateLayerControls() {
    const controlsContainer = document.getElementById('layer-controls-container');
    const mapControls = document.getElementById('map-controls');
    
    // Clear existing controls
    controlsContainer.innerHTML = '';
    
    // Flag to track if we have any active layers
    let hasActiveLayers = false;
    
    // Create controls for each active layer
    for (const [key, state] of Object.entries(layerState)) {
        if (state.active) {
            hasActiveLayers = true;
            
            // Create friendly name and icon
            let layerName, layerIcon;
            if (key === 'current') {
                layerName = 'Current Selection';
                layerIcon = 'fa-image';
            } else if (key === 'window-a') {
                layerName = 'Window A Layer';
                layerIcon = 'fa-square-a';
            } else {
                layerName = 'Window B Layer';
                layerIcon = 'fa-square-b';
            }
            
            // Create the layer control HTML
            const layerHtml = `
                <div class="layer-item" id="layer-item-${key}">
                    <div class="layer-header">
                        <input type="checkbox" id="layer-${key}" class="layer-visibility" onchange="toggleLayerVisibility('${key}')" ${state.visible ? 'checked' : ''}>
                        <label for="layer-${key}"><i class="fas ${layerIcon}"></i> ${layerName}</label>
                    </div>
                    <div class="opacity-control">
                        <span>Opacity:</span>
                        <input type="range" id="opacity-${key}" class="opacity-slider" min="0" max="1" step="0.1" value="${state.opacity}" 
                               onchange="updateLayerOpacity('${key}', this.value)" 
                               oninput="updateLayerOpacity('${key}', this.value)">
                    </div>
                </div>
            `;
            
            controlsContainer.innerHTML += layerHtml;
        }
    }
    
    // Show map controls if there are active layers and expand them
    if (hasActiveLayers && mapControls.classList.contains('minimized')) {
        mapControls.classList.remove('minimized');
    }
    
    // Show or hide the controls container based on active layers
    mapControls.style.display = hasActiveLayers ? 'block' : 'none';
}

// Function to toggle layer visibility
function toggleLayerVisibility(layerKey) {
    const checkbox = document.getElementById(`layer-${layerKey}`);
    layerState[layerKey].visible = checkbox.checked;
    
    if (layerState[layerKey].layerId) {
        const visibility = checkbox.checked ? 'visible' : 'none';
        map.setLayoutProperty(layerState[layerKey].layerId, 'visibility', visibility);
    }
}

// Function to update layer opacity
function updateLayerOpacity(layerKey, value) {
    layerState[layerKey].opacity = parseFloat(value);
    
    if (layerState[layerKey].layerId) {
        map.setPaintProperty(layerState[layerKey].layerId, 'raster-opacity', layerState[layerKey].opacity);
    }
}

// Function to view an item on the map
function viewOnMap(itemId, bounds) {
    // Reset all buttons first
    document.querySelectorAll('.view-map-btn').forEach(btn => {
        btn.textContent = 'View on Map';
        btn.classList.remove('active');
    });
    
    // Find and update the clicked button
    const clickedButton = event.target;
    clickedButton.textContent = 'Viewing';
    clickedButton.classList.add('active');
    
    // Add the layer to the map as current selection
    addStacLayerToMap(itemId, bounds, 'current');
}

// Function to select a window
function selectWindow(window, itemId) {
    const windowField = document.getElementById(`window-${window}`);
    const allButtons = document.querySelectorAll(`.win-${window}-btn`);
    
    // Check if this item is already selected for this window (toggle behavior)
    if (windowField.value === itemId) {
        // Deselect the item
        windowField.value = '';
        
        // Reset all buttons for this window
        allButtons.forEach(btn => {
            btn.textContent = `Win ${window.toUpperCase()}`;
            btn.classList.remove('selected');
        });
        
        // If there's an active layer for this window, remove it
        if (layerState[`window-${window}`].active) {
            // Remove the layer if it exists
            if (layerState[`window-${window}`].layerId) {
                if (map.getLayer(layerState[`window-${window}`].layerId)) {
                    map.removeLayer(layerState[`window-${window}`].layerId);
                }
                if (map.getSource(layerState[`window-${window}`].layerId)) {
                    map.removeSource(layerState[`window-${window}`].layerId);
                }
            }
            
            // Reset the layer state
            layerState[`window-${window}`].active = false;
            layerState[`window-${window}`].layerId = null;
            layerState[`window-${window}`].itemId = null;
            
            // Update the layer controls
            updateLayerControls();
        }
        
        return; // Exit the function
    }
    
    // Normal selection flow - select the item
    // Update the window field with the selected item ID
    windowField.value = itemId;
    
    // Add the selected image as a layer for this window
    addStacLayerToMap(itemId, null, `window-${window}`);
    
    // Make the layer visible
    layerState[`window-${window}`].visible = true;
    
    // Try to update the checkbox if it exists
    const checkbox = document.getElementById(`layer-window-${window}`);
    if (checkbox) {
        checkbox.checked = true;
        toggleLayerVisibility(`window-${window}`);
    }
    
    // Reset all buttons for this window first
    allButtons.forEach(btn => {
        btn.textContent = `Win ${window.toUpperCase()}`;
        btn.classList.remove('selected');
    });
    
    // Find the clicked button and highlight it permanently
    const clickedButton = event.target;
    clickedButton.textContent = 'Selected';
    clickedButton.classList.add('selected');
}

// References to DOM elements for use in this file
const loadingElement = document.getElementById('loading');
const selectionInfo = document.getElementById('selection-info');

// Load S2 grid GeoJSON when the map loads
map.on('load', async () => {
    loadingElement.style.display = 'block';
    
    try {
        // Fetch the zipped GeoJSON file
        const response = await fetch('https://data.source.coop/cholmes/s2-grid/s2-grid.geojson.zip');
        const zipBlob = await response.blob();
        
        // Use JSZip to unzip the file
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(zipBlob);
        
        // Find the first file in the zip (should be the .geojson)
        const fileNames = Object.keys(zipContents.files);
        if (fileNames.length === 0) {
            throw new Error('No files found in the zip archive');
        }
        
        // Get the GeoJSON content
        const geoJsonFile = zipContents.files[fileNames.find(name => name.endsWith('.geojson'))];
        if (!geoJsonFile) {
            throw new Error('No GeoJSON file found in the zip archive');
        }
        
        const geoJsonText = await geoJsonFile.async('text');
        const geoJson = JSON.parse(geoJsonText);
        
        // Add the GeoJSON as a source
        map.addSource('s2-grid', {
            type: 'geojson',
            data: geoJson
        });
        
        // Add the S2 grid as a fill layer with mostly transparent fill
        map.addLayer({
            id: 's2-grid-fill',
            type: 'fill',
            source: 's2-grid',
            paint: {
                'fill-color': '#088',
                'fill-opacity': 0.1
            }
        });
        
        // Add the S2 grid as a line layer with thin lines
        map.addLayer({
            id: 's2-grid-line',
            type: 'line',
            source: 's2-grid',
            paint: {
                'line-color': '#088',
                'line-width': 0.5,
                'line-opacity': 0.8
            }
        });
        
        // Add click interaction for grid cells to trigger search
        map.on('click', 's2-grid-fill', (e) => {
            // Get the clicked feature
            const features = map.queryRenderedFeatures(e.point, { layers: ['s2-grid-fill'] });
            
            if (!features.length) {
                return;
            }
            
            const feature = features[0];
            selectedFeature = feature;
            
            // Calculate the bounds of the feature
            const bounds = new maplibregl.LngLatBounds();
            
            // For polygons, we need to add all coordinates to the bounds
            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach(coord => {
                    bounds.extend(coord);
                });
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon => {
                    polygon[0].forEach(coord => {
                        bounds.extend(coord);
                    });
                });
            }
            
            // Zoom to the feature with some padding
            map.fitBounds(bounds, {
                padding: 50,
                maxZoom: 13, // Limit how far it zooms in
                duration: 1000 // Animation time in milliseconds
            });
            
            // Use the 'Name' property specifically as confirmed by the user
            let mgrsTileId = feature.properties.Name || '37PDN';
            
            console.log("Found MGRS Tile ID:", mgrsTileId, "from property 'Name'");
            
            // Update the sidebar with selected grid cell info
            selectionInfo.innerHTML = `<strong>Selected Grid Cell:</strong> ${mgrsTileId}`;
            
            // Trigger search automatically
            searchStacApi(mgrsTileId, true);
        });
        
        // Change cursor to pointer when hovering over a feature
        map.on('mouseenter', 's2-grid-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 's2-grid-fill', () => {
            map.getCanvas().style.cursor = '';
        });
        
        // Hide loading indicator
        loadingElement.style.display = 'none';
        
        // Initialize the layer controls
        updateLayerControls();
        
        // Load user preferences from localStorage
        const mapControlsMinimized = localStorage.getItem('mapControlsMinimized') === 'true';
        const filtersVisible = localStorage.getItem('filtersVisible') === 'true';
        
        // Apply preferences
        if (!mapControlsMinimized) {
            document.getElementById('map-controls').classList.remove('minimized');
        }
        
        // Set initial filter visibility
        const searchForm = document.getElementById('search-form');
        const toggleIcon = document.getElementById('filters-toggle-icon');
        
        if (!filtersVisible) {
            searchForm.style.display = 'none';
        } else {
            toggleIcon.style.transform = 'rotate(180deg)';
        }
        
    } catch (error) {
        console.error("Error loading S2 grid data:", error);
        loadingElement.textContent = 'Error loading S2 grid data';
        setTimeout(() => {
            loadingElement.style.display = 'none';
        }, 3000);
    }
}); 