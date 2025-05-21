import pyttsx3
import tempfile
import os

def text_to_speech(text, voice_type='male'):
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    engine.setProperty('rate', 100)
    engine.setProperty('volume', 1.0)
    if voice_type == 'female' and len(voices) > 1:
        engine.setProperty('voice', voices[1].id)
    else:
        engine.setProperty('voice', voices[0].id)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as fp:
        temp_path = fp.name
    engine.save_to_file(text, temp_path)
    engine.runAndWait()
    return temp_path 