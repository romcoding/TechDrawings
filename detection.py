import os
import torch
from openai import OpenAI
import base64
import PyPDF2
from dotenv import load_dotenv
from pdf2image import convert_from_path
import tempfile
from PIL import Image
import io

# Load environment variables from .env file
load_dotenv()
OpenAI.api_key = os.getenv("OPENAI_API_KEY")
if not OpenAI.api_key:
    print("[ERROR] OPENAI_API_KEY is not set in the environment.")

# --- YOLOv5-based detection function --- #
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', trust_repo=True)

# A sample mapping for YOLOv5 detections (using COCO classes as a placeholder)
COCO_MAPPING = {
    0: 'person',
    1: 'bicycle',
    2: 'car',
    3: 'motorcycle',
    4: 'airplane',
    5: 'bus'
    # Extend mapping as needed.
}

def detect_components(image_path):
    """
    Uses YOLOv5 to detect objects from an image.
    Returns a dictionary with component counts.
    """
    print("[DEBUG] Starting YOLOv5 detection for image:", image_path)
    results = model(image_path)
    print("[DEBUG] YOLOv5 raw predictions:", results.pred)
    counts = {}
    if results.pred and len(results.pred[0]) > 0:
        for pred in results.pred[0]:
            cls = int(pred[5])
            component = COCO_MAPPING.get(cls, 'unknown')
            counts[component] = counts.get(component, 0) + 1
    else:
        print("[DEBUG] YOLOv5 did not detect any objects.")
    print("[DEBUG] YOLOv5 detection counts:", counts)
    return counts

# --- OpenAI API-based detection function updated for openai 1.73.0 --- #

def extract_text_from_pdf(file_path):
    """
    Extracts text from a PDF file using PyPDF2.
    Returns the extracted text.
    """
    text = ""
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                print(f"[DEBUG] Extracted text from page {i}: {page_text[:100]}...")
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print("[ERROR] Exception during PDF text extraction:", e)
    print("[DEBUG] Total extracted text length:", len(text))
    return text

def convert_pdf_to_image(pdf_path):
    """
    Convert the first page of a PDF to a JPEG image
    """
    try:
        # Convert PDF to image
        images = convert_from_path(pdf_path, first_page=1, last_page=1)
        if not images:
            print("[ERROR] No images extracted from PDF")
            return None
        
        # Convert PIL Image to bytes
        img_byte_arr = io.BytesIO()
        images[0].save(img_byte_arr, format='JPEG', quality=95)
        img_byte_arr = img_byte_arr.getvalue()
        
        # Save temporary file
        temp_dir = tempfile.gettempdir()
        temp_image_path = os.path.join(temp_dir, 'temp_drawing.jpg')
        with open(temp_image_path, 'wb') as f:
            f.write(img_byte_arr)
        
        return temp_image_path
    except Exception as e:
        print(f"[ERROR] Failed to convert PDF to image: {e}")
        return None

def encode_image_to_base64(image_path):
    """
    Encode image to base64 string for OpenAI Vision API
    """
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"[ERROR] Failed to encode image: {e}")
        return None

def openai_detect_components(file_path):
    client = OpenAI()
    """
    Uses the OpenAI Vision API to analyze a technical drawing document.
    Returns a dictionary of the extracted BOM with detailed information in separate columns.
    """
    print("[DEBUG] Reading file for OpenAI detection:", file_path)
    
    # Validate file size
    try:
        file_size = os.path.getsize(file_path)
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            print("[ERROR] File too large (max 10MB)")
            return {}
    except Exception as e:
        print("[ERROR] Failed to check file size:", e)
        return {}

    # Convert PDF to image if necessary
    image_path = file_path
    if file_path.lower().endswith('.pdf'):
        print("[DEBUG] Converting PDF to image")
        image_path = convert_pdf_to_image(file_path)
        if not image_path:
            return {}

    # Prepare the image for GPT-4 Vision API
    base64_image = encode_image_to_base64(image_path)
    if not base64_image:
        return {}

    # Clean up temporary image if it was created
    if image_path != file_path:
        try:
            os.remove(image_path)
        except:
            pass

    # Enhanced prompt with technical standards and detailed BOM structure
    prompt_text = """Analyze this technical drawing according to VDI 3814, ISO 16484, and ISO 14617 standards.
    Extract all components and their details in a structured format.

    For each component, identify:
    1. Component Name with its identifier (e.g., "Pump P1", "Valve V1")
    2. Quantity (count of identical components)
    3. Size/Dimensions (in metric units, e.g., DN32, 1000 L)
    4. Type (according to ISO standards)
    5. Signal Type (for control components)
    6. Rating/Capacity (power, pressure, flow rate)
    7. Material
    8. Reference Code (according to DIN EN 81346)
    9. Location/System
    10. Additional Specifications

    Pay special attention to:
    - Valves (Ball, Gate, Check, Control, Safety)
    - Pumps and Motors
    - Sensors and Instruments
    - Control System Components
    - Pipes and Fittings
    - Electrical Components

    Format the response in a structured table with these exact columns (separated by semicolons):
    Component;Quantity;Size;Type;Signal;Rating;Material;Reference;Location;Specifications

    Use standard technical abbreviations where appropriate.
    Include all visible components. Use semicolons to separate fields for better parsing.
    If multiple identical components exist, list them as one entry with the appropriate quantity."""

    try:
        response = client.chat.completions.create(
            model="o4-mini-2025-04-16",  # Using the latest model
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert in technical drawing analysis specializing in building automation "
                        "and control systems (BACS). You understand VDI 3814, ISO 16484, ISO 14617, and IEC 60617 standards. "
                        "Analyze the image and provide detailed component information in a structured table format. "
                        "Use semicolons as separators and ensure proper counting of identical components."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_completion_tokens=4096
        )
    except Exception as e:
        print("[ERROR] OpenAI API request failed:", e)
        return {}

    try:
        # Parse the response
        response_text = response.choices[0].message.content.strip()
        print("[DEBUG] OpenAI API returned response:", response_text)
        
        # Parse semicolon-separated text
        lines = response_text.splitlines()
        bom = {}
        
        # Skip header and process each line
        for line in lines[1:]:
            if not line.strip():
                continue
            try:
                parts = [p.strip() for p in line.split(';')]
                if len(parts) >= 10:  # Now expecting 10 columns
                    comp = parts[0]
                    # Create a structured component entry
                    bom[comp] = {
                        'quantity': int(parts[1]) if parts[1].isdigit() else 1,  # Default to 1 if not specified
                        'size': parts[2],
                        'type': parts[3],
                        'signal': parts[4],
                        'rating': parts[5],
                        'material': parts[6],
                        'reference': parts[7],
                        'location': parts[8],
                        'specifications': parts[9]
                    }
            except Exception as e:
                print(f"[DEBUG] Error parsing line '{line}': {e}")

        print("[DEBUG] Final parsed BOM:", bom)
        return bom
    except Exception as e:
        print("[ERROR] Failed to parse OpenAI response:", e)
        return {}
