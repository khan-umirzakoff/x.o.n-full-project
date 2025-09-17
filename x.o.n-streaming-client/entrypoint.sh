#!/bin/bash

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

set -ex

trap "echo TRAPed signal" HUP INT QUIT TERM

# Wait for XDG_RUNTIME_DIR
until [ -d "${XDG_RUNTIME_DIR}" ]; do sleep 0.5; done
# Make user directory owned by the default user
chown -f "$(id -nu):$(id -ng)" ~ || sudo-root chown -f "$(id -nu):$(id -ng)" ~ || chown -R -f -h --no-preserve-root "$(id -nu):$(id -ng)" ~ || sudo-root chown -R -f -h --no-preserve-root "$(id -nu):$(id -ng)" ~ || echo 'Failed to change user directory permissions, there may be permission issues'
# Change operating system password to environment variable
(echo "${PASSWD}"; echo "${PASSWD}";) | sudo passwd "$(id -nu)" || (echo "mypasswd"; echo "${PASSWD}"; echo "${PASSWD}";) | passwd "$(id -nu)" || echo 'Password change failed, using default password'
# Remove directories to make sure the desktop environment starts
rm -rf /tmp/.X* ~/.cache || echo 'Failed to clean X11 paths'
# Ensure X11 socket directory exists with correct permissions (Xvfb requires this)
mkdir -pm1777 /tmp/.X11-unix || sudo-root mkdir -pm1777 /tmp/.X11-unix || echo 'Failed to create /tmp/.X11-unix'
chmod 1777 /tmp/.X11-unix || sudo-root chmod 1777 /tmp/.X11-unix || echo 'Failed to chmod /tmp/.X11-unix'
# Change time zone from environment variable
ln -snf "/usr/share/zoneinfo/${TZ}" /etc/localtime && echo "${TZ}" | tee /etc/timezone > /dev/null || echo 'Failed to set timezone'
# Add Lutris directories to path
export PATH="${PATH:+${PATH}:}/usr/local/games:/usr/games"
# Add LibreOffice to library path
export LD_LIBRARY_PATH="/usr/lib/libreoffice/program${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"

# Configure joystick interposer
export SELKIES_INTERPOSER='/usr/$LIB/selkies_joystick_interposer.so'
export LD_PRELOAD="${SELKIES_INTERPOSER}${LD_PRELOAD:+:${LD_LIBRARY_PATH}}"
export SDL_JOYSTICK_DEVICE=/dev/input/js0
mkdir -pm1777 /dev/input || sudo-root mkdir -pm1777 /dev/input || echo 'Failed to create joystick interposer directory'
touch /dev/input/js0 /dev/input/js1 /dev/input/js2 /dev/input/js3 || sudo-root touch /dev/input/js0 /dev/input/js1 /dev/input/js2 /dev/input/js3 || echo 'Failed to create joystick interposer devices'
chmod 777 /dev/input/js* || sudo-root chmod 777 /dev/input/js* || echo 'Failed to change permission for joystick interposer devices'

# Set default display
export DISPLAY="${DISPLAY:-:20}"
# PipeWire-Pulse server socket path
export PIPEWIRE_LATENCY="128/48000"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp}"
export PIPEWIRE_RUNTIME_DIR="${PIPEWIRE_RUNTIME_DIR:-${XDG_RUNTIME_DIR:-/tmp}}"
export PULSE_RUNTIME_PATH="${PULSE_RUNTIME_PATH:-${XDG_RUNTIME_DIR:-/tmp}/pulse}"
export PULSE_SERVER="${PULSE_SERVER:-unix:${PULSE_RUNTIME_PATH:-${XDG_RUNTIME_DIR:-/tmp}/pulse}/native}"
# Safe defaults for display parameters to avoid invalid -screen values
export DISPLAY_CDEPTH="${DISPLAY_CDEPTH:-24}"
export DISPLAY_DPI="${DISPLAY_DPI:-96}"
export DISPLAY_SIZEW="${DISPLAY_SIZEW:-1920}"
export DISPLAY_SIZEH="${DISPLAY_SIZEH:-1080}"

if [ -z "$(ldconfig -N -v $(sed 's/:/ /g' <<< $LD_LIBRARY_PATH) 2>/dev/null | grep 'libEGL_nvidia.so.0')" ] || [ -z "$(ldconfig -N -v $(sed 's/:/ /g' <<< $LD_LIBRARY_PATH) 2>/dev/null | grep 'libGLX_nvidia.so.0')" ]; then
  # Install NVIDIA userspace driver components including X graphic libraries, keep contents same between docker-selkies-glx-desktop and docker-selkies-egl-desktop
  export NVIDIA_DRIVER_ARCH="$(dpkg --print-architecture | sed -e 's/arm64/aarch64/' -e 's/armhf/32bit-ARM/' -e 's/i.*86/x86/' -e 's/amd64/x86_64/' -e 's/unknown/x86_64/')"
  if [ -z "${NVIDIA_DRIVER_VERSION}" ]; then
    # Driver version is provided by the kernel through the container toolkit, prioritize kernel driver version if available
    if [ -f "/proc/driver/nvidia/version" ]; then
      export NVIDIA_DRIVER_VERSION="$(head -n1 </proc/driver/nvidia/version | awk '{for(i=1;i<=NF;i++) if ($i ~ /^[0-9]+\.[0-9\.]+/) {print $i; exit}}')"
    elif command -v nvidia-smi >/dev/null 2>&1; then
      # Use NVIDIA-SMI when not available
      export NVIDIA_DRIVER_VERSION="$(nvidia-smi --version | grep 'DRIVER version' | cut -d: -f2 | tr -d ' ')"
    else
      echo 'Failed to find NVIDIA GPU driver version, container will likely not start because of no NVIDIA container toolkit or NVIDIA GPU driver present'
    fi
  fi
  cd /tmp
  # If version is different, new installer will overwrite the existing components

    # Check multiple sources in order to probe both consumer and datacenter driver versions
    curl -fsSL -O "https://international.download.nvidia.com/XFree86/Linux-${NVIDIA_DRIVER_ARCH}/${NVIDIA_DRIVER_VERSION}/NVIDIA-Linux-${NVIDIA_DRIVER_ARCH}-${NVIDIA_DRIVER_VERSION}.run" || curl -fsSL -O "https://international.download.nvidia.com/tesla/${NVIDIA_DRIVER_VERSION}/NVIDIA-Linux-${NVIDIA_DRIVER_ARCH}-${NVIDIA_DRIVER_VERSION}.run" || echo 'Failed NVIDIA GPU driver download'
  
  if [ -f "/tmp/NVIDIA-Linux-${NVIDIA_DRIVER_ARCH}-${NVIDIA_DRIVER_VERSION}.run" ]; then
    # Extract installer before installing
    rm -rf "NVIDIA-Linux-${NVIDIA_DRIVER_ARCH}-${NVIDIA_DRIVER_VERSION}"
    sh "NVIDIA-Linux-${NVIDIA_DRIVER_ARCH}-${NVIDIA_DRIVER_VERSION}.run" -x
    cd "NVIDIA-Linux-${NVIDIA_DRIVER_ARCH}-${NVIDIA_DRIVER_VERSION}"
    # Run NVIDIA driver installation without the kernel modules and host components
    sudo ./nvidia-installer --silent \
                      --no-kernel-module \
                      --install-compat32-libs \
                      --no-nouveau-check \
                      --no-nvidia-modprobe \
                      --no-systemd \
                      --no-rpms \
                      --no-backup \
                      --no-check-for-alternate-installs
    rm -rf /tmp/NVIDIA*
    cd ~
  else
    echo 'NVIDIA installer not found, skipping userspace install'
  fi
fi

# Run Xvfb server with required extensions (robust start with fallback)
XVFB_LOG="/tmp/xvfb.log"
# Pre-clean possible leftovers and ensure log exists
: >"${XVFB_LOG}" || true
pkill -f "Xvfb ${DISPLAY}" || true
rm -f "/tmp/.X${DISPLAY#*:}-lock" "/tmp/.X11-unix/X${DISPLAY#*:}" || true
set +e
# First attempt: keep extensions, but avoid potentially unsupported flags (+iglx, +render)
/usr/bin/Xvfb "${DISPLAY}" -screen 0 "${DISPLAY_SIZEW}x${DISPLAY_SIZEH}x${DISPLAY_CDEPTH}" -dpi "${DISPLAY_DPI}" \
  +extension "COMPOSITE" +extension "DAMAGE" +extension "GLX" +extension "RANDR" +extension "RENDER" \
  +extension "MIT-SHM" +extension "XFIXES" +extension "XTEST" \
  -nolisten "tcp" -ac -noreset -shmem >"${XVFB_LOG}" 2>&1 &
set -e

# Wait for X server to start (with timeout), then fallback to minimal flags if needed
echo 'Waiting for X Socket'
for i in $(seq 1 40); do
  if [ -S "/tmp/.X11-unix/X${DISPLAY#*:}" ]; then break; fi; sleep 0.5;
done
if [ ! -S "/tmp/.X11-unix/X${DISPLAY#*:}" ]; then
  echo 'X Socket not found, retrying Xvfb with minimal flags'
  pkill -f "Xvfb ${DISPLAY}" || true
  set +e
  /usr/bin/Xvfb "${DISPLAY}" -screen 0 "${DISPLAY_SIZEW}x${DISPLAY_SIZEH}x${DISPLAY_CDEPTH}" -dpi "${DISPLAY_DPI}" -nolisten "tcp" -ac -noreset >"${XVFB_LOG}" 2>&1 &
  set -e
  for i in $(seq 1 40); do
    if [ -S "/tmp/.X11-unix/X${DISPLAY#*:}" ]; then break; fi; sleep 0.5;
  done
fi
if [ ! -S "/tmp/.X11-unix/X${DISPLAY#*:}" ]; then
  echo 'Failed to start Xvfb. Last 80 lines of log:'
  tail -n 80 "${XVFB_LOG}" || true
  exit 1
fi

echo 'X Server is ready'

# Resize the screen to the provided size
if command -v /usr/local/bin/selkies-gstreamer-resize >/dev/null 2>&1; then
  /usr/local/bin/selkies-gstreamer-resize "${DISPLAY_SIZEW}x${DISPLAY_SIZEH}"
else
  echo "WARN: selkies-gstreamer-resize not found, skipping initial resize"
fi

# Use VirtualGL to run the KDE desktop environment with OpenGL if the GPU is available, otherwise use OpenGL with llvmpipe
export XDG_SESSION_ID="${DISPLAY#:}"
export QT_LOGGING_RULES="${QT_LOGGING_RULES:-*.debug=false;qt.qpa.*=false}"
if [ -n "$(nvidia-smi --query-gpu=uuid --format=csv,noheader | head -n1)" ] || [ -n "$(ls -A /dev/dri 2>/dev/null)" ]; then
  export VGL_FPS="${DISPLAY_REFRESH}"
  /usr/bin/vglrun -d "${VGL_DISPLAY:-egl}" +wm /usr/bin/dbus-launch --exit-with-session /usr/bin/startplasma-x11 &
else
  /usr/bin/dbus-launch --exit-with-session /usr/bin/startplasma-x11 &
fi

# Start Fcitx input method framework
/usr/bin/fcitx &


echo "Session Running. Press [Return] to exit."
read
