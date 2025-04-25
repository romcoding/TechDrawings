import multiprocessing

# Bind to 0.0.0.0 to allow external access
bind = "0.0.0.0:10000"

# Worker configuration
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 120

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Timeouts
keepalive = 120
worker_timeout = 120 