from threading import Thread
import subprocess
import os


# -------------- WSGI INITIALIZER ---------------
def run():
    try:
        os.chdir("/home/runner/SIH2023-Project/webapp/")
        print("⎆ Web Server started.")
        subprocess.run(["pkill", "-9", "gunicorn"])
        subprocess.run([
            "gunicorn",
            "main:app",
            "--bind",
            "0.0.0.0:8080",
            "--worker-class",
            "gevent",
            "--workers",
            "1",
        ])
    except Exception as error:
        print("⎈ Failed to start Web Server.")
        print(f"⎇ Debug: {error}")


def keep_alive():
    print("⎆ Starting Web Server.....")
    #t = Thread(target=run)
    #t.start()
    run()


keep_alive()
