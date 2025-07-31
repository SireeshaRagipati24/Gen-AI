from flask import Flask, request, session, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import os, uuid, hashlib, psycopg2, base64, traceback, random, string
from datetime import datetime, timedelta
from instagrapi import Client
from instagrapi.mixins.challenge import ChallengeChoice
from apscheduler.schedulers.background import BackgroundScheduler
import threading
from instagrapi.exceptions import TwoFactorRequired, ChallengeRequired
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
CORS(app, origins=os.getenv("CORS_ORIGINS", "*"), supports_credentials=True)

# Gemini Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

IMAGE_DIR = "static/images"
os.makedirs(IMAGE_DIR, exist_ok=True)

DB_CONFIG = {
    'host': os.getenv("POSTGRES_HOST"),
    'user': os.getenv("POSTGRES_USER"),
    'password': os.getenv("POSTGRES_PASSWORD"),
    'dbname': os.getenv("POSTGRES_DB")
}

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.start()

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def hash_password(password, salt=None):
    salt = salt or str(uuid.uuid4())
    return hashlib.sha512((password + salt).encode()).hexdigest(), salt

def verify_password(stored_hash, salt, input_password):
    return stored_hash == hash_password(input_password, salt)[0]

def generate_referral_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.before_first_request
def init_db():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS logins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                prompt TEXT NOT NULL,
                image_filename VARCHAR(255),
                generated_caption TEXT,
                modified_caption TEXT,
                points_used INTEGER DEFAULT 0,
                was_downloaded BOOLEAN DEFAULT FALSE,
                was_posted BOOLEAN DEFAULT FALSE,
                download_time TIMESTAMP,
                post_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        conn.commit()
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        if conn:
            conn.close()

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username, password = data.get("username"), data.get("password")
    referral_code = data.get("referral_code")
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            return jsonify({"success": False, "message": "Username already exists. Please login."}), 409

        password_hash, salt = hash_password(password)
        new_referral_code = generate_referral_code()
        
        cur.execute(
            "INSERT INTO users (username, password_hash, salt, referral_code, total_points) VALUES (%s, %s, %s, %s, %s) RETURNING id, total_points, points_used",
            (username, password_hash, salt, new_referral_code, 15)
        )
        result = cur.fetchone()
        user_id, total_points, points_used = result
        available_points = total_points - points_used

        if referral_code:
            referral_code = referral_code.upper()
            cur.execute("SELECT id FROM users WHERE UPPER(referral_code) = %s", (referral_code,))
            referrer_row = cur.fetchone()
            if referrer_row:
                referrer_id = referrer_row[0]
                cur.execute("""
                    UPDATE users 
                    SET total_points = total_points + 5, referrals_count = referrals_count + 1 
                    WHERE id = %s
                """, (referrer_id,))
                cur.execute("""
                    UPDATE users 
                    SET total_points = total_points + 5 
                    WHERE id = %s
                    RETURNING total_points, points_used
                """, (user_id,))
                result = cur.fetchone()
                total_points, points_used = result
                available_points = total_points - points_used
                cur.execute("UPDATE users SET referred_by = %s WHERE id = %s", (referrer_id, user_id))
                cur.execute("""
                    INSERT INTO referrals (referrer_id, referee_id, points_awarded) 
                    VALUES (%s, %s, 5)
                """, (referrer_id, user_id))

        conn.commit()
        session["user_id"] = user_id
        session["username"] = username
        session["insta_username"] = username
        session["insta_password"] = password
        
        return jsonify({
            "success": True, 
            "message": "Signup successful!",
            "referral_code": new_referral_code,
            "points": {
                "total": total_points,
                "used": points_used,
                "available": available_points
            }
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Error during signup: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username, password = data.get("username"), data.get("password")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, password_hash, salt, referral_code, total_points, points_used, referrals_count 
            FROM users 
            WHERE username = %s
        """, (username,))
        row = cur.fetchone()

        if not row:
            return jsonify({"success": False, "message": "User not found. Please sign up first."}), 404

        user_id, password_hash, salt, referral_code, total_points, points_used, referrals_count = row
        if not verify_password(password_hash, salt, password):
            return jsonify({"success": False, "message": "Incorrect password."}), 401

        cur.execute("INSERT INTO logins (user_id) VALUES (%s)", (user_id,))
        conn.commit()

        session["user_id"] = user_id
        session["username"] = username
        session["insta_username"] = username
        session["insta_password"] = password

        return jsonify({
            "success": True, 
            "message": "Login successful!",
            "referral_code": referral_code,
            "referrals_count": referrals_count,
            "points": {
                "total": total_points,
                "used": points_used,
                "available": total_points - points_used
            }
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Login error: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/check-auth", methods=["GET"])
def check_auth():
    if "user_id" in session:
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT referral_code, total_points, points_used, referrals_count, is_premium 
                FROM users 
                WHERE id = %s
            """, (session["user_id"],))
            result = cur.fetchone()
            if result:
                referral_code, total_points, points_used, referrals_count, is_premium = result
                available_points = total_points - points_used
                return jsonify({
                    "authenticated": True, 
                    "username": session["username"],
                    "referral_code": referral_code,
                    "referrals_count": referrals_count,
                    "is_premium": is_premium,
                    "points": {
                        "total": total_points,
                        "used": points_used,
                        "available": available_points
                    }
                })
        except Exception as e:
            return jsonify({"authenticated": True}), 200
        finally:
            cur.close()
            conn.close()
    return jsonify({"authenticated": False}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"}), 200

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
        cur.execute("""
            SELECT total_points, points_used 
            FROM users 
            WHERE id = %s
        """, (session["user_id"],))
        result = cur.fetchone()
        if not result:
            return jsonify({"error": "User not found"}), 404
        total_points, points_used = result
        available_points = total_points - points_used

        if not is_regeneration:
            if available_points < 5:
                return jsonify({
                    "success": False,
                    "message": "Not enough points",
                    "code": "INSUFFICIENT_POINTS"
                }), 402

        full_prompt = f"Generate a {tone} {content_type} for: {prompt}. Provide an Instagram caption with 3 hashtags."
        model_name = "gemini-2.0-flash-preview-image-generation"
        response = client.models.generate_content(
            model=model_name,
            contents=full_prompt,
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])
        )

        if not response.candidates:
            return jsonify({"error": "No response from Gemini API"}), 500
            
        img_data = None
        caption = ""
        b64 = None
        filename = None
        
        for part in response.candidates[0].content.parts:
            if getattr(part, 'text', None) is not None:
                caption = part.text.strip()
            elif getattr(part, 'inline_data', None) is not None:
                img_bytes = part.inline_data.data
                img_data = Image.open(BytesIO(img_bytes))
                filename = f"img_{datetime.now():%Y%m%d%H%M%S}_{random.randint(1000, 9999)}.png"
                path = os.path.join(IMAGE_DIR, filename)
                img_data.save(path)
                b64 = base64.b64encode(img_bytes).decode('utf-8')

        if not caption:
            caption = "Generated content - no caption available"

        if not img_data or not filename:
            return jsonify({"error": "Image generation failed"}), 500

        points_deducted = 0
        if not is_regeneration:
            points_deducted = 5
            cur.execute("""
                UPDATE users 
                SET points_used = points_used + %s 
                WHERE id = %s
            """, (points_deducted, session["user_id"]))
            points_used += points_deducted
            available_points = total_points - points_used

        cur.execute("""
            INSERT INTO activities (user_id, prompt, image_filename, generated_caption, points_used)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (session["user_id"], prompt, filename, caption, points_deducted))
        activity_result = cur.fetchone()
        activity_id, created_at = activity_result
        created_at_iso = created_at.isoformat()

        conn.commit()

        return jsonify({
            "success": True, 
            "caption": caption, 
            "filename": filename, 
            "image": b64,
            "points": {
                "total": total_points,
                "used": points_used,
                "available": available_points
            },
            "activity": {
                "id": activity_id,
                "prompt": prompt,
                "image_filename": filename,
                "generated_caption": caption,
                "created_at": created_at_iso,
                "points_used": points_deducted,
                "is_regeneration": is_regeneration
            }
        })

    except Exception as e:
        return jsonify({"error": f"Generate route error: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/activities", methods=["GET"])
def get_activities():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, prompt, image_filename, generated_caption, created_at
            FROM activities
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (session["user_id"],))
        
        activities = []
        for row in cur.fetchall():
            activities.append({
                "id": row[0],
                "prompt": row[1],
                "image_filename": row[2],
                "generated_caption": row[3],
                "created_at": row[4].isoformat()
            })
            
        return jsonify({"success": True, "activities": activities})
    except Exception as e:
        return jsonify({"error": f"Error fetching activities: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/get-image", methods=["GET"])
def get_image():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename required"}), 400

    image_path = os.path.join(IMAGE_DIR, filename)
    if not os.path.exists(image_path):
        return jsonify({"error": "Image not found"}), 404

    return send_file(image_path, mimetype='image/png')

@app.route("/api/update_caption", methods=["POST"])
def update_caption():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    filename = data.get("filename")
    caption = data.get("caption", "").strip()

    if not filename or not caption:
        return jsonify({"error": "Filename and caption required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE activities
            SET modified_caption = %s
            WHERE user_id = %s AND image_filename = %s
            RETURNING id
        """, (caption, session["user_id"], filename))
        
        if cur.rowcount == 0:
            return jsonify({"success": False, "message": "Record not found"}), 404
            
        conn.commit()
        return jsonify({"success": True, "message": "Caption updated"})
    except Exception as e:
        return jsonify({"error": f"Error updating caption: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/record-download", methods=["POST"])
def record_download():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    filename = data.get("filename")
    
    if not filename:
        return jsonify({"error": "Filename required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE activities
            SET was_downloaded = TRUE, download_time = CURRENT_TIMESTAMP
            WHERE user_id = %s AND image_filename = %s
        """, (session["user_id"], filename))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Error recording download: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/post", methods=["POST"])
def post_to_instagram():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    filename = data.get("filename")
    caption = data.get("caption", "").strip()

    insta_username = session.get("insta_username")
    insta_password = session.get("insta_password")

    if not filename or not caption:
        return jsonify({"error": "Filename and caption required"}), 400
    if not insta_username or not insta_password:
        return jsonify({"error": "Instagram credentials missing"}), 400

    image_path = os.path.join(IMAGE_DIR, filename)
    if not os.path.exists(image_path):
        return jsonify({"error": "Image not found"}), 404

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Generate OTP (6 digits)
        otp = ''.join(random.choices('0123456789', k=6))
        session['post_otp'] = otp

        cl = Client()
        cl.delay_range = [1, 3]

        try:
            cl.login(insta_username, insta_password)
        except TwoFactorRequired as e:
            session["2fa_username"] = insta_username
            session["2fa_password"] = insta_password
            session["2fa_identifier"] = e.two_factor_identifier
            session["filename"] = filename
            session["caption"] = caption
            return jsonify({
                "success": False,
                "require_2fa": True,
                "message": "2FA required. Enter code from WhatsApp/SMS."
            }), 401
        except ChallengeRequired:
            session['ig_client_settings'] = cl.get_settings()
            session["filename"] = filename
            session["caption"] = caption
            return jsonify({
                "success": False,
                "require_otp": True,
                "message": f"OTP sent to your WhatsApp/SMS: {otp}",
                "otp_hint": otp  # For development only
            }), 401

        # Normal login successful → upload image
        result = cl.photo_upload(path=image_path, caption=caption)
        shortcode = result.model_dump().get("shortcode")

        cur.execute("""
            UPDATE activities
            SET was_posted = TRUE, post_time = CURRENT_TIMESTAMP,
                modified_caption = %s
            WHERE user_id = %s AND image_filename = %s
        """, (caption, session["user_id"], filename))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Posted to Instagram successfully",
            "url": f"https://www.instagram.com/p/{shortcode}/" if shortcode else ""
        })

    except Exception as e:
        return jsonify({"error": f"Failed to post: {str(e)}"}), 500
    finally:
        cur.close()
        conn.close()

@app.route("/api/verify-post-otp", methods=["POST"])
def verify_post_otp():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    user_otp = data.get("otp")
    filename = session.get("filename")
    caption = session.get("caption", "").strip()

    if not all([user_otp, filename, caption]):
        return jsonify({"error": "Missing required data"}), 400

    # Verify OTP
    stored_otp = session.get('post_otp')
    if not stored_otp or stored_otp != user_otp:
        return jsonify({"error": "Invalid OTP"}), 401

    # Proceed with Instagram login and post
    try:
        cl = Client()
        cl.delay_range = [1, 3]
        
        # Restore settings from session
        if 'ig_client_settings' in session:
            cl.set_settings(session['ig_client_settings'])
        
        # Login again
        cl.login(session.get("insta_username"), session.get("insta_password"))
        
        # Upload image
        image_path = os.path.join(IMAGE_DIR, filename)
        result = cl.photo_upload(path=image_path, caption=caption)
        shortcode = result.model_dump().get("shortcode")

        # Update activity record
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE activities
            SET was_posted = TRUE, post_time = CURRENT_TIMESTAMP,
                modified_caption = %s
            WHERE user_id = %s AND image_filename = %s
        """, (caption, session["user_id"], filename))
        conn.commit()

        # Cleanup session
        for key in ['ig_client_settings', 'filename', 'caption', 'post_otp']:
            session.pop(key, None)

        return jsonify({
            "success": True,
            "message": "Posted to Instagram successfully",
            "url": f"https://www.instagram.com/p/{shortcode}/" if shortcode else ""
        })

    except Exception as e:
        return jsonify({"error": f"Failed to post: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)