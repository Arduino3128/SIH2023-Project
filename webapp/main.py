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
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import timedelta
import json
from dotenv import dotenv_values
from base64 import b64encode
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import bcrypt,bcrypt_check
from db_connector import Database
from regex import Regex

# ------------- APP CONFIGS --------------------
app_config = dotenv_values(".env")
mongodb_url = app_config["MONGODB_URL"].format(app_config['MONGODB_USER'],app_config['MONGODB_PASS'])
re = Regex()

# -------------- DB CONFIGS ---------------------
DB = Database()
DB.connect(mongodb_url,app_config["MONGODB_DB"],app_config["MONGODB_COLLECTION"])
mongo_client = DB.client
# -------------- FLASK CONFIGS ------------------
app = Flask(__name__, static_url_path="", static_folder="static")
csrf = CSRFProtect(app)
app.secret_key = app_config["FLASK_SECRET_KEY"]
app.permanent_session_lifetime = timedelta(weeks=1)

#app.config['SESSION_TYPE'] = "mongodb"
#app.config['SESSION_USE_SIGNER'] =  True
#app.config['SESSION_MONGODB'] = mongo_client
#app.config['SESSION_MONGODB_DB']=app_config["MONGODB_DB"]
#app.config['SESSION_MONGODB_COLLECT']=app_config["MONGODB_SESSION_COLLECTION"]
app.config['SESSION_TYPE'] = "filesystem"
#app.config['SESSION_USE_SIGNER'] =  True
app.config['SESSION_FILE_DIR'] = app_config['SESSION_FILE_DIR']
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


@app.errorhandler(CSRFError)
def handle_csrf_error(e):
	return render_template("csrf_error.html"), 400

# -------------- URL ROUTERS -----------------
@app.route("/")
def home():
	return render_template("index.html")

@app.route("/dashboard/register_device",methods=["GET","POST"])
def register_device():
	if session.get('Username'):
		if DB.verify_user(session.get('Username'),session.get('Password')):
			if request.method == "POST":
				try:
					r_str = json.loads(request.form.get('RegisterString'))
					farm_id = request.form.get("FarmID") #get based on location?
					location = request.form.get("Location")
					_status = DB.register_device(session.get('Username'),session.get('Password'),farm_id,r_str.get('DEVICE ID'),r_str.get('DEVICE MAC'),location)
					if _status:
						return "OK"
					return "FAIL"
				except:
					return "FAIL"
			else:
				return render_template("register_device.html")

	return redirect("/login")

@app.route("/register",methods=["GET","POST"])
def register():
	if request.method == "POST":
		username = request.form.get('username')
		password = request.form.get('password')
		if re.user_regex(username) and re.pass_regex(password):
			_status = DB.register_user(username,password)
			if _status:
				return redirect("/login")
			else:
				return redirect("/register")
		else:
				return redirect("/register")
	else:
		return render_template("register.html")

@app.route("/login",methods=["GET","POST"])
def login():
	if request.method == "POST":
		username = request.form.get('username')
		password = request.form.get('password')
		if re.user_regex(username) and re.pass_regex(password):
			_status = DB.verify_user(username,password)
			if _status:
				session['Username'] = username
				session['Password'] = password
				return redirect("/dashboard")
		return redirect("/login")
	else:
		if session.get('Username'):
				return redirect("/dashboard")
		return render_template("login.html")

@app.route("/logout",methods=["GET"])
def logout():
	session.clear()
	return "Logged Out"

@app.route("/dashboard",methods=["GET","POST"])
def dashboard():
	if session.get('Username'):
		if DB.verify_user(session.get('Username'),session.get('Password')):
			return DB.fetch_probe(session.get('Username'),session.get('Password'))
	return redirect("/login")

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

