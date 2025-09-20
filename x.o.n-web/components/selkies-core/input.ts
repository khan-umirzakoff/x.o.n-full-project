/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Queue } from './util';
import { GamepadManager } from './gamepad';

/**
 * Helper function to keep track of attached event listeners.
 */
function addListener(
  obj: EventTarget,
  name: string,
  func: (event: any) => void,
  ctx: any
): [EventTarget, string, (event: any) => void] {
  const newFunc = ctx ? func.bind(ctx) : func;
  obj.addEventListener(name, newFunc);
  return [obj, name, newFunc];
}

/**
 * Helper function to remove all attached event listeners.
 */
function removeListeners(listeners: Array<[EventTarget, string, (event: any) => void]>) {
  for (const listener of listeners) {
    listener[0].removeEventListener(listener[1], listener[2]);
  }
  listeners.length = 0;
}

export class Input {
  element: HTMLVideoElement;
  send: (data: string) => void;
  mouseRelative: boolean;
  m: any;
  buttonMask: number;
  keyboard: any; // This will be Guacamole.Keyboard
  gamepadManager: GamepadManager | null;
  x: number;
  y: number;
  cursorScaleFactor: number | null;

  onmenuhotkey: (() => void) | null;
  onfullscreenhotkey: (() => void) | null;
  ongamepadconnected: ((id?: any) => void) | null;
  ongamepaddisconneceted: ((id?: any) => void) | null;
  onresizeend: (() => void) | null;

  listeners: Array<[EventTarget, string, (event: any) => void]>;
  listeners_context: Array<[EventTarget, string, (event: any) => void]>;

  _queue: Queue<number>;
  _rtime: Date | null;
  _rtimeout: boolean;
  _rdelta: number;
  _allowTrackpadScrolling: boolean;
  _allowThreshold: boolean;
  _smallestDeltaY: number;
  _wheelThreshold: number;
  _scrollMagnitude: number;

  constructor(element: HTMLVideoElement, send: (data: string) => void) {
    this.element = element;
    this.send = send;
    this.mouseRelative = false;
    this.m = null;
    this.buttonMask = 0;
    this.keyboard = null;
    this.gamepadManager = null;
    this.x = 0;
    this.y = 0;
    this.cursorScaleFactor = null;

    this.onmenuhotkey = null;
    this.onfullscreenhotkey = this.enterFullscreen;
    this.ongamepadconnected = null;
    this.ongamepaddisconneceted = null;
    this.onresizeend = null;

    this.listeners = [];
    this.listeners_context = [];

    this._queue = new Queue();
    this._rtime = null;
    this._rtimeout = false;
    this._rdelta = 500;
    this._allowTrackpadScrolling = true;
    this._allowThreshold = true;
    this._smallestDeltaY = 10000;
    this._wheelThreshold = 100;
    this._scrollMagnitude = 10;
  }

  _windowMath = () => {
    const windowW = this.element.offsetWidth;
    const windowH = this.element.offsetHeight;
    const frameW = this.element.videoWidth;
    const frameH = this.element.videoHeight;

    if (frameW === 0 || frameH === 0) return;

    const multi = Math.min(windowW / frameW, windowH / frameH);
    const vpWidth = frameW * multi;
    const vpHeight = frameH * multi;

    this.m = {
      mouseMultiX: frameW / vpWidth,
      mouseMultiY: frameH / vpHeight,
      mouseOffsetX: Math.max((windowW - vpWidth) / 2.0, 0),
      mouseOffsetY: Math.max((windowH - vpHeight) / 2.0, 0),
      centerOffsetX: 0,
      centerOffsetY: 0,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      frameW,
      frameH,
    };
  };

  _clientToServerX = (clientX: number): number => {
    if (!this.m) return 0;
    let serverX = Math.round(
      (clientX - this.m.mouseOffsetX - this.m.centerOffsetX + this.m.scrollX) * this.m.mouseMultiX
    );
    if (serverX >= this.m.frameW) serverX = this.m.frameW - 1;
    if (serverX < 0) serverX = 0;
    return serverX;
  };

  _clientToServerY = (clientY: number): number => {
    if (!this.m) return 0;
    let serverY = Math.round(
      (clientY - this.m.mouseOffsetY - this.m.centerOffsetY + this.m.scrollY) * this.m.mouseMultiY
    );
    if (serverY >= this.m.frameH) serverY = this.m.frameH - 1;
    if (serverY < 0) serverY = 0;
    return serverY;
  };

  _mouseButtonMovement = (event: MouseEvent) => {
    const down = event.type === 'mousedown' ? 1 : 0;
    let mtype = 'm';

    if (event.type === 'mousemove' && !this.m) return;

    if (!document.pointerLockElement && this.mouseRelative) {
      this.element.requestPointerLock().catch((e) => console.log('pointer lock failed: ', e));
    }

    if (down && event.button === 0 && event.ctrlKey && event.shiftKey) {
      this.element.requestPointerLock().catch((e) => console.log('pointer lock failed: ', e));
      return;
    }

    if (document.pointerLockElement === this.element) {
      mtype = 'm2';
      this.x = event.movementX;
      this.y = event.movementY;
    } else if (event.type === 'mousemove') {
      this.x = this._clientToServerX(event.clientX);
      this.y = this._clientToServerY(event.clientY);
    }

    if (event.type === 'mousedown' || event.type === 'mouseup') {
      const mask = 1 << event.button;
      if (down) {
        this.buttonMask |= mask;
      } else {
        this.buttonMask &= ~mask;
      }
    }

    const toks = [mtype, this.x, this.y, this.buttonMask, 0];
    this.send(toks.join(','));
    event.preventDefault();
  };

  _mouseWheel = (event: WheelEvent) => {
    const mtype = document.pointerLockElement === this.element ? 'm2' : 'm';
    const button = event.deltaY < 0 ? 4 : 3;

    const mask = 1 << button;
    // Simulate button press and release.
    for (let i = 0; i < 2; i++) {
      if (i === 0) this.buttonMask |= mask;
      else this.buttonMask &= ~mask;
      const toks = [mtype, this.x, this.y, this.buttonMask, Math.abs(event.deltaY)];
      this.send(toks.join(','));
    }
    event.preventDefault();
  };

  _contextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  _key = (event: KeyboardEvent) => {
    if (
      (event.code === 'F5' && event.ctrlKey) ||
      (event.code === 'KeyI' && event.ctrlKey && event.shiftKey) ||
      event.code === 'F11'
    ) {
      event.preventDefault();
      return;
    }
    if (event.type === 'keydown' && event.code === 'KeyM' && event.ctrlKey && event.shiftKey) {
      if (document.fullscreenElement === null && this.onmenuhotkey) {
        this.onmenuhotkey();
        event.preventDefault();
      }
      return;
    }
    if (event.type === 'keydown' && event.code === 'KeyF' && event.ctrlKey && event.shiftKey) {
      if (document.fullscreenElement === null && this.onfullscreenhotkey) {
        this.onfullscreenhotkey();
        event.preventDefault();
      }
      return;
    }
  };

  _pointerLock = () => {
    if (document.pointerLockElement === this.element) {
      this.send('p,1');
      console.log('remote pointer visibility to: True');
    } else {
      this.send('p,0');
      console.log('remote pointer visibility to: False');
    }
  };

  _exitPointerLock = () => {
    document.exitPointerLock();
    this.send('p,0');
    console.log('remote pointer visibility to: False');
  };

  _onFullscreenChange = () => {
    if (document.fullscreenElement) {
      if (document.pointerLockElement === null) {
        this.element.requestPointerLock().catch((e) => console.log('pointer lock failed: ', e));
      }
      this.requestKeyboardLock();
    }
    if (this.keyboard) {
      this.keyboard.reset();
    }
    this.send('kr');
  };

  attach = () => {
    this.listeners.push(addListener(this.element, 'resize', this._windowMath, this));
    this.listeners.push(addListener(document, 'pointerlockchange', this._pointerLock, this));
    if (this.element.parentElement) {
        this.listeners.push(addListener(this.element.parentElement, 'fullscreenchange', this._onFullscreenChange, this));
    }
    this.listeners.push(addListener(window, 'resize', this._windowMath, this));
    this.attach_context();
  };

  attach_context = () => {
    this.listeners_context.push(addListener(this.element, 'wheel', this._mouseWheel, this));
    this.listeners_context.push(addListener(this.element, 'contextmenu', this._contextMenu, this));
    this.listeners_context.push(addListener(window, 'keydown', this._key, this));
    this.listeners_context.push(addListener(window, 'keyup', this._key, this));
    this.listeners_context.push(addListener(this.element, 'mousemove', this._mouseButtonMovement, this));
    this.listeners_context.push(addListener(this.element, 'mousedown', this._mouseButtonMovement, this));
    this.listeners_context.push(addListener(this.element, 'mouseup', this._mouseButtonMovement, this));

    if (window.Guacamole) {
        this.keyboard = new window.Guacamole.Keyboard(document);
        this.keyboard.onkeydown = (keysym: number) => {
            this.send('kd,' + keysym);
        };
        this.keyboard.onkeyup = (keysym: number) => {
            this.send('ku,' + keysym);
        };
    } else {
        console.error("Guacamole.Keyboard not found. Make sure the script is loaded.");
    }

    this._windowMath();
  };

  detach = () => {
    removeListeners(this.listeners);
    this.detach_context();
  };

  detach_context = () => {
    removeListeners(this.listeners_context);
    if (this.keyboard) {
      this.keyboard.onkeydown = null;
      this.keyboard.onkeyup = null;
      this.keyboard.reset();
      this.keyboard = null;
      this.send('kr');
    }
    if (document.pointerLockElement === this.element) {
        this._exitPointerLock();
    }
  };

  enterFullscreen = () => {
    if (!this.element) return;
    if (document.pointerLockElement === null) {
      this.element.requestPointerLock().catch((e) => console.log('pointer lock failed: ', e));
    }
    if (document.fullscreenElement === null && this.element.parentElement) {
      this.element.parentElement.requestFullscreen().catch((e) => {
        console.log('fullscreen failed: ', e);
      });
    }
  };

  requestKeyboardLock() {
    if ('keyboard' in navigator && 'lock' in (navigator as any).keyboard) {
      const keys = ['AltLeft', 'AltRight', 'Tab', 'Escape', 'ContextMenu', 'MetaLeft', 'MetaRight'];
      (navigator as any).keyboard.lock(keys).catch((e: any) => {
        console.log('keyboard lock failed: ', e);
      });
    }
  }

  getWindowResolution(): [number, number] {
    const w = document.body.offsetWidth * window.devicePixelRatio;
    const h = document.body.offsetHeight * window.devicePixelRatio;
    const evenW = w - (w % 2);
    const evenH = h - (h % 2);
    return [evenW, evenH];
  }
}
