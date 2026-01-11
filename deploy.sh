#!/bin/bash
# ===========================================
# MiniZapier Deploy Script
# ===========================================
# Usage:
#   ./deploy.sh              - Full deploy (sync + build + restart)
#   ./deploy.sh sync         - Only sync files
#   ./deploy.sh build        - Build containers
#   ./deploy.sh restart      - Restart containers
#   ./deploy.sh logs         - Show last 500 lines + follow
#   ./deploy.sh logs api     - Logs for specific service
#   ./deploy.sh status       - Container status
#   ./deploy.sh stop         - Stop all containers
#   ./deploy.sh start        - Start all containers
#   ./deploy.sh shell api    - Shell into container
#   ./deploy.sh db           - Connect to database

set -e

# Configuration
SERVER="kpeezy"
REMOTE_DIR="/minizapier"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Sync files to server
sync_files() {
    log_info "Syncing files to $SERVER:$REMOTE_DIR..."
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude '.next' \
        --exclude '.turbo' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '.DS_Store' \
        "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"
    log_success "Files synced"
}

# Build containers
build() {
    local service=$1
    log_info "Building containers..."
    if [ -n "$service" ]; then
        ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE build $service"
    else
        ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE build"
    fi
    log_success "Build complete"
}

# Restart containers
restart() {
    local service=$1
    log_info "Restarting containers..."
    if [ -n "$service" ]; then
        ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d $service"
    else
        ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d"
    fi
    log_success "Containers restarted"
}

# Full deploy
deploy() {
    log_info "Starting full deploy..."
    sync_files
    log_info "Building and restarting containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d --build"
    log_success "Deploy complete!"
    echo ""
    status
}

# Show logs
logs() {
    local service=$1
    local lines=${2:-500}

    if [ -n "$service" ]; then
        log_info "Showing logs for minizapier-$service (last $lines lines)..."
        ssh "$SERVER" "docker logs minizapier-$service --tail $lines -f"
    else
        log_info "Showing logs for all services (last $lines lines)..."
        ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE logs --tail $lines -f"
    fi
}

# Container status
status() {
    log_info "Container status:"
    ssh "$SERVER" "docker ps --filter 'name=minizapier' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
}

# Stop containers
stop() {
    log_info "Stopping containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE down"
    log_success "Containers stopped"
}

# Start containers
start() {
    log_info "Starting containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d"
    log_success "Containers started"
    status
}

# Shell into container
shell_into() {
    local service=$1
    if [ -z "$service" ]; then
        log_error "Please specify service: api, web, postgres, redis"
        exit 1
    fi
    log_info "Opening shell in minizapier-$service..."
    ssh -t "$SERVER" "docker exec -it minizapier-$service sh"
}

# Database connection
db_connect() {
    log_info "Connecting to PostgreSQL..."
    ssh -t "$SERVER" "docker exec -it minizapier-postgres psql -U minizapier -d minizapier"
}

# Run Prisma migrations
migrate() {
    log_info "Running database migrations..."
    ssh "$SERVER" "docker exec minizapier-api npx prisma migrate deploy"
    log_success "Migrations complete"
}

# Show help
show_help() {
    echo "MiniZapier Deploy Script"
    echo ""
    echo "Usage: ./deploy.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  (none)           Full deploy (sync + build + restart)"
    echo "  sync             Only sync files to server"
    echo "  build [service]  Build containers (optionally specific service)"
    echo "  restart [svc]    Restart containers"
    echo "  logs [service]   Show logs (last 500 + follow)"
    echo "  status           Show container status"
    echo "  stop             Stop all containers"
    echo "  start            Start all containers"
    echo "  shell <service>  Shell into container (api/web/postgres/redis)"
    echo "  db               Connect to PostgreSQL"
    echo "  migrate          Run Prisma migrations"
    echo "  help             Show this help"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                    # Full deploy"
    echo "  ./deploy.sh logs api           # API logs"
    echo "  ./deploy.sh shell api          # Shell into API container"
    echo "  ./deploy.sh build web          # Rebuild only web"
}

# Main
case "$1" in
    sync)
        sync_files
        ;;
    build)
        build "$2"
        ;;
    restart)
        restart "$2"
        ;;
    logs)
        logs "$2" "$3"
        ;;
    status)
        status
        ;;
    stop)
        stop
        ;;
    start)
        start
        ;;
    shell)
        shell_into "$2"
        ;;
    db)
        db_connect
        ;;
    migrate)
        migrate
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        deploy
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
