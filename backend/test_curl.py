import asyncio
from app.core.security import create_access_token
import uuid
from app.models.user import User
from sqlalchemy import select
from app.core.database import SessionLocal
import subprocess

def main():
    db = SessionLocal()
    user = db.execute(select(User).where(User.email == "consultor@test.com")).scalar_one_or_none()
    db.close()
    
    if not user:
        print("User not found")
        return
        
    token, _ = create_access_token(subject=str(user.id))
    
    url = "http://localhost:8000/api/v1/projects/7587bbaf-2ed1-46e9-87f9-0024fa77846d/artifacts/35aaebd9-de24-48dd-af2d-b4bab960ca3b/conceptual-model/versions"
    
    cmd = ["curl", "-s", "-w", "\\nHTTP_STATUS:%{http_code}", "-X", "GET", url, "-H", f"Authorization: Bearer {token}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    print("Response:", result.stdout)

if __name__ == "__main__":
    main()
