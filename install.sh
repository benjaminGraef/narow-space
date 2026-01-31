#!/bin/sh

INSTALLOC=$HOME/.local/share/gnome-shell/extensions/narrow-space@ben.dev

glib-compile-schemas narrow-space@ben.dev/schemas/
echo "compiled schemas"

rm $INSTALLOC -rf
cp ./narrow-space@ben.dev  $INSTALLOC -r
echo "Installed file to ${INSTALLOC}"
