from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import string

app = FastAPI(title="Simple Test Server")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PhoneRequest(BaseModel):
    phone_number: str
    user_type: str

# Store verification codes
verification_codes = {}

def generate_code():
    return ''.join(random.choices(string.digits, k=5))

@app.get("/")
async def root():
    return {"message": "Simple Test Server is running!"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "Simple Test API"}

@app.post("/api/auth/send-verification")
async def send_verification(request: PhoneRequest):
    code = generate_code()
    verification_codes[request.phone_number] = code
    
    print(f"*** VERIFICATION CODE FOR {request.phone_number}: {code} ***")
    
    return {
        "message": "کد تایید با موفقیت ارسال شد",
        "expires_in": 15
    }

@app.post("/api/auth/verify")
async def verify_code(phone_number: str, code: str):
    stored_code = verification_codes.get(phone_number)
    if stored_code and stored_code == code:
        return {"message": "تایید شد", "access_token": "fake_token"}
    else:
        return {"error": "کد اشتباه است"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001) 