#!/bin/bash

# Render CLI Helper Script for Stock Sense Backend
# Service ID: srv-d270p0p5pdvs73bttkog

SERVICE_ID="srv-d270p0p5pdvs73bttkog"
RENDER_CLI="./render.exe"

echo "🚀 Stock Sense Backend - Render CLI Helper"
echo "==========================================="
echo ""

case "$1" in
    "logs")
        echo "📋 Viewing live logs..."
        $RENDER_CLI logs --resources $SERVICE_ID --tail
        ;;
    "deploys")
        echo "🚢 Recent deployments:"
        $RENDER_CLI deploys list $SERVICE_ID --output json
        ;;
    "status")
        echo "📊 Service status:"
        $RENDER_CLI services --output json
        ;;
    "deploy")
        echo "🚀 Triggering new deployment..."
        $RENDER_CLI deploys create $SERVICE_ID
        ;;
    "restart")
        echo "🔄 Restarting service..."
        $RENDER_CLI restart --resources $SERVICE_ID
        ;;
    "ssh")
        echo "🔗 Opening SSH session..."
        $RENDER_CLI ssh --resources $SERVICE_ID
        ;;
    "quick-logs")
        echo "📋 Last 20 log entries:"
        $RENDER_CLI logs --resources $SERVICE_ID --limit 20 --output text
        ;;
    *)
        echo "Usage: $0 {logs|deploys|status|deploy|restart|ssh|quick-logs}"
        echo ""
        echo "Available commands:"
        echo "  logs        - View live logs (tail mode)"
        echo "  quick-logs  - Show last 20 log entries"
        echo "  deploys     - Show recent deployments"
        echo "  status      - Show service status"
        echo "  deploy      - Trigger new deployment"
        echo "  restart     - Restart the service"
        echo "  ssh         - Open SSH session to service"
        echo ""
        echo "Examples:"
        echo "  $0 logs       # View live logs"
        echo "  $0 quick-logs # Show recent logs"
        echo "  $0 status     # Check service status"
        exit 1
        ;;
esac
