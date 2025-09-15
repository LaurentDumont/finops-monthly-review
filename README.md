# FinOps Monthly Review

> ⚠️ **WARNING: VIBE CODED PROJECT** ⚠️
>
> This project was rapidly prototyped and "vibe coded" without following proper software engineering practices.
> It may contain:
> - Untested code paths
> - Security vulnerabilities
> - Performance issues
> - Inconsistent coding patterns
> - Missing error handling
> - Incomplete documentation
>
> **USE AT YOUR OWN RISK** - This is intended for experimentation and learning purposes only.
> Do not use in production environments without thorough review, testing, and security auditing.

A web application for comparing AWS monthly costs between the last two full months to help teams track consumption growth, decreases, and changes.

## Features

- **Monthly Cost Comparison**: Line-by-line comparison between the last two full months of AWS billing data
- **Real-time Search**: Filter services in real-time as you type
- **Review Workflow**: Guided process to validate cost increases and create incidents
- **Service Highlighting**: Visual indicators for cost changes:
  - 🆕 New services (blue highlight)
  - 📈 Increased costs (red highlight)
  - 📉 Decreased costs (green highlight)
  - ⏸️ Unchanged costs (yellow highlight)
  - ❌ Removed services (gray highlight)
- **Dark/Light Theme**: Toggle between themes with persistence
- **Incident Management**: Create and track incidents for cost increases
- **Responsive Design**: Bootstrap-based UI that works on desktop and mobile

## Technology Stack

- **Backend**: Python 3.13.7 with FastAPI
- **Frontend**: HTML, CSS (Bootstrap), JavaScript (jQuery), Nginx
- **Containers**: Separate Docker containers for frontend and backend
- **AWS Integration**: boto3 for Cost Explorer API
- **Containerization**: Docker & Docker Compose

## Architecture

```
├── backend/                # FastAPI backend service
│   ├── main.py            # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile         # Backend container
├── frontend/              # Nginx frontend service
│   ├── index.html        # Main HTML page
│   ├── static/           # CSS, JS, assets
│   ├── nginx.conf        # Nginx configuration
│   └── Dockerfile        # Frontend container
└── docker-compose.yml    # Multi-container orchestration
```

## Setup & Installation

### Prerequisites

- Docker and Docker Compose
- AWS credentials configured (for live data)

### Quick Start

1. Clone or create the project directory
2. Build and run with Docker Compose:

```bash
docker-compose up --build
```

3. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs

### AWS Configuration

For live AWS data, ensure your AWS credentials are configured:

- Set up AWS credentials via `aws configure`
- Or use environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Or use IAM roles if running on EC2

Required AWS permissions:
- `ce:GetCostAndUsage` (Cost Explorer API)

## Usage

1. Open the application at http://localhost:3000
2. Click "Run Comparison" to fetch and compare billing data
3. Use the search bar to filter services in real-time
4. Review the comparison table with highlighted changes
5. Click "Start Review" to begin the cost validation workflow
6. For each cost increase, provide explanations to create incidents

## API Endpoints

- `GET /api/compare` - Get billing comparison data
- `POST /api/incidents` - Save incidents from review workflow
- `GET /api/incidents` - Retrieve all stored incidents
- `GET /docs` - Interactive API documentation

## Development

The application includes mock data for development/testing when AWS API is not available.

### Container Structure

- **Backend Container**: FastAPI app running on port 8000
- **Frontend Container**: Nginx serving static files on port 80 (mapped to 3000)
- **Network**: Both containers communicate via Docker network

### Mock Data

When AWS API is unavailable, the application automatically falls back to mock data that simulates various cost change scenarios for testing.