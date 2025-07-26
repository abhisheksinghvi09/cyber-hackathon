from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import xml.etree.ElementTree as ET
import openai
import os
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import requests
from pydantic import BaseModel
import uuid
import httpx
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from collections import Counter, defaultdict

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Vulnerability Patch Management LLM", version="1.0.0")

# CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set Groq API Key
GROQ_API_KEY = ""
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# User auth settings
SECRET_KEY = "supersecretkey"  # In production, use a secure env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# In-memory user store for demo
users_db = {}

class User(BaseModel):
    username: str
    email: str
    full_name: str = ""
    disabled: bool = False

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = ""

class Token(BaseModel):
    access_token: str
    token_type: str

# Auth utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(username: str):
    user = users_db.get(username)
    if user:
        return UserInDB(**user)
    return None

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict):
    from datetime import timedelta
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

# Registration endpoint
@app.post("/api/register", response_model=User)
def register(user: UserCreate):
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    users_db[user.username] = {
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "disabled": False,
        "hashed_password": hashed_password
    }
    return User(**users_db[user.username])

# Login endpoint
@app.post("/api/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Get current user endpoint
@app.get("/api/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Data models
class ServiceInfo(BaseModel):
    ip: str
    port: str
    service: str
    version: str
    recommendation: str = ""
    severity: str = "Unknown"
    cve_info: List[str] = []

class ScanResult(BaseModel):
    scan_id: str
    timestamp: str
    services: List[ServiceInfo]
    summary: Dict[str, Any]

# In-memory storage for demo (use database in production)
# Now stores scan_id: { ...scan_result, 'username': username }
scan_results = {}

class ScriptRequest(BaseModel):
    service_index: int

class ChatMessage(BaseModel):
    message: str
    scan_id: str | None = None
    service_index: int | None = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str

def parse_nmap_xml(xml_content: str) -> List[Dict[str, str]]:
    """Parse Nmap XML and extract service information"""
    try:
        root = ET.fromstring(xml_content)
        results = []
        
        for host in root.findall("host"):
            # Get IP address
            address_elem = host.find("address")
            if address_elem is None:
                continue
            ip = address_elem.attrib.get("addr", "Unknown")
            
            # Get ports and services
            for port in host.findall(".//port"):
                port_num = port.attrib.get("portid", "")
                state = port.find("state")
                if state is None or state.attrib.get("state") != "open":
                    continue
                    
                service_elem = port.find("service")
                if service_elem is not None:
                    service_name = service_elem.attrib.get("name", "")
                    version = service_elem.attrib.get("version", "")
                    product = service_elem.attrib.get("product", "")
                    
                    if service_name:  # Only include if service is detected
                        results.append({
                            "ip": ip,
                            "port": port_num,
                            "service": service_name,
                            "version": version,
                            "product": product
                        })
        
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse XML: {str(e)}")

async def get_cve_info(service: str, version: str) -> List[str]:
    """Get CVE information from NVD API"""
    try:
        # Search for CVEs related to the service and version
        query = f"{service} {version}"
        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0"
        params = {
            "keywordSearch": query,
            "resultsPerPage": 5
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            cves = []
            for vuln in data.get("vulnerabilities", []):
                cve_id = vuln.get("cve", {}).get("id", "")
                description = vuln.get("cve", {}).get("descriptions", [{}])[0].get("value", "")
                cves.append(f"{cve_id}: {description[:100]}...")
            return cves
    except:
        pass
    return []

def determine_severity(service: str, version: str, cve_count: int) -> str:
    """Determine severity based on service, version, and CVE count"""
    high_risk_services = ["ssh", "telnet", "ftp", "smtp", "pop3", "imap"]
    medium_risk_services = ["http", "https", "dns", "ntp"]
    
    if service.lower() in high_risk_services:
        return "High"
    elif service.lower() in medium_risk_services:
        return "Medium"
    elif cve_count > 0:
        return "Medium"
    else:
        return "Low"

async def get_llm_recommendation(service: str, version: str, cve_info: List[str]) -> str:
    """Get patch recommendations from LLM (Groq)"""
    if not GROQ_API_KEY:
        return "Groq API key not configured. Please set GROQ_API_KEY environment variable."
    try:
        cve_text = "\n".join(cve_info) if cve_info else "No known CVEs found"
        prompt = f"""
You are a cybersecurity expert. Analyze the following service and provide detailed patch recommendations:

Service: {service}
Version: {version}
Known CVEs: {cve_text}

Please provide:
1. Security assessment
2. Specific patch/upgrade steps
3. Alternative security measures
4. Risk level explanation

Format your response in a clear, actionable manner.
"""
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-70b-8192",
            "messages": [
                {"role": "system", "content": "You are a cybersecurity expert specializing in vulnerability assessment and patch management."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
            "temperature": 0.3
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
    except Exception as e:
        return f"Error getting LLM recommendation: {str(e)}"

async def generate_patch_script(service: str, version: str) -> str:
    """Generate automated patch script using LLM (Groq)"""
    if not GROQ_API_KEY:
        return "# Groq API key not configured"
    try:
        prompt = f"""
Generate a Linux shell script to patch/upgrade {service} version {version}.
The script should:
1. Check current version
2. Backup current configuration
3. Update/upgrade the service
4. Verify the update
5. Include error handling

Provide only the shell script code, no explanations.
"""
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-70b-8192",
            "messages": [
                {"role": "system", "content": "You are a DevOps expert. Generate only shell script code."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 800,
            "temperature": 0.2
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
    except Exception as e:
        return f"# Error generating script: {str(e)}"

@app.post("/api/parse-scan")
async def parse_scan(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Parse Nmap XML file and generate vulnerability report"""
    if not file.filename.endswith('.xml'):
        raise HTTPException(status_code=400, detail="File must be an XML file")
    
    try:
        xml_content = await file.read()
        xml_text = xml_content.decode('utf-8')
        
        # Parse XML
        services_data = parse_nmap_xml(xml_text)
        
        # Generate scan ID
        scan_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Process each service
        processed_services = []
        for service_data in services_data:
            # Get CVE information
            cve_info = await get_cve_info(service_data["service"], service_data["version"])
            
            # Get LLM recommendation
            recommendation = await get_llm_recommendation(
                service_data["service"], 
                service_data["version"], 
                cve_info
            )
            
            # Determine severity
            severity = determine_severity(
                service_data["service"], 
                service_data["version"], 
                len(cve_info)
            )
            
            # Create service info
            service_info = ServiceInfo(
                ip=service_data["ip"],
                port=service_data["port"],
                service=service_data["service"],
                version=service_data["version"],
                recommendation=recommendation,
                severity=severity,
                cve_info=cve_info
            )
            processed_services.append(service_info)
        
        # Generate summary
        severity_counts = {}
        for service in processed_services:
            severity_counts[service.severity] = severity_counts.get(service.severity, 0) + 1
        
        summary = {
            "total_services": len(processed_services),
            "severity_breakdown": severity_counts,
            "high_risk_count": severity_counts.get("High", 0),
            "medium_risk_count": severity_counts.get("Medium", 0),
            "low_risk_count": severity_counts.get("Low", 0)
        }
        
        # Store results with username
        scan_results[scan_id] = {
            "scan_id": scan_id,
            "timestamp": timestamp,
            "services": processed_services,
            "summary": summary,
            "username": current_user.username
        }
        
        return {
            "status": "success",
            "scan_id": scan_id,
            "timestamp": timestamp,
            "services": [service.dict() for service in processed_services],
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/api/scan/{scan_id}")
async def get_scan_result(scan_id: str, current_user: User = Depends(get_current_user)):
    """Get scan results by ID"""
    scan = scan_results.get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["username"] != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to view this scan")
    return scan

@app.post("/api/generate-script/{scan_id}")
async def generate_script(scan_id: str, req: ScriptRequest, current_user: User = Depends(get_current_user)):
    scan = scan_results.get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["username"] != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to access this scan")
    service_index = req.service_index
    if service_index >= len(scan["services"]):
        raise HTTPException(status_code=400, detail="Invalid service index")
    
    service = scan["services"][service_index]
    script = await generate_patch_script(service.service, service.version)
    
    return {
        "service": service.service,
        "version": service.version,
        "script": script
    }

@app.get("/api/scans")
async def list_scans(current_user: User = Depends(get_current_user)):
    """List all scan results for the current user"""
    return {
        "scans": [
            {
                "scan_id": scan["scan_id"],
                "timestamp": scan["timestamp"],
                "summary": scan["summary"]
            }
            for scan in scan_results.values() if scan["username"] == current_user.username
        ]
    }

@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str, current_user: User = Depends(get_current_user)):
    """Delete scan result"""
    scan = scan_results.get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["username"] != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized to delete this scan")
    
    del scan_results[scan_id]
    return {"status": "deleted"}

@app.get("/api/stats/summary")
async def stats_summary(current_user: User = Depends(get_current_user)):
    user_scans = [scan for scan in scan_results.values() if scan["username"] == current_user.username]
    total_scans = len(user_scans)
    total_services = sum(scan["summary"]["total_services"] for scan in user_scans)
    risk_counts = Counter()
    for scan in user_scans:
        for sev, count in scan["summary"]["severity_breakdown"].items():
            risk_counts[sev] += count
    return {
        "total_scans": total_scans,
        "total_services": total_services,
        "risk_breakdown": dict(risk_counts)
    }

@app.get("/api/stats/timeline")
async def stats_timeline(current_user: User = Depends(get_current_user)):
    user_scans = [scan for scan in scan_results.values() if scan["username"] == current_user.username]
    timeline = []
    for scan in sorted(user_scans, key=lambda s: s["timestamp"]):
        timeline.append({
            "timestamp": scan["timestamp"],
            "total_services": scan["summary"]["total_services"],
            "high": scan["summary"].get("high_risk_count", 0),
            "medium": scan["summary"].get("medium_risk_count", 0),
            "low": scan["summary"].get("low_risk_count", 0)
        })
    return {"timeline": timeline}

@app.get("/api/stats/top-services")
async def stats_top_services(current_user: User = Depends(get_current_user)):
    user_scans = [scan for scan in scan_results.values() if scan["username"] == current_user.username]
    service_counter = Counter()
    for scan in user_scans:
        for svc in scan["services"]:
            key = f"{svc.service} {svc.version}" if svc.version else svc.service
            service_counter[key] += 1
    top_services = service_counter.most_common(10)
    return {"top_services": [{"service": s, "count": c} for s, c in top_services]}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(chat_msg: ChatMessage, current_user: User = Depends(get_current_user)):
    """Chat with AI about vulnerabilities and recommendations"""
    print(f"Received chat message: {chat_msg}")  # Debug log
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    try:
        # Build context from scan data if provided
        context = ""
        if chat_msg.scan_id:
            scan = scan_results.get(chat_msg.scan_id)
            if scan and scan["username"] == current_user.username:
                if chat_msg.service_index is not None and chat_msg.service_index < len(scan["services"]):
                    service = scan["services"][chat_msg.service_index]
                    context = f"""
Current Scan Context:
- Service: {service.service}
- Version: {service.version}
- IP: {service.ip}
- Port: {service.port}
- Severity: {service.severity}
- CVEs: {', '.join(service.cve_info) if service.cve_info else 'None'}
- Current Recommendation: {service.recommendation[:200]}...
"""
                else:
                    context = f"""
Current Scan Context:
- Total Services: {scan['summary']['total_services']}
- High Risk: {scan['summary'].get('high_risk_count', 0)}
- Medium Risk: {scan['summary'].get('medium_risk_count', 0)}
- Low Risk: {scan['summary'].get('low_risk_count', 0)}
"""

        prompt = f"""
You are a cybersecurity expert AI assistant for VulnPatch-LLM, a vulnerability management platform. 
You help users understand security vulnerabilities, provide detailed explanations, and offer actionable advice.

{context}

User Question: {chat_msg.message}

Please provide a clear, helpful response that includes:
- Technical explanation in simple terms
- Specific actionable recommendations
- Security best practices
- Risk assessment if applicable

Format your response in a clean, readable way. Use bullet points for lists and keep paragraphs short. Avoid excessive markdown formatting - just use basic formatting like **bold** for emphasis and bullet points for lists.
"""

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-70b-8192",
            "messages": [
                {"role": "system", "content": "You are a cybersecurity expert AI assistant specializing in vulnerability assessment, patch management, and security best practices. Provide clear, actionable advice."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            ai_response = data['choices'][0]['message']['content']
            
            return ChatResponse(
                response=ai_response,
                timestamp=datetime.now().isoformat()
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
