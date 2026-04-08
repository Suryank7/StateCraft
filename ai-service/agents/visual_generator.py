import os
import requests
import base64
from io import BytesIO

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5"

async def generate_ui_thumbnail(prompt: str) -> str:
    """
    Generates a UI Wireframe via Stable Diffusion 1.5 based on the user's description.
    Returns a base64 encoded data URI of the image.
    """
    if not HF_TOKEN:
        print("⚠️ No HF_TOKEN found. Generating a mock visual.")
        return _mock_visual()

    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    # Enhance prompt for UI Generation
    enhanced_prompt = f"Modern aesthetic UI wireframe, dribbble style frontend interface, glassmorphism SaaS dashboard for: {prompt}. high quality, clean layout, ui/ux."
    
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": enhanced_prompt})
        response.raise_for_status()
        
        # HuggingFace returns the raw image bytes for SD 1.5
        image_bytes = response.content
        base64_img = base64.b64encode(image_bytes).decode('utf-8')
        return f"data:image/jpeg;base64,{base64_img}"
    except Exception as e:
        print(f"❌ Failed to reach Stable Diffusion API. Error: {e}")
        return _mock_visual()

def _mock_visual() -> str:
    # A placeholder transparent base64 pixel or SVG mock string
    # We will return a simple SVG data URI as fallback
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#0f172a"/>
      <rect x="50" y="50" width="300" height="20" rx="4" fill="#1e293b"/>
      <rect x="50" y="80" width="100" height="150" rx="4" fill="#1e293b"/>
      <rect x="160" y="80" width="190" height="150" rx="4" fill="#1e293b"/>
      <text x="200" y="150" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="middle">AI Visual Placeholder</text>
    </svg>'''
    encoded = base64.b64encode(svg.encode('utf-8')).decode('utf-8')
    return f"data:image/svg+xml;base64,{encoded}"
