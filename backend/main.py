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
import re
from concurrent.futures import ThreadPoolExecutor
from text_to_speech import text_to_speech
from speech_to_text import process_audio_file
import json

# Limit Hugging Face cache to avoid memory issues
os.environ["TRANSFORMERS_CACHE"] = "/tmp"

app = FastAPI()

# CORS settings
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
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

# Load a better model for summarization
# Using facebook/bart-large-cnn which is better for summarization
tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn", use_auth_token=hf_token)
model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-large-cnn", use_auth_token=hf_token)
summarizer = pipeline("summarization", model=model, tokenizer=tokenizer)

def clean_text(text):
    """Clean and preprocess text for better summarization"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep punctuation
    text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)]', '', text)
    # Remove multiple periods
    text = re.sub(r'\.+', '.', text)
    return text.strip()

def smart_chunk_text(text, max_length=1024):
    """Split text into smart chunks based on sentences and paragraphs"""
    # Clean the text first
    text = clean_text(text)
    
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        # If adding this sentence would exceed max_length, save current chunk and start new one
        if len(current_chunk + sentence) > max_length and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence if current_chunk else sentence
    
    # Add the last chunk if it has content
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks

def generate_high_quality_summary(text):
    """Generate high-quality summary with better parameters"""
    try:
        # Clean the text
        text = clean_text(text)
        
        # If text is too short, return as is
        if len(text.split()) < 50:
            return text
        
        # Split into smart chunks
        chunks = smart_chunk_text(text, max_length=1024)
        
        summaries = []
        
        for chunk in chunks:
            if len(chunk.strip()) > 100:  # Only summarize substantial chunks
                try:
                    # Use better parameters for summarization
                    summary = summarizer(
                        chunk,
                        max_length=200,  # Increased for better coverage
                        min_length=50,   # Increased for more meaningful summaries
                        do_sample=False,  # Deterministic output
                        num_beams=4,     # Better quality with beam search
                        length_penalty=2.0,  # Encourage longer summaries
                        early_stopping=True,
                        no_repeat_ngram_size=3  # Avoid repetition
                    )
                    summaries.append(summary[0]['summary_text'])
                except Exception as e:
                    print(f"Error summarizing chunk: {e}")
                    # If summarization fails, use the chunk as is
                    summaries.append(chunk[:200] + "..." if len(chunk) > 200 else chunk)
        
        # Combine summaries
        final_summary = " ".join(summaries)
        
        # If the combined summary is still too long, create a final summary
        if len(final_summary.split()) > 300:
            try:
                final_summary = summarizer(
                    final_summary,
                    max_length=250,
                    min_length=100,
                    do_sample=False,
                    num_beams=4,
                    length_penalty=2.0,
                    early_stopping=True,
                    no_repeat_ngram_size=3
                )[0]['summary_text']
            except Exception as e:
                print(f"Error creating final summary: {e}")
                # If final summarization fails, truncate
                final_summary = final_summary[:500] + "..." if len(final_summary) > 500 else final_summary
        
        return final_summary
        
    except Exception as e:
        print(f"Error in generate_high_quality_summary: {e}")
        # Fallback: return a simple truncation
        return text[:500] + "..." if len(text) > 500 else text

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
            # Use the improved summarization function
            final_summary = generate_high_quality_summary(text)

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

# Speech-to-text endpoint
@app.post("/api/speech-to-text")
async def api_speech_to_text(audio_file: UploadFile = File(...)):
    try:
        result = process_audio_file(audio_file, summarizer)
        return result
    except Exception as e:
        return {
            "success": False,
            "transcribed_text": None,
            "summary": None,
            "overall_summary": None,
            "message": f"Error processing audio: {str(e)}"
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