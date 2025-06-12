import sqlite3
from flask import Flask, request, jsonify, g
import requests
import datetime
import time
import os # Importar o módulo os

app = Flask(__name__)

# Usando um caminho absoluto para o banco de dados
BASEDIR = os.path.abspath(os.path.dirname(__file__))
DATABASE = os.path.join(BASEDIR, '..', 'traffic.db') # traffic.db na pasta raiz

# Helper function to get database connection
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row # Allows accessing columns by name
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
        # Tabela para armazenar as cartas (modificada)
        # Removida a coluna recipient_number, adicionada sender_ip
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS letters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                letter_content TEXT,
                sender_ip TEXT -- Vincula ao IP do remetente
                -- access_id INTEGER, -- Opcional: vincular à entrada na tabela accesses
                -- FOREIGN KEY (access_id) REFERENCES accesses(id)
            )
        ''')
        db.commit()

@app.cli.command('initdb')
def initdb_command():
    """Initializes the database."""
    init_db()
    print('Initialized the database.')

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
            # ip-api uses 'isp' and 'org', let's map them to 'provider' and 'asn'
            asn_info = data.get('org', '')
            isp_info = data.get('isp', '')
            provider_combined = f"{asn_info} ({isp_info})" if asn_info and isp_info else asn_info if asn_info else isp_info

            return data.get('country', ''), data.get('city', ''), asn_info, provider_combined, f"{data.get('lat', '')},{data.get('lon', '')}"
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
    Performs IP lookup and saves data to the database.
    """
    if request.is_json:
        data = request.get_json()
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent')
        referer = request.headers.get('Referer')
        timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC') # Use datetime for timestamp

        print(f"Acesso detectado de IP: {ip_address}")
        print(f"User Agent: {user_agent}")
        print(f"Referer: {referer}")
        print(f"Timestamp: {timestamp}")
        print(f"Dados de Fingerprint: {data}")


        # Extract fingerprinting data with default values
        screen_resolution = data.get('resolution', '')
        timezone = data.get('timezone', '')
        canvas_fingerprint = data.get('canvas', '')
        webgl_info = data.get('webgl', '')
        # Ensure plugins and fonts are lists before joining
        plugins = ', '.join(data.get('plugins', [])) if isinstance(data.get('plugins'), list) else ''
        fonts = ', '.join(data.get('fonts', [])) if isinstance(data.get('fonts'), list) else ''
        is_tor = int(data.get('isTor', 0)) # Ensure integer
        is_proxy = int(data.get('isProxy', 0)) # Ensure integer
        is_headless = int(data.get('isHeadless', 0)) # Ensure integer
        time_on_page = float(data.get('timeOnPage', 0)) if data.get('timeOnPage') is not None else 0.0 # Ensure float
        mouse_movements = int(data.get('mouseMovements', 0)) if data.get('mouseMovements') is not None else 0 # Ensure integer
        clicks = int(data.get('clicks', 0)) if data.get('clicks') is not None else 0 # Ensure integer

        browser = data.get('browser', '')
        os_info = data.get('os', '')
        language = data.get('language', '')


        # Perform IP lookup
        country, city, asn_ip, provider_ip, coordinates_ip = lookup_ip_info(ip_address)

        # Use data from fingerprint if available, otherwise from IP lookup
        # You might want to decide which source has priority or combine them
        country_final = data.get('country', country)
        city_final = data.get('city', city)
        asn_final = data.get('asn', asn_ip)
        provider_final = data.get('provider', provider_ip)
        coordinates_final = data.get('coordinates', coordinates_ip)


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
                (ip_address, timestamp, user_agent, browser, os_info, language, referer,
                 screen_resolution, timezone, canvas_fingerprint, webgl_info,
                 plugins, fonts, is_tor, is_proxy, is_headless, time_on_page,
                 mouse_movements, clicks, country_final, city_final, asn_final, provider_final, coordinates_final)
            )
            db.commit()
        except Exception as e:
            print(f"Database error: {e}")
            # Rollback in case of error
            if db:
                 db.rollback()
            return jsonify({"status": "error", "message": "Database error"}), 500

        return jsonify({"status": "success", "message": "Fingerprint data received successfully!"}), 200
    else:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 415


# --- Endpoint para Salvar Cartas Anônimas ---
@app.route('/save-anonymous-letter', methods=['POST'])
def save_anonymous_letter():
    """
    Receives anonymous letter content from the frontend and saves it
    to the database, associated with the sender's IP.
    """
    if request.is_json:
        data = request.get_json()
        letter_content = data.get('letter_content', '')
        sender_ip = request.remote_addr # Captura o IP do remetente
        timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

        if not letter_content.strip() or letter_content.strip() == '<br>': # Verifica se o conteúdo da carta não está vazio
             return jsonify({"status": "error", "message": "Letter content cannot be empty"}), 400


        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute(
                '''INSERT INTO letters (
                    timestamp, letter_content, sender_ip
                ) VALUES (?, ?, ?)''',
                (timestamp, letter_content, sender_ip)
            )
            db.commit()
            return jsonify({"status": "success", "message": "Anonymous letter saved successfully!"}), 200
        except Exception as e:
            print(f"Database error saving letter: {e}")
            if db:
                 db.rollback()
            return jsonify({"status": "error", "message": "Database error saving letter"}), 500

    else:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 415


# --- Novo Endpoint para Enviar E-mail (Simulado) ---
@app.route('/send-email', methods=['POST'])
def send_email():
    """
    Receives email details from the frontend and simulates an email sending process.
    (Email sending logic will be implemented here later)
    """
    if request.is_json:
        data = request.get_json()
        sender_email = data.get('sender_email')
        recipient_email = data.get('recipient_email')
        letter_content = data.get('letter_content')

        # Validação básica dos dados recebidos
        if not sender_email or not recipient_email or not letter_content:
             return jsonify({"status": "error", "message": "Missing email data or letter content"}), 400


        print(f"Recebido pedido de envio de e-mail:")
        print(f"  Remetente: {sender_email}")
        print(f"  Destinatário: {recipient_email}")
        # print(f"  Conteúdo da Carta (HTML): {letter_content[:200]}...") # Evitar imprimir conteúdo muito longo no console


        # --- Lógica de Envio de E-mail (A SER IMPLEMENTADA) ---
        # Aqui você usaria uma biblioteca como smtplib, ou integraria com um serviço
        # para realmente enviar o e-mail.
        # Exemplo (pseudo-código):
        # import smtplib
        # from email.mime.text import MIMEText
        # from email.header import Header

        # try:
        #     # Configurações do seu servidor SMTP
        #     smtp_server = "your_smtp.server.com"
        #     smtp_port = 587 # Ou a porta do seu servidor SMTP
        #     smtp_user = "your_email@example.com" # O e-mail que enviará
        #     smtp_password = "your_email_password" # A senha do e-mail

        #     # Criar o objeto da mensagem
        #     msg = MIMEText(letter_content, 'html', 'utf-8') # 'html' para conteúdo HTML
        #     msg['Subject'] = Header("Sua Carta Secreta", 'utf-8')
        #     msg['From'] = Header(f"Admirador Secreto <{smtp_user}>", 'utf-8') # Nome e e-mail remetente
        #     msg['To'] = recipient_email # Destinatário

        #     with smtplib.SMTP(smtp_server, smtp_port) as server:
        #         server.starttls() # Iniciar TLS (segurança)
        #         server.login(smtp_user, smtp_password) # Fazer login
        #         server.sendmail(smtp_user, [recipient_email], msg.as_bytes()) # Enviar o e-mail

        #     print("E-mail enviado com sucesso.")
        #     return jsonify({"status": "success", "message": "E-mail enviado com sucesso!"}), 200
        # except Exception as e:
        #     print(f"Erro ao enviar e-mail: {e}")
        #     # Retornar uma resposta de erro com a mensagem de erro para o frontend
        #     return jsonify({"status": "error", "message": f"Erro ao enviar e-mail: {e}"}), 500
        # ------------------------------------------------------

        # Por enquanto, apenas retornamos sucesso para resolver o erro do frontend
        print("E-mail recebido no backend. Envio real não implementado.")
        return jsonify({"status": "success", "message": "Dados de e-mail recebidos no backend (envio real não implementado)!"}), 200

    else:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 415


# Admin Panel API Endpoint for Accesses
@app.route('/api/accesses')
def get_accesses():
    """
    Retrieves all access records from the database and returns them as JSON.
    (Basic implementation - no authentication yet)
    """
    db = get_db()
    cursor = db.execute('SELECT * FROM accesses')
    # Use row_factory to get dictionary-like rows
    accesses = cursor.fetchall()
    # accesses is already a list of sqlite3.Row objects (which behave like dictionaries)
    # Convert to a list of actual dictionaries for safer JSON serialization if needed,
    # but flask jsonify usually handles sqlite3.Row fine.
    accesses_list = [dict(row) for row in accesses]
    return jsonify(accesses_list)

# Admin Panel API Endpoint for Anonymous Letters
@app.route('/api/letters')
def get_letters():
    """
    Retrieves all anonymous letter records from the database and returns them as JSON.
    (Basic implementation - no authentication yet)
    """
    db = get_db()
    cursor = db.execute('SELECT * FROM letters')
    letters = cursor.fetchall()
    letters_list = [dict(row) for row in letters]
    return jsonify(letters_list)


# Entry point for running the application
if __name__ == '__main__':
    # In a production environment, use a production-ready WSGI server
    # debug=True is suitable for development
    app.run(debug=True, port=5000)
