import os
import shutil
from datetime import datetime, timedelta
from flask import Flask, request, send_file, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pandas as pd
from pdf2image import convert_from_path
from detection import openai_detect_components
from functools import wraps
from config import Config

# Validate configuration
try:
    Config.validate()
except ValueError as e:
    print(f"[ERROR] Configuration error: {e}")
    exit(1)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)  # Enable CORS for React frontend

# Apply configuration
app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = Config.ALLOWED_EXTENSIONS
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH
app.secret_key = Config.SECRET_KEY

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def cleanup_old_files():
    """Remove files older than configured time from the uploads directory"""
    try:
        current_time = datetime.now()
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                if current_time - file_time > timedelta(hours=Config.MAX_FILE_AGE_HOURS):
                    os.remove(file_path)
    except Exception as e:
        print(f"[ERROR] Cleanup failed: {e}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def serve_frontend():
    """Serve the React frontend"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the React build"""
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the frontend"""
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'model': Config.OPENAI_MODEL,
        'standards': Config.TECHNICAL_STANDARDS
    })

@app.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for login"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if username == Config.APP_USERNAME and password == Config.APP_PASSWORD:
            session['logged_in'] = True
            return jsonify({'success': True, 'message': 'Login successful'})
        else:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    """API endpoint for logout"""
    session.pop('logged_in', None)
    return jsonify({'success': True, 'message': 'Logout successful'})

@app.route('/api/upload', methods=['POST'])
@login_required
def api_upload_file():
    """API endpoint for file upload and analysis"""
    try:
        cleanup_old_files()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Analyze the drawing using GPT-5
        results = openai_detect_components(filepath)
        
        if not results:
            return jsonify({'error': 'Failed to analyze the drawing. Please ensure the image is clear and try again.'}), 500
        
        # Store results in session for CSV download
        session['last_results'] = results
        session['last_filename'] = filename
        
        # Generate CSV filename
        csv_filename = f'bom_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        session['csv_filename'] = csv_filename
        
        return jsonify({
            'success': True,
            'message': 'Analysis completed successfully',
            'results': results,
            'filename': csv_filename,
            'component_count': len(results),
            'model_used': Config.OPENAI_MODEL
        })
        
    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/api/download', methods=['GET'])
@login_required
def api_download_csv():
    """API endpoint for CSV download"""
    try:
        # Get the results from the session
        results = session.get('last_results', {})
        csv_filename = session.get('csv_filename', 'technical_drawing_analysis.csv')
        
        if not results:
            return jsonify({'error': 'No analysis results available'}), 400
        
        # Create a DataFrame with all columns
        data = []
        for component, details in results.items():
            data.append({
                'Component': component,
                'Quantity': details.get('quantity', 1),
                'Size': details.get('size', ''),
                'Type': details.get('type', ''),
                'Signal': details.get('signal', ''),
                'Rating': details.get('rating', ''),
                'Material': details.get('material', ''),
                'Reference': details.get('reference', ''),
                'Location': details.get('location', ''),
                'Specifications': details.get('specifications', '')
            })
        
        df = pd.DataFrame(data)
        
        # Create CSV file
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
        df.to_csv(csv_path, index=False, encoding='utf-8')
        
        return send_file(
            csv_path,
            mimetype='text/csv',
            as_attachment=True,
            download_name='technical_drawing_analysis.csv'
        )
    except Exception as e:
        print(f"[ERROR] Failed to generate CSV file: {e}")
        return jsonify({'error': 'Failed to generate CSV file'}), 500

@app.route('/api/analyze', methods=['POST'])
@login_required
def api_analyze_file():
    """API endpoint for analyzing files from the React frontend"""
    try:
        data = request.get_json()
        file_data = data.get('file', {})
        message = data.get('message', 'Please analyze this technical drawing using GPT-5.')
        
        if not file_data or 'data' not in file_data:
            return jsonify({'error': 'No file data provided'}), 400
        
        # Extract base64 data and save to temporary file
        import base64
        import tempfile
        
        # Remove data URL prefix if present
        file_content = file_data['data']
        if file_content.startswith('data:'):
            file_content = file_content.split(',')[1]
        
        # Decode base64 and save to temporary file
        file_bytes = base64.b64decode(file_content)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_data['type'].split('/')[-1]}") as temp_file:
            temp_file.write(file_bytes)
            temp_file_path = temp_file.name
        
        try:
            # Analyze the drawing using GPT-5
            results = openai_detect_components(temp_file_path)
            
            if not results:
                return jsonify({
                    'response': 'I was unable to analyze this technical drawing. Please ensure the image is clear, well-lit, and contains visible technical components. You may want to try uploading a different view or a higher resolution image.'
                })
            
            # Format results for display
            formatted_results = []
            for component, details in results.items():
                formatted_results.append(f"**{component}**")
                if details.get('quantity', 1) > 1:
                    formatted_results.append(f"  - Quantity: {details.get('quantity', 1)}")
                if details.get('size'):
                    formatted_results.append(f"  - Size: {details.get('size')}")
                if details.get('type'):
                    formatted_results.append(f"  - Type: {details.get('type')}")
                if details.get('signal'):
                    formatted_results.append(f"  - Signal: {details.get('signal')}")
                if details.get('rating'):
                    formatted_results.append(f"  - Rating: {details.get('rating')}")
                if details.get('material'):
                    formatted_results.append(f"  - Material: {details.get('material')}")
                if details.get('reference'):
                    formatted_results.append(f"  - Reference: {details.get('reference')}")
                if details.get('location'):
                    formatted_results.append(f"  - Location: {details.get('location')}")
                if details.get('specifications'):
                    formatted_results.append(f"  - Specifications: {details.get('specifications')}")
                formatted_results.append("")
            
            response_text = f"I've analyzed your technical drawing using {Config.OPENAI_MODEL}. Here's what I found:\n\n{''.join(formatted_results)}\n\nTotal components identified: {len(results)}"
            
            return jsonify({'response': response_text})
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
                
    except Exception as e:
        print(f"[ERROR] Analysis failed: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    """API endpoint for chat functionality"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        context = data.get('context', [])
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Provide information about the technical drawing analysis capabilities
        response = f"I'm here to help you with technical drawing analysis using {Config.OPENAI_MODEL}. I can analyze technical drawings, PDFs, and Word documents to identify components, create BOMs, and provide detailed technical information according to {', '.join(Config.TECHNICAL_STANDARDS)} standards. What would you like to know?"
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"[ERROR] Chat failed: {e}")
        return jsonify({'error': f'Chat failed: {str(e)}'}), 500

if __name__ == '__main__':
    print(f"🚀 Starting Technical Drawing Analyzer with {Config.OPENAI_MODEL}")
    print(f"📁 Upload folder: {Config.UPLOAD_FOLDER}")
    print(f"🔒 Authentication: {Config.APP_USERNAME}")
    print(f"🌐 Server: {Config.HOST}:{Config.PORT}")
    print(f"🌍 Web App: http://{Config.HOST}:{Config.PORT}")
    
    app.run(host=Config.HOST, port=Config.PORT, debug=True)
