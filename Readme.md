# Narrow-space
This is a tiling window manager that runs on top of Gnome, as a gnome extension. It is heavily based on the macOS window manager called aerospace (https://github.com/nikitabobko/AeroSpace), which is in turn inspired by the i3 window manager.

## Features currently working
* Tree based tiling window management
* Own implementation of workspaces, not relying on the gnome nativ workspaces. When using the term workspace, I am referring to narrow-space workspaces from now on.
* Custom keybinding configuration
* Workspace indication on top left panel + pause toggle

## Features yet to come
* Multi monitor support.
* Better customization/configuration
* More stability

## Setup and configuration
To setup, just install the gnome extension and enable it. Only windows that are opened once the extension is enabled, will be managed by it.

The switching between workspaces happens by minimizing all windows not in the current workspace. This will show the minimize animation in gnome, which is annoying. To avoid that disable the animations under `Settings > Accessibility > Seeing > Reduce Animation to ON`. This will make the switching much smoother.

For now there is not really any configuration that can be done to this extension. I want to add a configuration file that can customize some behaviour of the extension at some point.

### Configuration file
In order for narrow-space to work, you need a configuration file located under:

    /home/yourUserName/.config/narrow-space/keybindings.json

In this file, the workspace definitions as well as keybindings are defined. An example one can be found in this repository as well. 

### Workspaces

In the configuration file, the available workspaces are defined by the user. In total up to 16 different workspaces are possible. Each workspace has its own name (or key). For example, common workspaces would be 1-9. But any string is possible. The workspace is shown on the right top bar when the extension is active. The following would be an example for workspace definitions written in the keybindings.json:

    "define-workspace": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "M", "T"],

This would define 11 workspaces, with each workspace having its individual name, which will be shown when active.

### Keybindings
 The configuration json file describes the function and the desired keybinding for it. So for example:

    {
        "narrow-space-switch-workspace-1": ["<Super>1"]
    }
This configures Super + 1 key to trigger the function `switch-workspace-1`, which switches to workspace 1. Keep in mind that the `1` in `narrow-space-switch-workspace-1` means literally the first workspace that is defined in the array of `define-workspace` and <b>NOT</b> the name you gave that the workspace.

<b>Important: If on your system, the configured keybinding is already used for something else, narrow-space will not pick it up and therefore not function correctly! Check your keybindings under `Settings > Keyboard > View and Customize Shortcuts`</b>. Furthermore on Ubuntu the super + 0-9 keys are used to launch apps from the dock, you can disable that with:

    gsettings set org.gnome.shell.extensions.dash-to-dock hot-keys false
    gsettings set org.gnome.shell.keybindings switch-to-application-1 []
    gsettings set org.gnome.shell.keybindings switch-to-application-2 []
    gsettings set org.gnome.shell.keybindings switch-to-application-3 []
    gsettings set org.gnome.shell.keybindings switch-to-application-4 []
    gsettings set org.gnome.shell.keybindings switch-to-application-5 []
    gsettings set org.gnome.shell.keybindings switch-to-application-6 []
    gsettings set org.gnome.shell.keybindings switch-to-application-7 []
    gsettings set org.gnome.shell.keybindings switch-to-application-8 []
    gsettings set org.gnome.shell.keybindings switch-to-application-9 []

## Supported Functions and Default Keybindings

The following tables list all supported functions, grouped by category, with their default keybindings (when used with the keybinding.json that is provided in the repository) and a short description.

### Workspace Switching

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-switch-workspace1 | Super + 1 | Switch to workspace **1** |
| narrow-space-switch-workspace2 | Super + 2 | Switch to workspace **2** |
| narrow-space-switch-workspace3 | Super + 3 | Switch to workspace **3** |
| narrow-space-switch-workspace4 | Super + 4 | Switch to workspace **4** |
| narrow-space-switch-workspace5 | Super + 5 | Switch to workspace **5** |
| narrow-space-switch-workspace6 | Super + 6 | Switch to workspace **6** |
| narrow-space-switch-workspace7 | Super + 7 | Switch to workspace **7** |
| narrow-space-switch-workspace8 | Super + 8 | Switch to workspace **8** |
| narrow-space-switch-workspace9 | Super + 9 | Switch to workspace **9** |
| narrow-space-switch-workspace-s | Super + S | Switch to workspace **S** |
| narrow-space-switch-workspace-b | Super + B | Switch to workspace **B** |
| narrow-space-switch-workspace-m | Super + M | Switch to workspace **M** |
| narrow-space-switch-workspace-t | Super + T | Switch to workspace **T** |

### Moving Windows Between Workspaces

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-move-window-to-workspace-1 | Super + Shift + 1 | Move focused window to workspace **1** |
| narrow-space-move-window-to-workspace-2 | Super + Shift + 2 | Move focused window to workspace **2** |
| narrow-space-move-window-to-workspace-3 | Super + Shift + 3 | Move focused window to workspace **3** |
| narrow-space-move-window-to-workspace-4 | Super + Shift + 4 | Move focused window to workspace **4** |
| narrow-space-move-window-to-workspace-5 | Super + Shift + 5 | Move focused window to workspace **5** |
| narrow-space-move-window-to-workspace-6 | Super + Shift + 6 | Move focused window to workspace **6** |
| narrow-space-move-window-to-workspace-7 | Super + Shift + 7 | Move focused window to workspace **7** |
| narrow-space-move-window-to-workspace-8 | Super + Shift + 8 | Move focused window to workspace **8** |
| narrow-space-move-window-to-workspace-9 | Super + Shift + 9 | Move focused window to workspace **9** |
| narrow-space-move-window-to-workspace-s | Super + Shift + S | Move focused window to workspace **S** |
| narrow-space-move-window-to-workspace-b | Super + Shift + B | Move focused window to workspace **B** |
| narrow-space-move-window-to-workspace-m | Super + Shift + M | Move focused window to workspace **M** |
| narrow-space-move-window-to-workspace-t | Super + Shift + T | Move focused window to workspace **T** |

### Focus Navigation

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-move-focus-left | Super + H | Move focus to the window on the **left** |
| narrow-space-move-focus-right | Super + L | Move focus to the window on the **right** |
| narrow-space-move-focus-up | Super + K | Move focus to the window **above** |
| narrow-space-move-focus-down | Super + J | Move focus to the window **below** |

### Window Movement

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-move-window-left | Super + Shift + H | Move focused window **left** |
| narrow-space-move-window-right | Super + Shift + L | Move focused window **right** |
| narrow-space-move-window-up | Super + Shift + K | Move focused window **up** |
| narrow-space-move-window-down | Super + Shift + J | Move focused window **down** |

### Layout & Resizing

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-change-workspace-mode | Super + , | Cycle workspace layout / mode |
| narrow-space-resize-inc | Super + Shift + P | Increase size of the focused window |
| narrow-space-resize-dec | Super + Shift + O | Decrease size of the focused window |

### Window State & Modes

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-toggle-floating | Super + Shift + F | Toggle floating state of focused window |
| narrow-space-service-mode | Super + Shift + X | Toggle service mode |


### Service Mode keybindings
When in the service mode, indicated by the letters `Se` next to the current workspace indication label, some keybindings change their meaning. These are listed here:

| Function ID | Default Keybinding | Description |
|------------|-------------------|-------------|
| narrow-space-move-window-left | Super + Shift + H | Join the focused window with the window on the **left**, creating a new workspace inside the current workspace |
| narrow-space-move-window-right | Super + Shift + L | Join the focused window with the window on the **right**, creating a new workspace inside the current workspace |
| narrow-space-move-window-up | Super + Shift + K | Join the focused window with the window **above**, creating a new workspace inside the current workspace |
| narrow-space-move-window-down | Super + Shift + J | Join the focused window with the window **below**, creating a new workspace inside the current workspace |

## Nested Workspaces
Each workspace has a single tiling/layout strategy. Tiling vertical, horizontal or stacking vertical, horizontal. If you want to have two different layout strategies within one workspace, it is possible by creating a workspace within a workspace. This can be done by switching into the service mode and then joining the window with the window in the desired direction (narrow-space-move-window-... function). This will create a workspace containing the joined windows. Do not forget to leave the service mode again.

## Known Limitations
Some windows are not automatically tiled when they are started. I think the reason is that they try to restore some previous state they had and mess with the narrow-space resizing that gets triggered when a new window is created. Just switch to another workspace and then switch back and the tiling will work.

I only have 1 monitor currently, so I am not able to develop it for multiple monitor support, this will come soon!

Its for sure not super stable, but it works quite nice already.