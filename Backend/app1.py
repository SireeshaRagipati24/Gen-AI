# app.py
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import os, uuid as py_uuid, hashlib, psycopg2, base64, random, string
from instagrapi import Client
from apscheduler.schedulers.background import BackgroundScheduler
import threading
import time
import logging
from cryptography.fernet import Fernet
import json
import requests
from collections import defaultdict
from datetime import datetime, timedelta
import razorpay

until_date = datetime.now()
since_date = until_date - timedelta(days=30)

# Current time
now = datetime.now()
print("Now:", now)

# Razorpay client
client = razorpay.Client(auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET')))

# --------------------------------------------------
# Logging / Env
# --------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

# --------------------------------------------------
# Crypto / helpers
# --------------------------------------------------
fernet_key = os.getenv("ENCRYPTION_KEY")
if not fernet_key:
    raise ValueError("ENCRYPTION_KEY environment variable is required")
fernet = Fernet(fernet_key)

def encrypt_data(data: str | None) -> str | None:
    if data is None:
        return None
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(token: str | None) -> str | None:
    if token is None:
        return None
    return fernet.decrypt(token.encode()).decode()

def generate_device_id():
    return f"android-{py_uuid.uuid4().hex[:16]}"

def json_dumps_safe(obj) -> str | None:
    if obj is None:
        return None
    try:
        return json.dumps(obj)
    except TypeError:
        return json.dumps({"repr": str(obj)})

def json_loads_safe(text: str | None):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return None

# --------------------------------------------------
# Flask / CORS / Gemini
# --------------------------------------------------
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_secret_key")
CORS(app, origins=os.getenv("CORS_ORIGINS", "*"), supports_credentials=True)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

BASE_IMAGE_DIR = "static/images"
BASE_CAPTION_DIR = "static/captions"
os.makedirs(BASE_IMAGE_DIR, exist_ok=True)
os.makedirs(BASE_CAPTION_DIR, exist_ok=True)

DB_CONFIG = {
    'host': os.getenv("POSTGRES_HOST"),
    'user': os.getenv("POSTGRES_USER"),
    'password': os.getenv("POSTGRES_PASSWORD"),
    'dbname': os.getenv("POSTGRES_DB")
}

ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
IG_BUSINESS_ID = os.getenv("IG_USER_ID")

# --------------------------------------------------
# DB utils
# --------------------------------------------------

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def hash_password(password, salt=None):
    salt = salt or str(py_uuid.uuid4())
    return hashlib.sha512((password + salt).encode()).hexdigest(), salt

def verify_password(stored_hash, salt, input_password):
    return stored_hash == hash_password(input_password, salt)[0]

def generate_referral_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# --------------------------------------------------
# User-specific storage helpers
# --------------------------------------------------
def get_user_image_dir(user_id):
    """Get user-specific image directory"""
    user_dir = os.path.join(BASE_IMAGE_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def get_user_caption_dir(user_id):
    """Get user-specific caption directory"""
    user_dir = os.path.join(BASE_CAPTION_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def verify_user_owns_file(user_id, filename):
    """Verify that a file belongs to the user"""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 1 FROM activities 
            WHERE user_id=%s AND image_filename=%s
            """, (user_id, filename))
        return bool(cur.fetchone())
    finally:
        conn.close()

# --------------------------------------------------
# Scheduler
# --------------------------------------------------
scheduler = BackgroundScheduler()
scheduler.start()

# --------------------------------------------------
# App bootstrap
# --------------------------------------------------
#@app.before_serving
def init_db():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # users
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(128) NOT NULL,
                salt VARCHAR(64) NOT NULL,
                points_used INTEGER DEFAULT 0,
                total_points INTEGER DEFAULT 15,
                is_premium BOOLEAN DEFAULT FALSE,
                referral_code VARCHAR(10) UNIQUE,
                referred_by INTEGER REFERENCES users(id),
                referrals_count INTEGER DEFAULT 0,
                insta_username VARCHAR(100),
                insta_password TEXT,
                ig_device_id TEXT,
                ig_guid TEXT,
                ig_challenge_context TEXT,
                ig_session_settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # logins
        cur.execute("""
            CREATE TABLE IF NOT EXISTS logins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # activities
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                prompt TEXT NOT NULL,
                image_filename VARCHAR(255),
                generated_caption TEXT,
                modified_caption TEXT,
                caption_filename VARCHAR(255),
                points_used INTEGER DEFAULT 0,
                was_downloaded BOOLEAN DEFAULT FALSE,
                was_posted BOOLEAN DEFAULT FALSE,
                download_time TIMESTAMP,
                post_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Add caption_filename column if not exists
        cur.execute("""
            ALTER TABLE activities ADD COLUMN IF NOT EXISTS caption_filename VARCHAR(255)
        """)
        # referrals
        cur.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                points_awarded INTEGER NOT NULL DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # scheduled_posts
        cur.execute("""
            CREATE TABLE IF NOT EXISTS scheduled_posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                caption TEXT NOT NULL,
                image_filename VARCHAR(255),
                scheduled_time TIMESTAMP NOT NULL,
                platform VARCHAR(20) NOT NULL DEFAULT 'instagram',
                status VARCHAR(20) DEFAULT 'scheduled',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
        """)
        conn.commit()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
    finally:
        if conn:
            conn.close()

    # Start scheduler worker thread
    scheduler_thread = threading.Thread(target=check_scheduled_posts)
    scheduler_thread.daemon = True
    scheduler_thread.start()
    logger.info("Scheduler thread started")

# --------------------------------------------------
# IG Session Helpers
# --------------------------------------------------

def save_ig_settings(cur, user_id: int, cl: Client):
    """
    Save instagrapi session settings (encrypted) for re-use (no OTP next time).
    """
    try:
        settings = cl.get_settings()  # dict
        settings_str = json.dumps(settings)
        cur.execute(
            "UPDATE users SET ig_session_settings=%s WHERE id=%s",
            (encrypt_data(settings_str), user_id),
        )
        logger.info(f"Saved IG session settings for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to save IG settings: {e}")

def load_ig_settings(cur, user_id: int):
    cur.execute("SELECT ig_session_settings FROM users WHERE id=%s", (user_id,))
    r = cur.fetchone()
    if r and r[0]:
        try:
            settings_str = decrypt_data(r[0])
            return json.loads(settings_str) if settings_str else None
        except Exception as e:
            logger.error(f"Failed to decrypt/load IG settings: {e}")
    return None

# --------------------------------------------------
# Caption File Helpers
# --------------------------------------------------

def save_caption_file(user_id, image_filename, prompt, caption):
    """
    Save caption in JSON file with same base name as image
    """
    user_caption_dir = get_user_caption_dir(user_id)
    base_name, _ = os.path.splitext(image_filename)
    caption_filename = f"{base_name}_caption.json"
    caption_path = os.path.join(user_caption_dir, caption_filename)
    
    data = {
        "prompt": prompt,
        "caption": caption,
        "image_filename": image_filename,
        "created_at": datetime.now().isoformat(),
        "updated_at": None
    }
    
    with open(caption_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return caption_filename

def update_caption_file(user_id, caption_filename, new_caption):
    """
    Update existing caption file with new caption
    """
    user_caption_dir = get_user_caption_dir(user_id)
    caption_path = os.path.join(user_caption_dir, caption_filename)
    
    # Load existing data if file exists
    if os.path.exists(caption_path):
        with open(caption_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}
    
    # Update caption and timestamp
    data["caption"] = new_caption
    data["updated_at"] = datetime.now().isoformat()
    
    # Save updated data
    with open(caption_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return data

# --------------------------------------------------
# Scheduled posts worker
# --------------------------------------------------

def check_scheduled_posts():
    while True:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            now = datetime.now()

            cur.execute(
                """
                SELECT id, user_id, caption, image_filename, platform, status
                FROM scheduled_posts
                WHERE status IN ('scheduled') AND scheduled_time <= %s
                """,
                (now + timedelta(seconds=10),),
            )
            rows = cur.fetchall()
            for post in rows:
                post_id, user_id, caption, filename, platform, status = post
                logger.info(f"[Scheduler] Processing scheduled post: {post_id}")

                success, result = _post_to_instagram_background(post_id, user_id, caption, filename, prefer_session=True)
                if success:
                    logger.info(f"[Scheduler] Posted scheduled post {post_id}")
                else:
                    logger.error(f"[Scheduler] Failed scheduled post {post_id}: {result}")
            cur.close()
            conn.close()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        time.sleep(30)

def _post_to_instagram_background(post_id: int, user_id: int, caption: str, filename: str, prefer_session: bool = True):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get Instagram credentials + settings
        cur.execute("SELECT insta_username, insta_password, ig_session_settings, ig_device_id, ig_guid FROM users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        if not row:
            return False, "User not found"
        insta_username, insta_password_enc, ig_session_enc, device_id, guid = row
        insta_password = decrypt_data(insta_password_enc)
        if not insta_username or not insta_password:
            return False, "Instagram credentials missing"

        # Check image exists
        if not filename:
            return False, "No image filename"
            
        # Verify user owns the file
        cur.execute("SELECT 1 FROM activities WHERE user_id=%s AND image_filename=%s", (user_id, filename))
        if not cur.fetchone():
            return False, "Image not found or access denied"
            
        image_path = os.path.join(get_user_image_dir(user_id), filename)
        if not os.path.exists(image_path):
            return False, "Image not found"

        cl = Client()
        cl.delay_range = [1, 3]

        # If we have saved settings, restore them first
        used_session = False
        if prefer_session and ig_session_enc:
            try:
                settings_str = decrypt_data(ig_session_enc)
                if settings_str:
                    cl.set_settings(json.loads(settings_str))
                    # Keep same device/uuid if stored
                    if device_id:
                        cl.device_id = device_id
                    if guid:
                        cl.uuid = guid
                    cl.login(insta_username, insta_password)
                    used_session = True
                    logger.info(f"Reused saved IG session for user {user_id}")
            except Exception as e:
                logger.warning(f"Saved session login failed, will try fresh login. Reason: {e}")

        if not used_session:
            # Fresh login (may trigger OTP)
            try:
                cl.login(insta_username, insta_password)
                # Save new session for future runs
                save_ig_settings(cur, user_id, cl)
            except Exception as e:
                # If challenge, mark otp_required and persist challenge context
                if any(k in str(e).lower() for k in ["challenge", "otp", "verification", "2fa"]):
                    device_id = getattr(cl, "device_id", None) or generate_device_id()
                    guid = getattr(cl, "uuid", None) or str(py_uuid.uuid4())
                    challenge_ctx = getattr(cl, "challenge_context", None) or getattr(cl, "last_json", None)

                    cur.execute(
                        "UPDATE users SET ig_device_id=%s, ig_guid=%s, ig_challenge_context=%s WHERE id=%s",
                        (device_id, guid, json_dumps_safe(challenge_ctx), user_id),
                    )
                    cur.execute(
                        "UPDATE scheduled_posts SET status='otp_required', error_message='OTP challenge required' WHERE id=%s",
                        (post_id,),
                    )
                    conn.commit()
                    return False, "OTP challenge required"
                else:
                    return False, str(e)

        # Upload photo
        res = cl.photo_upload(path=image_path, caption=caption)
        shortcode = None
        if hasattr(res, "model_dump"):
            shortcode = res.model_dump().get("shortcode")
        elif isinstance(res, dict):
            shortcode = res.get("shortcode")

        # Update activities
        cur.execute(
            """
            UPDATE activities
            SET was_posted=TRUE, post_time=CURRENT_TIMESTAMP, modified_caption=%s
            WHERE user_id=%s AND image_filename=%s
            """,
            (caption, user_id, filename),
        )

        # Mark scheduled post as complete
        cur.execute(
            """
            UPDATE scheduled_posts
            SET status='completed', error_message=NULL, completed_at=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (post_id,),
        )
        conn.commit()

        return True, f"https://www.instagram.com/p/{shortcode}/" if shortcode else ""

    except Exception as e:
        if conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE scheduled_posts SET status='failed', error_message=%s WHERE id=%s",
                (str(e), post_id),
            )
            conn.commit()
        return False, str(e)

    finally:
        if conn:
            conn.close()

# --------------------------------------------------
# NEW: Prepare IG Session (pre-login to cache settings or trigger OTP)
# --------------------------------------------------
@app.route("/api/ig-session/prepare", methods=["POST"])
def ig_session_prepare():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT insta_username, insta_password FROM users WHERE id=%s", (session["user_id"],))
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "error": "User not found"}), 404
        insta_username, insta_password_enc = row
        insta_password = decrypt_data(insta_password_enc)

        cl = Client()
        cl.delay_range = [1, 3]
        # Do not block for code
        cl.challenge_code_handler = lambda username, choice: None

        try:
            cl.login(insta_username, insta_password)
            # Save session
            cur.execute("UPDATE users SET ig_device_id=%s, ig_guid=%s WHERE id=%s",
                        (getattr(cl, "device_id", None), getattr(cl, "uuid", None), session["user_id"]))
            save_ig_settings(cur, session["user_id"], cl)
            conn.commit()
            return jsonify({"success": True, "session_ready": True})
        except Exception as e:
            if any(k in str(e).lower() for k in ["challenge", "otp", "verification", "2fa"]):
                device_id = getattr(cl, "device_id", None) or generate_device_id()
                guid = getattr(cl, "uuid", None) or str(py_uuid.uuid4())
                challenge_ctx = getattr(cl, "challenge_context", None) or getattr(cl, "last_json", None)

                cur.execute(
                    "UPDATE users SET ig_device_id=%s, ig_guid=%s, ig_challenge_context=%s WHERE id=%s",
                    (device_id, guid, json_dumps_safe(challenge_ctx), session["user_id"]),
                )
                conn.commit()
                return jsonify({"success": True, "session_ready": False, "require_otp": True})
            else:
                return jsonify({"success": False, "error": str(e)}), 500
    except Exception as e:
        logger.error(f"ig_session_prepare error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()

# --------------------------------------------------
# NEW: Verify OTP ONLY (store session; do NOT post now)
# --------------------------------------------------
@app.route("/api/ig-session/verify", methods=["POST"])
def ig_session_verify():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    data = request.get_json() or {}
    otp = (data.get("otp") or "").strip()
    if not otp:
        return jsonify({"success": False, "error": "OTP required"}), 400

    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT insta_username, insta_password, ig_device_id, ig_guid, ig_challenge_context FROM users WHERE id=%s", (session["user_id"],))
        r = cur.fetchone()
        if not r:
            return jsonify({"success": False, "error": "User not found"}), 404
        insta_username, insta_password_enc, device_id, guid, ctx_raw = r
        insta_password = decrypt_data(insta_password_enc)

        cl = Client()
        cl.delay_range = [1, 3]
        cl.device_id = device_id or generate_device_id()
        cl.uuid = guid or str(py_uuid.uuid4())

        ctx = json_loads_safe(ctx_raw)
        if ctx:
            cl.challenge_context = ctx

        # use given otp
        cl.challenge_code_handler = lambda username, choice: otp

        try:
            cl.login(insta_username, insta_password)
        except Exception as e:
            return jsonify({"success": False, "error": f"OTP verification failed: {e}"}), 401

        # OTP success → save session settings for future scheduled posts
        save_ig_settings(cur, session["user_id"], cl)
        # Clear challenge context
        cur.execute("UPDATE users SET ig_challenge_context=NULL WHERE id=%s", (session["user_id"],))
        conn.commit()
        return jsonify({"success": True, "session_ready": True, "message": "OTP verified. Session saved."})
    except Exception as e:
        logger.error(f"ig_session_verify error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()

# --------------------------------------------------
# (OPTIONAL) Legacy: Verify OTP for already-triggered scheduled post
# If IG still throws challenge at posting time, user can enter OTP for that post_id.
# --------------------------------------------------
@app.route("/api/verify-scheduled-otp", methods=["POST"])
def verify_scheduled_otp():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    otp = (data.get("otp") or "").strip()
    post_id = data.get("post_id")
    if not otp or not post_id:
        return jsonify({"error": "OTP and post_id required"}), 400

    conn = get_db_connection(); cur = conn.cursor()
    try:
        # Get post details
        cur.execute(
            "SELECT user_id, caption, image_filename, platform FROM scheduled_posts WHERE id=%s AND user_id=%s",
            (post_id, session["user_id"])
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Scheduled post not found"}), 404
        user_id, caption, filename, platform = row

        # Get Instagram credentials + challenge context
        cur.execute("SELECT insta_username, insta_password, ig_device_id, ig_guid, ig_challenge_context FROM users WHERE id=%s", (session["user_id"],))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        insta_username, insta_password_enc, device_id, guid, ctx_raw = row
        insta_password = decrypt_data(insta_password_enc)

        cl = Client()
        cl.delay_range = [1, 3]
        cl.device_id = device_id or generate_device_id()
        cl.uuid = guid or str(py_uuid.uuid4())

        if ctx_raw:
            cl.challenge_context = json_loads_safe(ctx_raw)

        cl.challenge_code_handler = lambda username, choice: otp

        try:
            cl.login(insta_username, insta_password)
        except Exception as e:
            return jsonify({"error": f"OTP verification failed: {e}"}), 401

        # Save session now
        save_ig_settings(cur, session["user_id"], cl)
        cur.execute("UPDATE users SET ig_challenge_context=NULL WHERE id=%s", (session["user_id"],))

        # After verifying OTP for this post, set it back to scheduled (now)
        cur.execute("UPDATE scheduled_posts SET status='scheduled', scheduled_time=NOW() WHERE id=%s", (post_id,))
        conn.commit()

        return jsonify({"success": True, "message": "OTP verified. Post will be published shortly."})

    except Exception as e:
        logger.error(f"verify_scheduled_otp error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

# --------------------------------------------------
# AUTH, GENERATION & EXISTING ROUTES
# --------------------------------------------------
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    referral_code = data.get("referral_code")
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE username=%s", (username,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "Username already exists. Please login."}), 409

        password_hash, salt = hash_password(password)
        new_ref = generate_referral_code()
        cur.execute(
            """
            INSERT INTO users (username, password_hash, salt, referral_code, total_points, insta_username, insta_password)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, total_points, points_used
            """,
            (username, password_hash, salt, new_ref, 15, username, encrypt_data(password)),
        )
        user_id, total_points, points_used = cur.fetchone()

        if referral_code:
            cur.execute("SELECT id FROM users WHERE UPPER(referral_code)=%s", (referral_code.upper(),))
            r = cur.fetchone()
            if r:
                referrer_id = r[0]
                cur.execute("UPDATE users SET total_points=total_points+5, referrals_count=referrals_count+1 WHERE id=%s", (referrer_id,))
                cur.execute("UPDATE users SET total_points=total_points+5 WHERE id=%s", (user_id,))
                cur.execute(
                    "INSERT INTO referrals (referrer_id, referee_id, points_awarded) VALUES (%s, %s, 5)",
                    (referrer_id, user_id),
                )

        conn.commit()
        session["user_id"] = user_id
        session["username"] = username
        return jsonify({
            "success": True,
            "message": "Signup successful!",
            "referral_code": new_ref,
            "points": {
                "total": total_points,
                "used": points_used,
                "available": total_points - points_used,
            },
        }), 201
    except Exception as e:
        conn.rollback()
        logger.error(f"Signup error: {e}")
        return jsonify({"success": False, "message": f"Error during signup: {e}"}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, password_hash, salt, referral_code, total_points, points_used, referrals_count
            FROM users WHERE username=%s
            """,
            (username,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "User not found. Please sign up first."}), 404
        user_id, password_hash, salt, referral_code, total_points, points_used, referrals_count = row
        if not verify_password(password_hash, salt, password):
            return jsonify({"success": False, "message": "Incorrect password."}), 401

        cur.execute("UPDATE users SET insta_username=%s, insta_password=%s WHERE id=%s", (username, encrypt_data(password), user_id))
        cur.execute("INSERT INTO logins (user_id) VALUES (%s)", (user_id,))
        conn.commit()

        session["user_id"] = user_id
        session["username"] = username
        return jsonify({
            "success": True,
            "message": "Login successful!",
            "referral_code": referral_code,
            "referrals_count": referrals_count,
            "points": {"total": total_points, "used": points_used, "available": total_points - points_used},
        })
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"success": False, "message": f"Login error: {e}"}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/generate", methods=["POST"])
def generate():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    prompt = data.get("prompt", "").strip()
    tone = data.get("tone", "")
    content_type = data.get("content_type", "")
    is_regeneration = data.get("is_regeneration", False)

    if not prompt:
        return jsonify({"error": "Prompt required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Points check (only for fresh generation)
        if not is_regeneration:
            cur.execute(
                "SELECT total_points, points_used FROM users WHERE id=%s",
                (session["user_id"],),
            )
            total_points, points_used = cur.fetchone()
            if total_points - points_used < 5:
                return jsonify({
                    "success": False,
                    "message": "Not enough points",
                    "code": "INSUFFICIENT_POINTS"
                }), 402

        # Prepare prompt
        full_prompt = (
            f"Generate a {tone} {content_type} for: {prompt}. "
            f"Provide an Instagram caption with 3 hashtags."
        )
        logger.info(f"Sending prompt to Gemini: {full_prompt}")

        # Use latest Gemini model
        model_name = "gemini-2.0-flash-preview-image-generation"
        response = client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
        logger.info("Gemini response received")

        # Extract text + image
        text_parts = []
        image_data = None
        for part in response.candidates[0].content.parts:
            if getattr(part, "text", None):
                text_parts.append(part.text.strip())
            elif getattr(part, "inline_data", None) and not image_data:
                image_data = part.inline_data.data

        caption = "\n".join(text_parts) if text_parts else None

        # Fallback caption
        if not caption:
            logger.warning(f"No caption generated for prompt: {full_prompt}")
            caption = f"✨ {prompt} ✨\n#GeneratedImage #AIArt #CreativeAI"

        if not image_data:
            return jsonify({"error": "Image generation failed"}), 500

        # Save image to user folder
        user_image_dir = get_user_image_dir(session["user_id"])
        filename = f"img_{datetime.now():%Y%m%d%H%M%S}.png"
        path = os.path.join(user_image_dir, filename)

        img = Image.open(BytesIO(image_data))
        img.save(path)

        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()

        # Save caption file
        caption_filename = save_caption_file(
            session["user_id"], filename, prompt, caption
        )

        # Update points
        used_now = 0
        if not is_regeneration:
            used_now = 5
            cur.execute(
                "UPDATE users SET points_used=points_used+%s WHERE id=%s RETURNING total_points, points_used",
                (used_now, session["user_id"]),
            )
            total_points, points_used = cur.fetchone()

        # Save activity
        cur.execute(
            """
            INSERT INTO activities (user_id, prompt, image_filename, generated_caption, caption_filename, points_used)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (session["user_id"], prompt, filename, caption, caption_filename, used_now),
        )
        conn.commit()

        return jsonify({
            "success": True,
            "caption": caption,
            "filename": filename,
            "image": b64,
            "points": {
                "total": total_points,
                "used": points_used,
                "available": total_points - points_used
            },
        })

    except Exception as e:
        logger.error(f"Generate error: {e}")
        return jsonify({"error": f"Generate route error: {e}"}), 500

    finally:
        cur.close()
        conn.close()

# ----------------- Direct post -----------------
@app.route("/api/post", methods=["POST"])
def post_to_instagram_frontend():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    filename = data.get("filename")
    caption = data.get("caption", "").strip()
    if not filename or not caption:
        return jsonify({"error": "Filename and caption are required"}), 400

    # Verify user owns the file
    if not verify_user_owns_file(session["user_id"], filename):
        return jsonify({"error": "Access denied"}), 403

    # Get user-specific image path
    user_image_dir = get_user_image_dir(session["user_id"])
    image_path = os.path.join(user_image_dir, filename)
    if not os.path.exists(image_path):
        return jsonify({"error": "Image not found"}), 404

    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT insta_username, insta_password FROM users WHERE id=%s", (session["user_id"],))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        insta_username, insta_password_enc = row
        insta_password = decrypt_data(insta_password_enc)
        if not insta_username or not insta_password:
            return jsonify({"error": "Instagram credentials missing"}), 400

        cl = Client()
        cl.delay_range = [1, 3]
        cl.challenge_code_handler = lambda username, choice: None

        try:
            cl.login(insta_username, insta_password)
            save_ig_settings(cur, session["user_id"], cl)  # cache session
        except Exception as login_error:
            if any(k in str(login_error).lower() for k in ["challenge", "otp", "verification", "2fa"]):
                device_id = getattr(cl, "device_id", None) or generate_device_id()
                guid = getattr(cl, "uuid", None) or str(py_uuid.uuid4())
                challenge_ctx = getattr(cl, "challenge_context", None) or getattr(cl, "last_json", None)

                cur.execute(
                    "UPDATE users SET ig_device_id=%s, ig_guid=%s, ig_challenge_context=%s WHERE id=%s",
                    (device_id, guid, json_dumps_safe(challenge_ctx), session["user_id"]),
                )
                conn.commit()
                return jsonify({"success": False, "require_otp": True, "message": "OTP verification required"}), 401
            else:
                return jsonify({"success": False, "error": str(login_error)}), 500

        res = cl.photo_upload(path=image_path, caption=caption)
        shortcode = None
        if hasattr(res, "model_dump"):
            shortcode = res.model_dump().get("shortcode")
        elif isinstance(res, dict):
            shortcode = res.get("shortcode")

        cur.execute(
            """
            UPDATE activities
            SET was_posted=TRUE, post_time=CURRENT_TIMESTAMP, modified_caption=%s, updated_at=CURRENT_TIMESTAMP
            WHERE user_id=%s AND image_filename=%s
            """,
            (caption, session["user_id"], filename),
        )
        cur.execute("UPDATE users SET ig_challenge_context=NULL WHERE id=%s", (session["user_id"],))
        conn.commit()
        return jsonify({"success": True, "message": "Posted to Instagram successfully", "url": f"https://www.instagram.com/p/{shortcode}/" if shortcode else ""})

    except Exception as e:
        logger.exception("Post to Instagram error")
        return jsonify({"error": f"Failed to post to Instagram: {e}"}), 500
    finally:
        cur.close(); conn.close()

# ----------------- Direct OTP verify (post now) -----------------
@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json() or {}
    otp = (payload.get("otp") or "").strip()
    caption = payload.get("caption", "")
    filename = payload.get("filename")
    if not otp:
        return jsonify({"error": "OTP is required"}), 400

    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT insta_username, insta_password, ig_device_id, ig_guid, ig_challenge_context FROM users WHERE id=%s", (session["user_id"],))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        insta_username, insta_password_enc, device_id, guid, ctx_raw = row
        insta_password = decrypt_data(insta_password_enc)

        cl = Client()
        cl.delay_range = [1, 3]
        cl.device_id = device_id or generate_device_id()
        cl.uuid = guid or str(py_uuid.uuid4())

        ctx = json_loads_safe(ctx_raw)
        if ctx:
            cl.challenge_context = ctx

        cl.challenge_code_handler = lambda username, choice: otp

        try:
            cl.login(insta_username, insta_password)
        except Exception as e:
            logger.error(f"Login during OTP verification failed: {e}")
            return jsonify({"error": f"Failed to login: {e}"}), 401

        # Cache session for future (scheduled posts)
        save_ig_settings(cur, session["user_id"], cl)

        if not filename:
            return jsonify({"success": True, "message": "OTP verified. Session saved."})

        # Verify user owns the file
        if not verify_user_owns_file(session["user_id"], filename):
            return jsonify({"error": "Access denied"}), 403

        # Get user-specific image path
        user_image_dir = get_user_image_dir(session["user_id"])
        image_path = os.path.join(user_image_dir, filename)
        if not os.path.exists(image_path):
            return jsonify({"error": "Image not found"}), 404

        res = cl.photo_upload(path=image_path, caption=caption)
        shortcode = None
        if hasattr(res, "model_dump"):
            shortcode = res.model_dump().get("shortcode")
        elif isinstance(res, dict):
            shortcode = res.get("shortcode")

        cur.execute(
            """
            UPDATE activities SET was_posted=TRUE, post_time=CURRENT_TIMESTAMP, modified_caption=%s
            WHERE user_id=%s AND image_filename=%s
            """,
            (caption, session["user_id"], filename),
        )
        cur.execute("UPDATE users SET ig_challenge_context=NULL WHERE id=%s", (session["user_id"],))
        conn.commit()

        return jsonify({"success": True, "message": "Posted to Instagram successfully", "url": f"https://www.instagram.com/p/{shortcode}/" if shortcode else ""})

    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        return jsonify({"error": f"Failed to post: {e}"}), 500
    finally:
        cur.close(); conn.close()

# ----------------- Other routes -----------------
@app.route("/api/check-auth", methods=["GET"])
def check_auth():
    if "user_id" in session:
        conn = get_db_connection(); cur = conn.cursor()
        try:
            cur.execute(
                "SELECT referral_code, total_points, points_used, referrals_count, is_premium FROM users WHERE id=%s",
                (session["user_id"],),
            )
            r = cur.fetchone()
            if r:
                referral_code, total_points, points_used, referrals_count, is_premium = r
                return jsonify({
                    "authenticated": True,
                    "username": session["username"],
                    "referral_code": referral_code,
                    "referrals_count": referrals_count,
                    "is_premium": is_premium,
                    "points": {"total": total_points, "used": points_used, "available": total_points - points_used},
                })
        except Exception as e:
            logger.error(f"Check auth error: {e}")
            return jsonify({"authenticated": True}), 200
        finally:
            cur.close(); conn.close()
    return jsonify({"authenticated": False}), 401

@app.route('/api/usage', methods=['GET'])
def get_usage_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT referral_code, total_points, points_used, referrals_count FROM users WHERE id=%s", (session['user_id'],))
        row = cur.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        referral_code, total_points, points_used, referrals_count = row
        available_points = total_points - points_used
        free_generations = available_points // 5
        return jsonify({'success': True, 'referralCode': referral_code, 'totalPoints': total_points, 'pointsUsed': points_used, 'availablePoints': available_points, 'referralsCount': referrals_count, 'freeGenerations': free_generations})
    except Exception as e:
        logger.error(f"Usage data error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/get-image", methods=["GET"])
def get_image():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename required"}), 400
        
    # Verify user owns the file
    if not verify_user_owns_file(session["user_id"], filename):
        return jsonify({"error": "Access denied"}), 403
        
    try:
        # Get user-specific image directory
        user_image_dir = get_user_image_dir(session["user_id"])
        image_path = os.path.join(user_image_dir, filename)
        if not os.path.exists(image_path):
            return jsonify({"error": "Image not found"}), 404
            
        with open(image_path, "rb") as f:
            return f.read(), 200, {'Content-Type': 'image/png'}
    except Exception as e:
        logger.error(f"Get image error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/get-caption", methods=["GET"])
def get_caption():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename required"}), 400
        
    conn = get_db_connection(); cur = conn.cursor()
    try:
        # Verify user owns the file
        cur.execute("""
            SELECT caption_filename 
            FROM activities 
            WHERE user_id=%s AND image_filename=%s
            """, 
            (session["user_id"], filename))
        row = cur.fetchone()
        if not row or not row[0]:
            return jsonify({"error": "Caption not found"}), 404
            
        caption_filename = row[0]
        # Get user-specific caption directory
        user_caption_dir = get_user_caption_dir(session["user_id"])
        caption_path = os.path.join(user_caption_dir, caption_filename)
        if not os.path.exists(caption_path):
            return jsonify({"error": "Caption file missing"}), 404
            
        with open(caption_path, 'r') as f:
            caption_data = json.load(f)
            
        return jsonify({"success": True, "caption": caption_data})
        
    except Exception as e:
        logger.error(f"Get caption error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/scheduled-posts", methods=["GET"])
def get_scheduled_posts():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, caption, image_filename, scheduled_time, status, error_message, platform
            FROM scheduled_posts WHERE user_id=%s ORDER BY scheduled_time ASC
            """,
            (session["user_id"],),
        )
        posts = []
        for row in cur.fetchall():
            posts.append({
                "id": row[0],
                "caption": row[1],
                "image_filename": row[2],
                "scheduled_time": row[3].isoformat() if row[3] else None,
                "status": row[4],
                "error_message": row[5],
                "platform": row[6],
            })
        return jsonify({"success": True, "posts": posts})
    except Exception as e:
        logger.error(f"Get scheduled posts error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/schedule-post", methods=["POST"])
def schedule_post():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    data = request.get_json() or {}
    caption = (data.get("caption") or "").strip()
    filename = (data.get("filename") or "").strip()
    scheduled_time = data.get("scheduled_time")
    platform = data.get("platform", "instagram")
    if not caption or not scheduled_time:
        return jsonify({"success": False, "error": "Caption and scheduled time are required"}), 400
    try:
        scheduled_dt = datetime.fromisoformat(scheduled_time)
        if scheduled_dt < datetime.now():
            return jsonify({"success": False, "error": "Scheduled time must be in the future"}), 400
    except ValueError:
        return jsonify({"success": False, "error": "Invalid datetime format"}), 400

    # Verify user owns the file
    if filename and not verify_user_owns_file(session["user_id"], filename):
        return jsonify({"success": False, "error": "Access denied"}), 403

    # Ensure session is ready (front-end should call /api/ig-session/prepare first)
    conn = get_db_connection(); cur = conn.cursor()
    try:
        # sanity: do we have session cached?
        settings = load_ig_settings(cur, session["user_id"])
        if not settings:
            return jsonify({"success": False, "error": "Instagram session not ready. Please verify OTP first."}), 400

        cur.execute(
            """
            INSERT INTO scheduled_posts (user_id, caption, image_filename, scheduled_time, platform, status)
            VALUES (%s, %s, %s, %s, %s, 'scheduled') RETURNING id
            """,
            (session["user_id"], caption, filename, scheduled_dt, platform),
        )
        conn.commit()
        return jsonify({"success": True, "message": "Post scheduled successfully"})
    except Exception as e:
        logger.error(f"Schedule post error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/scheduled-post/<int:post_id>", methods=["DELETE"])
def delete_scheduled_post(post_id):
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("DELETE FROM scheduled_posts WHERE id=%s AND user_id=%s RETURNING id", (post_id, session["user_id"]))
        if cur.rowcount == 0:
            return jsonify({"success": False, "error": "Post not found or access denied"}), 404
        conn.commit()
        return jsonify({"success": True, "message": "Scheduled post deleted"})
    except Exception as e:
        logger.error(f"Delete scheduled post error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/update_caption", methods=["POST"])
def update_caption():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    filename = request.json.get("filename")
    new_caption = request.json.get("caption", "").strip()
    if not filename:
        return jsonify({"error": "Filename required"}), 400
        
    # Verify user owns the file
    if not verify_user_owns_file(session["user_id"], filename):
        return jsonify({"error": "Access denied"}), 403
        
    conn = get_db_connection(); cur = conn.cursor()
    try:
        # Get existing caption filename
        cur.execute("SELECT caption_filename FROM activities WHERE user_id=%s AND image_filename=%s", 
                   (session["user_id"], filename))
        row = cur.fetchone()
        caption_filename = row[0] if row else None
        
        # Create new caption file if doesn't exist
        if not caption_filename:
            # Get prompt for new caption file
            cur.execute("SELECT prompt FROM activities WHERE user_id=%s AND image_filename=%s", 
                       (session["user_id"], filename))
            prompt_row = cur.fetchone()
            prompt_text = prompt_row[0] if prompt_row else ""
            
            # Create new caption file
            caption_filename = save_caption_file(session["user_id"], filename, prompt_text, new_caption)
        else:
            # Update existing caption file
            update_caption_file(session["user_id"], caption_filename, new_caption)
        
        # Update database
        cur.execute("""
            UPDATE activities 
            SET modified_caption=%s, caption_filename=%s 
            WHERE user_id=%s AND image_filename=%s
            """, 
            (new_caption, caption_filename, session["user_id"], filename))
        
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Update caption error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/history", methods=["GET"])
def get_history():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, prompt, image_filename, generated_caption, caption_filename, created_at
            FROM activities WHERE user_id=%s ORDER BY created_at DESC LIMIT 5
            """,
            (session["user_id"],),
        )
        history = []
        for row in cur.fetchall():
            history.append({
                "id": row[0],
                "prompt": row[1],
                "filename": row[2],
                "caption": row[3],
                "caption_filename": row[4],
                "created_at": row[5].isoformat(),
            })
        return jsonify({"success": True, "history": history})
    except Exception as e:
        logger.error(f"Get history error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/record-download", methods=["POST"])
def record_download():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    filename = request.json.get("filename")
    if not filename:
        return jsonify({"error": "Filename required"}), 400
        
    # Verify user owns the file
    if not verify_user_owns_file(session["user_id"], filename):
        return jsonify({"error": "Access denied"}), 403
        
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("UPDATE activities SET was_downloaded=TRUE, download_time=CURRENT_TIMESTAMP WHERE user_id=%s AND image_filename=%s", (session["user_id"], filename))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Record download error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"}), 200


# --- 1. Followers & Media Count ---
@app.route("/api/analytics")
def get_analytics():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}?fields=followers_count,media_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

# --- 2. Posts with likes & comments ---
@app.route("/api/posts")
def get_posts():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,caption,like_count,comments_count,media_type,media_url,timestamp&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

# --- 3. Profile Views (new implementation) ---
@app.route("/api/profile-views")
def get_profile_views():
    profile_views_data = {"today": 0, "last_30_days": 0}

    try:
        base_url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights"
        until_date = datetime.datetime.now()
        since_date = until_date - timedelta(days=30)

        # Convert to UNIX timestamp
        since_ts = int(since_date.timestamp())
        until_ts = int(until_date.timestamp())

        profile_views_url = (
            f"{base_url}?metric=profile_views&period=day"
            f"&metric_type=total_value"  # <-- REQUIRED!
            f"&since={since_ts}&until={until_ts}&access_token={ACCESS_TOKEN}"
        )
        res = requests.get(profile_views_url).json()
        print("Profile views API response:", res)

        if "data" in res and res["data"]:
            values = res["data"][0].get("values", [])
            if values:
                profile_views_data["last_30_days"] = sum(v.get("value", 0) for v in values)
                profile_views_data["today"] = values[-1].get("value", 0)

    except Exception as e:
        print(f"Error fetching profile views: {e}")

    return jsonify(profile_views_data)


# --- 4. Insights: reach & impressions ---
@app.route("/api/insights")
def get_insights():
    try:
        url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=reach,impressions&period=day&access_token={ACCESS_TOKEN}"
        response = requests.get(url).json()
    except Exception as e:
        response = {"data": [], "error": str(e)}
    return jsonify(response)

# --- 5. User Profile Info ---
@app.route("/api/profile")
def get_profile():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}?fields=username,profile_picture_url&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

# --- 6. Followers Growth ---
@app.route("/api/followers-growth")
def get_followers_growth():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=follower_count&period=day&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    if "data" in response and response["data"]:
        return jsonify(response)
    return jsonify({"data": []})

# --- 7. Engagement by Day ---
@app.route("/api/engagement-by-day")
def get_engagement_by_day():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,timestamp,like_count,comments_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()

    engagement_by_day = defaultdict(int)
    for post in response.get("data", []):
        day = datetime.datetime.fromisoformat(post["timestamp"].replace("Z", "+00:00")).strftime("%A")
        engagement_by_day[day] += post.get("like_count", 0) + post.get("comments_count", 0)

    return jsonify(engagement_by_day)

@app.route("/api/audience-age")
def get_audience_age():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=audience_age_gender&period=lifetime&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

@app.route("/api/reach-vs-impressions")
def get_reach_vs_impressions():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=reach,impressions&period=day&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

# Add these new endpoints to your existing backend

@app.route("/api/top-posts")
def get_top_posts():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,caption,like_count,comments_count,media_type,media_url,timestamp,insights.metric(reach,impressions)&limit=5&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

@app.route("/api/audience-demographics")
def get_audience_demographics():
    # Age & Gender
    age_gender_url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=audience_gender_age&period=lifetime&access_token={ACCESS_TOKEN}"
    age_gender_response = requests.get(age_gender_url).json()
    age_gender_data = {}
    if "data" in age_gender_response and age_gender_response["data"]:
        values = age_gender_response["data"][0].get("values", [])
        if values and "value" in values[0]:
            age_gender_data = values[0]["value"]

    # Location
    location_url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=audience_city,audience_country&period=lifetime&access_token={ACCESS_TOKEN}"
    location_response = requests.get(location_url).json()
    location_data = {"cities": {}, "countries": {}}
    if "data" in location_response and location_response["data"]:
        for item in location_response["data"]:
            if item.get("name") == "audience_city" and item.get("values"):
                location_data["cities"] = item["values"][0].get("value", {})
            elif item.get("name") == "audience_country" and item.get("values"):
                location_data["countries"] = item["values"][0].get("value", {})

    # Gender
    gender_url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=audience_gender&period=lifetime&access_token={ACCESS_TOKEN}"
    gender_response = requests.get(gender_url).json()
    gender_data = {}
    if "data" in gender_response and gender_response["data"]:
        values = gender_response["data"][0].get("values", [])
        if values and "value" in values[0]:
            gender_data = values[0]["value"]

    return jsonify({
        "age_gender": age_gender_data,
        "location": location_data,
        "gender": gender_data
    })

@app.route("/api/followers-gender")
def get_followers_gender():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=audience_gender&period=lifetime&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())


# --- 1. Post Engagement by Type ---
@app.route("/api/engagement-by-type")
def engagement_by_type():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,media_type,like_count,comments_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    
    result = defaultdict(lambda: {"likes": 0, "comments": 0})
    for post in response.get("data", []):
        mtype = post.get("media_type", "UNKNOWN")
        result[mtype]["likes"] += post.get("like_count", 0)
        result[mtype]["comments"] += post.get("comments_count", 0)
    
    return jsonify(result)

# --- 2. Best Time/Day to Post ---
@app.route("/api/best-time-post")
def best_time_post():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,timestamp,like_count,comments_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    
    engagement_by_hour = defaultdict(int)
    engagement_by_day = defaultdict(int)
    
    for post in response.get("data", []):
        dt = datetime.datetime.fromisoformat(post["timestamp"].replace("Z", "+00:00"))
        total_engagement = post.get("like_count", 0) + post.get("comments_count", 0)
        engagement_by_hour[dt.hour] += total_engagement
        engagement_by_day[dt.strftime("%A")] += total_engagement
    
    return jsonify({
        "by_hour": dict(engagement_by_hour),
        "by_day": dict(engagement_by_day)
    })


# --- 3. Hashtag Performance ---
@app.route("/api/hashtag-performance")
def hashtag_performance():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,caption,like_count,comments_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    
    hashtag_stats = defaultdict(lambda: {"likes": 0, "comments": 0})
    
    for post in response.get("data", []):
        caption = post.get("caption", "")
        hashtags = [tag.strip("#") for tag in caption.split() if tag.startswith("#")]
        for tag in hashtags:
            hashtag_stats[tag]["likes"] += post.get("like_count", 0)
            hashtag_stats[tag]["comments"] += post.get("comments_count", 0)
    
    return jsonify(hashtag_stats)

# --- 4. Followers Activity (new vs returning) ---
# Note: Instagram API doesn't provide this directly; this is a placeholder
@app.route("/api/follower-activity")
def follower_activity():
    # You may need to maintain previous followers data to calculate new vs returning
    return jsonify({"new_followers": 2, "returning_followers": 1})

# --- 5. Bio/Link Clicks ---
@app.route("/api/link-clicks")
def link_clicks():
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=website_clicks&period=day&access_token={ACCESS_TOKEN}"
    response = requests.get(url)
    return jsonify(response.json())

# --- 6. Export Data ---
@app.route("/api/export-data")
def export_data():
    # Example: combine followers, posts, engagement
    analytics_url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}?fields=followers_count,media_count&access_token={ACCESS_TOKEN}"
    posts_url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=id,caption,like_count,comments_count&access_token={ACCESS_TOKEN}"
    analytics_data = requests.get(analytics_url).json()
    posts_data = requests.get(posts_url).json()
    return jsonify({"analytics": analytics_data, "posts": posts_data})

# --- 7. Alerts for big changes --

@app.route("/api/alerts")
def alerts():
    alerts_list = []
    return jsonify(alerts_list)

'''
@app.route("/api/alerts")
def alerts():
    alerts_list = []

    # 1️⃣ Follower Changes
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=follower_count&period=day&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    follower_values = response.get("data", [])[0].get("values", []) if response.get("data") else []
    if len(follower_values) >= 2:
        today = follower_values[-1]["value"]
        yesterday = follower_values[-2]["value"]
        change = today - yesterday
        if abs(change) >= 10:
            msg = f"Followers {'increased' if change > 0 else 'decreased'} by {abs(change)} today."
            alerts_list.append({
                "type": "followers",
                "metric": "Followers",
                "change": change,
                "message": msg,
                "date": datetime.now().isoformat()
            })

    # 2️⃣ Profile Views
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=profile_views&period=day&metric_type=total_value&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    pv_values = response.get("data", [])[0].get("values", []) if response.get("data") else []
    if len(pv_values) >= 2:
        today = pv_values[-1]["value"]
        yesterday = pv_values[-2]["value"]
        percent_change = ((today - yesterday) / yesterday * 100) if yesterday else 0
        if abs(percent_change) >= 30:
            msg = f"Profile views {'increased' if percent_change > 0 else 'dropped'} {abs(int(percent_change))}% compared to yesterday."
            alerts_list.append({
                "type": "profile_views",
                "metric": "Profile Views",
                "change": percent_change,
                "message": msg,
                "date": datetime.now().isoformat()
            })

    # 3️⃣ Post Reach / Impressions
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=reach,impressions&period=day&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    for metric in response.get("data", []):
        values = metric.get("values", [])
        if len(values) >= 2:
            today = values[-1]["value"]
            avg = sum(v["value"] for v in values[:-1]) / max(len(values)-1, 1)
            if today > 2 * avg:
                msg = f"Your last post {metric['name']} reached {int(today/avg)}x more people than average."
                alerts_list.append({
                    "type": metric["name"],
                    "metric": metric["name"].capitalize(),
                    "change": today-avg,
                    "message": msg,
                    "date": datetime.now().isoformat()
                })

    # 4️⃣ Engagement Metrics (likes, comments)
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=like_count,comments_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    likes = [p.get("like_count", 0) for p in response.get("data", [])]
    comments = [p.get("comments_count", 0) for p in response.get("data", [])]
    if likes:
        avg_likes = sum(likes) / len(likes)
        last_likes = likes[-1]
        if last_likes < 0.5 * avg_likes:
            alerts_list.append({
                "type": "likes",
                "metric": "Likes",
                "change": None,
                "message": "Engagement rate dropped below 50% of average likes.",
                "date": datetime.now().isoformat()
            })
    if comments:
        avg_comments = sum(comments) / len(comments)
        last_comments = comments[-1]
        if last_comments < 0.5 * avg_comments:
            alerts_list.append({
                "type": "comments",
                "metric": "Comments",
                "change": None,
                "message": "Engagement rate dropped below 50% of average comments.",
                "date": datetime.now().isoformat()
            })

    # 5️⃣ Story Views / Completion
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/stories?fields=insights.metric(story_insights)&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    for story in response.get("data", []):
        insights = story.get("insights", {}).get("data", [])
        for metric in insights:
            if metric["name"] == "exits":
                value = metric["values"][0]["value"]
                if value > 50:
                    alerts_list.append({
                        "type": "story",
                        "metric": "Story Exits",
                        "change": value,
                        "message": f"Story exit rate is high ({value}%).",
                        "date": datetime.now().isoformat()
                    })

    # 6️⃣ Hashtag Performance
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/media?fields=caption,like_count,comments_count&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    hashtag_counts = {}
    for post in response.get("data", []):
        caption = post.get("caption", "")
        hashtags = [word for word in caption.split() if word.startswith("#")]
        for tag in hashtags:
            hashtag_counts[tag] = hashtag_counts.get(tag, 0) + post.get("like_count", 0) + post.get("comments_count", 0)
    trending_hashtags = [tag for tag, score in hashtag_counts.items() if score > 10]
    for tag in trending_hashtags:
        alerts_list.append({
            "type": "hashtag",
            "metric": "Hashtag",
            "change": None,
            "message": f"Hashtag {tag} is trending!",
            "date": datetime.now().isoformat()
        })

    # 7️⃣ Custom Thresholds
    if len(follower_values) >= 2:
        if follower_values[-2]["value"] - follower_values[-1]["value"] > 10:
            alerts_list.append({
                "type": "custom",
                "metric": "Followers",
                "change": follower_values[-2]["value"] - follower_values[-1]["value"],
                "message": "Daily followers dropped >10.",
                "date": datetime.now().isoformat()
            })

    # 8️⃣ Time-Sensitive Alerts (weekly summary)
    url = f"https://graph.facebook.com/v23.0/{IG_BUSINESS_ID}/insights?metric=reach&period=week&access_token={ACCESS_TOKEN}"
    response = requests.get(url).json()
    values = response.get("data", [])[0].get("values", []) if response.get("data") else []
    if len(values) >= 2:
        last_week = values[-2]["value"]
        this_week = values[-1]["value"]
        if last_week:
            change = ((this_week - last_week) / last_week) * 100
            alerts_list.append({
                "type": "summary",
                "metric": "Reach",
                "change": change,
                "message": f"This week, total reach changed by {int(change)}% compared to last week.",
                "date": datetime.now().isoformat()
            })

    return jsonify(alerts_list) '''


# --- 8. Post Comparison ---
@app.route("/api/compare-posts")
def compare_posts():
    post_ids = request.args.get("ids")  # comma-separated IDs
    if not post_ids:
        return jsonify({"error": "Provide post IDs as ?ids=id1,id2"}), 400
    ids = post_ids.split(",")
    comparison = {}
    for pid in ids:
        url = f"https://graph.facebook.com/v23.0/{pid}?fields=id,like_count,comments_count,insights.metric(reach,impressions)&access_token={ACCESS_TOKEN}"
        comparison[pid] = requests.get(url).json()
    return jsonify(comparison)

@app.route('/create-order', methods=['POST'])
def create_order():
    data = request.json
    amount = data.get('amount')  # amount in INR
    if not amount:
        return jsonify({'error': 'Amount is required'}), 400

    amount_paise = int(amount) * 100  # Razorpay expects amount in paise
    currency = 'INR'
    receipt = 'receipt_001'

    order = client.order.create(dict(amount=amount_paise, currency=currency, receipt=receipt, payment_capture=1))
    return jsonify(order)


#payment

@app.route('/verify-payment', methods=['POST'])
def verify_payment():
    data = request.json
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_signature = data.get('razorpay_signature')

    params_dict = {
        'razorpay_order_id': razorpay_order_id,
        'razorpay_payment_id': razorpay_payment_id,
        'razorpay_signature': razorpay_signature
    }

    try:
        client.utility.verify_payment_signature(params_dict)
        return jsonify({'status': 'Payment verified successfully'})
    except razorpay.errors.SignatureVerificationError:
        return jsonify({'status': 'Payment verification failed'}), 400


if __name__ == "__main__":
    # Initialize database
    init_db()

    # Start the scheduler
    if not scheduler.running:
        scheduler.start()

    # Run the Flask app
    # Important in production: use a proper WSGI server (e.g., gunicorn/uwsgi)
    app.run(host="0.0.0.0", port=5000, debug=True)



