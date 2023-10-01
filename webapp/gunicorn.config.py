bind = "0.0.0.0:443"
workers = 8
pidfile = 'pidfile'
errorlog = 'errorlog'
loglevel = 'info'
accesslog = 'accesslog'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

certfile = '/home/ubuntu/www/fullchain.pem'
keyfile = '/home/ubuntu/www/privkey.pem'
