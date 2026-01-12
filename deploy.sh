#!/bin/bash
# ===========================================
# MiniZapier Deploy Panel
# ===========================================

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
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear_screen() { printf "\033c"; }

header() {
    echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}    ${BOLD}MiniZapier Deploy Panel${NC}                 ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    ${BLUE}minizapier.syntratrade.xyz${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info() { echo -e "${BLUE}▶${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

press_enter() {
    echo ""
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read
}

# Actions
do_status() {
    log_info "Container Status:"
    echo ""
    ssh "$SERVER" "docker ps --filter 'name=minizapier' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null || log_error "Failed to connect"
}

do_sync() {
    log_info "Syncing files to server..."
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude '.next' \
        --exclude '.turbo' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '.DS_Store' \
        "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/" 2>/dev/null
    log_success "Files synced!"
}

wait_for_container() {
    local container=$1
    local max_attempts=${2:-30}
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if ssh "$SERVER" "docker exec $container echo 'ready'" &>/dev/null; then
            return 0
        fi
        log_info "Waiting for $container to be ready... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    return 1
}

do_deploy() {
    log_info "Starting full deploy..."
    do_sync
    log_info "Building and restarting containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d --build" 2>/dev/null

    log_info "Waiting for API container to be ready..."
    if wait_for_container "minizapier-api" 30; then
        log_success "API container is ready!"
        log_info "Applying database schema changes..."
        if ssh "$SERVER" "docker exec minizapier-api npx prisma db push" 2>&1; then
            log_success "Database schema updated!"
        else
            log_error "Schema update failed! Check API logs for details."
        fi
    else
        log_error "API container failed to start in time. Run migrations manually: ./deploy.sh migrate"
    fi

    log_success "Deploy complete!"
    echo ""
    do_status
}

do_restart() {
    log_info "Restarting containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE restart" 2>/dev/null
    log_success "Containers restarted!"
}

do_stop() {
    log_info "Stopping containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE down" 2>/dev/null
    log_success "Containers stopped!"
}

do_start() {
    log_info "Starting containers..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d" 2>/dev/null
    log_success "Containers started!"
}

do_logs() {
    local service=$1
    local container="minizapier-$service"
    log_info "Logs for $container (Ctrl+C to exit):"
    echo ""
    ssh "$SERVER" "docker logs $container --tail 500 -f" 2>/dev/null
}

do_logs_all() {
    log_info "All logs (Ctrl+C to exit):"
    echo ""
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE logs --tail 200 -f" 2>/dev/null
}

do_shell() {
    local service=$1
    local container="minizapier-$service"
    log_info "Opening shell in $container..."
    ssh -t "$SERVER" "docker exec -it $container sh" 2>/dev/null
}

do_db() {
    log_info "Connecting to PostgreSQL..."
    ssh -t "$SERVER" "docker exec -it minizapier-postgres psql -U minizapier -d minizapier" 2>/dev/null
}

do_migrate() {
    log_info "Running database migrations..."
    ssh "$SERVER" "docker exec minizapier-api npx prisma migrate deploy" 2>/dev/null
    log_success "Migrations complete!"
}

do_rebuild_web() {
    log_info "Rebuilding web container..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d --build web" 2>/dev/null
    log_success "Web container rebuilt!"
}

do_rebuild_api() {
    log_info "Rebuilding API container..."
    ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d --build api" 2>/dev/null
    log_success "API container rebuilt!"
}

# Menus
logs_menu() {
    while true; do
        clear_screen
        header
        echo -e "${BOLD}Logs Menu${NC}"
        echo ""
        echo "  1) All services"
        echo "  2) API"
        echo "  3) Web"
        echo "  4) PostgreSQL"
        echo "  5) Redis"
        echo ""
        echo "  0) Back"
        echo ""
        echo -ne "${CYAN}Select: ${NC}"
        read choice

        case $choice in
            1) do_logs_all ;;
            2) do_logs "api" ;;
            3) do_logs "web" ;;
            4) do_logs "postgres" ;;
            5) do_logs "redis" ;;
            0) return ;;
            *) log_error "Invalid option" && sleep 1 ;;
        esac
    done
}

shell_menu() {
    while true; do
        clear_screen
        header
        echo -e "${BOLD}Shell Menu${NC}"
        echo ""
        echo "  1) API container"
        echo "  2) Web container"
        echo "  3) PostgreSQL (psql)"
        echo "  4) Redis (redis-cli)"
        echo ""
        echo "  0) Back"
        echo ""
        echo -ne "${CYAN}Select: ${NC}"
        read choice

        case $choice in
            1) do_shell "api" ;;
            2) do_shell "web" ;;
            3) do_db ;;
            4) ssh -t "$SERVER" "docker exec -it minizapier-redis redis-cli" 2>/dev/null ;;
            0) return ;;
            *) log_error "Invalid option" && sleep 1 ;;
        esac
    done
}

build_menu() {
    while true; do
        clear_screen
        header
        echo -e "${BOLD}Build Menu${NC}"
        echo ""
        echo "  1) Full deploy (sync + build all)"
        echo "  2) Sync files only"
        echo "  3) Rebuild Web"
        echo "  4) Rebuild API"
        echo "  5) Run migrations"
        echo ""
        echo "  0) Back"
        echo ""
        echo -ne "${CYAN}Select: ${NC}"
        read choice

        case $choice in
            1) do_deploy && press_enter ;;
            2) do_sync && press_enter ;;
            3) do_rebuild_web && press_enter ;;
            4) do_rebuild_api && press_enter ;;
            5) do_migrate && press_enter ;;
            0) return ;;
            *) log_error "Invalid option" && sleep 1 ;;
        esac
    done
}

# Main menu
main_menu() {
    while true; do
        clear_screen
        header
        do_status
        echo ""
        echo -e "${BOLD}Actions:${NC}"
        echo ""
        echo "  1) ${GREEN}Deploy${NC}      - Full deploy (sync + build)"
        echo "  2) Restart    - Restart all containers"
        echo "  3) Stop       - Stop all containers"
        echo "  4) Start      - Start all containers"
        echo ""
        echo "  5) Logs       - View logs →"
        echo "  6) Shell      - Container shell →"
        echo "  7) Build      - Build options →"
        echo ""
        echo "  q) Quit"
        echo ""
        echo -ne "${CYAN}Select: ${NC}"
        read choice

        case $choice in
            1) do_deploy && press_enter ;;
            2) do_restart && press_enter ;;
            3) do_stop && press_enter ;;
            4) do_start && press_enter ;;
            5) logs_menu ;;
            6) shell_menu ;;
            7) build_menu ;;
            q|Q|0) clear_screen && exit 0 ;;
            *) log_error "Invalid option" && sleep 1 ;;
        esac
    done
}

# Direct command support (for non-interactive use)
case "$1" in
    deploy) do_deploy ;;
    sync) do_sync ;;
    status) do_status ;;
    restart) do_restart ;;
    stop) do_stop ;;
    start) do_start ;;
    logs) do_logs "${2:-api}" ;;
    shell) do_shell "${2:-api}" ;;
    db) do_db ;;
    migrate) do_migrate ;;
    "") main_menu ;;
    *) echo "Usage: $0 [deploy|sync|status|restart|stop|start|logs|shell|db|migrate]" ;;
esac
