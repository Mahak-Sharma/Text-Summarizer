import speech_recognition as sr
import tempfile
import os
import re
from pydub import AudioSegment
from fastapi import UploadFile

# Initialize the speech recognizer
recognizer = sr.Recognizer()

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

def convert_to_wav(input_path, output_path):
    """
    Convert audio file to WAV format
    """
    try:
        # Load the audio file
        audio = AudioSegment.from_file(input_path)
        # Export as WAV
        audio.export(output_path, format="wav")
        return True
    except Exception as e:
        print(f"Error converting audio: {str(e)}")
        return False

def speech_to_text(audio_file_path):
    """
    Convert speech from audio file to text
    """
    try:
        with sr.AudioFile(audio_file_path) as source:
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source)
            # Record the audio
            audio = recognizer.record(source)
            # Convert speech to text
            text = recognizer.recognize_google(audio)
            return text
    except sr.UnknownValueError:
        return "Speech Recognition could not understand the audio"
    except sr.RequestError as e:
        return f"Could not request results from Speech Recognition service; {e}"

def generate_summary(text, summarizer):
    """
    Generate a high-quality summary from the transcribed text
    """
    try:
        # Clean the text
        text = clean_text(text)
        
        # If text is too short, return as is
        if len(text.split()) < 50:
            return {
                "detailed_summary": text,
                "overall_summary": text
            }
        
        # Split into smart chunks
        chunks = smart_chunk_text(text, max_length=1024)
        
        summaries = []
        
        for chunk in chunks:
            if len(chunk.strip()) > 100:  # Only summarize substantial chunks
                try:
                    # Use better parameters for summarization
                    summary = summarizer(
                        chunk,
                        max_length=200,  
                        min_length=50,   
                        do_sample=False,  
                        num_beams=4,     
                        length_penalty=2.0,  
                        early_stopping=True,
                        no_repeat_ngram_size=3  
                    )
                    summaries.append(summary[0]['summary_text'])
                except Exception as e:
                    print(f"Error summarizing chunk: {e}")
                    # If summarization fails, use the chunk as is
                    summaries.append(chunk[:200] + "..." if len(chunk) > 200 else chunk)
        
        # Combine summaries
        final_summary = " ".join(summaries)
        
        # If the combined summary is still too long, create a final overall summary
        if len(final_summary.split()) > 300:
            try:
                overall_summary = summarizer(
                    final_summary,
                    max_length=150,
                    min_length=50,
                    do_sample=False,
                    num_beams=4,
                    length_penalty=2.0,
                    early_stopping=True,
                    no_repeat_ngram_size=3
                )
                return {
                    "detailed_summary": final_summary,
                    "overall_summary": overall_summary[0]['summary_text']
                }
            except Exception as e:
                print(f"Error creating final summary: {e}")
                # If final summarization fails, truncate for overall summary
                overall_summary = final_summary[:300] + "..." if len(final_summary) > 300 else final_summary
                return {
                    "detailed_summary": final_summary,
                    "overall_summary": overall_summary
                }
        
        return {
            "detailed_summary": final_summary,
            "overall_summary": final_summary
        }
    except Exception as e:
        return {
            "detailed_summary": f"Error generating summary: {str(e)}",
            "overall_summary": f"Error generating summary: {str(e)}"
        }

def process_audio_file(audio_file: UploadFile, summarizer):
    """
    Process audio file and generate summary
    """
    try:
        # Read the file content
        file_content = audio_file.file.read()
        
        # Create temporary files for input and output
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as temp_input:
            temp_input.write(file_content)
            temp_input_path = temp_input.name

        temp_output_path = temp_input_path + '.wav'
        
        try:
            # Convert to WAV if needed
            if not temp_input_path.lower().endswith('.wav'):
                if not convert_to_wav(temp_input_path, temp_output_path):
                    raise Exception("Failed to convert audio to WAV format")
                os.unlink(temp_input_path)  # Remove the original file
                audio_path = temp_output_path
            else:
                audio_path = temp_input_path

            # Convert speech to text
            transcribed_text = speech_to_text(audio_path)
            
            if transcribed_text == "Speech Recognition could not understand the audio":
                return {
                    "success": False,
                    "transcribed_text": None,
                    "summary": None,
                    "overall_summary": None,
                    "message": "Could not understand the audio. Please try again with clearer audio."
                }
            
            # Generate summary
            summary_result = generate_summary(transcribed_text, summarizer)
            
            return {
                "success": True,
                "transcribed_text": transcribed_text,
                "summary": summary_result["detailed_summary"],
                "overall_summary": summary_result["overall_summary"],
                "message": "Audio processed successfully"
            }
        finally:
            # Clean up temporary files
            if os.path.exists(temp_input_path):
                os.unlink(temp_input_path)
            if os.path.exists(temp_output_path):
                os.unlink(temp_output_path)
                
    except Exception as e:
        return {
            "success": False,
            "transcribed_text": None,
            "summary": None,
            "overall_summary": None,
            "message": f"Error processing audio: {str(e)}"
        } 