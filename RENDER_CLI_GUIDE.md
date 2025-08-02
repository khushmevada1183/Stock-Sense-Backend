# Render CLI Setup and Usage Guide

## 🚀 Stock Sense Backend Management

Your Render CLI is now successfully installed and configured!

### Service Information
- **Service ID**: `srv-d270p0p5pdvs73bttkog`
- **Service URL**: https://stock-sense-backend-ocjo.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d270p0p5pdvs73bttkog

### Quick Commands

#### Direct Render CLI Usage:
```bash
# View live logs (real-time)
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --tail

# View last 50 log entries
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --limit 50 --output text

# List recent deployments
./render.exe deploys list srv-d270p0p5pdvs73bttkog --output json

# Check service status
./render.exe services --output json

# Trigger new deployment
./render.exe deploys create srv-d270p0p5pdvs73bttkog

# Restart service
./render.exe restart --resources srv-d270p0p5pdvs73bttkog

# Open SSH session
./render.exe ssh --resources srv-d270p0p5pdvs73bttkog
```

#### Using the Helper Script:
```bash
# View live logs
./render-helper.sh logs

# Show last 20 log entries
./render-helper.sh quick-logs

# Check deployments
./render-helper.sh deploys

# Check service status
./render-helper.sh status

# Trigger deployment
./render-helper.sh deploy

# Restart service
./render-helper.sh restart

# SSH into service
./render-helper.sh ssh
```

### Useful Log Filtering

```bash
# Filter logs by text
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --text "ERROR" --limit 10

# Filter by HTTP status codes
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --status-code "500,429" --limit 20

# View logs from specific time
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --start "2025-08-02T14:00:00Z" --limit 50
```

### Development Workflow

1. **After making code changes**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Monitor deployment**:
   ```bash
   ./render-helper.sh logs
   ```

3. **Check deployment status**:
   ```bash
   ./render-helper.sh deploys
   ```

### Rate Limiting Monitoring

With your new rate limiting system, you can monitor:

```bash
# Check for rate limit errors
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --text "429" --limit 20

# Monitor API key rotation
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --text "API key rotated" --limit 10

# Check rate limiting logs
./render.exe logs --resources srv-d270p0p5pdvs73bttkog --text "Rate limiting" --limit 10
```

### Troubleshooting

If you see errors:
1. **Connection issues**: Check if the service is running with `./render-helper.sh status`
2. **Rate limits**: Monitor with `./render-helper.sh logs` and look for 429 errors
3. **Deployment issues**: Check `./render-helper.sh deploys` for failed deployments

### Current Status
✅ Render CLI installed and authenticated  
✅ Advanced rate limiting system deployed  
✅ 11 API keys configured with rotation  
✅ Service running and healthy  
✅ Helper scripts configured  

Your Stock Sense Backend is now fully manageable via the command line!
