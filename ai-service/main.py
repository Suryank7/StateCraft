from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from agents.state_generator import generate_state_machine
from agents.visual_generator import generate_ui_thumbnail

load_dotenv()

app = FastAPI(title="StateCraft AI Service")

# Allow requests from the Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str

@app.post("/generate-state")
async def api_generate_state(req: PromptRequest):
    """
    Uses DeepSeek / Llama to interpret the prompt and generate 
    a strictly formatted JSON abstract syntax tree of the state machine.
    """
    try:
        result = await generate_state_machine(req.prompt)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-visual")
async def api_generate_visual(req: PromptRequest):
    """
    Uses Stable Diffusion 1.5 to generate an aesthetic conceptual thumbnail 
    or wireframe representation of the given state workflow.
    """
    try:
        image_url = await generate_ui_thumbnail(req.prompt)
        return {"status": "success", "image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run on 8000, which the Node backend proxies to.
    uvicorn.run(app, host="127.0.0.1", port=8000)
