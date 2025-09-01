import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration class"""
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    OPENAI_MODEL = 'gpt-4o'  # Using GPT-4o for superior analysis
    
    # Flask Configuration
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-here')
    UPLOAD_FOLDER = 'uploads/'
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB limit for GPT-5
    
    # File Extensions
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
    
    # Authentication
    APP_USERNAME = os.getenv('APP_USERNAME', 'admin')
    APP_PASSWORD = os.getenv('APP_PASSWORD', 'admin')
    
    # Server Configuration
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 10000))
    
    # Analysis Configuration
    CLEANUP_INTERVAL_HOURS = 1  # Clean up old files every hour
    MAX_FILE_AGE_HOURS = 1      # Keep files for 1 hour
    
    # Technical Standards
    TECHNICAL_STANDARDS = [
        'VDI 3814',      # Building automation and control systems
        'ISO 16484',     # Building automation and control systems
        'ISO 14617',     # Graphical symbols for diagrams
        'IEC 60617',     # Graphical symbols for diagrams
        'DIN EN 81346'   # Reference designation system
    ]
    
    # Component Categories
    COMPONENT_CATEGORIES = [
        'Control Valves (Ball, Gate, Check, Control, Safety, Solenoid)',
        'Pumps, Motors, and Drives',
        'Sensors and Measurement Instruments',
        'Control System Components (PLCs, DCS, SCADA)',
        'Pipes, Fittings, and Supports',
        'Electrical Components and Wiring',
        'HVAC Equipment',
        'Safety and Emergency Systems'
    ]
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required")
        
        if not cls.SECRET_KEY or cls.SECRET_KEY == 'your-secret-key-here':
            raise ValueError("FLASK_SECRET_KEY must be set to a secure value")
        
        return True
