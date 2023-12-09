import json
from datetime import timedelta, datetime
from threading import Thread
from db_connector import Database
from dotenv import dotenv_values
from flask import Flask, redirect, render_template, request, session, make_response
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
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_FILE_DIR"] = app_config["SESSION_FILE_DIR"]
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
#app.config['SERVER_NAME'] = "barelyafloat.cloudns.nz"
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
    #return render_template("index.html")
    return redirect("/login")


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
        return render_template("register.html",
                               info="",
                               message_type='invalid_creds')
    else:
        return render_template("register.html", info="")


@app.route("/dashboard/developer", methods=[
    "GET",
])
def developer():
    response = redirect("/dashboard")
    response.set_cookie("developer", "true")
    return response


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        try:
            if username == "Test101" and request.cookies.get(
                    "developer") != "true":
                headers = request.headers
                with open(".logs.txt", "a") as file:
                    file.write(
                        f"Timestamp: {datetime.now()} UTC | Username: {username} | Headers: {headers}\n{'-'*50}\n"
                    )
        except:
            pass
        if re.user_regex(username) and re.pass_regex(password):
            _status = DB.verify_user(username, password)
            if _status:
                session["Username"] = username
                session["Password"] = password
                response = redirect("/dashboard")
                response.set_cookie("showDemo", "true")
                return response

        test_user = app_config["TEST_USER"]
        test_pass = app_config["TEST_PASS"]
        return render_template("login.html",
                               test_user=test_user,
                               test_pass=test_pass,
                               info="",
                               message_type='invalid_creds')
    else:
        if session.get("Username"):
            response = redirect("/dashboard")
            return response

        test_user = app_config["TEST_USER"]
        test_pass = app_config["TEST_PASS"]
        return render_template("login.html",
                               test_user=test_user,
                               test_pass=test_pass,
                               info="")


@app.route("/dashboard/profile", methods=["GET"])
def profile():
    if session.get("Username"):
        username = session.get("Username")
        farms = len(DB.fetch_farm_list(username))
        return render_template("profile.html", username=username, farms=farms)
    else:
        return redirect("/login")


@app.route("/logout", methods=["GET"])
def logout():
    session.clear()
    response = make_response(render_template("logout.html"))
    response.set_cookie('showDemo', expires=0)
    #response.set_cookie('session',expires=0)
    return response


# -------------- DASHBOARD ROUTERS --------------
@app.route("/dashboard", methods=["GET", "POST"])
def dashboard():
    if session.get("Username"):
        if DB.verify_user(session.get("Username"), session.get("Password")):
            if request.method == "POST":
                req_type = request.form.get("type")
                if req_type == "get_farm":
                    return DB.fetch_farm_list(session.get("Username"))
                elif req_type == "get_probes":
                    farm_id = request.form.get("farm_id")
                    probe_list = DB.fetch_probe(session.get("Username"),
                                                session.get("Password"))
                    return probe_list.get(farm_id)["ProbeModule"]
                elif req_type == "update_probe":
                    farm_id = request.form.get("farm_id")
                    device_id = request.form.get("device_id")
                    value = request.form.get("value")
                    return DB.set_valve_state(farm_id, device_id, value)
                return {}
            else:
                if request.args.get("showDemo") == "true":
                    resp = redirect("/dashboard")
                    resp.set_cookie("showDemo", "true")
                    return resp
                else:
                    return render_template("dashboard.html",
                                           username=session.get("Username"))

    return redirect("/login")


@app.route("/dashboard/register_device", methods=["GET", "POST"])
def register_device():
    if session.get("Username"):
        if DB.verify_user(session.get("Username"), session.get("Password")):
            if request.method == "POST":
                try:
                    device_id = request.form.get("device_id")
                    alias_name = request.form.get("alias_name")
                    farm_id = request.form.get("farm_id")
                    location = request.form.get("location")
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
                farm_id = request.args.get("farm_id")
                return render_template("register_device.html", farm_id=farm_id)

    return redirect("/login")


@app.route("/dashboard/find_device", methods=["GET", "POST"])
def find_device():
    if session.get("Username"):
        if DB.verify_user(session.get("Username"), session.get("Password")):
            if request.method == "POST":
                try:
                    device_id = request.form.get("device_id")
                    farm_id = request.form.get("farm_id")
                    _data = DB.fetch_single_probe(session.get("Username"),
                                                  farm_id, device_id)
                    if _data != {}:
                        return {"status": "OK", "location": _data["Location"]}
                    return {"status": "FAIL"}
                except:
                    return {"status": "FAIL"}
            else:
                return render_template("find_device.html",
                                       farm_id=request.args.get("farm_id"),
                                       device_id=request.args.get("device_id"))
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
        "response": DB.api(dev_id, farm_id, value_type, token, totp, value)
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
