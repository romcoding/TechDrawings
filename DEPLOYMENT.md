# Deployment Guide

This guide explains how to deploy the Technical Drawing Analyzer as a web application.

## 🚀 Quick Start (Development)

### 1. Local Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd TechDrawings-3

# Run the startup script
./start.sh  # On macOS/Linux
# or
start.bat   # On Windows
```

### 2. Access the Web App
- Open your browser and go to: `http://localhost:10000`
- Login with: `admin` / `admin`
- Upload technical drawings and start analyzing!

## 🌐 Production Deployment

### Option 1: Single Server Deployment

#### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Python 3.8+
- Node.js 18+
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt)

#### Installation Steps

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx poppler-utils -y

# Clone repository
git clone <repository-url>
cd TechDrawings-3
```

2. **Application Setup**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies and build
npm install
npm run build

# Create environment file
cp env.example .env
# Edit .env with your OpenAI API key and secure credentials
```

3. **Nginx Configuration**
```bash
# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/techdrawings

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:10000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/techdrawings /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **SSL Certificate**
```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

5. **Systemd Service**
```bash
# Create service file
sudo nano /etc/systemd/system/techdrawings.service

# Add this content:
[Unit]
Description=Technical Drawing Analyzer
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/app
Environment=PATH=/path/to/your/app/venv/bin
ExecStart=/path/to/your/app/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl enable techdrawings
sudo systemctl start techdrawings
```

### Option 2: Docker Deployment

#### Dockerfile
```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 10000

# Start application
CMD ["python", "app.py"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  techdrawings:
    build: .
    ports:
      - "10000:10000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - FLASK_SECRET_KEY=${FLASK_SECRET_KEY}
      - APP_USERNAME=${APP_USERNAME}
      - APP_PASSWORD=${APP_PASSWORD}
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

#### Run with Docker
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 3: Cloud Deployment

#### AWS EC2
1. Launch EC2 instance (t3.medium or larger)
2. Configure security groups (port 80, 443, 22)
3. Follow single server deployment steps
4. Use Elastic IP for static IP address

#### Google Cloud Platform
1. Create Compute Engine instance
2. Configure firewall rules
3. Follow single server deployment steps
4. Use Cloud Load Balancer for SSL termination

#### Azure
1. Create Virtual Machine
2. Configure Network Security Groups
3. Follow single server deployment steps
4. Use Application Gateway for SSL termination

## 🔧 Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Security (change these!)
FLASK_SECRET_KEY=your_secure_secret_key_here
APP_USERNAME=your_username
APP_PASSWORD=your_secure_password

# Optional
PORT=10000
HOST=0.0.0.0
```

### Security Considerations
- Change default credentials
- Use strong, unique passwords
- Enable HTTPS in production
- Set up firewall rules
- Regular security updates
- Monitor logs for suspicious activity

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check application status
curl http://your-domain.com/health

# Check service status
sudo systemctl status techdrawings

# View logs
sudo journalctl -u techdrawings -f
```

### Backup Strategy
```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Backup environment configuration
cp .env .env.backup.$(date +%Y%m%d)
```

### Updates
```bash
# Pull latest code
git pull origin main

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt
npm install
npm run build

# Restart service
sudo systemctl restart techdrawings
```

## 🚨 Troubleshooting

### Common Issues
1. **Port already in use**: Check if another service is using port 10000
2. **Permission denied**: Ensure proper file permissions and user setup
3. **Build failures**: Check Node.js version and npm dependencies
4. **API errors**: Verify OpenAI API key and quota

### Debug Mode
```bash
# Enable debug logging
export FLASK_ENV=development
python app.py
```

### Support
- Check logs: `sudo journalctl -u techdrawings -f`
- Verify configuration: `python -c "from config import Config; Config.validate()"`
- Test OpenAI connection: Check API key and network connectivity

---

**Happy Deploying! 🚀**
