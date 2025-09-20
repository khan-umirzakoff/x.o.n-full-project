/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *   Copyright 2019 Google LLC
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

/*eslint no-unused-vars: ["error", { "vars": "local" }]*/

import { Queue } from './util';
import { GamepadManager } from './gamepad';

// Minimal TypeScript module version of the original Input class.
// This keeps API surface used elsewhere (e.g., getWindowResolution) while we complete the full port.
export class Input {
  element: Element | null;
  send: (data: string) => void;
  mouseRelative: boolean;
  m: any;
  buttonMask: number;
  keyboard: any;
  gamepadManager: GamepadManager | null;
  x: number;
  y: number;
  onmenuhotkey: (() => void) | null;
  onfullscreenhotkey: (() => void) | null;
  ongamepadconnected: ((id?: any) => void) | null;
  ongamepaddisconneceted: ((id?: any) => void) | null;
  listeners: Array<any>;
  listeners_context: Array<any>;
  onresizeend: (() => void) | null;
  _queue: Queue;
  _rtime: number | null;

  constructor(element: Element | null, send: (data: string) => void) {
    this.element = element;
    this.send = send;

    this.mouseRelative = false;
    this.m = null;
    this.buttonMask = 0;
    this.keyboard = null;
    this.gamepadManager = null;
    this.x = 0;
    this.y = 0;

    this.onmenuhotkey = null;
    this.onfullscreenhotkey = this.enterFullscreen;
    this.ongamepadconnected = null;
    this.ongamepaddisconneceted = null;

    this.listeners = [];
    this.listeners_context = [];

    this.onresizeend = null;

    this._queue = new Queue();

    this._rtime = null;
  }

  // Fullscreen helper retained from original to preserve UX bindings.
  enterFullscreen = () => {
    if (!this.element) return;
    if (document.pointerLockElement === null && (this.element as any).requestPointerLock) {
      (this.element as any).requestPointerLock();
    }
    if (document.fullscreenElement === null && this.element.parentElement) {
      this.element.parentElement.requestFullscreen().catch((e) => {
        console.log('fullscreen failed: ', e);
      });
    }
  };

  /**
   * Request keyboard lock, must be in fullscreen mode to work.
   */
  requestKeyboardLock() {
    if ('keyboard' in navigator && 'lock' in (navigator as any).keyboard) {
      const keys = [
        'AltLeft',
        'AltRight',
        'Tab',
        'Escape',
        'ContextMenu',
        'MetaLeft',
        'MetaRight',
      ];
      (navigator as any).keyboard
        .lock(keys)
        .then(() => {
          console.log('keyboard lock success');
        })
        .catch((e: any) => {
          console.log('keyboard lock failed: ', e);
        });
    }
  }

  /**
   * Returns current window resolution aligned to even values and scaled by devicePixelRatio.
   */
  getWindowResolution(): [number, number] {
    return [
      parseInt((() => {
        const offsetRatioWidth = document.body.offsetWidth * window.devicePixelRatio;
        return offsetRatioWidth - (offsetRatioWidth % 2);
      })() as unknown as string),
      parseInt((() => {
        const offsetRatioHeight = document.body.offsetHeight * window.devicePixelRatio;
        return offsetRatioHeight - (offsetRatioHeight % 2);
      })() as unknown as string),
    ];
  }
}
