import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
# Allow CORS for all domains on all routes, which is acceptable for this internal agent.
CORS(app)

@app.route('/launch', methods=['POST'])
def launch_game():
    """
    Launches a game using Steam.
    Expects a JSON payload with 'app_id', e.g., {"app_id": "730"} for Counter-Strike 2.
    """
    # Check if the request has a JSON body
    if not request.json:
        logging.error("Received request with no JSON body.")
        return jsonify({"status": "error", "message": "Invalid request: Missing JSON body."}), 400

    app_id = request.json.get('app_id')

    if not app_id:
        logging.error("Received request without an 'app_id'.")
        return jsonify({"status": "error", "message": "Invalid request: 'app_id' is required."}), 400

    logging.info(f"Received request to launch game with app_id: {app_id}")

    try:
        # Sanitize app_id to ensure it's a number, preventing command injection.
        if not str(app_id).isdigit():
            logging.error(f"Invalid app_id format: {app_id}")
            return jsonify({"status": "error", "message": "Invalid app_id: Must be a number."}), 400

        # Steam executable'ning to'g'ri yo'li
        steam_path = "/home/ubuntu/.steam/debian-installation/ubuntu12_32/steam"
        command = f"{steam_path} steam://run/{app_id}"
        logging.info(f"Executing command: {command}")

        # Using Popen to launch the game in a non-blocking way.
        # The environment needs to be set up correctly for the 'steam' command to be found
        # and for it to connect to the correct display. We pass the current environment.
        subprocess.Popen(command.split(), env=os.environ.copy())

        return jsonify({"status": "success", "message": f"Launch command issued for app_id {app_id}."}), 200

    except Exception as e:
        logging.error(f"Failed to launch game {app_id}: {e}")
        return jsonify({"status": "error", "message": "An internal error occurred."}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "game-agent"}), 200

if __name__ == '__main__':
    # Listens on all available network interfaces.
    # The port should be exposed in the Docker configuration.
    app.run(host='0.0.0.0', port=5001)
