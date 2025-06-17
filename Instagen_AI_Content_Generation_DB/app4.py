from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory
from google import genai
from google.genai import types
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from dotenv import load_dotenv
from instagrapi import Client
import os
import re
import json
from datetime import datetime
import psycopg2
from psycopg2 import sql
import hashlib
import uuid

# Load environment variables
load_dotenv(override=True)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY")

# Database configuration
DB_CONFIG = {
    'host': os.getenv("MYSQL_HOST"),
    'user': os.getenv("MYSQL_USER"),
    'password': os.getenv("MYSQL_PASSWORD"),
    'database': os.getenv("MYSQL_DB")
}

# Initialize Flask app
app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

# Create image folder if not exists
IMAGE_DIR = "static/images"
os.makedirs(IMAGE_DIR, exist_ok=True)

# Database utility functions
def get_db_connection():
    conn = psycopg2.connect(**DB_CONFIG)
    return conn

def init_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(128) NOT NULL,
                salt VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)
        
        # Create consolidated activities table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                prompt TEXT NOT NULL,
                image_filename VARCHAR(255),
                generated_caption TEXT,
                modified_caption TEXT,
                was_downloaded BOOLEAN DEFAULT FALSE,
                was_posted BOOLEAN DEFAULT FALSE,
                download_time TIMESTAMP,
                post_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        if conn:
            conn.close()

# Initialize database tables
init_db()

# Security functions
def hash_password(password, salt=None):
    if salt is None:
        salt = str(uuid.uuid4())
    password_hash = hashlib.sha512((password + salt).encode('utf-8')).hexdigest()
    return password_hash, salt

def verify_password(stored_hash, stored_salt, provided_password):
    password_hash, _ = hash_password(provided_password, stored_salt)
    return password_hash == stored_hash

# User management functions
def create_user(username, password):
    password_hash, salt = hash_password(password)
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password_hash, salt) VALUES (%s, %s, %s)",
            (username, password_hash, salt)
        )
        conn.commit()
        return True
    except psycopg2.IntegrityError:
        return False  # Username already exists
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    finally:
        if conn:
            conn.close()

def get_user(username):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, username, password_hash, salt FROM users WHERE username = %s",
            (username,)
        )
        user = cur.fetchone()
        if user:
            return {
                'id': user[0],
                'username': user[1],
                'password_hash': user[2],
                'salt': user[3]
            }
        return None
    except Exception as e:
        print(f"Error getting user: {e}")
        return None
    finally:
        if conn:
            conn.close()

def update_last_login(user_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s",
            (user_id,)
        )
        conn.commit()
    except Exception as e:
        print(f"Error updating last login: {e}")
    finally:
        if conn:
            conn.close()

def update_activity(user_id, prompt=None, image_filename=None, 
                   generated_caption=None, modified_caption=None,
                   downloaded=False, posted=False):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if there's an existing activity for this prompt/image
        cur.execute(
            """
            SELECT id FROM activities 
            WHERE user_id = %s AND image_filename = %s
            """,
            (user_id, image_filename)
        )
        existing_activity = cur.fetchone()
        
        if existing_activity:
            # Update existing activity
            activity_id = existing_activity[0]
            update_fields = []
            params = []
            
            if modified_caption is not None:
                update_fields.append("modified_caption = %s")
                params.append(modified_caption)
            
            if downloaded:
                update_fields.append("was_downloaded = TRUE")
                update_fields.append("download_time = CURRENT_TIMESTAMP")
            
            if posted:
                update_fields.append("was_posted = TRUE")
                update_fields.append("post_time = CURRENT_TIMESTAMP")
            
            if update_fields:
                update_query = f"""
                    UPDATE activities 
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """
                params.append(activity_id)
                cur.execute(update_query, params)
        else:
            # Create new activity record
            cur.execute(
                """
                INSERT INTO activities 
                (user_id, prompt, image_filename, generated_caption, 
                 modified_caption, was_downloaded, was_posted, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """,
                (user_id, prompt, image_filename, generated_caption,
                 modified_caption, downloaded, posted)
            )
        
        conn.commit()
    except Exception as e:
        print(f"Error updating activity: {e}")
    finally:
        if conn:
            conn.close()

# Utility functions
def slugify(text):
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return "_".join(text.lower().split()[:6])

def generate_default_caption(prompt):
    """Generate a default caption if API fails"""
    words = prompt.split()[:5]
    base = " ".join(words)
    return f"{base} #aiart #digitalcreation #creative"

# Routes
@app.route("/")
def index():
    if "username" in session:
        return redirect(url_for("generate"))
    return render_template("index.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        
        if get_user(username):
            flash("Username already exists. Please log in.", "error")
            return redirect(url_for("login"))
        
        if create_user(username, password):
            flash("Account created successfully! Please log in.", "success")
            return redirect(url_for("login"))
        else:
            flash("Error creating account. Please try again.", "error")
    
    return render_template("signup.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        
        user = get_user(username)
        if user and verify_password(user['password_hash'], user['salt'], password):
            session["username"] = username
            session["user_id"] = user['id']
            session["insta_username"] = username
            session["insta_password"] = password
            session["image_history"] = []
            session["history_index"] = -1
            
            update_last_login(user['id'])
            flash("Logged in successfully!", "success")
            return redirect(url_for("generate"))
        else:
            flash("Invalid username or password. Please try again or sign up.", "error")
    
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("username", None)
    session.pop("user_id", None)
    session.pop("insta_username", None)
    session.pop("insta_password", None)
    session.pop("image_history", None)
    session.pop("history_index", None)
    
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))

@app.route("/download/<filename>")
def download_image(filename):
    if "username" not in session or "user_id" not in session:
        flash("Please log in first.", "error")
        return redirect(url_for("login"))
    
    try:
        # Update activity with download information
        update_activity(
            user_id=session["user_id"],
            image_filename=filename,
            downloaded=True
        )
        
        return send_from_directory(IMAGE_DIR, filename, as_attachment=True)
    except FileNotFoundError:
        flash("Image not found.", "error")
        return redirect(url_for("generate"))

@app.route("/generate", methods=["GET", "POST"])
def generate():
    if "username" not in session or "user_id" not in session:
        flash("Please log in first.", "error")
        return redirect(url_for("login"))

    if "image_history" not in session:
        session["image_history"] = []
    if "history_index" not in session:
        session["history_index"] = -1

    if request.method == "POST":
        if 'go_back' in request.form:
            if session["history_index"] < len(session["image_history"]) - 1:
                session["history_index"] += 1
                previous_image = session["image_history"][-(session["history_index"]+1)]
                return render_template("generate.html", 
                    image_url=previous_image['url'],
                    caption=previous_image['caption'],
                    image_filename=previous_image['filename'],
                    prompt=previous_image['prompt'])
            else:
                flash("No more previous images available", "info")
                return redirect(url_for("generate"))
        
        if 'go_forward' in request.form:
            if session["history_index"] > 0:
                session["history_index"] -= 1
                next_image = session["image_history"][-(session["history_index"]+1)]
                return render_template("generate.html", 
                    image_url=next_image['url'],
                    caption=next_image['caption'],
                    image_filename=next_image['filename'],
                    prompt=next_image['prompt'])
            elif session["history_index"] == 0:
                session["history_index"] = -1
                return redirect(url_for("generate"))
            else:
                flash("No more next images available", "info")
                return redirect(url_for("generate"))
        
        if 'post_to_insta' in request.form:
            image_filename = request.form["image_filename"]
            custom_caption = request.form.get("custom_caption", "").strip()
            
            if not custom_caption:
                flash("Please write a caption before posting", "error")
                return redirect(url_for("generate"))
            
            try:
                image_path = os.path.join(IMAGE_DIR, image_filename)
                cl = Client()
                cl.delay_range = [1, 3]
                cl.login(session["insta_username"], session["insta_password"])
                result = cl.photo_upload(path=image_path, caption=custom_caption)
                
                if result:
                    # Update activity with post information
                    update_activity(
                        user_id=session["user_id"],
                        image_filename=image_filename,
                        modified_caption=custom_caption,
                        posted=True
                    )
                    
                    flash("Posted to Instagram successfully!", "success")
                else:
                    flash("Post might have been successful, but Instagram returned a warning.", "info")
                    
            except Exception as e:
                if 'feedback_required' in str(e).lower():
                    flash("Your post was likely successful, but Instagram returned a warning. Please check your account.", "info")
                else:
                    flash(f"Failed to post to Instagram: {str(e)}", "error")
            return redirect(url_for("generate"))
        
        prompt = request.form["prompt"]
        try:
            generation_prompt = (
                f"{prompt}. Generate an ultra-realistic, high-definition (4K resolution) image with professional quality: "
                
                # Core Image Requirements
                "- Perfect lighting and shadows matching real-world physics\n"
                "- Natural textures and details that look completely authentic\n"
                "- Vibrant but realistic colors (RGB color profile)\n"
                "- Depth of field mimicking high-end DSLR cameras (f/1.4 to f/2.8)\n"
                "- No visible artifacts, distortions or AI-generated tells\n"
                
                # Conditional Elements
                f"{'- Accurate human features with proper anatomy and skin textures' if 'person' in prompt.lower() else ''}\n"
                f"{'- Legible, properly integrated text with realistic materials' if any(x in prompt.lower() for x in ['text', 'sale', 'offer', 'discount']) else ''}\n"
                f"{'- Professional product staging with accurate reflections' if any(x in prompt.lower() for x in ['product', 'item', 'merchandise']) else ''}\n"
                
                # Style Guidance
                "\nStyle should be:\n"
                "- Hyper-realistic professional photography\n"
                "- Commercial/advertising quality if promotional content\n"
                "- Editorial magazine quality for people/places\n"
                
                # For Promotional Content
                f"{'\nFor promotional content specifically include:' if any(x in prompt.lower() for x in ['promo', 'sale', 'offer', 'discount', 'ad', 'advert']) else ''}\n"
                f"{'- Clear focal point for marketing message' if any(x in prompt.lower() for x in ['promo', 'sale', 'offer', 'discount']) else ''}\n"
                f"{'- Negative space for text overlay if needed' if any(x in prompt.lower() for x in ['banner', 'poster', 'ad']) else ''}\n"
                f"{'- Branding elements placement areas' if 'logo' in prompt.lower() else ''}\n"
                
                # Output Requirements
                "\nAlso provide:\n"
                "1. Instagram caption (under 30 words) - "
                f"{'include promotional language and urgency' if any(x in prompt.lower() for x in ['promo', 'sale', 'offer']) else 'sounds human-written'}\n"
                "2. 3 highly relevant hashtags - "
                f"{'include commercial tags like #Offer #LimitedTime' if any(x in prompt.lower() for x in ['promo', 'sale']) else 'trending organic tags'}\n"
                "3. Suggested alt-text - "
                f"{'with promotional focus' if any(x in prompt.lower() for x in ['promo', 'sale']) else 'descriptive'}\n"
                "4. Recommended posting time (if applicable)\n"
                "5. Color palette hex codes for branding"
            )
            
            response = client.models.generate_content(
                model="gemini-2.0-flash-preview-image-generation",
                contents=generation_prompt,
                config=types.GenerateContentConfig(response_modalities=['TEXT', 'IMAGE'])
            )
            
            if not response.candidates or not response.candidates[0].content.parts:
                raise ValueError("Invalid response from generation API")
            
            generated_image = None
            generated_caption = ""
            
            for part in response.candidates[0].content.parts:
                if part.text: 
                    generated_caption = part.text.strip()
                elif part.inline_data: 
                    generated_image = Image.open(BytesIO(part.inline_data.data))
            
            if not generated_caption:
                try:
                    caption_response = client.models.generate_content(
                        model="gemini-pro",
                        contents=f"Generate a catchy Instagram caption with hashtags for: {prompt}"
                    )
                    generated_caption = caption_response.candidates[0].content.parts[0].text.strip()
                except Exception as e:
                    generated_caption = generate_default_caption(prompt)
                    flash("Used default caption as generation failed", "warning")
            
            if not generated_image:
                raise ValueError("Image generation failed")
            
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            image_filename = f"{slugify(prompt)}_{timestamp}.png"
            image_path = os.path.join(IMAGE_DIR, image_filename)
            generated_image.save(image_path)
            
            image_data = {
                'url': url_for('static', filename=f'images/{image_filename}'),
                'caption': generated_caption,
                'filename': image_filename,
                'prompt': prompt
            }
            
            if session["history_index"] != -1:
                session["image_history"] = session["image_history"][:-(session["history_index"]+1)]
                session["history_index"] = -1
            
            session["image_history"].append(image_data)
            if len(session["image_history"]) > 4:
                session["image_history"].pop(0)
            
            # Log the generation activity
            update_activity(
                user_id=session["user_id"],
                prompt=prompt,
                image_filename=image_filename,
                generated_caption=generated_caption
            )
            
            session.modified = True
            
            return render_template("generate.html", 
                image_url=image_data['url'],
                caption=image_data['caption'],
                image_filename=image_data['filename'],
                prompt=image_data['prompt'])
            
        except Exception as e:
            if "RESOURCE_EXHAUSTED" in str(e):
                flash("❌ You have exceeded your daily free quota for image generation. Please try again tomorrow or upgrade your plan.", "error")
            else:
                flash(f"Error generating content: {str(e)}", "error")
            return redirect(url_for("generate"))

    return render_template("generate.html")

@app.route("/promotional")
def promotional():
    if "username" not in session:
        return redirect(url_for("login"))
    
    templates = [
        {"name": "Discount Offer", "prompt": "Create a vibrant banner announcing '50% OFF' sale with colorful balloons"},
        {"name": "New Product", "prompt": "Generate a sleek product image for a tech gadget with futuristic design"},
        {"name": "Event Promotion", "prompt": "Create an event poster for a music festival with crowd silhouette"},
        {"name": "Seasonal Sale", "prompt": "Design a winter holiday promotion with snowflakes and gift boxes"},
        {"name": "Limited Offer", "prompt": "Create a special offer image with countdown timer and discount text"},
        {"name": "Social Media Post", "prompt": "Generate a square Instagram post featuring our new collection"}
    ]
    
    return render_template("promotional.html", templates=templates)

if __name__ == "__main__":
    app.run(debug=True)