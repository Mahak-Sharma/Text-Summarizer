from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from transformers import pipeline
import os
import io
import docx
import PyPDF2
from text_to_speech import text_to_speech
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

def extract_text_from_file(file_content: bytes, file_type: str) -> str:
    """Extract text from different file types"""
    text = ""
    if file_type == "text/plain":
        text = file_content.decode("utf-8")
    elif file_type == "application/pdf":
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        for page in pdf_reader.pages:
            text += page.extract_text()
    elif file_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
        doc = docx.Document(io.BytesIO(file_content))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
    return text

@app.post("/api/process")
async def process_document(file: UploadFile = File(...), action: str = "summarize"):
    try:
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        text = extract_text_from_file(content, file.content_type)

        if action == "summarize":
            # Splits text into chunks
            max_chunk_length = 1024
            chunks = [text[i:i + max_chunk_length] for i in range(0, len(text), max_chunk_length)]
            
            # Summarize each chunk
            summaries = []
            for chunk in chunks:
                if len(chunk.strip()) > 100:  # Only summarize chunks with substantial content
                    summary = summarizer(chunk, max_length=130, min_length=30, do_sample=False)
                    summaries.append(summary[0]['summary_text'])
            
            # Combine summaries
            final_summary = " ".join(summaries)
            
            return {
                "success": True,
                "result": final_summary,
                "type": "summary",
                "message": "Document summarized successfully"
            }
        else:
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

@app.post("/api/text-to-speech")
async def api_text_to_speech(
    payload: dict = Body(...)
):
    try:
        text = payload.get("text")
        voice_type = payload.get("voice_type", "male")
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 