set dotenv-load

LOG_DIR := ".logs"

# Start all services (db + dev)
start:
    mkdir -p {{LOG_DIR}}
    npx supabase start
    pnpm dev > {{LOG_DIR}}/dev.log 2>&1 &
    echo "Started. Logs: {{LOG_DIR}}/dev.log"

# Stop all services
stop:
    -pkill -f "turbo run dev" 2>/dev/null
    -pkill -f "pnpm dev" 2>/dev/null
    npx supabase stop
    echo "Stopped."

# Restart all services
restart: stop start

# Clear log files
clearlogs:
    rm -f {{LOG_DIR}}/*.log
    echo "Logs cleared."

# Tail dev logs
logs:
    tail -f {{LOG_DIR}}/dev.log

# Show running status
status:
    npx supabase status
    -pgrep -fl "turbo run dev" || echo "dev: not running"

# Start only DB
db-start:
    supabase start

# Stop only DB
db-stop:
    npx supabase stop

# Run DB migrations
db-migrate:
    npx supabase db push
