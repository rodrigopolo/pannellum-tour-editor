# 🌐 Pannellum Tour Editor

A simple visual editor for creating interactive 360° panoramic tours using the Pannellum library. Build multi-scene virtual tours with clickable hotspots for seamless navigation between panoramas.

## ✨ Live Demo

🔗 **[Try the Editor Online](https://rodrigopolo.github.io/pannellum-tour-editor/)**

## 🎯 Features

- **Visual Scene Management** - Add, edit, and delete panoramic scenes with live preview
- **Interactive Hotspot Placement** - `⌘ Cmd` or `Ctrl` + Click to place navigation hotspots directly on panoramas.
- **Drag & Drop Ordering** - Rearrange scenes and hotspots with intuitive drag controls.
- **Camera Capture** - Save current view angles for consistent navigation targets.
- **Import/Export** - Save and load tour configurations as JSON files.
- **Multi-Resolution Support** - Optimized tiled panorama loading for performance.
- **Real-time Preview** - See changes instantly in the integrated viewer.
- **Scene Navigation** - Previous/Next buttons for sequential scene browsing.
- **Smart ID Management** - Automatic ID generation with manual override options.

## 🚀 Quick Start

### Using GitHub Pages (Recommended)

1. Visit the [live editor](https://rodrigopolo.github.io/pannellum-tour-editor/)
2. Click **"Add New Scene"** to start building your tour
3. Import an existing tour JSON or create from scratch
4. Export your configuration when done

### Local Development

```bash
# Clone the repository
git clone https://github.com/rodrigopolo/pannellum-tour-editor.git
cd pannellum-tour-editor

# Open in browser (no build process required!)
open index.html
# Or serve with any HTTP server
python -m http.server 8000
# Then visit http://localhost:8000/
```

## 📖 Usage Guide

### Creating Your First Tour

1. **Add a Scene**
   - Click **"New"** button in the Scenes section
   - Enter a unique Scene ID (e.g., "lobby", "room_101")
   - Specify the panorama folder path containing tiled images
   - Set resolution parameters (Max Level: 5, Cube Resolution: 8192)

2. **Place Hotspots**
   - Select a scene from the dropdown
   - Hold `Cmd/Ctrl` and click on the preview to place a hotspot
   - Configure the hotspot:
     - **Text**: Display label
     - **Target Scene**: Destination scene
     - **Hotspot ID**: Auto-generated or custom

3. **Capture Views**
   - Navigate to desired camera angle in preview
   - Click **"Capture"** to save current view
   - All hotspots targeting this scene will update with the captured view

4. **Configure Tour Settings**
   - Select the **First Scene** in Tour Settings
   - This determines the starting point of your tour

5. **Export Configuration**
   - Click **"Export"** to download tour.json
   - Use this file with Pannellum viewer in production

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Click` | Add hotspot at cursor position |
| `Escape` | Close modal dialogs |
| Click on hotspot item | Preview hotspot location |
| Drag handles | Reorder scenes or hotspots |

## 📋 Configuration Format

The editor generates a JSON configuration compatible with Pannellum:

```json
{
    "default": {
        "firstScene": "Sample01",
        "sceneOrder": [
            "Sample01",
            "Sample02"
        ],
        "sceneFadeDuration": 1000,
        "autoLoad": true
    },
    "scenes": {
        "Sample01": {
            "hfov": 100,
            "pitch": 0,
            "yaw": 0,
            "type": "multires",
            "preview": "./Sample01/1/f_0_0.jpg",
            "multiRes": {
                "basePath": "./Sample01/",
                "path": "%l/%s_%y_%x",
                "fallbackPath": "/fallback/%s",
                "extension": "jpg",
                "tileResolution": 512,
                "maxLevel": 4,
                "cubeResolution": 4096
            },
            "hotSpots": [
                {
                    "pitch": -7.2,
                    "yaw": -0.1,
                    "type": "scene",
                    "text": "Sample02",
                    "sceneId": "Sample02",
                    "id": "hs_Sample02_001",
                    "targetPitch": 0,
                    "targetYaw": 0,
                    "targetHfov": 100
                }
            ]
        },
        "Sample02": {
            "hfov": 100,
            "pitch": 0,
            "yaw": 0,
            "type": "multires",
            "preview": "./Sample02/1/f_0_0.jpg",
            "multiRes": {
                "basePath": "./Sample02/",
                "path": "%l/%s_%y_%x",
                "fallbackPath": "/fallback/%s",
                "extension": "jpg",
                "tileResolution": 512,
                "maxLevel": 4,
                "cubeResolution": 4096
            },
            "hotSpots": [
                {
                    "pitch": -25.7,
                    "yaw": 2.6,
                    "type": "scene",
                    "text": "Sample01",
                    "sceneId": "Sample01",
                    "id": "hs_Sample01_001",
                    "targetPitch": 0,
                    "targetYaw": 0,
                    "targetHfov": 100
                }
            ]
        }
    }
}
```

## 🗂️ Panorama File Structure

The editor expects multi-resolution tiled panoramas organized as:

```
panorama_folder/
├── 1/           # Lowest resolution
│   └── f_0_0.jpg
├── 2/
│   ├── f_0_0.jpg
│   └── f_0_1.jpg
└── 5/           # Highest resolution (maxLevel)
    └── [multiple tiles]
```

### Generating Tiled Panoramas

1. Use [these scripts](https://github.com/rodrigopolo/clis/tree/main/360#publish) that automatically convert `.tif` images into multi-res jpg.
2. Use [Pannellum's tools](https://github.com/mpetroff/pannellum) to convert equirectangular images.

## 🔧 Advanced Features

### Scene ID Management
- Scene IDs can be renamed - all hotspot references update automatically
- Hotspot IDs support manual editing with automatic validation
- Duplicate IDs are prevented with real-time checking

### Capture Functionality
- Captures current camera position (pitch, yaw, field of view)
- Updates all hotspots that target the current scene
- Useful for setting consistent entry points between scenes

### Import Validation
- Automatically generates missing hotspot IDs
- Validates scene references
- Handles legacy configurations gracefully

## 🖥️ Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 50+ | Recommended |
| Firefox | 45+ | Full support |
| Safari | 10+ | Full support |
| Edge | 79+ | Chromium-based |
| Mobile Safari | iOS 10+ | Touch gestures supported |
| Chrome Mobile | Android 5+ | Touch gestures supported |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- No build process required - pure HTML/CSS/JavaScript
- Follow existing code style and patterns
- Test in multiple browsers before submitting PR
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Pannellum](https://pannellum.org/) - The amazing 360° panorama viewer library
- [Matthew Petroff](https://github.com/mpetroff) - Creator of Pannellum
- Built with vanilla JavaScript - no framework dependencies

## 📬 Support

- **Issues**: [GitHub Issues](https://github.com/rodrigopolo/pannellum-tour-editor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rodrigopolo/pannellum-tour-editor/discussions)

