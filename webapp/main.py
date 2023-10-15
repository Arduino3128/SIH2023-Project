import json
from datetime import timedelta
from threading import Thread
from db_connector import Database
from dotenv import dotenv_values
from flask import Flask, redirect, render_template, request, session
from flask_session import Session
from flask_wtf.csrf import CSRFError, CSRFProtect
from regex import Regex
from werkzeug.middleware.proxy_fix import ProxyFix

# ------------- APP CONFIGS --------------------
app_config = dotenv_values(".env")
mongodb_url = app_config["MONGODB_URL"].format(app_config["MONGODB_USER"],
                                               app_config["MONGODB_PASS"])
re = Regex()

# -------------- DB CONFIGS ---------------------
DB = Database()
DB.connect(
    mongodb_url,
    app_config["MONGODB_DB"],
    app_config["MONGODB_COLLECTION"],
    app_config["MONGODB_DEVICE_COLLECTION"],
)
# -------------- FLASK CONFIGS ------------------
app = Flask(__name__, static_url_path="", static_folder="static")
csrf = CSRFProtect(app)
app.secret_key = app_config["FLASK_SECRET_KEY"]
app.permanent_session_lifetime = timedelta(weeks=1)

# app.config['SESSION_TYPE'] = "mongodb"
# app.config['SESSION_USE_SIGNER'] =  True
# app.config['SESSION_MONGODB'] = mongo_client
# app.config['SESSION_MONGODB_DB']=app_config["MONGODB_DB"]
# app.config['SESSION_MONGODB_COLLECT']=app_config["MONGODB_SESSION_COLLECTION"]
app.config["SESSION_TYPE"] = "filesystem"
# app.config['SESSION_USE_SIGNER'] =  True
app.config["SESSION_FILE_DIR"] = app_config["SESSION_FILE_DIR"]
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_host=1)
Session(app)


# -------------- ERROR HANDLERS ---------------
@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return render_template(
        "404.html"), 405  # Did it on purpose, send 404 to confuse.


@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    return render_template("csrf_error.html"), 400


# -------------- URL ROUTERS -----------------
@app.route("/")
def home():
    return render_template("index.html")


# -------------- AUTH ROUTERS ----------------
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        if confirm_password != password:
            return redirect("/register")
        if re.user_regex(username) and re.pass_regex(password):
            _status = DB.register_user(username, password)
            if _status:
                return redirect("/login")
            else:
                return redirect("/register")
        else:
            return redirect("/register")
    else:
        return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if re.user_regex(username) and re.pass_regex(password):
            _status = DB.verify_user(username, password)
            if _status:
                session["Username"] = username
                session["Password"] = password
                return redirect("/dashboard")
        return redirect("/login")
    else:
        if session.get("Username"):
            return redirect("/dashboard")
        return render_template("login.html")


@app.route("/logout", methods=["GET"])
def logout():
    session.clear()
    return render_template("logout.html")


# -------------- DASHBOARD ROUTERS --------------
@app.route("/dashboard", methods=["GET", "POST"])
def dashboard():
    if session.get("Username"):
        if DB.verify_user(session.get("Username"), session.get("Password")):
            return DB.fetch_probe(session.get("Username"),
                                  session.get("Password"))
    return redirect("/login")


@app.route("/dashboard/register_device", methods=["GET", "POST"])
@csrf.exempt
def register_device():
    if session.get("Username"):
        if DB.verify_user(session.get("Username"), session.get("Password")):
            if request.method == "POST":
                try:
                    data = json.loads(request.data)
                    device_id = data.get("DeviceID")
                    alias_name = data.get("AliasName")
                    farm_id = data.get(
                        "FarmID"
                    )  # get based on location? or scan the QR on the Compute module first and then QR on Soil Probe?
                    location = data.get("Location")
                    _status = DB.register_device(
                        session.get("Username"),
                        session.get("Password"),
                        device_id,
                        location,
                        alias_name,
                        farm_id,
                    )
                    return _status
                except Exception as ERROR:
                    return {"status": f"FAIL: {ERROR}"}
            else:
                return render_template("register_device.html")

    return redirect("/login")


@app.route("/dashboard/find_device", methods=["GET", "POST"])
@csrf.exempt
def find_device():
    if session.get("Username"):
        if DB.verify_user(session.get("Username"), session.get("Password")):
            if request.method == "POST":
                try:
                    data = json.loads(request.data)
                    device_id = data.get("DeviceID")
                    farm_id = data.get("FarmID")
                    _data = DB.fetch_single_probe(session.get("Username"),
                                                  farm_id, device_id)
                    if _data != {}:
                        return {"status": "OK", "location": _data["Location"]}
                    return {"status": "FAIL"}
                except:
                    return {"status": "FAIL"}
            else:
                return render_template("find_device.html")
    else:
        return redirect("/login")


# -------------- API ROUTERS --------------------
@app.route("/api", methods=["POST"])
@csrf.exempt
def api():
    value_type = request.form.get("type")
    token = request.form.get("token")
    totp = request.form.get("totp")
    value = request.form.get("value")
    farm_id = request.form.get("farm_id")
    dev_id = request.form.get("dev_id")
    _status = {
        "status": DB.api(dev_id, farm_id, value_type, token, totp, value)
    }
    return _status


# -------------- WSGI INITIALIZER ---------------
def run():
    try:
        from waitress import serve

        print("⎆ Web Server started.")
        serve(app, host="0.0.0.0", port=8000)
    except Exception as error:
        print("⎈ Failed to start Web Server.")
        print(f"⎇ Debug: {error}")


def keep_alive():
    print("⎆ Starting Web Server.....")
    t = Thread(target=run)
    t.start()


# keep_alive()

# app.run(debug=True, host="0.0.0.0", port=8080)
