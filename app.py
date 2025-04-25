import os
import shutil
from datetime import datetime, timedelta
from flask import Flask, request, send_file, render_template_string, url_for, jsonify, session, redirect
from werkzeug.utils import secure_filename
import pandas as pd
from pdf2image import convert_from_path
from detection import detect_components, openai_detect_components
from functools import wraps

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-here')

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def cleanup_old_files():
    """Remove files older than 1 hour from the uploads directory"""
    try:
        current_time = datetime.now()
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                if current_time - file_time > timedelta(hours=1):
                    os.remove(file_path)
    except Exception as e:
        print(f"[ERROR] Cleanup failed: {e}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == os.getenv('APP_USERNAME', 'admin') and password == os.getenv('APP_PASSWORD', 'admin'):
            session['logged_in'] = True
            return redirect(url_for('index'))
        return render_template_string(login_template("Invalid credentials"))
    return render_template_string(login_template())

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/', methods=['GET'])
@login_required
def index():
    cleanup_old_files()
    
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Technical Drawing Analysis</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            :root {
                --primary-color: #2c3e50;
                --secondary-color: #3498db;
                --accent-color: #e74c3c;
                --background-color: #f8f9fa;
                --text-color: #2c3e50;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: var(--background-color);
                color: var(--text-color);
            }
            
            .navbar {
                background-color: var(--primary-color);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .navbar-brand {
                font-weight: 600;
                color: white !important;
            }
            
            .nav-link {
                color: rgba(255,255,255,0.8) !important;
                transition: color 0.3s ease;
            }
            
            .nav-link:hover {
                color: white !important;
            }
            
            .main-container {
                max-width: 1200px;
                margin: 2rem auto;
                padding: 0 1rem;
            }
            
            .upload-card {
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                padding: 2rem;
                margin-bottom: 2rem;
            }
            
            .upload-area {
                border: 2px dashed var(--secondary-color);
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .upload-area:hover {
                background-color: rgba(52, 152, 219, 0.1);
            }
            
            .upload-icon {
                font-size: 3rem;
                color: var(--secondary-color);
                margin-bottom: 1rem;
            }
            
            .btn-primary {
                background-color: var(--secondary-color);
                border-color: var(--secondary-color);
                padding: 0.5rem 1.5rem;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            
            .btn-primary:hover {
                background-color: #2980b9;
                border-color: #2980b9;
                transform: translateY(-1px);
            }
            
            .loading {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                z-index: 1000;
                backdrop-filter: blur(5px);
            }
            
            .spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }
            
            .preview-container {
                margin-top: 2rem;
                display: none;
            }
            
            .preview-image {
                max-width: 100%;
                max-height: 400px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .method-selector {
                margin: 1.5rem 0;
            }
            
            .method-card {
                border: 2px solid #e9ecef;
                border-radius: 8px;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .method-card:hover {
                border-color: var(--secondary-color);
                background-color: rgba(52, 152, 219, 0.05);
            }
            
            .method-card.selected {
                border-color: var(--secondary-color);
                background-color: rgba(52, 152, 219, 0.1);
            }
            
            .method-icon {
                font-size: 2rem;
                color: var(--secondary-color);
                margin-bottom: 0.5rem;
            }
            
            .method-title {
                font-weight: 600;
                margin-bottom: 0.5rem;
            }
            
            .method-description {
                color: #6c757d;
                font-size: 0.9rem;
            }
        </style>
    </head>
    <body>
        <nav class="navbar navbar-expand-lg navbar-dark">
            <div class="container">
                <a class="navbar-brand" href="/">
                    <i class="fas fa-drafting-compass me-2"></i>
                    Technical Drawing Analysis
                </a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="/logout">
                        <i class="fas fa-sign-out-alt me-1"></i>
                        Logout
                    </a>
                </div>
            </div>
        </nav>

        <div class="main-container">
            <div class="upload-card">
                <h2 class="mb-4">Upload Technical Drawing</h2>
                <p class="lead mb-4">Upload a technical drawing in PNG, JPG, PDF, or DOC/DOCX format for analysis.</p>
                
                <form method="post" action="/upload" enctype="multipart/form-data" id="uploadForm">
                    <div class="upload-area" id="dropZone">
                        <i class="fas fa-cloud-upload-alt upload-icon"></i>
                        <h4>Drag & Drop your file here</h4>
                        <p class="text-muted">or</p>
                        <input type="file" name="file" id="file" class="d-none" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" required>
                        <button type="button" class="btn btn-primary" onclick="document.getElementById('file').click()">
                            <i class="fas fa-folder-open me-2"></i>
                            Browse Files
                        </button>
                        <p class="mt-2 text-muted" id="fileInfo"></p>
                    </div>

                    <div class="method-selector">
                        <h4 class="mb-3">Select Analysis Method</h4>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="method-card" onclick="selectMethod('yolov5')">
                                    <div class="text-center">
                                        <i class="fas fa-robot method-icon"></i>
                                        <h5 class="method-title">YOLOv5 Detection</h5>
                                        <p class="method-description">Advanced computer vision for precise component detection</p>
                                    </div>
                                    <div class="form-check text-center">
                                        <input class="form-check-input" type="radio" name="analysis_method" id="yolov5" value="yolov5" checked>
                                        <label class="form-check-label" for="yolov5">Select</label>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="method-card" onclick="selectMethod('openai')">
                                    <div class="text-center">
                                        <i class="fas fa-brain method-icon"></i>
                                        <h5 class="method-title">OpenAI Analysis</h5>
                                        <p class="method-description">AI-powered text analysis for detailed component identification</p>
                                    </div>
                                    <div class="form-check text-center">
                                        <input class="form-check-input" type="radio" name="analysis_method" id="openai" value="openai">
                                        <label class="form-check-label" for="openai">Select</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="text-center mt-4">
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-magic me-2"></i>
                            Analyze Drawing
                        </button>
                    </div>
                </form>
                
                <div class="preview-container" id="previewContainer">
                    <h4 class="mb-3">Preview</h4>
                    <img id="previewImage" class="preview-image" src="" alt="Preview">
                </div>
            </div>
        </div>

        <div class="loading" id="loading">
            <div class="spinner">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <h4 class="mt-3">Analyzing your drawing...</h4>
                <p class="text-muted">This may take a few moments</p>
            </div>
        </div>

        <div class="analysis-results" id="analysisResults" style="display: none;">
            <h3 class="mb-4">Analysis Results</h3>
            <p>Your technical drawing has been analyzed successfully. Here are the detected components:</p>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Component</th>
                            <th>Quantity</th>
                            <th>Size</th>
                            <th>Type</th>
                            <th>Signal</th>
                            <th>Rating</th>
                            <th>Material</th>
                            <th>Reference</th>
                            <th>Location</th>
                            <th>Specifications</th>
                        </tr>
                    </thead>
                    <tbody id="resultsTableBody">
                    </tbody>
                </table>
            </div>
            <div class="mt-4">
                <a href="#" id="downloadExcel" class="btn btn-success">
                    <i class="fas fa-file-excel me-2"></i>Download as Excel
                </a>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            function selectMethod(method) {
                document.querySelectorAll('.method-card').forEach(card => {
                    card.classList.remove('selected');
                });
                document.querySelector(`.method-card:has(#${method})`).classList.add('selected');
                document.getElementById(method).checked = true;
            }

            // Initialize the first method as selected
            selectMethod('yolov5');

            const dropZone = document.getElementById('dropZone');
            const fileInput = document.getElementById('file');
            const fileInfo = document.getElementById('fileInfo');

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            function highlight(e) {
                dropZone.classList.add('bg-light');
            }

            function unhighlight(e) {
                dropZone.classList.remove('bg-light');
            }

            dropZone.addEventListener('drop', handleDrop, false);

            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                fileInput.files = files;
                updateFileInfo(files[0]);
            }

            fileInput.addEventListener('change', function(e) {
                updateFileInfo(this.files[0]);
            });

            function updateFileInfo(file) {
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.getElementById('previewImage');
                        const container = document.getElementById('previewContainer');
                        preview.src = e.target.result;
                        container.style.display = 'block';
                    }
                    reader.readAsDataURL(file);
                    
                    fileInfo.textContent = `Selected file: ${file.name} (${formatFileSize(file.size)})`;
                }
            }

            function formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }

            document.getElementById('uploadForm').addEventListener('submit', function(e) {
                e.preventDefault(); // Prevent default form submission
                document.getElementById('loading').style.display = 'block';
                
                const formData = new FormData(this);
                
                fetch('/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    // Check the content type of the response
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json().then(data => {
                            if (data.error) {
                                throw new Error(data.error);
                            }
                            return data;
                        });
                    } else {
                        // If it's HTML, replace the entire page content
                        return response.text().then(html => {
                            document.documentElement.innerHTML = html;
                            return null;
                        });
                    }
                })
                .then(data => {
                    document.getElementById('loading').style.display = 'none';
                    if (data) { // If we got JSON data
                        displayResults(data.results);
                        document.getElementById('analysisResults').style.display = 'block';
                        document.getElementById('downloadExcel').href = `/download/${data.filename}`;
                    }
                    // If we got HTML, the page has already been replaced
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    alert('An error occurred during upload: ' + error);
                });
            });

            function displayResults(results) {
                const tableBody = document.getElementById('resultsTableBody');
                tableBody.innerHTML = '';
                
                for (const [component, details] of Object.entries(results)) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${component}</td>
                        <td>${details.quantity || 1}</td>
                        <td>${details.size || '-'}</td>
                        <td>${details.type || '-'}</td>
                        <td>${details.signal || '-'}</td>
                        <td>${details.rating || '-'}</td>
                        <td>${details.material || '-'}</td>
                        <td>${details.reference || '-'}</td>
                        <td>${details.location || '-'}</td>
                        <td>${details.specifications || '-'}</td>
                    `;
                    tableBody.appendChild(row);
                }
                
                // Show the results container
                const resultsContainer = document.getElementById('analysisResults');
                resultsContainer.style.display = 'block';
                
                // Scroll to results
                resultsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        </script>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    try:
        if 'file' not in request.files:
            return render_template_string(error_template("No file uploaded"))
        
        file = request.files['file']
        if file.filename == '':
            return render_template_string(error_template("No file selected"))
        
        if not allowed_file(file.filename):
            return render_template_string(error_template("File type not allowed"))
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Analyze the drawing
        results = openai_detect_components(filepath)
        
        # Store results in session for CSV download
        session['last_results'] = results
        
        # Generate CSV filename
        csv_filename = f'bom_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        # Create results page HTML
        result_html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Analysis Results</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                :root {{
                    --primary-color: #2c3e50;
                    --secondary-color: #3498db;
                    --background-color: #f8f9fa;
                    --text-color: #2c3e50;
                }}
                
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: var(--background-color);
                    color: var(--text-color);
                }}
                
                .navbar {{
                    background-color: var(--primary-color);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                
                .navbar-brand {{
                    font-weight: 600;
                    color: white !important;
                }}
                
                .nav-link {{
                    color: rgba(255,255,255,0.8) !important;
                }}
                
                .main-container {{
                    max-width: 1400px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                }}
                
                .result-card {{
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    padding: 2rem;
                    margin-bottom: 2rem;
                }}
                
                .table {{
                    margin-top: 1rem;
                }}
                
                .table th {{
                    background-color: var(--primary-color);
                    color: white;
                }}
                
                .btn {{
                    padding: 0.5rem 1.5rem;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }}
                
                .btn:hover {{
                    transform: translateY(-1px);
                }}
                
                .btn-success {{
                    background-color: #27ae60;
                    border-color: #27ae60;
                }}
                
                .btn-success:hover {{
                    background-color: #219a52;
                    border-color: #219a52;
                }}
            </style>
        </head>
        <body>
            <nav class="navbar navbar-expand-lg navbar-dark">
                <div class="container">
                    <a class="navbar-brand" href="/">
                        <i class="fas fa-drafting-compass me-2"></i>
                        Technical Drawing Analysis
                    </a>
                    <div class="navbar-nav ms-auto">
                        <a class="nav-link" href="/logout">
                            <i class="fas fa-sign-out-alt me-1"></i>
                            Logout
                        </a>
                    </div>
                </div>
            </nav>

            <div class="main-container">
                <div class="result-card">
                    <h2 class="mb-4">Analysis Results</h2>
                    <p class="lead">Your technical drawing has been analyzed successfully. Here are the detected components:</p>
                    
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Quantity</th>
                                    <th>Size</th>
                                    <th>Type</th>
                                    <th>Signal</th>
                                    <th>Rating</th>
                                    <th>Material</th>
                                    <th>Reference</th>
                                    <th>Location</th>
                                    <th>Specifications</th>
                                </tr>
                            </thead>
                            <tbody>
                                {''.join(
                                    f'''<tr>
                                        <td>{comp}</td>
                                        <td>{details.get('quantity', 1)}</td>
                                        <td>{details.get('size', '-')}</td>
                                        <td>{details.get('type', '-')}</td>
                                        <td>{details.get('signal', '-')}</td>
                                        <td>{details.get('rating', '-')}</td>
                                        <td>{details.get('material', '-')}</td>
                                        <td>{details.get('reference', '-')}</td>
                                        <td>{details.get('location', '-')}</td>
                                        <td>{details.get('specifications', '-')}</td>
                                    </tr>''' 
                                    for comp, details in results.items()
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="text-center mt-4">
                        <a href="{url_for('download_file', filename=csv_filename)}" class="btn btn-success btn-lg me-2">
                            <i class="fas fa-download me-2"></i>
                            Download CSV
                        </a>
                        <a href="/" class="btn btn-secondary btn-lg">
                            <i class="fas fa-upload me-2"></i>
                            Upload Another File
                        </a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return render_template_string(result_html)
        
    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        return render_template_string(error_template(f"An error occurred: {str(e)}"))

@app.route('/download/<filename>', methods=['GET'])
@login_required
def download_file(filename):
    try:
        # Get the results from the session
        results = session.get('last_results', {})
        
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
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
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

def error_template(message):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Error</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            :root {{
                --primary-color: #2c3e50;
                --secondary-color: #3498db;
                --accent-color: #e74c3c;
                --background-color: #f8f9fa;
                --text-color: #2c3e50;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: var(--background-color);
                color: var(--text-color);
            }}
            
            .navbar {{
                background-color: var(--primary-color);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            
            .navbar-brand {{
                font-weight: 600;
                color: white !important;
            }}
            
            .nav-link {{
                color: rgba(255,255,255,0.8) !important;
                transition: color 0.3s ease;
            }}
            
            .nav-link:hover {{
                color: white !important;
            }}
            
            .main-container {{
                max-width: 1200px;
                margin: 2rem auto;
                padding: 0 1rem;
            }}
            
            .error-card {{
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                padding: 2rem;
                margin-bottom: 2rem;
            }}
            
            .alert-danger {{
                background-color: #f8d7da;
                border-color: #f5c6cb;
                color: #721c24;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
            }}
            
            .btn-primary {{
                background-color: var(--secondary-color);
                border-color: var(--secondary-color);
                padding: 0.5rem 1.5rem;
                font-weight: 500;
                transition: all 0.3s ease;
            }}
            
            .btn-primary:hover {{
                background-color: #2980b9;
                border-color: #2980b9;
                transform: translateY(-1px);
            }}
        </style>
    </head>
    <body>
        <nav class="navbar navbar-expand-lg navbar-dark">
            <div class="container">
                <a class="navbar-brand" href="/">
                    <i class="fas fa-drafting-compass me-2"></i>
                    Technical Drawing Analysis
                </a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="/logout">
                        <i class="fas fa-sign-out-alt me-1"></i>
                        Logout
                    </a>
                </div>
            </div>
        </nav>

        <div class="main-container">
            <div class="error-card">
                <div class="alert alert-danger">
                    <h4 class="alert-heading">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error!
                    </h4>
                    <p>{message}</p>
                </div>
                <div class="text-center">
                    <a href="/" class="btn btn-primary">
                        <i class="fas fa-home me-2"></i>
                        Back to Home
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def login_template(error_message=None):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Login - Technical Drawing Analysis</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            :root {{
                --primary-color: #2c3e50;
                --secondary-color: #3498db;
                --accent-color: #e74c3c;
                --background-color: #f8f9fa;
                --text-color: #2c3e50;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: var(--background-color);
                color: var(--text-color);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            
            .login-card {{
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                padding: 2rem;
                width: 100%;
                max-width: 400px;
            }}
            
            .login-header {{
                text-align: center;
                margin-bottom: 2rem;
            }}
            
            .login-icon {{
                font-size: 3rem;
                color: var(--secondary-color);
                margin-bottom: 1rem;
            }}
            
            .form-control {{
                padding: 0.75rem;
                border-radius: 8px;
                border: 1px solid #ced4da;
                transition: all 0.3s ease;
            }}
            
            .form-control:focus {{
                border-color: var(--secondary-color);
                box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
            }}
            
            .btn-primary {{
                background-color: var(--secondary-color);
                border-color: var(--secondary-color);
                padding: 0.75rem;
                font-weight: 500;
                transition: all 0.3s ease;
                width: 100%;
            }}
            
            .btn-primary:hover {{
                background-color: #2980b9;
                border-color: #2980b9;
                transform: translateY(-1px);
            }}
            
            .alert-danger {{
                background-color: #f8d7da;
                border-color: #f5c6cb;
                color: #721c24;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
            }}
        </style>
    </head>
    <body>
        <div class="login-card">
            <div class="login-header">
                <i class="fas fa-drafting-compass login-icon"></i>
                <h3>Technical Drawing Analysis</h3>
                <p class="text-muted">Please login to continue</p>
            </div>
            
            {f'<div class="alert alert-danger">{error_message}</div>' if error_message else ''}
            
            <form method="post">
                <div class="mb-3">
                    <label for="username" class="form-label">Username</label>
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="fas fa-user"></i>
                        </span>
                        <input type="text" class="form-control" id="username" name="username" required>
                    </div>
                </div>
                <div class="mb-4">
                    <label for="password" class="form-label">Password</label>
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="fas fa-lock"></i>
                        </span>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt me-2"></i>
                    Login
                </button>
            </form>
        </div>
    </body>
    </html>
    """

if __name__ == '__main__':
    app.run(debug=True)
