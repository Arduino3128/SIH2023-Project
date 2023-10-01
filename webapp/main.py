from threading import Thread
import subprocess


# -------------- WSGI INITIALIZER ---------------
def run():
    try:
        print("⎆ Web Server started.")
        subprocess.run(["pkill", "-9", "python3"])
        subprocess.run(
            [
                "gunicorn",
                "runner:app",
                "--bind",
                "0.0.0.0:443",
		"--certfile",
		"/etc/letsencrypt/live/barelyafloat.cloudns.nz/fullchain.pem",
		"--keyfile",
                "/etc/letsencrypt/live/barelyafloat.cloudns.nz/privkey.pem",
                "--worker-class",
                "gevent",
            ]
        )
    except Exception as error:
        print("⎈ Failed to start Web Server.")
        print(f"⎇ Debug: {error}")


def keep_alive():
    print("⎆ Starting Web Server.....")
    # t = Thread(target=run)
    # t.start()
    run()


keep_alive()
