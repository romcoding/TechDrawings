import os
# import torch  # Commented out to reduce memory usage
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

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    print("[ERROR] OPENAI_API_KEY is not set in the environment.")

# --- YOLOv5-based detection function --- #
# model = torch.hub.load('ultralytics/yolov5', 'yolov5s', trust_repo=True)
# COCO_MAPPING = { ... }
# def detect_components(image_path):
#     ...
#     return counts

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
    """
    Uses the OpenAI GPT-5 Vision API to analyze a technical drawing document.
    Returns a dictionary of the extracted BOM with detailed information in separate columns.
    """
    print("[DEBUG] Reading file for OpenAI detection:", file_path)
    
    # Validate file size
    try:
        file_size = os.path.getsize(file_path)
        if file_size > 20 * 1024 * 1024:  # Increased to 20MB limit for GPT-5
            print("[ERROR] File too large (max 20MB)")
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

    # Prepare the image for GPT-5 Vision API
    base64_image = encode_image_to_base64(image_path)
    if not base64_image:
        return {}

    # Clean up temporary image if it was created
    if image_path != file_path:
        try:
            os.remove(image_path)
        except:
            pass

    # Enhanced prompt optimized for GPT-5
    prompt_text = """Analyze this technical drawing with expert precision according to international engineering standards (VDI 3814, ISO 16484, ISO 14617, IEC 60617).

    Extract ALL visible components and create a comprehensive Bill of Materials (BOM) with the following structure:

    For each component, identify and categorize:
    1. Component Name & Identifier (e.g., "Pump P1", "Valve V1", "Sensor S1")
    2. Quantity (count of identical components)
    3. Size/Dimensions (in metric units, e.g., DN32, 1000 L, 100 kW)
    4. Component Type (according to ISO standards)
    5. Signal Type (for control/automation components)
    6. Rating/Capacity (power, pressure, flow rate, voltage, etc.)
    7. Material Specification
    8. Reference Code (according to DIN EN 81346)
    9. System Location/Zone
    10. Technical Specifications & Notes

    Pay special attention to:
    - Control Valves (Ball, Gate, Check, Control, Safety, Solenoid)
    - Pumps, Motors, and Drives
    - Sensors and Measurement Instruments
    - Control System Components (PLCs, DCS, SCADA)
    - Pipes, Fittings, and Supports
    - Electrical Components and Wiring
    - HVAC Equipment
    - Safety and Emergency Systems

    Format the response as a structured table with these exact columns (separated by semicolons):
    Component;Quantity;Size;Type;Signal;Rating;Material;Reference;Location;Specifications

    Use standard technical abbreviations and ensure accurate counting of identical components.
    Include ALL visible components - be thorough and systematic in your analysis."""

    try:
        response = client.chat.completions.create(
            model="gpt-5o-mini",  # Using GPT-5 for superior technical analysis
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert engineering analyst specializing in technical drawing interpretation "
                        "for building automation, control systems (BACS), and industrial applications. "
                        "You have deep knowledge of VDI 3814, ISO 16484, ISO 14617, IEC 60617, and DIN EN 81346 standards. "
                        "Your analysis is precise, thorough, and follows engineering best practices. "
                        "Always provide structured, semicolon-separated output for optimal parsing."
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
            max_tokens=4096,
            temperature=0.1  # Low temperature for consistent, precise analysis
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
                if len(parts) >= 10:  # Expecting 10 columns
                    comp = parts[0]
                    # Create a structured component entry
                    bom[comp] = {
                        'quantity': int(parts[1]) if parts[1].isdigit() else 1,
                        'size': parts[2],
                        'type': parts[3],
                        'signal': parts[4],
                        'rating': parts[5],
                        'material': parts[6],
                        'reference': parts[7],
                        'location': parts[8],
                        'specifications': parts[9]
                    }
                elif len(parts) >= 5:  # Handle cases with fewer columns
                    comp = parts[0]
                    bom[comp] = {
                        'quantity': int(parts[1]) if parts[1].isdigit() else 1,
                        'size': parts[2] if len(parts) > 2 else '',
                        'type': parts[3] if len(parts) > 3 else '',
                        'signal': parts[4] if len(parts) > 4 else '',
                        'rating': parts[5] if len(parts) > 5 else '',
                        'material': parts[6] if len(parts) > 6 else '',
                        'reference': parts[7] if len(parts) > 7 else '',
                        'location': parts[8] if len(parts) > 8 else '',
                        'specifications': parts[9] if len(parts) > 9 else ''
                    }
            except Exception as e:
                print(f"[DEBUG] Error parsing line '{line}': {e}")

        print("[DEBUG] Final parsed BOM:", bom)
        return bom
    except Exception as e:
        print("[ERROR] Failed to parse OpenAI response:", e)
        return {}
