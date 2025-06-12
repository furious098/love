import sqlite3
from flask import Flask, request, jsonify, g
import requests
import time

app = Flask(__name__)
DATABASE = 'traffic.db' # Use a relative path or configure for absolute path

# Helper function to get database connection

def lookup_ip_info(ip):
    """
    Calls the ip-api.com API to get country, city, ASN, provider,
    and coordinates for a given IP address.
    """
    try:
        response = requests.get(f'http://ip-api.com/json/{ip}?fields=country,city,isp,org,lat,lon')
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        if data.get('status') == 'success':
            return data.get('country', ''), data.get('city', ''), data.get('org', ''), data.get('isp', ''), f"{data.get('lat', '')},{data.get('lon', '')}"
        else:
            print(f"IP API lookup failed for {ip}: {data.get('message', 'Unknown error')}")
            return '', '', '', '', ''
    except requests.exceptions.RequestException as e:
        print(f"Error during IP API lookup for {ip}: {e}")
        return '', '', '', '', ''

@app.route('/register', methods=['POST'])
def register_data():
    """
    Receives data from the frontend, including fingerprinting data,
    For now, it just prints all the received data and headers.
    """
    if request.is_json:
        data = request.get_json()
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent')
        referer = request.headers.get('Referer')
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())

        # Extract fingerprinting data
        screen_resolution = data.get('resolution')
        timezone = data.get('timezone')
        canvas_fingerprint = data.get('canvas')
        webgl_info = data.get('webgl')
        plugins = ', '.join(data.get('plugins', [])) # Store as comma-separated string
        fonts = ', '.join(data.get('fonts', [])) # Store as comma-separated string
        is_tor = data.get('isTor', 0) # Assuming 0 or 1
        is_proxy = data.get('isProxy', 0) # Assuming 0 or 1
        is_headless = data.get('isHeadless', 0) # Assuming 0 or 1
        time_on_page = data.get('timeOnPage', 0)
        mouse_movements = data.get('mouseMovements', 0)
        clicks = data.get('clicks', 0)

        # Perform IP lookup
        country, city, asn, provider_ip, coordinates_ip = lookup_ip_info(ip_address)
        
        provider = data.get('provider', '')
        coordinates = data.get('coordinates', '')

        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                '''INSERT INTO accesses (
                    ip, timestamp, user_agent, browser, os, language, referer, 
                    screen_resolution, timezone, canvas_fingerprint, webgl_info,
                    plugins, fonts, is_tor, is_proxy, is_headless, time_on_page,
                    mouse_movements, clicks, country, city, asn, provider, coordinates
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (ip_address, timestamp, user_agent, data.get('browser', ''), data.get('os', ''), data.get('language', ''), referer, 
                 screen_resolution, timezone, canvas_fingerprint, webgl_info, 
                 plugins, fonts, is_tor, is_proxy, is_headless, time_on_page,
                 mouse_movements, clicks, country, city, asn, provider, coordinates) 
            )
            db.commit()
        except Exception as e:
            print(f"Database error: {e}")
            return jsonify({"status": "error", "message": "Database error"}), 500

        return jsonify({"status": "success", "message": "Data received successfully!"}), 200
    else:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 415

# Admin Panel API Endpoint
@app.route('/api/accesses')
def get_accesses():
    """
    Retrieves all access records from the database and returns them as JSON.
    (Basic implementation - no authentication yet)
    """
    db = get_db()
    cursor = db.execute('SELECT * FROM accesses')
    accesses = cursor.fetchall()
    # Convert to list of dictionaries for JSON serialization
    accesses_list = []
    for row in accesses:
        accesses_list.append(dict(zip([column[0] for column in cursor.description], row)))
    return jsonify(accesses_list)

if __name__ == '__main__':
    # In a production environment, use a production-ready WSGI server
    app.run(debug=True, port=5000)


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    return db

@app.teardown_appcontext
def close_db(error):
    db = getattr(g, '_database', None) 
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accesses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT,
                timestamp TEXT,
                user_agent TEXT,
                browser TEXT,
                os TEXT,
                language TEXT,
                referer TEXT,
                screen_resolution TEXT,
                timezone TEXT,
                canvas_fingerprint TEXT,
                webgl_info TEXT,
                plugins TEXT,
                fonts TEXT,
                is_tor INTEGER,
                is_proxy INTEGER,
                is_headless INTEGER,
                time_on_page REAL,
                mouse_movements INTEGER,
                clicks INTEGER,
                country TEXT, 
                city TEXT,
                asn TEXT,
                provider TEXT,
                coordinates TEXT
            )
        ''')
        db.commit()

@app.cli.command('initdb')
def initdb_command():
    """Initializes the database."""
    init_db()
    print('Initialized the database.')