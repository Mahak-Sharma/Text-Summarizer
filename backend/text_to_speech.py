from gtts import gTTS
import tempfile
import os
import logging
from uuid import uuid4

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def text_to_speech(text, voice_type=""):
    try:
        # Generate unique temp file path
        temp_dir = os.getenv("TEMP_DIR", "/tmp/audio_files")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"{uuid4().hex}.mp3")

        # Generate TTS audio using gTTS
        tts = gTTS(text=text, lang="en")
        tts.save(temp_path)

        # Verify file exists
        if not os.path.exists(temp_path):
            raise Exception("Failed to create audio file")

        return temp_path

    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        raise Exception(f"Failed to convert text to speech: {str(e)}")