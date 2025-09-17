#!/usr/bin/env python3
"""
High-accuracy Python speech recognition and TTS service for OPSIS
Provides superior voice control compared to browser Web Speech API
"""

import asyncio
import io
import json
import tempfile
import threading
import time
import wave
from typing import Dict, List, Optional, Union
import re

# Core speech libraries
import speech_recognition as sr
import pyttsx3
from gtts import gTTS
import pygame

# Web framework
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Audio processing
import base64

app = FastAPI(title="OPSIS Speech Service", version="1.0.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global speech recognition instance
recognizer = sr.Recognizer()

# Global TTS engine
tts_engine = None
tts_lock = threading.Lock()

def init_tts_engine():
    """Initialize the TTS engine with optimal settings"""
    global tts_engine
    with tts_lock:
        if tts_engine is None:
            try:
                print("🔊 Initializing TTS engine...")
                tts_engine = pyttsx3.init()
                
                # Configure voice settings for accessibility
                try:
                    voices = tts_engine.getProperty('voices')
                    if voices and len(voices) > 0:
                        # Prefer female voice if available (often clearer for accessibility)
                        female_voice_found = False
                        for voice in voices:
                            if hasattr(voice, 'name') and voice.name:
                                if 'female' in voice.name.lower() or 'woman' in voice.name.lower():
                                    tts_engine.setProperty('voice', voice.id)
                                    female_voice_found = True
                                    print(f"🎙️ Using female voice: {voice.name}")
                                    break
                        
                        if not female_voice_found:
                            # Use first available voice
                            tts_engine.setProperty('voice', voices[0].id)
                            print(f"🎙️ Using default voice: {voices[0].name if hasattr(voices[0], 'name') else 'Default'}")
                    else:
                        print("⚠️ No voices found, using system default")
                except Exception as e:
                    print(f"⚠️ Warning: Could not configure voice: {e}")
                
                # Set optimal speech rate (150-200 WPM is optimal for accessibility)
                try:
                    tts_engine.setProperty('rate', 180)
                    tts_engine.setProperty('volume', 1.0)
                    print("✅ TTS engine configured successfully")
                except Exception as e:
                    print(f"⚠️ Warning: Could not set TTS properties: {e}")
                    
            except Exception as e:
                print(f"❌ Failed to initialize TTS engine: {e}")
                tts_engine = None

# Initialize TTS engine on startup
init_tts_engine()

# Initialize pygame mixer for audio playback
pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)

class VoiceCommandProcessor:
    """Enhanced voice command processing with natural language understanding"""
    
    def __init__(self):
        self.command_patterns = {
            # Navigation commands with extensive variations
            'navigation': {
                'home': [
                    r'\b(go|navigate|take me|show me)\s*(to\s*)?(home|dashboard|main page|main menu)\b',
                    r'^(home|dashboard|main)$',
                    r'\b(back to home|return home|go back)\b'
                ],
                'exams': [
                    r'\b(go|navigate|take me|show me)\s*(to\s*)?(exams?|exam list|test list|available exams|quiz list)\b',
                    r'^(exams?|tests?|quiz|quizzes)$',
                    r'\b(show.*exams?|list.*exams?|view.*exams?)\b'
                ],
                'results': [
                    r'\b(go|navigate|take me|show me)\s*(to\s*)?(results?|scores?|grades?|my results|my scores)\b',
                    r'^(results?|scores?|grades?)$',
                    r'\b(show.*results?|view.*scores?|check.*grades?)\b'
                ],
                'settings': [
                    r'\b(go|navigate|take me|show me)\s*(to\s*)?(settings?|accessibility|preferences|options|config)\b',
                    r'^(settings?|accessibility|preferences|options|config)$',
                    r'\b(open.*settings?|access.*settings?)\b'
                ],
                'help': [
                    r'\b(help|voice commands|commands|instructions|guide|tutorial)\b',
                    r'^(help|commands)$',
                    r'\b(show.*help|voice.*help|command.*list)\b'
                ],
                'admin': [
                    r'\b(go|navigate|take me|show me)\s*(to\s*)?(admin|administration|admin panel|management)\b',
                    r'^(admin|administration)$'
                ]
            },
            
            # Exam navigation commands
            'exam_navigation': {
                'next': [
                    r'\b(next|forward|advance|move ahead|go forward|skip|proceed)\b.*question',
                    r'^(next|forward|advance|proceed)$',
                    r'\b(next one|move on|continue)\b'
                ],
                'previous': [
                    r'\b(previous|back|go back|move back|prior|earlier|last|before)\b.*question',
                    r'^(back|previous|prior)$',
                    r'\b(go back|step back|move back)\b'
                ],
                'first': [
                    r'\b(first|beginning|start|initial)\b.*question',
                    r'^(first|start|beginning)$',
                    r'\b(go to start|back to first)\b'
                ],
                'last': [
                    r'\b(last|final|end)\b.*question',
                    r'^(last|end|final)$',
                    r'\b(go to end|final question)\b'
                ],
                'goto': [
                    r'\b(go to|jump to|navigate to|show me)\b.*\b(question|number|item)\s*(\d+)',
                    r'^\b(question|number)\s*(\d+)$',
                    r'\b(question|item|number)\s*(\d+)\b'
                ]
            },
            
            # Answer selection commands with phonetic alphabet support
            'answer_selection': {
                'option_a': [
                    r'\b(option|choice|select|choose|pick)\s*[Aa]\b',
                    r'^[Aa]$',
                    r'\b(alpha|alfa)\b',
                    r'\b(letter\s*[Aa]|option\s*[Aa])\b'
                ],
                'option_b': [
                    r'\b(option|choice|select|choose|pick)\s*[Bb]\b',
                    r'^[Bb]$',
                    r'\b(bravo|beta)\b',
                    r'\b(letter\s*[Bb]|option\s*[Bb])\b'
                ],
                'option_c': [
                    r'\b(option|choice|select|choose|pick)\s*[Cc]\b',
                    r'^[Cc]$',
                    r'\b(charlie|gamma)\b',
                    r'\b(letter\s*[Cc]|option\s*[Cc])\b'
                ],
                'option_d': [
                    r'\b(option|choice|select|choose|pick)\s*[Dd]\b',
                    r'^[Dd]$',
                    r'\b(delta)\b',
                    r'\b(letter\s*[Dd]|option\s*[Dd])\b'
                ],
                'option_e': [
                    r'\b(option|choice|select|choose|pick)\s*[Ee]\b',
                    r'^[Ee]$',
                    r'\b(echo|epsilon)\b',
                    r'\b(letter\s*[Ee]|option\s*[Ee])\b'
                ],
                'true': [
                    r'\b(true|yes|correct|right|affirmative)\b',
                    r'^(true|yes|t)$',
                    r'\b(answer.*true|select.*true|choose.*true)\b'
                ],
                'false': [
                    r'\b(false|no|incorrect|wrong|negative)\b',
                    r'^(false|no|f)$',
                    r'\b(answer.*false|select.*false|choose.*false)\b'
                ]
            },
            
            # Action commands
            'actions': {
                'save': [
                    r'\b(save|store|record|keep)\b.*answer',
                    r'^(save|store)$',
                    r'\b(save.*answer|save.*response|record.*answer)\b'
                ],
                'submit': [
                    r'\b(submit|finish|complete|turn in|hand in)\b.*exam',
                    r'^(submit|finish|complete|done)$',
                    r'\b(submit.*exam|finish.*exam|turn.*in)\b'
                ],
                'flag': [
                    r'\b(flag|mark|bookmark|tag)\b.*question',
                    r'^(flag|mark)$',
                    r'\b(flag.*question|mark.*question|bookmark.*question)\b'
                ],
                'unflag': [
                    r'\b(unflag|unmark|remove.*flag|clear.*flag)\b',
                    r'^(unflag|unmark)$',
                    r'\b(remove.*mark|clear.*mark)\b'
                ],
                'clear': [
                    r'\b(clear|delete|remove|erase)\b.*answer',
                    r'^(clear|delete|remove)$',
                    r'\b(clear.*answer|delete.*answer|remove.*answer)\b'
                ]
            },
            
            # Reading commands
            'reading': {
                'read_question': [
                    r'\b(read|speak|say)\b.*question',
                    r'^(read|speak)$',
                    r'\b(read.*question|speak.*question|say.*question)\b'
                ],
                'read_options': [
                    r'\b(read|speak|say)\b.*(options?|choices?|answers?)',
                    r'^(options?|choices?)$',
                    r'\b(read.*options?|speak.*options?|list.*options?)\b'
                ],
                'read_page': [
                    r'\b(read|speak)\s+(page|content|text|everything)\b',
                    r'^(read page|speak page)$',
                    r'\b(read.*page|speak.*page|read.*all)\b'
                ],
                'stop_reading': [
                    r'\b(stop|cancel|halt|pause)\s+(reading|speaking)\b',
                    r'^(stop|cancel|halt|pause)$',
                    r'\b(stop.*reading|stop.*speaking|cancel.*reading)\b'
                ],
                'repeat': [
                    r'\b(repeat|again|say again|read again)\b',
                    r'^(repeat|again)$',
                    r'\b(say.*again|read.*again|repeat.*that)\b'
                ]
            },
            
            # Accessibility commands
            'accessibility': {
                'increase_font': [
                    r'\b(increase|bigger|larger|zoom in)\b.*font',
                    r'^(bigger|larger|zoom in)$',
                    r'\b(make.*bigger|increase.*size|larger.*text)\b'
                ],
                'decrease_font': [
                    r'\b(decrease|smaller|reduce|zoom out)\b.*font',
                    r'^(smaller|reduce|zoom out)$',
                    r'\b(make.*smaller|decrease.*size|smaller.*text)\b'
                ],
                'reset_font': [
                    r'\b(reset|normal|default)\b.*font',
                    r'^(reset|normal|default)$',
                    r'\b(reset.*size|normal.*size|default.*font)\b'
                ],
                'change_theme': [
                    r'\b(change|switch|cycle|toggle)\s+(theme|color|appearance|mode)\b',
                    r'^(change theme|switch theme|dark mode|light mode)$',
                    r'\b(dark.*mode|light.*mode|high.*contrast)\b'
                ]
            },
            
            # Status inquiry commands
            'status': {
                'time': [
                    r'\b(time|timer|remaining|left|how long|how much time)\b',
                    r'^(time|timer)$',
                    r'\b(time.*remaining|time.*left|minutes.*left)\b'
                ],
                'progress': [
                    r'\b(progress|status|how many|completion|percentage)\b',
                    r'^(progress|status)$',
                    r'\b(how.*far|completion.*rate|progress.*bar)\b'
                ],
                'current_question': [
                    r'\b(current|this|which)\b.*question',
                    r'^(current|which)$',
                    r'\b(current.*question|this.*question|question.*number)\b'
                ],
                'total_questions': [
                    r'\b(total|how many|all)\b.*questions?',
                    r'^(total|how many)$',
                    r'\b(total.*questions?|number.*questions?|all.*questions?)\b'
                ],
                'answered': [
                    r'\b(answered|completed|done)\b.*questions?',
                    r'^(answered|completed)$',
                    r'\b(how.*answered|how.*completed|questions?.*done)\b'
                ],
                'flagged': [
                    r'\b(flagged|marked|bookmarked)\b.*questions?',
                    r'^(flagged|marked)$',
                    r'\b(how.*flagged|how.*marked|flagged.*questions?)\b'
                ]
            }
        }
    
    def process_command(self, text: str) -> Dict:
        """Process voice command with enhanced natural language understanding"""
        if not text:
            return {'type': 'unknown', 'action': None, 'confidence': 0}
        
        # Normalize the text
        normalized = text.lower().strip()
        
        # Remove common filler words
        clean_text = re.sub(r'\b(uh|um|er|ah|like|you know|well|so|actually|basically|please|now|can you|could you|i want to|i would like to|go ahead and|let me|let\'s|okay|alright)\b', '', normalized).strip()
        
        # Remove extra whitespace
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        if not clean_text:
            return {'type': 'unknown', 'action': None, 'confidence': 0}
        
        # Search through all command categories
        for category, commands in self.command_patterns.items():
            for action, patterns in commands.items():
                for pattern in patterns:
                    if re.search(pattern, clean_text, re.IGNORECASE):
                        result = {'type': category, 'action': action, 'confidence': 0.9}
                        
                        # Extract additional information for specific commands
                        if action == 'goto':
                            # Extract question number
                            match = re.search(r'\b(question|number|item)\s*(\d+)', clean_text)
                            if match:
                                result['value'] = int(match.group(2))
                        
                        return result
        
        # If no exact match, try fuzzy matching and suggestions
        suggestions = self._get_command_suggestions(clean_text)
        return {
            'type': 'unknown',
            'action': None,
            'confidence': 0,
            'suggestions': suggestions,
            'original_text': text,
            'normalized_text': clean_text
        }
    
    def _get_command_suggestions(self, text: str) -> List[str]:
        """Get command suggestions for unrecognized input"""
        suggestions = []
        
        # Navigation suggestions
        if re.search(r'\b(go|navigate|show|take|move)\b', text):
            suggestions.append('Try: "go to exams", "go home", "go to results", or "help"')
        
        # Action suggestions
        if re.search(r'\b(do|make|perform|execute)\b', text) and not re.search(r'\b(submit|save|flag|clear)\b', text):
            suggestions.append('Try: "submit exam", "save answer", "flag question", or "clear answer"')
        
        # Reading suggestions
        if re.search(r'\b(read|speak|say|tell)\b', text) and not re.search(r'\b(question|option|page)\b', text):
            suggestions.append('Try: "read question", "read options", "read page", or "stop reading"')
        
        # Answer suggestions
        if re.search(r'\b(answer|choose|select|pick)\b', text) and not re.search(r'\b[a-eA-E]|true|false\b', text):
            suggestions.append('Try: "option A", "option B", "true", "false", or use phonetic alphabet like "alpha", "bravo"')
        
        return suggestions[:2]  # Limit to 2 suggestions

# Global command processor
command_processor = VoiceCommandProcessor()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "OPSIS Speech Service"}

@app.post("/api/speech/recognize")
async def recognize_speech(audio_file: UploadFile = File(...)):
    """
    Advanced speech recognition with multiple engine fallback
    Supports various audio formats and provides high accuracy
    """
    try:
        # Read the uploaded audio file
        audio_data = await audio_file.read()
        
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name
        
        # Try multiple recognition engines for best accuracy
        recognition_results = []
        
        try:
            # Primary: Google Speech Recognition (most accurate)
            with sr.AudioFile(tmp_file_path) as source:
                audio = recognizer.record(source)
                # Use getattr to avoid type checking issues
                recognize_func = getattr(recognizer, 'recognize_google', None)
                if recognize_func:
                    text = recognize_func(audio, language='en-US')
                    recognition_results.append({
                        'engine': 'google',
                        'text': text,
                        'confidence': 0.95
                    })
        except Exception as e:
            print(f"Google recognition failed: {e}")
        
        try:
            # Fallback: Sphinx (offline)
            with sr.AudioFile(tmp_file_path) as source:
                audio = recognizer.record(source)
                # Use getattr to avoid type checking issues
                recognize_func = getattr(recognizer, 'recognize_sphinx', None)
                if recognize_func:
                    text = recognize_func(audio)
                    recognition_results.append({
                        'engine': 'sphinx',
                        'text': text,
                        'confidence': 0.7
                    })
        except Exception as e:
            print(f"Sphinx recognition failed: {e}")
        
        # Clean up temporary file
        import os
        os.unlink(tmp_file_path)
        
        if not recognition_results:
            raise HTTPException(status_code=400, detail="Speech recognition failed")
        
        # Use the best result (highest confidence)
        best_result = max(recognition_results, key=lambda x: x['confidence'])
        recognized_text = best_result['text']
        
        # Process the command
        command_result = command_processor.process_command(recognized_text)
        
        return {
            'success': True,
            'text': recognized_text,
            'engine': best_result['engine'],
            'confidence': best_result['confidence'],
            'command': command_result,
            'all_results': recognition_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech recognition error: {str(e)}")

@app.post("/api/speech/synthesize")
async def synthesize_speech(request: Dict):
    """
    High-quality text-to-speech synthesis
    Supports multiple voices, speeds, and output formats
    """
    try:
        text = request.get('text', '')
        voice_engine = request.get('engine', 'pyttsx3')  # 'pyttsx3' or 'gtts'
        rate = request.get('rate', 180)  # Words per minute
        voice_id = request.get('voice_id', None)
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        if voice_engine == 'gtts':
            # Use Google Text-to-Speech for high quality
            tts = gTTS(text=text, lang='en', slow=False)
            
            # Create audio buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            return StreamingResponse(
                io.BytesIO(audio_buffer.read()),
                media_type="audio/mpeg",
                headers={"Content-Disposition": "attachment; filename=speech.mp3"}
            )
        
        else:
            # Use pyttsx3 for local TTS with more control
            with tts_lock:
                init_tts_engine()
                
                if tts_engine is None:
                    raise HTTPException(status_code=500, detail="TTS engine not available")
                
                try:
                    # Configure voice settings
                    if voice_id and hasattr(tts_engine, 'setProperty'):
                        tts_engine.setProperty('voice', voice_id)
                    
                    if hasattr(tts_engine, 'setProperty'):
                        tts_engine.setProperty('rate', rate)
                    
                    # Create temporary file for audio output
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                        tmp_file_path = tmp_file.name
                    
                    # Save speech to file
                    if hasattr(tts_engine, 'save_to_file') and hasattr(tts_engine, 'runAndWait'):
                        tts_engine.save_to_file(text, tmp_file_path)
                        tts_engine.runAndWait()
                        
                        # Read the generated audio file
                        with open(tmp_file_path, 'rb') as f:
                            audio_data = f.read()
                        
                        # Clean up
                        import os
                        os.unlink(tmp_file_path)
                        
                        return StreamingResponse(
                            io.BytesIO(audio_data),
                            media_type="audio/wav",
                            headers={"Content-Disposition": "attachment; filename=speech.wav"}
                        )
                    else:
                        raise HTTPException(status_code=500, detail="TTS engine methods not available")
                        
                except Exception as e:
                    print(f"pyttsx3 TTS failed: {e}")
                    raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

@app.get("/api/speech/voices")
async def get_available_voices():
    """Get list of available TTS voices"""
    try:
        with tts_lock:
            init_tts_engine()
            
            if tts_engine is None:
                # Return fallback voices if TTS engine is not available
                return {
                    'success': True,
                    'voices': [
                        {
                            'id': 'gtts-default',
                            'name': 'Google TTS Default',
                            'languages': ['en'],
                            'gender': 'neutral',
                            'age': 'adult'
                        }
                    ],
                    'default_rate': 180,
                    'supported_engines': ['gtts']
                }
            
            voices = None
            if hasattr(tts_engine, 'getProperty'):
                voices = tts_engine.getProperty('voices')
            
            voice_list = []
            if voices and len(voices) > 0:
                for voice in voices:
                    voice_list.append({
                        'id': getattr(voice, 'id', 'unknown'),
                        'name': getattr(voice, 'name', 'Unknown Voice'),
                        'languages': getattr(voice, 'languages', ['en']),
                        'gender': getattr(voice, 'gender', 'unknown'),
                        'age': getattr(voice, 'age', 'unknown')
                    })
            else:
                # Add default voice if no voices found
                voice_list.append({
                    'id': 'default',
                    'name': 'System Default',
                    'languages': ['en'],
                    'gender': 'unknown',
                    'age': 'unknown'
                })
            
            return {
                'success': True,
                'voices': voice_list,
                'default_rate': 180,
                'supported_engines': ['pyttsx3', 'gtts']
            }
    
    except Exception as e:
        print(f"Error getting voices: {e}")
        # Return minimal fallback
        return {
            'success': True,
            'voices': [
                {
                    'id': 'fallback',
                    'name': 'Fallback Voice',
                    'languages': ['en'],
                    'gender': 'neutral',
                    'age': 'adult'
                }
            ],
            'default_rate': 180,
            'supported_engines': ['gtts']
        }

@app.post("/api/speech/process-command")
async def process_voice_command(request: Dict):
    """Process voice command text and return structured command"""
    try:
        text = request.get('text', '')
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        command_result = command_processor.process_command(text)
        
        return {
            'success': True,
            'command': command_result,
            'original_text': text
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Command processing error: {str(e)}")

if __name__ == "__main__":
    print("🎙️ Starting OPSIS Speech Service...")
    print("🔊 TTS Engine initialized")
    print("🎤 Speech Recognition ready")
    print("📞 API endpoints:")
    print("   - POST /api/speech/recognize - Speech to text")
    print("   - POST /api/speech/synthesize - Text to speech")
    print("   - GET  /api/speech/voices - Available voices")
    print("   - POST /api/speech/process-command - Process commands")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)