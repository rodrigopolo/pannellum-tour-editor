/**
 * Panorama Tour Editor - JavaScript Core Module
 * 
 * A comprehensive visual editor for creating interactive 360° panoramic tours.
 * Integrates directly with Pannellum.js library for real-time preview and editing.
 * 
 * Features:
 * - Scene management (add/edit/delete/reorder)
 * - Hotspot creation and editing with drag-and-drop
 * - Real-time preview with Pannellum viewer
 * - Configuration import/export
 * - Multi-resolution panorama support
 * 
 * @version 2.0
 * @author Tour Editor Team
 * @requires pannellum.js
 */
/**
 * Global tour configuration object
 * Contains all tour settings, scenes, and hotspots
 * @type {Object}
 */
let tourConfig = {
    "default": {
        "firstScene": "",
        "sceneOrder": [],
        "sceneFadeDuration": 1000,
        "autoLoad": true
    },
    "scenes": {}
};

/**
 * Global state variables
 */
let viewer = null;              // Pannellum viewer instance
let currentScene = null;        // Currently selected scene ID
let pendingHotspot = null;      // Temporary hotspot data during creation/editing
let draggedSceneId = null;      // Scene being dragged in scene order list
let draggedHotspotIndex = null; // Hotspot being dragged in hotspot list
let hotspotCounter = 0;         // Counter for generating unique hotspot IDs

/**
 * DOM element references
 * Cached on page load for better performance
 */
const sceneSelect = document.getElementById('sceneSelect');
const firstSceneSelect = document.getElementById('firstScene');
const addSceneBtn = document.getElementById('addSceneBtn');
const deleteSceneBtn = document.getElementById('deleteSceneBtn');
const captureViewBtn = document.getElementById('captureViewBtn');
const exportBtn = document.getElementById('exportBtn');
const copyBtn = document.getElementById('copyBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const previewBtn = document.getElementById('previewBtn');

// Scene management elements
const editSceneBtn = document.getElementById('editSceneBtn');

// Hotspots elements
const hotspotsSection = document.getElementById('hotspotsSection');
const hotspotsList = document.getElementById('hotspotsList');

// Modal elements
const addSceneModal = document.getElementById('addSceneModal');
const addHotspotModal = document.getElementById('addHotspotModal');
const editSceneModal = document.getElementById('editSceneModal');

/**
 * ===================================================================
 * VIEWER MANAGEMENT FUNCTIONS
 * ===================================================================
 */
/**
 * Initialize or reinitialize the Pannellum viewer
 * Creates a new viewer instance with current tour configuration
 */
function initializeViewer() {
    if (!document.getElementById('panorama')) {
        console.error('Panorama container not found');
        return;
    }
    
    // Destroy existing viewer if any
    if (viewer) {
        try {
            viewer.destroy();
        } catch (e) {
        }
        viewer = null;
    }
    
    // Only initialize if we have scenes
    if (Object.keys(tourConfig.scenes).length > 0) {
        // Clear any placeholder message
        document.getElementById('panorama').innerHTML = '';
        
        try {
            // Pass a deep copy to prevent Pannellum from modifying our config
            const configCopy = JSON.parse(JSON.stringify(tourConfig));
            viewer = pannellum.viewer('panorama', configCopy);
            setupViewerEventListeners();
            setupNavigationButtons();
            
            // If no scene is currently selected, select the first scene
            if (!currentScene && tourConfig.default.firstScene && tourConfig.scenes[tourConfig.default.firstScene]) {
                sceneSelect.value = tourConfig.default.firstScene;
                selectScene();
            } else if (!currentScene && Object.keys(tourConfig.scenes).length > 0) {
                sceneSelect.value = Object.keys(tourConfig.scenes)[0];
                selectScene();
            }
        } catch (error) {
            console.error('Error initializing viewer:', error);
        }
    } else {
        // Clear the panorama container if no scenes
        document.getElementById('panorama').innerHTML = '<div style="color: #666; text-align: center; padding: 50px;">No scenes available. Add a scene to get started.</div>';
    }
}

/**
 * Safely destroy the current viewer instance
 * Prevents memory leaks when switching configurations
 */
function destroyViewer() {
    if (viewer) {
        try {
            viewer.destroy();
        } catch (e) {
        }
        viewer = null;
    }
}

/**
 * Set up event listeners for the Pannellum viewer
 * Handles scene changes, hotspot placement, and keyboard shortcuts
 */
function setupViewerEventListeners() {
    if (!viewer) return;
    
    // Scene change event
    viewer.on('scenechange', function(sceneId) {
        // Update current scene index for navigation
        updateNavigationIndex(sceneId);
        
        // Update scene dropdown to match the current scene
        if (sceneSelect.value !== sceneId) {
            sceneSelect.value = sceneId;
            selectScene();
        }
    });
    
    // Handle clicks for adding hotspots
    const panoramaEl = document.querySelector('#panorama');
    if (!panoramaEl) return;
    
    let isCtrlPressed = false;
    
    // Track ctrl/cmd key
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            isCtrlPressed = true;
            panoramaEl.style.cursor = 'crosshair';
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (!e.ctrlKey && !e.metaKey) {
            isCtrlPressed = false;
            panoramaEl.style.cursor = 'default';
        }
    });
    
    // Handle click for adding hotspots
    panoramaEl.addEventListener('click', function(e) {
        if ((e.ctrlKey || e.metaKey) && currentScene && viewer) {
            e.preventDefault();
            e.stopPropagation();
            
            // Use Pannellum's API to get accurate coordinates
            const coords = viewer.mouseEventToCoords(e);
            if (coords) {
                const pitch = coords[0];
                const yaw = coords[1];
                showAddHotspotModal(pitch, yaw);
            }
            
            return false;
        }
    });
}

/**
 * ===================================================================
 * SCENE NAVIGATION FUNCTIONS
 * ===================================================================
 */
let currentSceneIndex = 0;

/**
 * Set up previous/next navigation buttons
 */
function setupNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.onclick = prevScene;
    }
    
    if (nextBtn) {
        nextBtn.onclick = nextScene;
    }
}

/**
 * Update the current scene index for navigation
 * @param {string} sceneId - The ID of the current scene
 */
function updateNavigationIndex(sceneId) {
    const sceneOrder = tourConfig.default.sceneOrder || Object.keys(tourConfig.scenes);
    const index = sceneOrder.indexOf(sceneId);
    if (index !== -1) {
        currentSceneIndex = index;
    }
}

/**
 * Navigate to the next scene in the tour order
 */
function nextScene() {
    const sceneOrder = tourConfig.default.sceneOrder || Object.keys(tourConfig.scenes);
    if (sceneOrder.length > 0 && viewer) {
        currentSceneIndex = (currentSceneIndex + 1) % sceneOrder.length;
        viewer.loadScene(sceneOrder[currentSceneIndex]);
    }
}

/**
 * Navigate to the previous scene in the tour order
 */
function prevScene() {
    const sceneOrder = tourConfig.default.sceneOrder || Object.keys(tourConfig.scenes);
    if (sceneOrder.length > 0 && viewer) {
        currentSceneIndex = (currentSceneIndex - 1 + sceneOrder.length) % sceneOrder.length;
        viewer.loadScene(sceneOrder[currentSceneIndex]);
    }
}

/**
 * ===================================================================
 * INITIALIZATION AND EVENT SETUP
 * ===================================================================
 */

/**
 * Initialize the editor when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeSceneOrder();
    updateSceneDropdowns();
    renderSceneOrderList();
    restoreSceneOrderState();
    initializeViewer();
});

/**
 * Set up all event listeners for the editor interface
 */
function setupEventListeners() {
    // Scene management
    addSceneBtn.addEventListener('click', showAddSceneModal);
    editSceneBtn.addEventListener('click', showEditSceneModal);
    deleteSceneBtn.addEventListener('click', deleteCurrentScene);
    captureViewBtn.addEventListener('click', captureCurrentView);
    sceneSelect.addEventListener('change', selectScene);
    
    // Configuration
    exportBtn.addEventListener('click', exportConfiguration);
    copyBtn.addEventListener('click', copyJSObject);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importConfiguration);
    previewBtn.addEventListener('click', () => {
        initializeViewer(); // Force refresh
        
        // Update scene dropdown to match the first scene that viewer loads
        if (tourConfig.default.firstScene && tourConfig.scenes[tourConfig.default.firstScene]) {
            sceneSelect.value = tourConfig.default.firstScene;
            currentScene = tourConfig.default.firstScene;
            selectScene();
        } else if (Object.keys(tourConfig.scenes).length > 0) {
            const firstAvailableScene = Object.keys(tourConfig.scenes)[0];
            sceneSelect.value = firstAvailableScene;
            currentScene = firstAvailableScene;
            selectScene();
        }
    });
    
    // Modal handlers
    document.getElementById('confirmAddScene').addEventListener('click', addNewScene);
    document.getElementById('cancelAddScene').addEventListener('click', hideAddSceneModal);
    document.getElementById('confirmEditScene').addEventListener('click', editCurrentScene);
    document.getElementById('cancelEditScene').addEventListener('click', hideEditSceneModal);
    document.getElementById('confirmAddHotspot').addEventListener('click', confirmAddHotspot);
    document.getElementById('cancelAddHotspot').addEventListener('click', hideAddHotspotModal);
    
    // First scene selection
    firstSceneSelect.addEventListener('change', (e) => {
        tourConfig.default.firstScene = e.target.value;
        if (viewer && e.target.value) {
            // Just update config, don't load the scene
            // The viewer will use this on next refresh
        }
    });
    
    // Scene Order collapse toggle
    const sceneOrderHeader = document.getElementById('sceneOrderHeader');
    if (sceneOrderHeader) {
        sceneOrderHeader.addEventListener('click', toggleSceneOrder);
    }
    
    // Auto-populate hotspot text and ID when target scene is selected
    const hotspotTarget = document.getElementById('hotspotTarget');
    const hotspotText = document.getElementById('hotspotText');
    const hotspotId = document.getElementById('hotspotId');
    if (hotspotTarget && hotspotText && hotspotId) {
        hotspotTarget.addEventListener('change', (e) => {
            const targetScene = e.target.value;
            
            // Auto-populate text if empty
            if (targetScene && !hotspotText.value.trim()) {
                hotspotText.value = targetScene;  // Use scene ID directly
            }
            
            // Auto-update ID to match target scene (but preserve user edits)
            if (targetScene) {
                const currentId = hotspotId.value.trim();
                // Only update if current ID follows the auto-generated pattern or is empty
                if (!currentId || /^hs_\w+_\d{3}$/.test(currentId)) {
                    const newId = generateSceneBasedHotspotId(targetScene);
                    hotspotId.value = newId;
                }
            }
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addSceneModal) hideAddSceneModal();
        if (e.target === editSceneModal) hideEditSceneModal();
        if (e.target === addHotspotModal) hideAddHotspotModal();
    });
}

/**
 * ===================================================================
 * SCENE MANAGEMENT FUNCTIONS
 * ===================================================================
 */
/**
 * Show the modal dialog for adding a new scene
 */
function showAddSceneModal() {
    addSceneModal.style.display = 'flex';
    document.getElementById('newSceneId').value = '';
    document.getElementById('newScenePath').value = '';
}

/**
 * Hide the add scene modal dialog
 */
function hideAddSceneModal() {
    addSceneModal.style.display = 'none';
}

/**
 * Show the modal dialog for editing the current scene
 * Populates form fields with current scene data
 */
function showEditSceneModal() {
    if (!currentScene || !tourConfig.scenes[currentScene]) {
        alert('Please select a scene first');
        return;
    }
    
    const scene = tourConfig.scenes[currentScene];
    
    // Populate modal with current scene data
    document.getElementById('editSceneId').value = currentScene;
    document.getElementById('editScenePath').value = scene.multiRes.basePath || '';
    document.getElementById('editSceneHfov').value = scene.hfov || 100;
    document.getElementById('editScenePitch').value = scene.pitch || 0;
    document.getElementById('editSceneYaw').value = scene.yaw || 0;
    document.getElementById('editSceneMaxLevel').value = scene.multiRes.maxLevel || 5;
    document.getElementById('editSceneCubeResolution').value = scene.multiRes.cubeResolution || 8192;
    
    editSceneModal.style.display = 'flex';
}

/**
 * Hide the edit scene modal dialog
 */
function hideEditSceneModal() {
    editSceneModal.style.display = 'none';
}

/**
 * Create a new scene with the provided configuration
 * Validates input and updates both config and viewer
 */
function addNewScene() {
    const newSceneId = document.getElementById('newSceneId').value.trim();
    const newScenePath = document.getElementById('newScenePath').value.trim();
    const maxLevel = parseInt(document.getElementById('newSceneMaxLevel').value);
    const cubeResolution = parseInt(document.getElementById('newSceneCubeResolution').value);
    
    if (!newSceneId || !newScenePath) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (tourConfig.scenes[newSceneId]) {
        alert('Scene ID already exists');
        return;
    }
    
    // Create new scene configuration
    tourConfig.scenes[newSceneId] = {
        "hfov": 100,
        "pitch": 0,
        "yaw": 0,
        "type": "multires",
        "preview": newScenePath + "1/f_0_0.jpg",
        "multiRes": {
            "basePath": newScenePath,
            "path": "%l/%s_%y_%x",
            "fallbackPath": "/fallback/%s",
            "extension": "jpg",
            "tileResolution": 512,
            "maxLevel": maxLevel,
            "cubeResolution": cubeResolution
        },
        "hotSpots": []
    };
    
    // Add to scene order
    tourConfig.default.sceneOrder.push(newSceneId);
    
    hideAddSceneModal();
    updateSceneDropdowns();
    renderSceneOrderList();
    
    // Set as first scene ONLY if this is the very first scene
    if (Object.keys(tourConfig.scenes).length === 1) {
        tourConfig.default.firstScene = newSceneId;
        firstSceneSelect.value = newSceneId;
    }
    
    // If viewer exists, add scene dynamically
    if (viewer) {
        try {
            // Pass a deep copy to prevent Pannellum from modifying our config
            const sceneCopy = JSON.parse(JSON.stringify(tourConfig.scenes[newSceneId]));
            viewer.addScene(newSceneId, sceneCopy);
            // Load the new scene
            viewer.loadScene(newSceneId, 
                tourConfig.scenes[newSceneId].pitch || 0,
                tourConfig.scenes[newSceneId].yaw || 0,
                tourConfig.scenes[newSceneId].hfov || 100
            );
        } catch (error) {
            console.error('Error adding scene to viewer:', error);
            // Fallback to reinitialize
            initializeViewer();
        }
    } else {
        // Initialize viewer if it doesn't exist
        initializeViewer();
    }
    
    sceneSelect.value = newSceneId;
    selectScene();
}

/**
 * Count hotspots related to a specific scene
 * @param {string} sceneId - Scene ID to analyze
 * @returns {Object} Object with counts of different hotspot types
 */
function countRelatedHotspots(sceneId) {
    let ownHotspots = 0;  // Hotspots belonging to this scene
    let referencingHotspots = 0;  // Hotspots in other scenes pointing to this scene
    
    // Count hotspots belonging to the scene being deleted
    if (tourConfig.scenes[sceneId] && tourConfig.scenes[sceneId].hotSpots) {
        ownHotspots = tourConfig.scenes[sceneId].hotSpots.length;
    }
    
    // Count hotspots in other scenes that point to this scene
    Object.keys(tourConfig.scenes).forEach(otherSceneId => {
        if (otherSceneId !== sceneId && tourConfig.scenes[otherSceneId].hotSpots) {
            referencingHotspots += tourConfig.scenes[otherSceneId].hotSpots.filter(
                hotspot => hotspot.sceneId === sceneId
            ).length;
        }
    });
    
    return {
        own: ownHotspots,
        referencing: referencingHotspots,
        total: ownHotspots + referencingHotspots
    };
}

/**
 * Delete the currently selected scene
 * Removes scene, updates references, and cleans up hotspots
 */
function deleteCurrentScene() {
    if (!currentScene) return;
    
    // Count related hotspots
    const hotspotCounts = countRelatedHotspots(currentScene);
    
    // Create enhanced confirmation message
    let confirmMessage = `Are you sure you want to delete scene "${currentScene}"?`;
    
    if (hotspotCounts.total > 0) {
        confirmMessage += `\n\nThis will also delete ${hotspotCounts.total} related hotspot${hotspotCounts.total > 1 ? 's' : ''}:`;
        
        if (hotspotCounts.own > 0) {
            confirmMessage += `\n• ${hotspotCounts.own} hotspot${hotspotCounts.own > 1 ? 's' : ''} from this scene`;
        }
        
        if (hotspotCounts.referencing > 0) {
            confirmMessage += `\n• ${hotspotCounts.referencing} hotspot${hotspotCounts.referencing > 1 ? 's' : ''} in other scenes that point${hotspotCounts.referencing > 1 ? '' : 's'} here`;
        }
        
        confirmMessage += '\n\nDo you want to proceed with the deletion?';
    }
    
    if (confirm(confirmMessage)) {
        if (viewer) {
            try {
                const currentActiveScene = viewer.getScene();
                const remainingScenesAfterDeletion = Object.keys(tourConfig.scenes).filter(id => id !== currentScene);
                
                // Step 1: Remove all hotspots that belong to the scene being deleted (while still on that scene)
                if (currentActiveScene === currentScene && tourConfig.scenes[currentScene] && tourConfig.scenes[currentScene].hotSpots) {
                    tourConfig.scenes[currentScene].hotSpots.forEach(hotspot => {
                        if (hotspot.id) {
                            try {
                                viewer.removeHotSpot(hotspot.id, currentScene);
                            } catch (e) {
                                console.warn('Failed to remove hotspot from viewer:', hotspot.id, e);
                            }
                        }
                    });
                }
                
                // Step 2: Switch to another scene if we're deleting the currently active scene
                if (currentActiveScene === currentScene && remainingScenesAfterDeletion.length > 0) {
                    const nextScene = remainingScenesAfterDeletion[0];
                    const nextSceneConfig = tourConfig.scenes[nextScene];
                    viewer.loadScene(nextScene, nextSceneConfig.pitch, nextSceneConfig.yaw, nextSceneConfig.hfov);
                }
                
                // Step 3: Remove hotspots from other scenes that point to the scene being deleted
                Object.keys(tourConfig.scenes).forEach(sceneId => {
                    if (sceneId !== currentScene && tourConfig.scenes[sceneId].hotSpots) {
                        const hotspotsToRemove = tourConfig.scenes[sceneId].hotSpots.filter(
                            hotspot => hotspot.sceneId === currentScene
                        );
                        
                        hotspotsToRemove.forEach(hotspot => {
                            if (hotspot.id) {
                                try {
                                    // We need to switch to the scene that contains this hotspot to remove it
                                    const currentViewerScene = viewer.getScene();
                                    if (currentViewerScene !== sceneId) {
                                        const tempSceneConfig = tourConfig.scenes[sceneId];
                                        viewer.loadScene(sceneId, tempSceneConfig.pitch, tempSceneConfig.yaw, tempSceneConfig.hfov);
                                    }
                                    viewer.removeHotSpot(hotspot.id, sceneId);
                                } catch (e) {
                                    console.warn('Failed to remove referencing hotspot from viewer:', hotspot.id, e);
                                }
                            }
                        });
                    }
                });
                
                // Step 4: Switch back to the next scene if needed
                if (remainingScenesAfterDeletion.length > 0) {
                    const nextScene = remainingScenesAfterDeletion[0];
                    const nextSceneConfig = tourConfig.scenes[nextScene];
                    const currentViewerScene = viewer.getScene();
                    if (currentViewerScene !== nextScene) {
                        viewer.loadScene(nextScene, nextSceneConfig.pitch, nextSceneConfig.yaw, nextSceneConfig.hfov);
                    }
                }
                
                // Step 5: Now we can safely remove the scene from viewer
                const removeResult = viewer.removeScene(currentScene);
                if (!removeResult) {
                    console.warn('Failed to remove scene from viewer:', currentScene);
                }
            } catch (error) {
                console.error('Error removing scene from viewer:', error);
            }
        }
        
        const sceneToDelete = currentScene;
        
        // Update currentScene variable to the new active scene if we switched
        if (viewer) {
            try {
                const remainingScenesAfterDeletion = Object.keys(tourConfig.scenes).filter(id => id !== sceneToDelete);
                if (remainingScenesAfterDeletion.length > 0) {
                    currentScene = remainingScenesAfterDeletion[0];
                } else {
                    currentScene = null;
                }
            } catch (e) {
                currentScene = null;
            }
        } else {
            currentScene = null;
        }
        
        delete tourConfig.scenes[sceneToDelete];
        
        // Remove from scene order
        const orderIndex = tourConfig.default.sceneOrder.indexOf(sceneToDelete);
        if (orderIndex > -1) {
            tourConfig.default.sceneOrder.splice(orderIndex, 1);
        }
        
        // Update first scene if necessary
        if (tourConfig.default.firstScene === sceneToDelete) {
            const remainingScenes = Object.keys(tourConfig.scenes);
            tourConfig.default.firstScene = remainingScenes.length > 0 ? remainingScenes[0] : "";
        }
        
        // Remove hotspots pointing to this scene
        Object.values(tourConfig.scenes).forEach(scene => {
            scene.hotSpots = scene.hotSpots.filter(h => h.sceneId !== sceneToDelete);
        });
        
        updateSceneDropdowns();
        renderSceneOrderList();
        
        // Update UI to reflect the new current scene
        if (currentScene) {
            sceneSelect.value = currentScene;
        } else {
            sceneSelect.value = "";
        }
        selectScene();
        
        // Reinitialize viewer if no scenes left
        if (Object.keys(tourConfig.scenes).length === 0) {
            initializeViewer();
        }
    }
}

/**
 * Handle scene selection from the dropdown
 * Updates UI state and loads scene in viewer
 */
function selectScene() {
    currentScene = sceneSelect.value;
    
    if (currentScene && tourConfig.scenes[currentScene]) {
        // Enable Edit Scene and Capture View buttons
        editSceneBtn.disabled = false;
        captureViewBtn.disabled = false;
        
        // Show hotspots section
        hotspotsSection.style.display = 'block';
        updateHotspotsList();
        
        // Update scene order list to show active scene
        renderSceneOrderList();
        
        // Load scene in viewer if it exists
        if (viewer && currentScene) {
            try {
                const scene = tourConfig.scenes[currentScene];
                viewer.loadScene(currentScene, scene.pitch, scene.yaw, scene.hfov);
            } catch (error) {
                console.error('Error loading scene:', error);
            }
        }
    } else {
        // Disable Edit Scene and Capture View buttons
        editSceneBtn.disabled = true;
        captureViewBtn.disabled = true;
        
        // Hide hotspots section
        hotspotsSection.style.display = 'none';
    }
}

/**
 * Apply changes from the edit scene modal
 * Updates scene properties and refreshes viewer
 */
function editCurrentScene() {
    if (!currentScene) return;
    
    const newSceneId = document.getElementById('editSceneId').value.trim();
    const newScenePath = document.getElementById('editScenePath').value.trim();
    const newHfov = parseFloat(document.getElementById('editSceneHfov').value);
    const newPitch = parseFloat(document.getElementById('editScenePitch').value);
    const newYaw = parseFloat(document.getElementById('editSceneYaw').value);
    const newMaxLevel = parseInt(document.getElementById('editSceneMaxLevel').value);
    const newCubeResolution = parseInt(document.getElementById('editSceneCubeResolution').value);
    
    // Validate required fields
    if (!newSceneId || !newScenePath) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Check if scene ID has changed and rename if needed
    if (newSceneId !== currentScene) {
        if (!renameScene(currentScene, newSceneId)) {
            // Rename failed, restore original ID
            document.getElementById('editSceneId').value = currentScene;
            return;
        }
    }
    
    // Update scene properties
    const scene = tourConfig.scenes[currentScene];
    scene.multiRes.basePath = newScenePath;
    scene.preview = newScenePath + "1/f_0_0.jpg";
    scene.hfov = newHfov;
    scene.pitch = newPitch;
    scene.yaw = newYaw;
    scene.multiRes.maxLevel = newMaxLevel;
    scene.multiRes.cubeResolution = newCubeResolution;
    
    // Update hotspot target positions and HFOV
    updateHotspotReferences(currentScene, {
        targetPitch: scene.pitch,
        targetYaw: scene.yaw,
        targetHfov: scene.hfov
    });
    
    hideEditSceneModal();
    
    // Update viewer dynamically
    if (viewer) {
        try {
            // Remove and re-add the scene with new config
            const wasCurrentScene = (viewer.getScene && viewer.getScene() === currentScene);
            viewer.removeScene(currentScene);
            // Pass a deep copy to prevent Pannellum from modifying our config
            const sceneCopy = JSON.parse(JSON.stringify(scene));
            viewer.addScene(currentScene, sceneCopy);
            if (wasCurrentScene) {
                viewer.loadScene(currentScene, scene.pitch, scene.yaw, scene.hfov);
            }
        } catch (error) {
            console.error('Error updating scene:', error);
            // Fallback to reinitialize
            initializeViewer();
        }
    }
}

/**
 * Capture the current viewer camera position and apply to scene
 * Uses Pannellum's getPitch, getYaw, and getHfov methods
 */
function captureCurrentView() {
    if (!currentScene || !viewer) return;
    
    try {
        const pitch = viewer.getPitch();
        const yaw = viewer.getYaw();
        const hfov = viewer.getHfov();
        
        updateSceneWithCapturedView(pitch, yaw, hfov);
        showCaptureFeedback();
    } catch (error) {
        console.error('Error capturing view:', error);
    }
}

/**
 * Update scene configuration with captured camera values
 * @param {number} pitch - Vertical camera angle
 * @param {number} yaw - Horizontal camera angle
 * @param {number} hfov - Horizontal field of view
 */
function updateSceneWithCapturedView(pitch, yaw, hfov) {
    if (!currentScene || !tourConfig.scenes[currentScene]) return;
    
    const scene = tourConfig.scenes[currentScene];
    
    // Update scene's camera properties
    scene.pitch = pitch;
    scene.yaw = yaw;
    scene.hfov = hfov;
    
    // Update hotspots that target this scene
    const updateCount = updateHotspotReferences(currentScene, {
        targetPitch: pitch,
        targetYaw: yaw,
        targetHfov: hfov
    });
    
    console.log(`Updated ${updateCount} hotspots targeting scene "${currentScene}" with captured view (P:${pitch.toFixed(1)}°, Y:${yaw.toFixed(1)}°, FOV:${hfov.toFixed(0)})`);
    
    // If hotspots were updated, refresh the viewer to show changes
    if (updateCount > 0 && viewer) {
        // Save current camera position
        const savedPitch = viewer.getPitch();
        const savedYaw = viewer.getYaw();
        const savedHfov = viewer.getHfov();
        const savedScene = currentScene;
        
        // Reinitialize viewer (similar to preview button logic)
        initializeViewer();
        
        // Restore the scene and camera position
        if (tourConfig.scenes[savedScene]) {
            viewer.loadScene(savedScene, savedPitch, savedYaw, savedHfov);
            currentScene = savedScene;
            sceneSelect.value = savedScene;
        }
    }
}

/**
 * ===================================================================
 * HOTSPOT MANAGEMENT FUNCTIONS
 * ===================================================================
 */
/**
 * Update the hotspots list UI for the current scene
 * Creates draggable items with edit/delete buttons
 */
function updateHotspotsList() {
    if (!currentScene) return;
    
    const hotspots = tourConfig.scenes[currentScene].hotSpots || [];
    hotspotsList.innerHTML = '';
    
    hotspots.forEach((hotspot, index) => {
        const item = document.createElement('div');
        item.className = 'hotspot-item';
        item.draggable = true;
        item.dataset.hotspotIndex = index;
        item.innerHTML = `
            <span class="hotspot-drag-handle">≡</span>
            <div class="hotspot-item-text">
                <strong>${hotspot.text}</strong> → ${hotspot.sceneId}
                <br><small>Hotspot: ${hotspot.pitch.toFixed(1)}°, ${hotspot.yaw.toFixed(1)}°</small>
            </div>
            <div class="hotspot-buttons">
                <button class="hotspot-edit" onclick="editHotspot(${index})">Edit</button>
                <button class="hotspot-delete" onclick="deleteHotspot(${index})">Delete</button>
            </div>
        `;
        
        // Add click listener for lookAt functionality (excluding buttons)
        item.addEventListener('click', function(e) {
            // Don't trigger lookAt if clicking on buttons or drag handle
            if (e.target.closest('.hotspot-buttons') || e.target.closest('.hotspot-drag-handle')) {
                return;
            }
            previewHotspotLocation(hotspot);
        });
        
        // Add drag event listeners
        item.addEventListener('dragstart', handleHotspotDragStart);
        item.addEventListener('dragover', handleHotspotDragOver);
        item.addEventListener('drop', handleHotspotDrop);
        item.addEventListener('dragend', handleHotspotDragEnd);
        item.addEventListener('dragenter', handleHotspotDragEnter);
        item.addEventListener('dragleave', handleHotspotDragLeave);
        
        hotspotsList.appendChild(item);
    });
}

/**
 * Delete a hotspot at the specified index
 * @param {number} index - Index of hotspot to delete
 */
window.deleteHotspot = function(index) {
    if (!currentScene) return;
    
    const hotspots = tourConfig.scenes[currentScene].hotSpots;
    if (index >= 0 && index < hotspots.length) {
        const deletedHotspot = hotspots[index];
        
        // Remove from viewer first
        if (deletedHotspot.id && viewer) {
            const success = removeSingleHotspot(deletedHotspot.id);
            if (!success) {
                // Remove from config and update all hotspots
                hotspots.splice(index, 1);
                updateHotspotsList();
                updateViewerHotspots();
                return;
            }
        }
        
        // Remove from config
        hotspots.splice(index, 1);
        updateHotspotsList();
    }
};

/**
 * Edit a hotspot at the specified index
 * @param {number} index - Index of hotspot to edit
 */
window.editHotspot = function(index) {
    if (!currentScene) return;
    
    const hotspot = tourConfig.scenes[currentScene].hotSpots[index];
    if (!hotspot) return;
    
    showEditHotspotModal(hotspot, index);
};

/**
 * Update hotspots in the viewer by recreating the scene
 * This is the most reliable way to sync hotspot changes
 */
function updateViewerHotspots() {
    if (!viewer || !currentScene) return;
    
    try {
        const scene = tourConfig.scenes[currentScene];
        const hotspots = scene.hotSpots || [];
        
        // Clear all existing hotspots by removing and re-adding the scene
        // This is the most reliable way since Pannellum doesn't have a clear all hotspots method
        const wasCurrentScene = (viewer.getScene && viewer.getScene() === currentScene);
        let currentPitch = 0, currentYaw = 0, currentHfov = 100;
        
        if (wasCurrentScene) {
            try {
                currentPitch = viewer.getPitch();
                currentYaw = viewer.getYaw();
                currentHfov = viewer.getHfov();
            } catch (e) {
                currentPitch = scene.pitch || 0;
                currentYaw = scene.yaw || 0;
                currentHfov = scene.hfov || 100;
            }
        }
        
        // Remove and re-add the scene to clear all hotspots
        viewer.removeScene(currentScene);
        // Pass a deep copy to prevent Pannellum from modifying our config
        const sceneCopy = JSON.parse(JSON.stringify(scene));
        viewer.addScene(currentScene, sceneCopy);
        
        if (wasCurrentScene) {
            viewer.loadScene(currentScene, currentPitch, currentYaw, currentHfov);
        }
        
    } catch (error) {
        console.error('Error updating hotspots:', error);
        initializeViewer();
    }
}

/**
 * Add a single hotspot to the viewer
 * @param {Object} hotspotData - Hotspot configuration object
 */
function addSingleHotspot(hotspotData) {
    if (!viewer || !currentScene) return;
    
    try {
        viewer.addHotSpot(hotspotData, currentScene);
    } catch (error) {
        console.error('Error adding hotspot:', error);
        // Fallback to full update
        updateViewerHotspots();
    }
}

/**
 * Remove a single hotspot from the viewer
 * @param {string} hotspotId - ID of hotspot to remove
 * @returns {boolean} Success status
 */
function removeSingleHotspot(hotspotId) {
    if (!viewer || !currentScene || !hotspotId) return;
    
    try {
        const success = viewer.removeHotSpot(hotspotId, currentScene);
        return success;
    } catch (error) {
        console.error('Error removing hotspot:', error);
        return false;
    }
}

/**
 * Show the modal for adding a new hotspot
 * @param {number} pitch - Vertical position of hotspot
 * @param {number} yaw - Horizontal position of hotspot
 */
function showAddHotspotModal(pitch, yaw) {
    pendingHotspot = { pitch, yaw, isEditing: false, editIndex: null };
    
    // Set modal title and button text for adding
    addHotspotModal.querySelector('h3').textContent = 'Add Hotspot';
    document.getElementById('confirmAddHotspot').textContent = 'Add Hotspot';
    
    // Pre-populate ID field with intelligent suggestion
    const initialId = generateSceneBasedHotspotId(currentScene);
    document.getElementById('hotspotId').value = initialId;
    
    // Populate target scene dropdown
    const targetSelect = document.getElementById('hotspotTarget');
    targetSelect.innerHTML = '<option value="">Select target scene...</option>';
    
    Object.keys(tourConfig.scenes).forEach(sceneId => {
        if (sceneId !== currentScene) {
            const option = document.createElement('option');
            option.value = sceneId;
            option.textContent = sceneId;
            targetSelect.appendChild(option);
        }
    });
    
    // Clear text field and set clicked coordinates
    document.getElementById('hotspotText').value = '';
    document.getElementById('hotspotPitch').value = pitch.toFixed(1);
    document.getElementById('hotspotYaw').value = yaw.toFixed(1);
    
    addHotspotModal.style.display = 'flex';
}

/**
 * Show the modal for editing an existing hotspot
 * @param {Object} hotspot - Hotspot data to edit
 * @param {number} index - Index of hotspot in array
 */
function showEditHotspotModal(hotspot, index) {
    pendingHotspot = { 
        pitch: hotspot.pitch, 
        yaw: hotspot.yaw, 
        isEditing: true, 
        editIndex: index 
    };
    
    // Set modal title and button text for editing
    addHotspotModal.querySelector('h3').textContent = 'Edit Hotspot';
    document.getElementById('confirmAddHotspot').textContent = 'Update Hotspot';
    
    // Populate ID field for existing hotspots
    document.getElementById('hotspotId').value = hotspot.id || '';
    
    // Populate target scene dropdown
    const targetSelect = document.getElementById('hotspotTarget');
    targetSelect.innerHTML = '<option value="">Select target scene...</option>';
    
    Object.keys(tourConfig.scenes).forEach(sceneId => {
        if (sceneId !== currentScene) {
            const option = document.createElement('option');
            option.value = sceneId;
            option.textContent = sceneId;
            targetSelect.appendChild(option);
        }
    });
    
    // Pre-populate fields with hotspot data
    document.getElementById('hotspotText').value = hotspot.text || '';
    targetSelect.value = hotspot.sceneId || '';
    document.getElementById('hotspotPitch').value = hotspot.pitch || 0;
    document.getElementById('hotspotYaw').value = hotspot.yaw || 0;
    
    addHotspotModal.style.display = 'flex';
}

/**
 * Hide the hotspot modal dialog
 */
function hideAddHotspotModal() {
    addHotspotModal.style.display = 'none';
    pendingHotspot = null;
    
    // Clear ID field
    document.getElementById('hotspotId').value = '';
}

/**
 * Process the hotspot modal form and create/update hotspot
 * Handles both new hotspots and editing existing ones
 */
function confirmAddHotspot() {
    if (!currentScene || !pendingHotspot) return;
    
    let text = document.getElementById('hotspotText').value.trim();
    let hotspotId = document.getElementById('hotspotId').value;
    hotspotId = hotspotId ? hotspotId.trim() : '';
    const targetScene = document.getElementById('hotspotTarget').value;
    const hotspotPitch = parseFloat(document.getElementById('hotspotPitch').value);
    const hotspotYaw = parseFloat(document.getElementById('hotspotYaw').value);
    
    if (!targetScene) {
        alert('Please select a target scene');
        return;
    }
    
    // Validate hotspot ID if provided
    const excludeIndex = pendingHotspot.isEditing ? pendingHotspot.editIndex : -1;
    const validation = validateHotspotId(hotspotId, currentScene, excludeIndex);
    if (!validation.isValid) {
        alert(validation.errorMessage);
        return;
    }
    
    // Use scene ID as default if no text provided, but user can override
    if (!text) {
        text = targetScene;  // Default to scene ID
    }
    
    // Auto-generate ID if not provided by user
    if (!hotspotId) {
        hotspotId = `hs_${currentScene}_${hotspotCounter++}`;
    }
    
    // Get target scene's initial camera position for targetPitch and targetYaw
    const targetSceneConfig = tourConfig.scenes[targetScene];
    const targetPitch = targetSceneConfig ? (targetSceneConfig.pitch || 0) : 0;
    const targetYaw = targetSceneConfig ? (targetSceneConfig.yaw || 0) : 0;
    const targetHfov = targetSceneConfig ? (targetSceneConfig.hfov || 100) : 100;
    
    const hotspotData = {
        pitch: hotspotPitch,
        yaw: hotspotYaw,
        type: "scene",
        text: text,
        sceneId: targetScene,
        id: hotspotId,
        // cssClass: "chs",
        targetPitch: targetPitch,
        targetYaw: targetYaw,
        targetHfov: targetHfov
    };
    
    if (pendingHotspot.isEditing) {
        // Edit existing hotspot: remove old, add new
        const existingHotspot = tourConfig.scenes[currentScene].hotSpots[pendingHotspot.editIndex];
        const oldId = existingHotspot.id;
        
        // Remove old hotspot from viewer
        if (oldId && viewer) {
            removeSingleHotspot(oldId);
        }
        
        // Update config (use a copy to prevent reference issues)
        const configCopy = JSON.parse(JSON.stringify(hotspotData));
        tourConfig.scenes[currentScene].hotSpots[pendingHotspot.editIndex] = configCopy;
        
        // Add updated hotspot to viewer (use a separate copy)
        if (viewer) {
            const viewerCopy = JSON.parse(JSON.stringify(hotspotData));
            addSingleHotspot(viewerCopy);
        }
    } else {
        // Add completely new hotspot
        
        // Add to config (use a copy to prevent reference issues)
        const configCopy = JSON.parse(JSON.stringify(hotspotData));
        tourConfig.scenes[currentScene].hotSpots.push(configCopy);
        
        // Add to viewer (use a separate copy)
        if (viewer) {
            const viewerCopy = JSON.parse(JSON.stringify(hotspotData));
            addSingleHotspot(viewerCopy);
        }
    }
    
    updateHotspotsList();
    hideAddHotspotModal();
}

/**
 * ===================================================================
 * SCENE UTILITY FUNCTIONS
 * ===================================================================
 */
/**
 * Rename a scene and update all references
 * @param {string} oldSceneId - Current scene ID
 * @param {string} newSceneId - New scene ID
 * @returns {boolean} Success status
 */
function renameScene(oldSceneId, newSceneId) {
    // Validation
    if (!newSceneId || newSceneId.trim() === '') {
        alert('Scene ID cannot be empty');
        return false;
    }
    
    // Sanitize scene ID (allow only alphanumeric, underscore, and hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(newSceneId)) {
        alert('Scene ID can only contain letters, numbers, underscores, and hyphens');
        return false;
    }
    
    if (oldSceneId === newSceneId) {
        return true; // No change needed
    }
    
    if (tourConfig.scenes[newSceneId]) {
        alert('A scene with this ID already exists');
        return false;
    }
    
    // Confirm rename
    if (!confirm(`Are you sure you want to rename scene "${oldSceneId}" to "${newSceneId}"? All hotspot references will be updated.`)) {
        return false;
    }
    
    // Update scenes object - preserve order by rebuilding
    const updatedScenes = {};
    for (const [key, value] of Object.entries(tourConfig.scenes)) {
        if (key === oldSceneId) {
            updatedScenes[newSceneId] = value;
        } else {
            updatedScenes[key] = value;
        }
    }
    tourConfig.scenes = updatedScenes;
    
    // Update all hotspot references in all scenes
    let hotspotUpdateCount = 0;
    Object.values(tourConfig.scenes).forEach(scene => {
        if (scene.hotSpots && scene.hotSpots.length > 0) {
            scene.hotSpots.forEach(hotspot => {
                if (hotspot.sceneId === oldSceneId) {
                    hotspot.sceneId = newSceneId;
                    // DO NOT touch hotspot.text - leave it as user set it
                    hotspotUpdateCount++;
                }
            });
        }
    });
    
    // Update scene order array
    const orderIndex = tourConfig.default.sceneOrder.indexOf(oldSceneId);
    if (orderIndex > -1) {
        tourConfig.default.sceneOrder[orderIndex] = newSceneId;
    }
    
    // Update first scene if it matches
    if (tourConfig.default.firstScene === oldSceneId) {
        tourConfig.default.firstScene = newSceneId;
    }
    
    // Update current scene variable
    if (currentScene === oldSceneId) {
        currentScene = newSceneId;
    }
    
    // Handle viewer update
    if (viewer) {
        try {
            const wasCurrentScene = (viewer.getScene && viewer.getScene() === oldSceneId);
            viewer.removeScene(oldSceneId);
            // Pass a deep copy to prevent Pannellum from modifying our config
            const sceneCopy = JSON.parse(JSON.stringify(tourConfig.scenes[newSceneId]));
            viewer.addScene(newSceneId, sceneCopy);
            if (wasCurrentScene) {
                viewer.loadScene(newSceneId);
            }
        } catch (error) {
            console.error('Error renaming scene in viewer:', error);
            initializeViewer();
        }
    }
    
    // Refresh all UI elements
    updateSceneDropdowns();
    renderSceneOrderList();
    
    // Re-select the renamed scene
    sceneSelect.value = newSceneId;
    selectScene();
    
    
    return true;
}

/**
 * Update hotspot target references when scene properties change
 * @param {string} targetSceneId - Scene ID to update references for
 * @param {Object} updates - Properties to update (targetPitch, targetYaw, targetHfov)
 * @returns {number} Number of hotspots updated
 */
function updateHotspotReferences(targetSceneId, updates) {
    let updateCount = 0;
    
    Object.entries(tourConfig.scenes).forEach(([sceneId, scene]) => {
        if (scene.hotSpots && scene.hotSpots.length > 0) {
            scene.hotSpots.forEach((hotspot, index) => {
                if (hotspot.sceneId === targetSceneId) {
                    // DO NOT UPDATE TEXT - leave hotspot.text as is
                    
                    // Update target position and HFOV
                    if (updates.targetPitch !== undefined) {
                        hotspot.targetPitch = updates.targetPitch;
                    }
                    if (updates.targetYaw !== undefined) {
                        hotspot.targetYaw = updates.targetYaw;
                    }
                    if (updates.targetHfov !== undefined) {
                        hotspot.targetHfov = updates.targetHfov;
                    }
                    updateCount++;
                }
            });
        }
    });
    
    return updateCount;
}


/**
 * ===================================================================
 * SCENE ORDER MANAGEMENT
 * ===================================================================
 */
/**
 * Initialize scene order array if not present
 */
function initializeSceneOrder() {
    if (!tourConfig.default.sceneOrder || tourConfig.default.sceneOrder.length === 0) {
        tourConfig.default.sceneOrder = Object.keys(tourConfig.scenes);
    }
}

/**
 * Render the draggable scene order list
 */
function renderSceneOrderList() {
    const container = document.getElementById('sceneOrderList');
    if (!container) return;
    
    container.innerHTML = '';
    
    tourConfig.default.sceneOrder.forEach((sceneId, index) => {
        if (!tourConfig.scenes[sceneId]) return;
        
        const item = document.createElement('div');
        item.className = 'scene-order-item';
        item.draggable = true;
        item.dataset.sceneId = sceneId;
        
        item.innerHTML = `
            <span class="drag-handle">≡</span>
            <span class="scene-name">${sceneId}${currentScene === sceneId ? ' (active)' : ''}</span>
            <div class="scene-controls">
                <button class="btn-order-up" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn-order-down" ${index === tourConfig.default.sceneOrder.length - 1 ? 'disabled' : ''}>↓</button>
            </div>
        `;
        
        // Add drag event listeners
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        
        // Add button event listeners
        const upBtn = item.querySelector('.btn-order-up');
        const downBtn = item.querySelector('.btn-order-down');
        
        upBtn.addEventListener('click', () => moveScene(sceneId, 'up'));
        downBtn.addEventListener('click', () => moveScene(sceneId, 'down'));
        
        container.appendChild(item);
    });
}

/**
 * Reorder scenes according to new order array
 * @param {Array<string>} newOrder - New scene order
 */
function reorderScenes(newOrder) {
    // Update the order array
    tourConfig.default.sceneOrder = newOrder;
    
    // Rebuild scenes object in new order
    const reorderedScenes = {};
    newOrder.forEach(sceneId => {
        if (tourConfig.scenes[sceneId]) {
            reorderedScenes[sceneId] = tourConfig.scenes[sceneId];
        }
    });
    tourConfig.scenes = reorderedScenes;
    
    // Update navigation index for arrow buttons to work correctly
    if (viewer) {
        try {
            const activeScene = viewer.getScene();
            if (activeScene) {
                updateNavigationIndex(activeScene);
            }
        } catch (error) {
            // If we can't get active scene from viewer, use currentScene
            if (currentScene) {
                updateNavigationIndex(currentScene);
            }
        }
    }
    
    // Update UI
    renderSceneOrderList();
    updateSceneDropdowns();
}

/**
 * Move a scene up or down in the order
 * @param {string} sceneId - Scene to move
 * @param {string} direction - 'up' or 'down'
 */
function moveScene(sceneId, direction) {
    const currentIndex = tourConfig.default.sceneOrder.indexOf(sceneId);
    if (currentIndex === -1) return;
    
    const newOrder = [...tourConfig.default.sceneOrder];
    
    if (direction === 'up' && currentIndex > 0) {
        // Swap with previous item
        [newOrder[currentIndex - 1], newOrder[currentIndex]] = 
        [newOrder[currentIndex], newOrder[currentIndex - 1]];
    } else if (direction === 'down' && currentIndex < newOrder.length - 1) {
        // Swap with next item
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
        [newOrder[currentIndex + 1], newOrder[currentIndex]];
    }
    
    reorderScenes(newOrder);
}

/**
 * ===================================================================
 * DRAG AND DROP HANDLERS
 * ===================================================================
 */
/**
 * Handle drag start for scene reordering
 */
function handleDragStart(e) {
    draggedSceneId = e.currentTarget.dataset.sceneId;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * Handle drag over event
 */
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handle drag enter event
 */
function handleDragEnter(e) {
    if (e.currentTarget.dataset.sceneId !== draggedSceneId) {
        e.currentTarget.classList.add('drag-over');
    }
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop event for scene reordering
 */
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const targetSceneId = e.currentTarget.dataset.sceneId;
    
    if (draggedSceneId && targetSceneId && draggedSceneId !== targetSceneId) {
        const newOrder = [...tourConfig.default.sceneOrder];
        const draggedIndex = newOrder.indexOf(draggedSceneId);
        const targetIndex = newOrder.indexOf(targetSceneId);
        
        if (draggedIndex > -1 && targetIndex > -1) {
            // Remove dragged item
            newOrder.splice(draggedIndex, 1);
            // Insert at new position
            newOrder.splice(targetIndex, 0, draggedSceneId);
            
            reorderScenes(newOrder);
        }
    }
    
    return false;
}

/**
 * Clean up after drag operation
 */
function handleDragEnd(e) {
    // Clean up
    document.querySelectorAll('.scene-order-item').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedSceneId = null;
}

/**
 * Hotspot drag and drop handlers
 */
/**
 * Handle drag start for hotspot reordering
 */
function handleHotspotDragStart(e) {
    draggedHotspotIndex = parseInt(e.currentTarget.dataset.hotspotIndex);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

/**
 * Handle drag over for hotspots
 */
function handleHotspotDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handle drag enter for hotspots
 */
function handleHotspotDragEnter(e) {
    const targetIndex = parseInt(e.currentTarget.dataset.hotspotIndex);
    if (targetIndex !== draggedHotspotIndex) {
        e.currentTarget.classList.add('drag-over');
    }
}

/**
 * Handle drag leave for hotspots
 */
function handleHotspotDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop event for hotspot reordering
 */
function handleHotspotDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const targetIndex = parseInt(e.currentTarget.dataset.hotspotIndex);
    
    if (draggedHotspotIndex !== null && targetIndex !== draggedHotspotIndex) {
        const hotspots = tourConfig.scenes[currentScene].hotSpots;
        
        // Reorder hotspots array
        const draggedHotspot = hotspots[draggedHotspotIndex];
        hotspots.splice(draggedHotspotIndex, 1);
        hotspots.splice(targetIndex, 0, draggedHotspot);
        
        // Update UI
        updateHotspotsList();
        updateViewerHotspots();
    }
    
    return false;
}

/**
 * Clean up after hotspot drag operation
 */
function handleHotspotDragEnd(e) {
    // Clean up
    document.querySelectorAll('.hotspot-item').forEach(item => {
        item.classList.remove('dragging', 'drag-over');
    });
    draggedHotspotIndex = null;
}

/**
 * ===================================================================
 * CONFIGURATION IMPORT/EXPORT FUNCTIONS
 * ===================================================================
 */
/**
 * Export current tour configuration as JSON file
 */
function exportConfiguration() {
    // If viewer exists, we could potentially get config from it
    // but for now we'll use our local tourConfig
    const configText = JSON.stringify(tourConfig, null, 4);
    const blob = new Blob([configText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tour-config.json';
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Copy tour configuration to clipboard as JavaScript object
 */
function copyJSObject() {
    const jsObjectText = convertToJSObject(tourConfig);
    
    // Try to use Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsObjectText).then(() => {
            showCopyFeedback();
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            fallbackCopyToClipboard(jsObjectText);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(jsObjectText);
    }
}

/**
 * Convert JSON object to JavaScript object notation
 * @param {Object} obj - Object to convert
 * @returns {string} JavaScript object string
 */
function convertToJSObject(obj) {
    // Convert to JSON first, then remove quotes from property names
    let jsonString = JSON.stringify(obj, null, 4);
    
    // Remove quotes from property names that are valid JavaScript identifiers
    // This regex matches quoted property names that are valid JS identifiers
    jsonString = jsonString.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:');
    
    return jsonString;
}

/**
 * Fallback clipboard copy for older browsers
 * @param {string} text - Text to copy
 */
function fallbackCopyToClipboard(text) {
    // Create temporary textarea for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback();
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Copy failed. Please manually select and copy the configuration.');
    }
    
    document.body.removeChild(textArea);
}

/**
 * Show visual feedback for copy operation
 */
function showCopyFeedback() {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
    }, 2000);
}

/**
 * Show visual feedback for capture operation
 */
function showCaptureFeedback() {
    const originalText = captureViewBtn.textContent;
    captureViewBtn.textContent = 'Captured!';
    captureViewBtn.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
        captureViewBtn.textContent = originalText;
        captureViewBtn.style.backgroundColor = '';
    }, 2000);
}

/**
 * Preview hotspot location using lookAt animation
 * @param {Object} hotspot - Hotspot data with pitch/yaw coordinates
 */
function previewHotspotLocation(hotspot) {
    if (!viewer || !currentScene) return;
    
    try {
        // Get the current scene's hfov
        const scene = tourConfig.scenes[currentScene];
        const hfov = scene ? scene.hfov : null;
        
        // Use lookAt to smoothly animate to the hotspot position
        // Parameters: pitch, yaw, hfov, animated (milliseconds), callback, callbackArgs
        viewer.lookAt(hotspot.pitch, hotspot.yaw, hfov, 1000);
    } catch (error) {
        console.error('Error previewing hotspot location:', error);
    }
}

/**
 * Validate that a hotspot ID is valid and unique
 * @param {string} hotspotId - ID to validate
 * @param {string} sceneId - Scene ID for context
 * @param {number} excludeIndex - Index to exclude from duplicate check (for editing)
 * @returns {Object} Validation result with isValid and errorMessage
 */
function validateHotspotId(hotspotId, sceneId, excludeIndex = -1) {
    // Check if empty or undefined (will be auto-generated)
    if (!hotspotId || typeof hotspotId !== 'string' || hotspotId.trim() === '') {
        return { isValid: true, errorMessage: null }; // Empty is OK, will auto-generate
    }
    
    // Sanitize ID (similar to scene ID validation)
    if (!/^[a-zA-Z0-9_-]+$/.test(hotspotId)) {
        return { 
            isValid: false, 
            errorMessage: 'Hotspot ID can only contain letters, numbers, underscores, and hyphens' 
        };
    }
    
    // Check for duplicates across ALL scenes
    for (const [checkSceneId, scene] of Object.entries(tourConfig.scenes)) {
        if (scene.hotSpots) {
            for (let i = 0; i < scene.hotSpots.length; i++) {
                const hotspot = scene.hotSpots[i];
                // Skip if this is the same hotspot we're editing
                if (checkSceneId === sceneId && i === excludeIndex) continue;
                
                if (hotspot.id === hotspotId) {
                    return { 
                        isValid: false, 
                        errorMessage: `Hotspot ID "${hotspotId}" already exists in scene "${checkSceneId}"` 
                    };
                }
            }
        }
    }
    
    return { isValid: true, errorMessage: null };
}

/**
 * Generate a scene-based hotspot ID with next available number
 * @param {string} targetSceneId - Target scene for the hotspot
 * @returns {string} Generated hotspot ID
 */
function generateSceneBasedHotspotId(targetSceneId) {
    let counter = 1;
    let candidateId;
    
    // Find next available number for this scene
    do {
        candidateId = `hs_${targetSceneId}_${counter.toString().padStart(3, '0')}`;
        counter++;
    } while (isHotspotIdInUse(candidateId));
    
    return candidateId;
}

/**
 * Check if a hotspot ID is already in use across all scenes
 * @param {string} hotspotId - ID to check
 * @returns {boolean} True if ID is in use
 */
function isHotspotIdInUse(hotspotId) {
    for (const scene of Object.values(tourConfig.scenes)) {
        if (scene.hotSpots && scene.hotSpots.some(h => h.id === hotspotId)) {
            return true;
        }
    }
    return false;
}

/**
 * Fix hotspot that's missing an ID by generating one
 * @param {Object} hotspot - Hotspot to fix
 * @param {string} sceneId - Scene ID for context
 * @param {number} index - Index in hotspot array
 */
function fixMissingHotspotId(hotspot, sceneId, index) {
    // Check if hotspot has no ID or invalid ID
    if (!hotspot.id || typeof hotspot.id !== 'string' || hotspot.id.trim() === '') {
        hotspot.id = `hs_${sceneId}_${hotspotCounter++}`;
        console.log(`Generated missing ID for hotspot in scene ${sceneId}:`, hotspot.id);
    }
}

/**
 * Ensure all hotspots have unique IDs for proper Pannellum API usage
 * Generates IDs for hotspots that don't have them
 */
function ensureHotspotIds() {
    let maxCounter = 0;
    
    // First pass: find the highest existing counter to avoid conflicts
    Object.keys(tourConfig.scenes).forEach(sceneId => {
        const scene = tourConfig.scenes[sceneId];
        if (scene.hotSpots) {
            scene.hotSpots.forEach(hotspot => {
                if (hotspot.id && hotspot.id.startsWith('hs_')) {
                    const parts = hotspot.id.split('_');
                    if (parts.length >= 3) {
                        const counter = parseInt(parts[parts.length - 1]);
                        if (!isNaN(counter)) {
                            maxCounter = Math.max(maxCounter, counter);
                        }
                    }
                }
            });
        }
    });
    
    // Update global counter to avoid conflicts
    hotspotCounter = maxCounter + 1;
    
    // Second pass: generate IDs for hotspots that don't have them
    Object.keys(tourConfig.scenes).forEach(sceneId => {
        const scene = tourConfig.scenes[sceneId];
        if (scene.hotSpots) {
            scene.hotSpots.forEach((hotspot, index) => {
                fixMissingHotspotId(hotspot, sceneId, index);
            });
        }
    });
}

/**
 * Import tour configuration from JSON file
 * @param {Event} e - File input change event
 */
function importConfiguration(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            tourConfig = imported;
            
            // Ensure sceneOrder exists
            if (!tourConfig.default.sceneOrder || tourConfig.default.sceneOrder.length === 0) {
                tourConfig.default.sceneOrder = Object.keys(tourConfig.scenes);
            }
            
            // Ensure all hotspots have IDs BEFORE any other processing
            ensureHotspotIds();
            
            // Sync scenes object order with sceneOrder
            reorderScenes(tourConfig.default.sceneOrder);
            
            updateSceneDropdowns();
            renderSceneOrderList();
            
            // Select the first scene from the imported config
            if (tourConfig.default.firstScene && tourConfig.scenes[tourConfig.default.firstScene]) {
                sceneSelect.value = tourConfig.default.firstScene;
            } else if (Object.keys(tourConfig.scenes).length > 0) {
                // If no first scene is set, select the first available scene
                sceneSelect.value = Object.keys(tourConfig.scenes)[0];
            }
            selectScene();
            
            // Reinitialize viewer with new config
            initializeViewer();
        } catch (error) {
            alert('Error importing configuration: ' + error.message);
        }
    };
    reader.readAsText(file);
}

/**
 * ===================================================================
 * UI UPDATE FUNCTIONS
 * ===================================================================
 */
/**
 * Update scene dropdown menus with current scenes
 */
function updateSceneDropdowns() {
    // Update main scene selector
    sceneSelect.innerHTML = '<option value="">Select a scene...</option>';
    firstSceneSelect.innerHTML = '<option value="">Select first scene...</option>';
    
    Object.keys(tourConfig.scenes).forEach(sceneId => {
        const option1 = document.createElement('option');
        option1.value = sceneId;
        option1.textContent = sceneId;
        sceneSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = sceneId;
        option2.textContent = sceneId;
        firstSceneSelect.appendChild(option2);
    });
    
    // Set first scene selection
    firstSceneSelect.value = tourConfig.default.firstScene;
}

/**
 * Scene order section collapse/expand functions
 */
/**
 * Toggle scene order section visibility
 */
function toggleSceneOrder() {
    const content = document.getElementById('sceneOrderContent');
    const toggle = document.getElementById('sceneOrderToggle');
    
    if (!content || !toggle) return;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
        localStorage.setItem('sceneOrderExpanded', 'true');
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
        localStorage.setItem('sceneOrderExpanded', 'false');
    }
}

/**
 * Restore scene order section state from localStorage
 */
function restoreSceneOrderState() {
    const expanded = localStorage.getItem('sceneOrderExpanded') !== 'false';
    const content = document.getElementById('sceneOrderContent');
    const toggle = document.getElementById('sceneOrderToggle');
    
    if (!content || !toggle) return;
    
    if (!expanded) {
        content.style.display = 'none';
        toggle.textContent = '▶';
    } else {
        content.style.display = 'block';
        toggle.textContent = '▼';
    }
}