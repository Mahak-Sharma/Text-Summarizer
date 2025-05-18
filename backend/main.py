from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from transformers import pipeline
from gtts import gTTS
import os
import io
import docx
import PyPDF2

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the summarization pipeline
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
    """
    Endpoint to process uploaded documents
    Supports: summarization and text-to-speech
    """
    try:
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        text = extract_text_from_file(content, file.content_type)

        if action == "summarize":
            # Split text into chunks if it's too long (BART has a max input length)
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
        
        elif action == "text-to-speech":
            try:
                # Create temporary file
                temp_file = "temp_audio.mp3"
                tts = gTTS(text=text, lang='en')
                tts.save(temp_file)
                
                # Read the file content
                with open(temp_file, "rb") as audio_file:
                    audio_content = audio_file.read()
                
                # Clean up the temporary file
                os.remove(temp_file)
                
                # Return audio with proper headers
                return Response(
                    content=audio_content,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Type": "audio/mpeg",
                        "Content-Length": str(len(audio_content))
                    }
                )
            except Exception as e:
                return {
                    "success": False,
                    "result": None,
                    "type": None,
                    "message": f"Error creating text-to-speech: {str(e)}"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 