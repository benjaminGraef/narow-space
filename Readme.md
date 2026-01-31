# Narrow-space
This is a tiling window manager that runs on top of Gnome, as a gnome extension. It is heavily based on the Mac OS window manager called aerospace (https://github.com/nikitabobko/AeroSpace), which is in turn inspired by i3 window manager.

## Features currently working
* Tree based tiling window management
* Own implementation of workspaces, not relying on the gnome nativ workspaces. When using the term workspace, I am refering to narros-space workspaces from now on.

## Features yet to come
* Multi monitor support.
* Better customization/configuration

## Setup and configuration
To setup, just install the gnome extension and enable it. Only windows that are openend once the extension is enabled, will be managed by it.

The switching between workspaces happens by minimizing all windows not in the current workspace. This will show the minimize animation in gnome, which is annoying. To avoid that disable the animations under "Settings > Accessibility > Seeing > Reduce Animation to ON". This will make the switching much smoother.

For now there is not really any configuration that can be done to this extension. I want to add a configuration file that can 

