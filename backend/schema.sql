DROP TABLE IF EXISTS accesses;

CREATE TABLE accesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
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
    is_tor BOOLEAN,
    is_proxy BOOLEAN,
    is_headless BOOLEAN,
    time_on_page REAL,
    mouse_movements INTEGER,
    clicks INTEGER,
    country TEXT,
    city TEXT,
    asn TEXT,
    provider TEXT,
    coordinates TEXT
);