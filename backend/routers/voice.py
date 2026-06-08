from fastapi import APIRouter, File, UploadFile, HTTPException
from groq import Groq
import os

router = APIRouter(prefix="/api/voice", tags=["voice"])
_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio vacío")
    try:
        filename = audio.filename or "audio.webm"
        transcription = _client.audio.transcriptions.create(
            file=(filename, content),
            model="whisper-large-v3-turbo",
            language="es",
            response_format="text",
        )
        return {"text": transcription}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcripción fallida: {str(e)}")
