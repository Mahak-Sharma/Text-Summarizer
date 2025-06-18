from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import os
import io
import docx
import pdfplumber
from concurrent.futures import ThreadPoolExecutor
from text_to_speech import text_to_speech
import json

# Limit Hugging Face cache to avoid memory issues
os.environ["TRANSFORMERS_CACHE"] = "/tmp"

app = FastAPI()

# CORS settings
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://text-summarizer-frontend.onrender.com",
    "https://text-summarizer.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load HF token from .env
hf_token = os.getenv("HF_TOKEN")

# Load model and tokenizer properly with token
tokenizer = AutoTokenizer.from_pretrained("sshleifer/distilbart-cnn-12-6", use_auth_token=hf_token)
model = AutoModelForSeq2SeqLM.from_pretrained("sshleifer/distilbart-cnn-12-6", use_auth_token=hf_token)
summarizer = pipeline("summarization", model=model, tokenizer=tokenizer)

# Text extractors
def extract_pdf_text(file_content: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        with ThreadPoolExecutor() as executor:
            text = list(executor.map(lambda p: p.extract_text() or "", pdf.pages))
    return "\n".join(text)

def extract_docx_text(file_content: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_content))
    return "\n".join(para.text for para in doc.paragraphs)

def extract_text_from_file(file_content: bytes, file_type: str) -> str:
    if file_type == "text/plain":
        return file_content.decode("utf-8")
    elif file_type == "application/pdf":
        return extract_pdf_text(file_content)
    elif file_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ]:
        return extract_docx_text(file_content)
    return ""

# Document processing endpoint
@app.post("/api/process")
async def process_document(file: UploadFile = File(...), action: str = "summarize"):
    try:
        content = await file.read()
        text = extract_text_from_file(content, file.content_type)

        if action == "summarize":
            max_chunk_length = 512
            chunks = [text[i:i + max_chunk_length] for i in range(0, len(text), max_chunk_length)]
            summaries = []

            for chunk in chunks:
                if len(chunk.strip()) > 100:
                    summary = summarizer(chunk, max_length=130, min_length=30, do_sample=False)
                    summaries.append(summary[0]['summary_text'])

            final_summary = " ".join(summaries)

            return {
                "success": True,
                "result": final_summary,
                "type": "summary",
                "message": "Document summarized successfully"
            }

        return {
            "success": False,
            "result": None,
            "type": None,
            "message": f"Unsupported action: {action}"
        }

    except Exception as e:
        return {
            "success": False,
            "result": None,
            "type": None,
            "message": f"Error processing document: {str(e)}"
        }

# TTS endpoint
@app.post("/api/text-to-speech")
async def api_text_to_speech(payload: dict = Body(...)):
    try:
        text = payload.get("text")
        voice_type = payload.get("voice_type", "")
        if not text:
            return Response(
                content=json.dumps({"success": False, "message": "No text provided."}),
                media_type="application/json",
                status_code=400
            )

        audio_path = text_to_speech(text, voice_type)
        if not os.path.exists(audio_path):
            return Response(
                content=json.dumps({"success": False, "message": "Failed to generate audio file."}),
                media_type="application/json",
                status_code=500
            )

        return FileResponse(
            audio_path,
            media_type="audio/mpeg",
            filename="speech.mp3"
        )

    except Exception as e:
        return Response(
            content=json.dumps({"success": False, "message": f"Error: {str(e)}"}),
            media_type="application/json",
            status_code=500
        )

@app.get("/healthcheck")
def healthcheck():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)