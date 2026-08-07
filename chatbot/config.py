import os, ssl
os.environ['GRPC_SSL_CIPHER_SUITES'] = 'HIGH+ECDSA'
os.environ['PYTHONHTTPSVERIFY'] = '0'
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except: pass
os.environ['ANONYMIZED_TELEMETRY'] = 'False'

import httpx
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.environ.get('UPLOAD_PATH', os.path.join(BASE_DIR, 'uploads'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ML_MODEL_PATH = os.path.join(BASE_DIR, 'textile-defect-detection-master', 'models', 'best_model.pt')
CHROMA_DIR = os.environ.get('CHROMA_PATH', os.path.join(BASE_DIR, 'chroma_defects'))

# The OKF agent intentionally has a single provider: values come only from .env.
BASE_URL = os.environ.get('OPENAI_BASE_URL')
LLM_MODEL = os.environ.get('OPENAI_MODEL')
EMBEDDING_MODEL = os.environ.get('EMBEDDING_MODEL')
API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_TIMEOUT_SECONDS = float(os.environ.get('OPENAI_TIMEOUT_SECONDS', '45'))
VERIFY_SSL = os.environ.get('OPENAI_VERIFY_SSL', 'true').strip().lower() not in {'0', 'false', 'no'}

FLASK_PORT = 8000
SECRET_KEY = os.environ.get('SECRET_KEY', 'friday-hackathon-secret-key-2024')
JWT_ALGORITHM = 'HS256'

TIKTOKEN_CACHE_DIR = os.path.join(BASE_DIR, '.tiktoken_cache')
os.environ['TIKTOKEN_CACHE_DIR'] = TIKTOKEN_CACHE_DIR
os.makedirs(TIKTOKEN_CACHE_DIR, exist_ok=True)

_http_client = None
_llm = None
_embeddings = None
_vectordb = None

def get_http_client():
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(
            verify=VERIFY_SSL,
            timeout=httpx.Timeout(OPENAI_TIMEOUT_SECONDS, connect=15.0),
        )
    return _http_client

def _require_model_settings():
    missing = [name for name, value in {
        'OPENAI_API_KEY': API_KEY,
        'OPENAI_MODEL': LLM_MODEL,
        'EMBEDDING_MODEL': EMBEDDING_MODEL,
    }.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required .env setting(s): {', '.join(missing)}")

def get_llm():
    global _llm
    if _llm is None:
        from langchain_openai import ChatOpenAI
        _require_model_settings()
        _llm = ChatOpenAI(
            model=LLM_MODEL,
            api_key=API_KEY,
            base_url=BASE_URL,
            http_client=get_http_client(),
            timeout=OPENAI_TIMEOUT_SECONDS,
            max_retries=0,
        )
    return _llm

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        from langchain_openai import OpenAIEmbeddings
        _require_model_settings()
        _embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            api_key=API_KEY,
            base_url=BASE_URL,
            http_client=get_http_client()
        )
    return _embeddings

def get_vectordb():
    global _vectordb
    if _vectordb is None:
        # Chroma has a large import graph; load it only if vector persistence is used.
        from langchain_community.vectorstores import Chroma
        _vectordb = Chroma(persist_directory=CHROMA_DIR, embedding_function=get_embeddings())
    return _vectordb

