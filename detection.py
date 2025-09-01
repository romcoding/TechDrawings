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

    # Sophisticated prompt for expert technical drawing analysis
    prompt_text = """You are an expert engineering analyst with deep knowledge of technical drawings, building automation, and industrial control systems. Analyze this technical drawing with maximum precision and detail according to international engineering standards (VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346).

    **COMPREHENSIVE COMPONENT ANALYSIS REQUIRED:**

    For each visible component, provide detailed analysis in these categories:

    1. **Component Name & Identifier**: Use standard naming conventions (e.g., "Pump P1", "Valve V1", "Sensor S1", "Controller C1")
    2. **Quantity**: Exact count of identical components
    3. **Size/Dimensions**: 
       - Pipes: DN (nominal diameter), wall thickness
       - Equipment: Power ratings (kW), flow rates (m³/h), pressure ratings (bar)
       - Electrical: Voltage, current, power ratings
       - Dimensions: Length, width, height in mm
    4. **Component Type**: Categorize according to these standards:
       - **Valves**: Ball, Gate, Check, Control, Safety, Solenoid, Butterfly, Globe, Needle
       - **Pumps**: Centrifugal, Positive Displacement, Submersible, Booster
       - **Sensors**: Temperature, Pressure, Flow, Level, Humidity, CO2, VOC, Air Quality
       - **Actuators**: Electric, Pneumatic, Hydraulic, Thermal
       - **Controllers**: PLC, DCS, SCADA, Building Automation, Room Controllers
       - **HVAC**: Air Handling Units, Chillers, Heat Exchangers, Fans, Air Dampers
       - **Electrical**: Switchgear, Transformers, Motors, Drives, Frequency Converters
       - **Instrumentation**: Transmitters, Indicators, Recorders, Switches
    5. **Signal Type**: 
       - Analog: 0-10V, 4-20mA, 0-20mA
       - Digital: Binary, 3-point, PWM
       - Communication: Modbus, BACnet, KNX, LON, Profibus, Ethernet
       - Wireless: EnOcean, Zigbee, LoRa
    6. **Rating/Capacity**: 
       - Power: kW, HP
       - Pressure: bar, Pa, psi
       - Flow: m³/h, L/min, GPM
       - Temperature: °C, K
       - Voltage: VAC, VDC
       - Current: A
    7. **Material Specification**: 
       - Metals: Steel, Stainless Steel, Brass, Bronze, Aluminum, Cast Iron
       - Plastics: PVC, PP, PE, PVDF
       - Coatings: Epoxy, Polyester, Zinc, Nickel
       - Seals: NBR, EPDM, FPM, PTFE
    8. **Reference Code**: According to DIN EN 81346 standards
    9. **System Location/Zone**: 
       - Building: Zone, Floor, Room, Area
       - System: Primary, Secondary, Tertiary
       - Function: Heating, Cooling, Ventilation, Domestic Hot Water
    10. **Technical Specifications & Notes**: 
        - Operating conditions
        - Maintenance requirements
        - Safety features
        - Special requirements
        - Standards compliance

    **CRITICAL ANALYSIS REQUIREMENTS:**

    - **Be extremely thorough**: Identify EVERY visible component, no matter how small
    - **Count accurately**: Distinguish between similar but different components
    - **Use technical standards**: Reference VDI 3814, ISO 16484, ISO 14617, IEC 60617
    - **Consider system context**: Understand the overall system function and relationships
    - **Identify control logic**: Recognize automation sequences and control strategies
    - **Note safety systems**: Identify emergency shutdown, fire protection, safety interlocks
    - **Document interfaces**: Note communication protocols, signal types, power requirements

    **OUTPUT FORMAT:**
    Provide a structured table with these exact columns (separated by semicolons):
    Component;Quantity;Size;Type;Signal;Rating;Material;Reference;Location;Specifications

    **QUALITY REQUIREMENTS:**
    - Maximum precision and technical accuracy
    - Professional engineering terminology
    - Complete coverage of all visible elements
    - Logical system organization
    - Standards-compliant categorization

    Analyze this drawing as if you are preparing a comprehensive engineering specification for a major industrial project. Be thorough, precise, and professional."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # Using GPT-4o for superior technical analysis
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior engineering analyst with 20+ years of experience in technical drawing interpretation, "
                        "building automation systems (BACS), industrial control systems, and mechanical engineering. "
                        "You have expert-level knowledge of VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346, "
                        "ASHRAE, and EN standards. You specialize in HVAC, building automation, process control, and industrial systems. "
                        "Your analysis is always comprehensive, precise, and follows international engineering best practices. "
                        "You understand complex system interactions, control strategies, and safety requirements. "
                        "Always provide structured, semicolon-separated output for optimal parsing. "
                        "Be thorough and professional - this analysis will be used for engineering specifications and procurement."
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
        
        # Enhanced parsing for sophisticated analysis
        lines = response_text.splitlines()
        bom = {}
        csv_data = []
        
        # Find the table header
        header_found = False
        for line in lines:
            if 'Component;Quantity;Size;Type;Signal;Rating;Material;Reference;Location;Specifications' in line:
                header_found = True
                csv_data.append(line)  # Add header to CSV
                continue
            
            if header_found and line.strip():
                try:
                    parts = [p.strip() for p in line.split(';')]
                    if len(parts) >= 10:  # Full 10-column analysis
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
                        # Add to CSV data
                        csv_data.append(line)
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
                        # Add to CSV data
                        csv_data.append(line)
                except Exception as e:
                    print(f"[DEBUG] Error parsing line '{line}': {e}")

        # Store CSV data for download
        if csv_data:
            try:
                import os
                csv_filename = f"bom_analysis_{int(time.time())}.csv"
                csv_path = os.path.join('uploads', csv_filename)
                with open(csv_path, 'w', encoding='utf-8') as f:
                    for line in csv_data:
                        f.write(line + '\n')
                print(f"[DEBUG] CSV file saved: {csv_path}")
            except Exception as e:
                print(f"[DEBUG] Failed to save CSV: {e}")

        print("[DEBUG] Final parsed BOM:", bom)
        return bom
    except Exception as e:
        print("[ERROR] Failed to parse OpenAI response:", e)
        return {}
