# Tasks: Professional App Structure Refactor

## Phase 1: Foundation (new folders + shared utilities)

- [x] 1. Create directory structure and design tokens
  - Create all new directories: `config/`, `lib/`, `hooks/`, `context/`, `components/ui/`, `components/layout/`, `components/camera/`, `components/map/`, `components/mission/`, `features/operator/`, `features/technician/`, `features/science/`, `features/navigation/`, `features/operations-wall/`, `styles/`
  - Create `styles/theme.css` with CSS custom properties extracted from repeated inline color/spacing values
  - Import `theme.css` in `globals.css`

- [x] 2. Create centralized config modules
  - Create `config/environment.js` — move `getRosbridgeUrl`, `getApiBaseUrl`, `getWebRTCUrl`, `useLocalTiles` from `config.js`
  - Create `config/ros-topics.js` — move `GUI_REQUIRED_TOPICS`, `TECHNICIAN_TOPICS`, `TECHNICIAN_COMMAND_TOPICS` from `config.js`
  - Create `config/constants.js` — move all exports from `GUI functions/pageConstants.js` (MODES, SUBSYSTEMS, CAMERA_ROLES, etc.)
  - Create `config/index.js` barrel export
  - Delete old `config.js` and `GUI functions/pageConstants.js`
  - Update all imports across the codebase

- [x] 3. Create centralized API layer and move battery utility
  - Create `lib/api.js` with fetch wrappers: `getObjectDetectionStatus`, `startObjectDetection`, `stopObjectDetection`, `sendPathPlan`, `getRoverPosition`, `getRadioStatus`, `sendRosCommand`
  - Move `battery.js` to `lib/battery.js`
  - Update all imports

- [x] 4. Extract shared hooks
  - Create `hooks/useStopwatch.js` — extract stopwatch logic (used in OperatorTab, ScienceMonitor, TechnicianDashboard)
  - Create `hooks/useRosConnection.js` — extract ROS WebSocket setup + topic subscription pattern
  - Create `hooks/useObjectDetection.js` — extract polling logic from Navigation.js
  - Create `hooks/useRadioStatus.js` — extract radio polling from OperationsWall
  - Move existing `hooks/useWebRTCCameras.js` to new `hooks/` location
  - Move `hooks/WebRTCContext.js` to `context/WebRTCContext.js`
  - Update all imports

## Phase 2: Extract reusable UI components

- [x] 5. Create shared UI components
  - Create `components/ui/Modal.jsx` — generic modal overlay (backdrop click, Escape key, title, close button)
  - Create `components/ui/GraphBar.jsx` — the repeated progress bar visualization
  - Create `components/ui/Timer.jsx` — stopwatch/countdown display component using `useStopwatch`

## Phase 3: Move and reorganize existing components

- [x] 6. Move layout and camera components
  - Move `NavigationBar.js` → `components/layout/NavigationBar.jsx`
  - Move `SubsystemBar.js` → `components/layout/SubsystemBar.jsx`
  - Move `PageContent.js` → `components/layout/PageContent.jsx`
  - Move `CameraFeed.js` → `components/camera/CameraFeed.jsx`
  - Move `CameraManagerModal.js` → `components/camera/CameraManagerModal.jsx`
  - Extract `FullscreenCameraOverlay` from OperatorTab → `components/camera/FullscreenCameraOverlay.jsx`
  - Move `MapView.js` → `components/map/MapView.jsx`
  - Move `MissionPanel.js` → `components/mission/MissionPanel.jsx`
  - Update all imports in `page.js` and other consumers

## Phase 4: Decompose large feature components

- [x] 7. Decompose OperatorTab into feature modules
  - Create `features/operator/OperatorTab.jsx` — slim orchestrator that switches on selectedSubsystem
  - Create `features/operator/DriveView.jsx` — extract "Drive (Default)" branch
  - Create `features/operator/ArmView.jsx` — extract "Arm" branch
  - Create `features/operator/ScienceView.jsx` — extract "Science" branch
  - Create `features/operator/DriveScienceView.jsx` — extract "Drive (Science)" branch
  - Delete old `GUI functions/OperatorTab.js`
  - Update import in PageContent

- [x] 8. Decompose Navigation into feature modules
  - Create `features/navigation/Navigation.jsx` — slim orchestrator
  - Create `features/navigation/ObjectDetection.jsx` — extract "Object Detection" panel
  - Create `features/navigation/ControlPanel.jsx` — extract "Control Panel" panel
  - Create `features/navigation/RosCommandPanel.jsx` — extract "Placeholder2" / ROS command panel
  - Delete old `GUI functions/Navigation.js`
  - Update import in PageContent

- [x] 9. Decompose OperationsWall into feature modules
  - Create `features/operations-wall/OperationsWall.jsx` — slim orchestrator
  - Create `features/operations-wall/ArmMonitor.jsx`
  - Create `features/operations-wall/DriveMonitor.jsx`
  - Create `features/operations-wall/DroneMonitor.jsx`
  - Create `features/operations-wall/RoverStatusMonitor.jsx`
  - Delete old `GUI functions/OperationsWall.js`
  - Update imports in PageContent and OperatorTab

- [x] 10. Decompose TechnicianDashboard into feature modules
  - Create `features/technician/TechnicianDashboard.jsx` — slim orchestrator
  - Create `features/technician/MissionClock.jsx`
  - Create `features/technician/PowerPanel.jsx`
  - Create `features/technician/CommsPanel.jsx`
  - Create `features/technician/MobilityPanel.jsx`
  - Create `features/technician/DiagnosticsPanel.jsx`
  - Delete old `GUI functions/TechnicianDashboard.js`
  - Update import in PageContent

- [x] 11. Decompose ScienceMonitor into feature modules
  - Create `features/science/ScienceMonitor.jsx` — slim orchestrator (tab switch)
  - Create `features/science/Scientist1Tab1.jsx`
  - Create `features/science/Scientist1Tab2.jsx`
  - Create `features/science/Scientist2Tab2.jsx`
  - Create `features/science/EquipmentSpecialist.jsx`
  - Create `features/science/DefaultScienceView.jsx` — the "Scientist 2 Tab 1" default grid view
  - Delete old `GUI functions/ScienceMonitor.js`
  - Update import in PageContent

## Phase 5: Cleanup

- [x] 12. Final cleanup and verification
  - Remove the empty `GUI functions/` directory
  - Verify the app builds successfully (`npm run build` or `next build`)
  - Verify no broken imports remain
  - Verify all pages render correctly (manual smoke test)
  - Update `page.js` imports if any remain pointing to old paths
