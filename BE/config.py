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
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from litellm import completion
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ML_MODEL_PATH = os.path.join(BASE_DIR, 'textile-defect-detection-master', 'models', 'best_model.pt')
CHROMA_DIR = os.path.join(BASE_DIR, 'chroma_defects')

BASE_URL = 'https://genailab.tcs.in'
LLM_MODEL = 'genailab-maas-gpt-4o'
VISION_MODEL = 'azure_ai/genailab-maas-Llama-3.2-90B-Vision-Instruct'
EMBEDDING_MODEL = 'azure/genailab-maas-text-embedding-3-large'
API_KEY = os.environ.get('GENAILAB_API_KEY', 'sk-gvEmPsuh15hW9dkg-CF8mQ')

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
        _http_client = httpx.Client(verify=False)
    return _http_client

def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=LLM_MODEL,
            api_key=API_KEY,
            base_url=BASE_URL,
            http_client=get_http_client()
        )
    return _llm

def get_embeddings():
    global _embeddings
    if _embeddings is None:
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
        _vectordb = Chroma(persist_directory=CHROMA_DIR, embedding_function=get_embeddings())
    return _vectordb

import litellm
litellm.ssl_verify = False

def get_vision_llm_response(messages):
    response = completion(
        model=VISION_MODEL,
        messages=messages,
        api_base=BASE_URL,
        api_key=API_KEY,
    )
    return response
