const GP_TIMEOUT = 50; // Poll every 50ms
const MAX_GAMEPADS = 4; // Max number of gamepads to poll

interface GamepadState {
  axes: number[];
  buttons: number[];
}

export class GamepadManager {
  public numButtons: number;
  public numAxes: number;
  private onButton: (gp_num: number, btn_num: number, val: number) => void;
  private onAxis: (gp_num: number, axis_num: number, val: number) => void;
  private state: { [key: number]: GamepadState };
  private interval: number;

  constructor(
    gamepad: Gamepad,
    onButton: (gp_num: number, btn_num: number, val: number) => void,
    onAxis: (gp_num: number, axis_num: number, val: number) => void
  ) {
    this.numButtons = gamepad.buttons.length;
    this.numAxes = gamepad.axes.length;
    this.onButton = onButton;
    this.onAxis = onAxis;
    this.state = {};
    this.interval = window.setInterval(() => {
      this._poll();
    }, GP_TIMEOUT);
  }

  private _poll() {
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < MAX_GAMEPADS; i++) {
      const gpDevice = gamepads[i];

      if (gpDevice) {
        let gpState = this.state[i];

        if (!gpState) {
          gpState = this.state[i] = { axes: [], buttons: [] };
        }

        for (let x = 0; x < gpDevice.buttons.length; x++) {
          const value = gpDevice.buttons[x].value;
          if (gpState.buttons[x] !== value) {
            this.onButton(i, x, value);
          }
          gpState.buttons[x] = value;
        }

        for (let x = 0; x < gpDevice.axes.length; x++) {
          let val = gpDevice.axes[x];
          if (Math.abs(val) < 0.05) val = 0;

          if (gpState.axes[x] !== val) {
            this.onAxis(i, x, val);
          }
          gpState.axes[x] = val;
        }
      } else if (this.state[i]) {
        delete this.state[i];
      }
    }
  }

  public destroy() {
    clearInterval(this.interval);
  }
}