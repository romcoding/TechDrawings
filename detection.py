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
    Instead of extracting text alone, this function reads the entire file as binary,
    encodes it in base64, and includes it in the prompt for BOM extraction.
    This version is updated for openai version 1.73.0 and uses the ChatCompletion endpoint with model "o3-mini".
    Detailed debug messages are printed at each step.
    Returns a dictionary of the extracted BOM.
    """
    print("[DEBUG] Reading file for OpenAI detection:", file_path)
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
        print("[DEBUG] Read", len(file_data), "bytes from the file.")
        encoded_data = base64.b64encode(file_data).decode("utf-8")
        print("[DEBUG] Base64-encoded data length:", len(encoded_data))
    except Exception as e:
        print("[ERROR] Exception while reading/encoding file:", e)
        return {}

    # Construct the prompt using both a system and a user message.
    prompt_text = (
        "Please decode the following technical drawing document (provided as a Base64 encoded string) and extract its Bill of Materials (BOM). "
        "Your output should be in CSV format with exactly two columns: 'Component' and 'Quantity'. "
        "Only list technical components (e.g., valves, pumps, armatures, etc.) with their numeric quantities and do not include any commentary.\n\n"
        "Document (Base64 encoded):\n" + encoded_data
    )
    messages = [
        {"role": "system", "content": "You are an expert in technical drawing analysis."},
        {"role": "user", "content": prompt_text}
    ]
    print("[DEBUG] Constructed prompt with total length:", sum(len(m['content']) for m in messages))

    try:
        response = client.chat.completions.create(
            model="o3-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.0
        )
    except Exception as e:
        print("[ERROR] OpenAI API request failed:", e)
        return {}

    csv_text = response.choices[0].message.content.strip()
    print("[DEBUG] OpenAI API returned CSV text:\n", csv_text)
    
    # Parse CSV text, expecting a header "Component,Quantity"
    lines = csv_text.splitlines()
    bom = {}
    if len(lines) < 2:
        print("[DEBUG] CSV parsing failed: Not enough lines in output.")
        return bom

    header = lines[0].strip().lower().replace(" ", "")
    print("[DEBUG] CSV header:", header)
    if "component" not in header or "quantity" not in header:
        print("[DEBUG] CSV header is invalid:", header)
        return bom

    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split(',')
        if len(parts) >= 2:
            comp = parts[0].strip()
            try:
                qty = int(parts[1].strip())
            except ValueError:
                print(f"[DEBUG] Non-numeric quantity for component '{comp}': '{parts[1].strip()}'")
                qty = 0
            bom[comp] = qty
    print("[DEBUG] Parsed BOM from OpenAI API:", bom)
    return bom
