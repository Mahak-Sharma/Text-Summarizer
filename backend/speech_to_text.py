import speech_recognition as sr
from transformers import pipeline
import tempfile
import os
from pydub import AudioSegment
from fastapi import UploadFile

# Initialize the speech recognizer
recognizer = sr.Recognizer()

# Initialize the summarizer with more detailed parameters
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device=0 if os.environ.get("CUDA_VISIBLE_DEVICES") else -1
)

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

def generate_summary(text):
    """
    Generate a more detailed summary from the transcribed text
    """
    try:
        # Split text into chunks if it's too long
        max_chunk_length = 1024
        chunks = [text[i:i + max_chunk_length] for i in range(0, len(text), max_chunk_length)]
        
        # Summarize each chunk with more detailed parameters
        summaries = []
        for chunk in chunks:
            if len(chunk.strip()) > 100:  # Only summarize chunks with substantial content
                summary = summarizer(
                    chunk,
                    max_length=200,  # Increased from 130
                    min_length=50,   # Increased from 30
                    do_sample=False,
                    num_beams=4,     # Added for better quality
                    length_penalty=2.0,  # Added to encourage longer summaries
                    early_stopping=True
                )
                summaries.append(summary[0]['summary_text'])
        
        # Combine summaries with better formatting
        final_summary = " ".join(summaries)
        
        # If the text is long enough, generate a final overall summary
        if len(final_summary) > 500:
            overall_summary = summarizer(
                final_summary,
                max_length=150,
                min_length=50,
                do_sample=False,
                num_beams=4,
                length_penalty=2.0,
                early_stopping=True
            )
            return {
                "detailed_summary": final_summary,
                "overall_summary": overall_summary[0]['summary_text']
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

def process_audio_file(audio_file: UploadFile):
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
            summary_result = generate_summary(transcribed_text)
            
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