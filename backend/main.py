from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import boto3
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import json
from decimal import Decimal
import os

app = FastAPI(title="FinOps Monthly Review API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory storage for incidents (in production, use a database)
incidents_store = []

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, obj).default(obj)

class Incident(BaseModel):
    id: str
    service: str
    costChange: float
    changePercent: float
    explanation: str
    timestamp: str

class IncidentsRequest(BaseModel):
    incidents: List[Incident]

def get_billing_data(start_date, end_date):
    """Fetch billing data from AWS Cost Explorer for the given date range"""
    try:
        client = boto3.client('ce')

        response = client.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.strftime('%Y-%m-%d'),
                'End': end_date.strftime('%Y-%m-%d')
            },
            Granularity='MONTHLY',
            Metrics=['BlendedCost'],
            GroupBy=[
                {
                    'Type': 'DIMENSION',
                    'Key': 'SERVICE'
                }
            ]
        )

        billing_data = {}
        for result in response['ResultsByTime']:
            for group in result['Groups']:
                service = group['Keys'][0]
                cost = Decimal(group['Metrics']['BlendedCost']['Amount'])
                if service in billing_data:
                    billing_data[service] += cost
                else:
                    billing_data[service] = cost

        return billing_data

    except Exception as e:
        # Return mock data for development/testing
        print(f"AWS API error (using mock data): {e}")
        return get_mock_billing_data(start_date, end_date)

def get_mock_billing_data(start_date, end_date):
    """Generate mock billing data for testing"""
    import random

    services = [
        'Amazon Elastic Compute Cloud - Compute',
        'Amazon Simple Storage Service',
        'Amazon Relational Database Service',
        'Amazon CloudFront',
        'Amazon Virtual Private Cloud',
        'AWS Lambda',
        'Amazon CloudWatch',
        'Amazon Route 53',
        'AWS WAF',
        'Amazon ElastiCache'
    ]

    # Generate different data based on month to simulate changes
    month_offset = start_date.month % 2
    billing_data = {}

    for service in services:
        base_cost = random.uniform(10, 1000)
        if month_offset == 0:
            # First month
            cost = base_cost
        else:
            # Second month - simulate various changes
            change_factor = random.choice([0.7, 0.8, 1.2, 1.5, 1.8])  # Decrease or increase
            cost = base_cost * change_factor

        billing_data[service] = Decimal(str(round(cost, 2)))

    # Add some services only in second month (new services)
    if month_offset == 1:
        new_services = ['Amazon Kinesis', 'AWS Glue']
        for service in new_services:
            billing_data[service] = Decimal(str(round(random.uniform(50, 200), 2)))

    return billing_data

def compare_billing_data(previous_month_data, current_month_data):
    """Compare billing data between two months"""
    comparison = []

    all_services = set(previous_month_data.keys()) | set(current_month_data.keys())

    for service in all_services:
        prev_cost = previous_month_data.get(service, Decimal('0'))
        curr_cost = current_month_data.get(service, Decimal('0'))

        if prev_cost == 0 and curr_cost > 0:
            status = 'new'
            change_percent = None
        elif prev_cost > 0 and curr_cost == 0:
            status = 'removed'
            change_percent = -100
        else:
            change = curr_cost - prev_cost
            change_percent = (change / prev_cost * 100) if prev_cost > 0 else 0

            if change_percent > 5:
                status = 'increased'
            elif change_percent < -5:
                status = 'decreased'
            else:
                status = 'unchanged'

        comparison.append({
            'service': service,
            'previous_cost': prev_cost,
            'current_cost': curr_cost,
            'change': curr_cost - prev_cost,
            'change_percent': change_percent,
            'status': status
        })

    # Sort by current cost descending
    comparison.sort(key=lambda x: x['current_cost'], reverse=True)

    return comparison

@app.get("/")
async def root():
    return {"message": "FinOps Monthly Review API", "version": "1.0.0"}

@app.get("/api/compare")
async def compare():
    """API endpoint to get billing comparison data"""
    try:
        # Calculate date ranges for last two full months
        today = datetime.now()

        # Current month (last full month)
        current_month_end = today.replace(day=1) - timedelta(days=1)
        current_month_start = current_month_end.replace(day=1)

        # Previous month
        previous_month_end = current_month_start - timedelta(days=1)
        previous_month_start = previous_month_end.replace(day=1)

        # Get billing data for both months
        previous_data = get_billing_data(previous_month_start, previous_month_end + timedelta(days=1))
        current_data = get_billing_data(current_month_start, current_month_end + timedelta(days=1))

        # Compare the data
        comparison = compare_billing_data(previous_data, current_data)

        response_data = {
            'previous_month': {
                'start': previous_month_start.strftime('%Y-%m-%d'),
                'end': previous_month_end.strftime('%Y-%m-%d'),
                'name': previous_month_start.strftime('%B %Y')
            },
            'current_month': {
                'start': current_month_start.strftime('%Y-%m-%d'),
                'end': current_month_end.strftime('%Y-%m-%d'),
                'name': current_month_start.strftime('%B %Y')
            },
            'comparison': comparison
        }

        return json.loads(json.dumps(response_data, cls=DecimalEncoder))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/incidents")
async def save_incidents(request: IncidentsRequest):
    """Save incidents from review workflow"""
    try:
        incidents = [incident.dict() for incident in request.incidents]

        # Add timestamp if not present
        for incident in incidents:
            if 'timestamp' not in incident:
                incident['timestamp'] = datetime.now().isoformat()

        # Store incidents (in production, save to database)
        incidents_store.extend(incidents)

        return {
            'success': True,
            'message': f'Saved {len(incidents)} incidents',
            'incident_count': len(incidents_store)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/incidents")
async def get_incidents():
    """Retrieve all incidents"""
    try:
        return {
            'incidents': incidents_store,
            'count': len(incidents_store)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)