# Requirements: Professional App Structure Refactor

## Overview
Restructure the `umdloop_gui_web/app/` directory from its current flat, monolithic layout into a professional, feature-based architecture. This is a purely organizational refactor — no functionality changes.

## Current State
- All UI components live in a flat `GUI functions/` folder (space in name)
- Components are large monoliths (OperatorTab: 700 lines, TechnicianDashboard: 684 lines, ScienceMonitor: 601 lines)
- Inline styles used everywhere with no design tokens
- Business logic, API calls, ROS subscriptions, and UI rendering mixed in same files
- Duplicated logic (stopwatch in 3 places, fullscreen overlay in 3 places, graphBar in 2 places)
- Hardcoded API URLs scattered throughout components instead of using centralized config
- No separation between reusable UI primitives and feature-specific components

## Requirements

### R1: Directory Structure
- Remove the `GUI functions/` folder (space in path causes tooling issues)
- Organize into: `config/`, `lib/`, `hooks/`, `context/`, `components/`, `features/`, `styles/`
- Feature folders: `operator/`, `technician/`, `science/`, `navigation/`, `operations-wall/`
- Component subfolders: `ui/` (generic primitives), `layout/` (navigation chrome), `camera/`, `map/`, `mission/`

### R2: Extract Shared Hooks
- `useStopwatch` — currently duplicated in OperatorTab, ScienceMonitor, TechnicianDashboard
- `useRosConnection` — ROS WebSocket setup duplicated in TechnicianDashboard and OperationsWall
- `useObjectDetection` — polling logic from Navigation.js
- `useRadioStatus` — polling logic from OperationsWall

### R3: Extract Reusable UI Components
- `Modal` / `FullscreenOverlay` — repeated fullscreen/popup overlay pattern
- `GraphBar` — duplicated bar chart helper
- `Timer` — stopwatch + countdown display (used in 3 places)
- `StatusBadge` — repeated status indicator pattern
- `Button` / `Card` — repeated inline style patterns

### R4: Centralize Configuration
- Move topic definitions to `config/ros-topics.js`
- Move environment helpers to `config/environment.js`
- Move UI constants (MODES, SUBSYSTEMS, CAMERA_ROLES) to `config/constants.js`
- Provide `config/index.js` barrel export

### R5: Centralize API Layer
- Create `lib/api.js` with typed fetch wrappers for all Flask backend endpoints
- Use `getApiBaseUrl()` consistently (currently hardcoded in Navigation.js)
- Functions: `getObjectDetectionStatus()`, `startObjectDetection()`, `stopObjectDetection()`, `sendPathPlan()`, `getRoverPosition()`, `getRadioStatus()`

### R6: Decompose Large Components
- `OperatorTab` (700 lines) → `DriveView`, `ArmView`, `ScienceView`, `DriveScienceView`
- `TechnicianDashboard` (684 lines) → `MissionClock`, `PowerPanel`, `CommsPanel`, `MobilityPanel`, `DiagnosticsPanel`
- `ScienceMonitor` (601 lines) → `Scientist1Tab1`, `Scientist1Tab2`, `Scientist2Tab2`, `EquipmentSpecialist`
- `Navigation` (250 lines) → `ObjectDetection`, `ControlPanel`, `RosCommandPanel`
- `OperationsWall` (400+ lines) → `ArmMonitor`, `DriveMonitor`, `DroneMonitor`, `RoverStatusMonitor`

### R7: Styling Strategy
- Extract repeated color values into CSS custom properties (design tokens)
- Create a `styles/theme.css` with named variables for all colors, spacing, border-radii
- Components continue using inline styles but reference CSS variables where possible
- No requirement to migrate fully to CSS modules or Tailwind (that's a separate effort)

### R8: Preserve Behavior
- Zero functional changes — app must behave identically before and after
- All existing WebRTC, ROS, camera, map, navigation, and telemetry features must work
- No new dependencies introduced
- Existing imports from outside `app/` (e.g., `../../spectrometer/RamanPlot`) must still resolve

### R9: Import Hygiene
- Each feature folder may have an `index.js` barrel export
- Avoid circular imports
- Keep import paths relative and short

## Out of Scope
- Adding tests (separate effort)
- Migrating to Tailwind or CSS modules
- Changing any component behavior or API
- TypeScript migration
- Performance optimizations
