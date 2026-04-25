import os
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "intfloat/multilingual-e5-base"
TOP_K = 20
SIMILARITY_THRESHOLD = 0.75
USE_EMBEDDINGS = os.getenv("USE_EMBEDDINGS", "false").strip().lower() in {"1", "true", "yes", "on"}

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "proverbs.csv")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = "telugu_proverbs"

# CORS / Frontend Configuration
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

# Admin Credentials
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
