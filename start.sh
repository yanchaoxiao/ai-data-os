#!/bin/bash

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
AIDATA_DIR="$REPO_ROOT/packages/worker-aidata"
LOG_DIR="$AIDATA_DIR/logs"
PID_FILE="$REPO_ROOT/.pids"
AIDATA_PID_FILE="$REPO_ROOT/.pids-aidata"

mkdir -p "$LOG_DIR"

PYTHON="$AIDATA_DIR/.venv/bin/python"

ok()   { echo "  ✓ $1"; }
step() { echo "▶ $1"; }
warn() { echo "  ⚠ $1"; }
info() { echo "  · $1"; }
err()  { echo "  ✗ $1"; }

# ── helpers ──────────────────────────────────────────────────────

kill_port() {
  local pids
  pids=$(lsof -ti ":$1" 2>/dev/null) || true
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    info "killed :$1"
  fi
}

kill_pid_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null && info "stopped PID $pid" || true
  done < "$file"
  rm -f "$file"
}

wait_http() {
  local url="$1" label="$2" seconds="${3:-30}"
  local i
  for i in $(seq 1 "$seconds"); do
    if curl -sf "$url" > /dev/null 2>&1; then
      ok "$label"
      return 0
    fi
    sleep 1
  done
  warn "$label 启动超时 (${seconds}s)，请查看: ./start.sh logs"
  return 0
}

load_env() {
  if [[ -f "$AIDATA_DIR/.env" ]]; then
    set -o allexport
    source "$AIDATA_DIR/.env"
    set +o allexport
  fi
  : "${JWT_SECRET_KEY:=dev-secret-key-change-in-production}"
  export JWT_SECRET_KEY
}

# ── stop ──────────────────────────────────────────────────────────

stop_all() {
  step "停止所有服务"
  kill_pid_file "$PID_FILE"
  kill_pid_file "$AIDATA_PID_FILE"
  for port in 3005 8011 8002 3100 3101 3001 3002 3003 3004; do
    kill_port "$port"
  done
  ok "所有服务已停止"
}

stop_aidata() {
  step "停止 worker-aidata"
  kill_pid_file "$AIDATA_PID_FILE"
  for port in 3005 8011 8002; do
    kill_port "$port"
  done
  ok "worker-aidata 已停止"
}

# ── start worker-aidata ───────────────────────────────────────────

start_aidata() {
  step "worker-aidata"

  if [[ ! -f "$PYTHON" ]]; then
    info "虚拟环境不存在，开始初始化..."
    cd "$AIDATA_DIR"
    /Users/xiaoyanyupei/.workbuddy/binaries/python/versions/3.13.12/bin/python3 -m venv .venv
    .venv/bin/pip install -e .
    if [[ ! -f "$PYTHON" ]]; then
      err "虚拟环境初始化失败"
      return 1
    fi
  fi

  load_env
  cd "$AIDATA_DIR"

  "$PYTHON" -m uvicorn semantic.main:app --port 8011 \
    >> "$LOG_DIR/semantic.log" 2>&1 &
  echo $! >> "$AIDATA_PID_FILE"

  "$PYTHON" -m uvicorn fusion.main:app --port 8002 \
    >> "$LOG_DIR/fusion.log" 2>&1 &
  echo $! >> "$AIDATA_PID_FILE"

  "$PYTHON" -m uvicorn gateway.main:app --reload --port 3005 \
    >> "$LOG_DIR/gateway.log" 2>&1 &
  echo $! >> "$AIDATA_PID_FILE"

  cd "$REPO_ROOT"

  wait_http "http://localhost:3005/api/v1/health" \
    "gateway:3005  semantic:8011  fusion:8002" 30
}

# ── start frontend ────────────────────────────────────────────────

start_frontend() {
  step "前端"
  cd "$REPO_ROOT"
  pnpm dev >> "$LOG_DIR/frontend.log" 2>&1 &
  echo $! >> "$PID_FILE"

  wait_http "http://localhost:3100" "portal:3100" 60
  ok "aidata:3001  growth:3002  dealflow:3004"
}

# ── status ────────────────────────────────────────────────────────

show_status() {
  echo "── 端口状态 ──"
  local port name
  for port in 3005 8011 8002 3100 3001 3002 3004; do
    case "$port" in
      3005) name="gateway   " ;;
      8011) name="semantic  " ;;
      8002) name="fusion    " ;;
      3100) name="portal    " ;;
      3001) name="aidata    " ;;
      3002) name="growth    " ;;
      3004) name="dealflow  " ;;
      *)    name="unknown   " ;;
    esac
    if lsof -ti ":$port" > /dev/null 2>&1; then
      echo "  ✓ $name :$port  UP"
    else
      echo "  ✗ $name :$port  DOWN"
    fi
  done
}

# ── logs ──────────────────────────────────────────────────────────

show_logs() {
  local svc="${1:-gateway}" lines="${2:-80}"
  local log_file="$LOG_DIR/${svc}.log"
  if [[ -f "$log_file" ]]; then
    tail -n "$lines" "$log_file"
  else
    warn "日志不存在: $log_file"
    echo "  可用: gateway  semantic  fusion  frontend"
  fi
}

# ── help ──────────────────────────────────────────────────────────

show_help() {
  echo "用法: $0 <命令>"
  echo ""
  echo "  (无参数)           启动全部服务"
  echo "  stop               停止全部服务"
  echo "  restart            停止 + 重新启动全部服务"
  echo "  restart-aidata     仅重启 Python 后端"
  echo "  status             查看各端口运行状态"
  echo "  logs [svc] [N]     查看日志"
  echo "  help               显示此帮助"
}

# ── main ──────────────────────────────────────────────────────────

CMD="${1:-}"

case "$CMD" in
  stop)
    stop_all
    exit 0
    ;;
  restart)
    stop_all
    sleep 1
    CMD=""
    ;;
  restart-aidata)
    stop_aidata
    sleep 1
    start_aidata
    echo ""
    echo "worker-aidata 已重启 · 日志: ./start.sh logs [gateway|semantic|fusion]"
    exit 0
    ;;
  status)
    show_status
    exit 0
    ;;
  logs)
    show_logs "${2:-gateway}" "${3:-80}"
    exit 0
    ;;
  help|--help|-h)
    show_help
    exit 0
    ;;
  ""|start)
    :
    ;;
  *)
    err "未知命令: $CMD"
    show_help
    exit 1
    ;;
esac

# ── 完整启动 ──────────────────────────────────────────────────────

if [[ -f "$PID_FILE" || -f "$AIDATA_PID_FILE" ]]; then
  warn "检测到残留 PID，建议先运行: ./start.sh stop"
fi

# Docker services
step "Docker"
if ! docker info > /dev/null 2>&1; then
  info "Docker 未运行，正在启动 OrbStack..."
  open -a OrbStack
  for i in $(seq 1 30); do
    docker info > /dev/null 2>&1 && break
    sleep 2
  done
fi

cd "$REPO_ROOT"
docker compose up -d postgres neo4j redis > /dev/null 2>&1 || \
  warn "docker compose 部分服务启动失败，继续..."

# wait postgres
_pg_ok=0
for i in $(seq 1 20); do
  docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && _pg_ok=1 && break
  sleep 1
done
if [[ $_pg_ok -eq 1 ]]; then ok "postgres:5433"; else warn "postgres:5433 未就绪"; fi

# wait redis
_redis_ok=0
for i in $(seq 1 10); do
  docker compose exec -T redis redis-cli ping > /dev/null 2>&1 && _redis_ok=1 && break
  sleep 1
done
if [[ $_redis_ok -eq 1 ]]; then ok "redis:6379"; else warn "redis:6379 未就绪"; fi

# wait neo4j
for i in $(seq 1 30); do
  docker compose exec -T neo4j wget -q --spider http://localhost:7474 > /dev/null 2>&1 && ok "neo4j:7687" && break
  sleep 2
  if [[ $i -eq 30 ]]; then warn "neo4j 启动超时，归因分析图谱功能降级运行"; fi
done

# Python backend
start_aidata

# Frontend
start_frontend

echo ""
echo "══════════════════════════════════════"
echo "  所有服务已就绪"
echo "  http://localhost:3100  ← portal"
echo "══════════════════════════════════════"
echo ""
echo "  stop              停止所有"
echo "  restart-aidata    重启 Python 后端"
echo "  status            端口状态"
echo "  logs [svc]        查看日志"
echo ""
