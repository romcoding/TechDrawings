import os
import torch
from openai import OpenAI
import base64
import PyPDF2
from dotenv import load_dotenv

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

def openai_detect_components(file_path):
    client = OpenAI()
    """
    Uses the OpenAI API to analyze a technical drawing document.
    Returns a dictionary of the extracted BOM.
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
    
    # First try to extract text from the file
    text = ""
    if file_path.lower().endswith('.pdf'):
        text = extract_text_from_pdf(file_path)
    else:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    text = f.read()
            except Exception as e:
                print("[ERROR] Failed to read file:", e)
                return {}

    if not text:
        print("[ERROR] No text could be extracted from the file")
        return {}

    # Enhanced prompt for better component identification
    prompt_text = (
        "You are an expert in technical drawing analysis and Bill of Materials (BOM) extraction. "
        "Your task is to analyze the following technical document and extract its components with high precision.\n\n"
        
        "Focus on identifying these specific technical components:\n"
        "1. Valves:\n"
        "   - Ball valves\n"
        "   - Gate valves\n"
        "   - Check valves\n"
        "   - Control valves\n"
        "   - Safety valves\n"
        "2. Pumps and Motors:\n"
        "   - Centrifugal pumps\n"
        "   - Gear pumps\n"
        "   - Electric motors\n"
        "   - Hydraulic pumps\n"
        "3. Pipes and Fittings:\n"
        "   - Straight pipes\n"
        "   - Elbows\n"
        "   - Tees\n"
        "   - Reducers\n"
        "   - Flanges\n"
        "4. Instruments and Sensors:\n"
        "   - Pressure gauges\n"
        "   - Temperature sensors\n"
        "   - Flow meters\n"
        "   - Level indicators\n"
        "5. Electrical Components:\n"
        "   - Switches\n"
        "   - Relays\n"
        "   - Circuit breakers\n"
        "   - Transformers\n"
        "6. Mechanical Parts:\n"
        "   - Bearings\n"
        "   - Gears\n"
        "   - Shafts\n"
        "   - Couplings\n\n"
        
        "Important Guidelines:\n"
        "1. Only list components that you are highly confident about\n"
        "2. Convert all measurements to standard units (e.g., '2 meters of pipe' → '2')\n"
        "3. Group similar components (e.g., 'Gate Valve 1' and 'Gate Valve 2' → 'Gate Valve: 2')\n"
        "4. Include any relevant specifications (e.g., '1\" Ball Valve')\n"
        "5. If a component has multiple instances, sum them up\n"
        "6. If you're unsure about a component, do not include it\n\n"
        
        "Your output must be in CSV format with exactly two columns: 'Component' and 'Quantity'.\n"
        "Start your response with 'Component,Quantity' on the first line, followed by one component per line.\n"
        "Do not include any other text or explanations in your response.\n\n"
        
        "Document content:\n" + text[:4000]  # Limit text length to avoid token limits
    )

    messages = [
        {"role": "system", "content": (
            "You are an expert in technical drawing analysis and BOM extraction. "
            "Your task is to identify and quantify technical components from engineering drawings. "
            "You have extensive knowledge of mechanical, electrical, and industrial components. "
            "You are precise, accurate, and only include components you are confident about. "
            "Respond only with the CSV data, starting with the header 'Component,Quantity'."
        )},
        {"role": "user", "content": prompt_text}
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-4",  # Using GPT-4 for better accuracy
            messages=messages,
            max_tokens=1000,
            temperature=0.1,  # Lower temperature for more consistent results
            presence_penalty=0.1,  # Slight penalty for repeating components
            frequency_penalty=0.1  # Slight penalty for repeating patterns
        )
    except Exception as e:
        print("[ERROR] OpenAI API request failed:", e)
        return {}

    try:
        # Parse the response
        response_text = response.choices[0].message.content.strip()
        print("[DEBUG] OpenAI API returned response:", response_text)
        
        # Parse CSV text
        lines = response_text.splitlines()
        bom = {}
        
        # Skip header and process each line
        for line in lines[1:]:
            if not line.strip():
                continue
            try:
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 2:
                    comp = parts[0]
                    try:
                        qty = int(parts[1])
                        if qty > 0:  # Only include components with positive quantities
                            bom[comp] = qty
                    except ValueError:
                        print(f"[DEBUG] Non-numeric quantity for component '{comp}': '{parts[1]}'")
            except Exception as e:
                print(f"[DEBUG] Error parsing line '{line}': {e}")

        print("[DEBUG] Final parsed BOM:", bom)
        return bom
    except Exception as e:
        print("[ERROR] Failed to parse OpenAI response:", e)
        return {}
