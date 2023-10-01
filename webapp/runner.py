from flask import (
    Flask,
    flash,
    render_template,
    redirect,
    session,
    request,
    send_from_directory,
)
from threading import Thread
from flask_wtf.csrf import CSRFProtect
from flask_wtf.csrf import CSRFError
import requests
import os
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import timedelta
import json
from dotenv import dotenv_values
from base64 import b64encode
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import bcrypt,bcrypt_check


app_config = dotenv_values(".env")
mongodb_url = f"mongodb+srv://app_config['MONGODB_USER']:{app_config['MONGODB_PASS']}@sih2023.lomtnfw.mongodb.net/?retryWrites=true&w=majority"

app = Flask(__name__, static_url_path="", static_folder="static")

app.secret_key = app_config["FLASK_SECRET_KEY"]
app.permanent_session_lifetime = timedelta(weeks=1)
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_host=1)


# -------------- ERROR HANDLERS ---------------
'''
@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    return render_template("csrf_error.html"), 400
'''

# -------------- URL ROUTERS -----------------
@app.route("/")
def home():
    return render_template("index.html")


# -------------- WSGI INITIALIZER ---------------
def run():
    try:
        from waitress import serve

        print("⎆ Web Server started.")
        serve(app, host="0.0.0.0", port=80)
    except Exception as error:
        print("⎈ Failed to start Web Server.")
        print(f"⎇ Debug: {error}")


def keep_alive():
    print("⎆ Starting Web Server.....")
    t = Thread(target=run)
    t.start()


# keep_alive()

# app.run(debug=True, host="0.0.0.0", port=8080)
