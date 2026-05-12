"""Pytest configuration — adds the umdloop_gui_web directory to sys.path."""

import sys
from pathlib import Path

# Add umdloop_gui_web to path so `backend.*` imports resolve
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
