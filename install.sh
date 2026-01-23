#!/bin/sh

INSTALLOC=$HOME/.local/share/gnome-shell/extensions/seaside@ben.com

glib-compile-schemas seaside@ben.com/schemas/
echo "compiled schemas"

rm $INSTALLOC -rf
cp ./seaside@ben.com $INSTALLOC -r
echo "Installed file to ${INSTALLOC}"
