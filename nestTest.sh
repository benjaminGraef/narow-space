#!/bin/sh

env MUTTER_DEBUG_DUMMY_MODE_SPECS=2560x1600 dbus-run-session -- gnome-shell --nested --wayland 2>&1 | grep -i seaspace