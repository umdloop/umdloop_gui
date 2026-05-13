# Design: Professional App Structure Refactor

## Target Directory Layout

```
umdloop_gui_web/app/
├── layout.js
├── page.js
├── globals.css
├── favicon.ico
│
├── config/
│   ├── index.js                  # barrel re-export
│   ├── environment.js            # getRosbridgeUrl, getApiBaseUrl, getWebRTCUrl, useLocalTiles
│   ├── ros-topics.js             # GUI_REQUIRED_TOPICS, TECHNICIAN_TOPICS, TECHNICIAN_COMMAND_TOPICS
│   └── constants.js              # MODES, SUBSYSTEMS, CAMERA_ROLES, NAVIGATION_BUTTONS, etc.
│
├── lib/
│   ├── api.js                    # centralized Flask API wrappers
│   └── battery.js                # battery curve math (pure utility)
│
├── hooks/
│   ├── useWebRTCCameras.js       # existing (moved)
│   ├── useStopwatch.js           # extracted from 3 components
│   ├── useRosConnection.js       # extracted ROS setup pattern
│   ├── useObjectDetection.js     # extracted from Navigation
│   └── useRadioStatus.js         # extracted from OperationsWall
│
├── context/
│   └── WebRTCContext.js          # existing (moved)
│
├── components/
│   ├── ui/
│   │   ├── Modal.jsx             # generic modal/overlay wrapper
│   │   ├── GraphBar.jsx          # progress bar visualization
│   │   └── Timer.jsx             # stopwatch/countdown display
│   ├── layout/
│   │   ├── NavigationBar.jsx     # top mode selector
│   │   ├── SubsystemBar.jsx      # subsystem pill buttons
│   │   └── PageContent.jsx       # mode router
│   ├── camera/
│   │   ├── CameraFeed.jsx        # single camera stream
│   │   ├── CameraCard.jsx        # camera with label wrapper
│   │   ├── CameraManagerModal.jsx
│   │   └── FullscreenCameraOverlay.jsx
│   ├── map/
│   │   └── MapView.jsx
│   └── mission/
│       └── MissionPanel.jsx
│
├── features/
│   ├── operator/
│   │   ├── OperatorTab.jsx       # orchestrator (mode switch)
│   │   ├── DriveView.jsx
│   │   ├── ArmView.jsx
│   │   ├── ScienceView.jsx
│   │   └── DriveScienceView.jsx
│   ├── technician/
│   │   ├── TechnicianDashboard.jsx
│   │   ├── MissionClock.jsx
│   │   ├── PowerPanel.jsx
│   │   ├── CommsPanel.jsx
│   │   ├── MobilityPanel.jsx
│   │   └── DiagnosticsPanel.jsx
│   ├── science/
│   │   ├── ScienceMonitor.jsx    # orchestrator (tab switch)
│   │   ├── Scientist1Tab1.jsx
│   │   ├── Scientist1Tab2.jsx
│   │   ├── Scientist2Tab2.jsx
│   │   └── EquipmentSpecialist.jsx
│   ├── navigation/
│   │   ├── Navigation.jsx        # orchestrator
│   │   ├── ObjectDetection.jsx
│   │   ├── ControlPanel.jsx
│   │   └── RosCommandPanel.jsx
│   └── operations-wall/
│       ├── OperationsWall.jsx    # orchestrator
│       ├── ArmMonitor.jsx
│       ├── DriveMonitor.jsx
│       ├── DroneMonitor.jsx
│       └── RoverStatusMonitor.jsx
│
└── styles/
    └── theme.css                 # CSS custom properties (design tokens)
```

## Design Decisions

### D1: Migration Strategy — Bottom-Up
We refactor bottom-up to avoid breaking the app at any intermediate step:
1. Create new folders and shared utilities first (config, lib, hooks, components/ui)
2. Move existing files into new locations, updating imports
3. Decompose large components last (each decomposition is self-contained)

### D2: Barrel Exports
- `config/index.js` re-exports all config modules for clean imports
- Feature folders do NOT get barrel exports (avoids circular deps and tree-shaking issues)
- Components are imported directly by path

### D3: Hook Extraction Pattern
Extracted hooks return the same interface the inline code currently provides. Example:

```js
// hooks/useStopwatch.js
export default function useStopwatch() {
  // ... state + logic ...
  return { elapsedMs, running, start, pause, reset, formatted };
}
```

Components replace their inline stopwatch state with `const stopwatch = useStopwatch()`.

### D4: API Layer Pattern
```js
// lib/api.js
import { getApiBaseUrl } from "../config";

const base = () => getApiBaseUrl();

export async function getObjectDetectionStatus() {
  const res = await fetch(`${base()}/object-detection/status`);
  return res.json();
}
// ... etc
```

### D5: Modal/Overlay Extraction
The repeated pattern (fixed overlay + centered card + close on Escape + close on backdrop click) becomes a single `<Modal>` component:

```jsx
<Modal open={!!sciencePopup} onClose={() => setSciencePopup(null)} title={title}>
  {body}
</Modal>
```

### D6: FullscreenCameraOverlay
The camera fullscreen pattern (with rotation controls) is extracted into its own component that accepts `camera`, `rotation`, and `onRotate` props.

### D7: Design Tokens
```css
/* styles/theme.css */
:root {
  --color-surface-primary: #1a1a1a;
  --color-surface-secondary: #232323;
  --color-surface-elevated: #2b2b2b;
  --color-border-primary: #3d3d3d;
  --color-border-strong: #1f1e1e;
  --color-accent-danger: #c90202;
  --color-accent-danger-dark: #530000;
  --color-accent-success: #1f7a1f;
  --color-text-primary: #ffffff;
  --color-text-secondary: #d8d8d8;
  --color-text-muted: #888888;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 9999px;
}
```

### D8: File Extension Convention
Use `.jsx` for all component files (they contain JSX). Use `.js` for pure logic files (config, lib, hooks that don't return JSX).

### D9: Preserving External Imports
The `../../spectrometer/RamanPlot` import from ScienceMonitor and OperatorTab will need path adjustment based on new file depth. Since features are at `features/science/ScienceMonitor.jsx`, the import becomes `../../../../spectrometer/RamanPlot`.

## Risk Mitigation
- Each task is independently verifiable (app should build after each step)
- No behavior changes — only file moves and import rewrites
- Git history preserved via small, focused commits per task
