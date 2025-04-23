import os
import shutil
from datetime import datetime, timedelta
from flask import Flask, request, send_file, render_template_string, url_for, jsonify
from werkzeug.utils import secure_filename
import pandas as pd
from pdf2image import convert_from_path
from detection import detect_components, openai_detect_components

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit

# Create uploads directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

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

@app.route('/', methods=['GET'])
def index():
    # Clean up old files before showing the interface
    cleanup_old_files()
    
    # Updated HTML interface with loading spinner and better styling
    html = """
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Technical Drawing Analysis</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
      <style>
        .loading {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.8);
          z-index: 1000;
        }
        .spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .preview-container {
          margin-top: 20px;
          display: none;
        }
        .preview-image {
          max-width: 100%;
          max-height: 300px;
        }
      </style>
    </head>
    <body>
      <div class="container mt-5">
        <h1 class="mb-4">Upload a Technical Document</h1>
        <p class="lead">Upload a file in PNG, JPG, PDF, or DOC/DOCX format.</p>
        <form method="post" action="/upload" enctype="multipart/form-data" id="uploadForm">
          <div class="form-group">
            <label for="file">Select File:</label>
            <input type="file" name="file" id="file" class="form-control-file" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" required>
          </div>
          <div class="form-group">
            <label for="method">Analysis Method:</label><br>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="analysis_method" id="yolov5" value="yolov5" checked>
              <label class="form-check-label" for="yolov5">YOLOv5</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="analysis_method" id="openai" value="openai">
              <label class="form-check-label" for="openai">OpenAI API</label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Upload and Process</button>
        </form>
        
        <div class="preview-container" id="previewContainer">
          <h3>Preview</h3>
          <img id="previewImage" class="preview-image" src="" alt="Preview">
        </div>
      </div>

      <div class="loading" id="loading">
        <div class="spinner">
          <div class="spinner-border text-primary" role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <p class="mt-2">Processing your file...</p>
        </div>
      </div>

      <script>
        document.getElementById('file').addEventListener('change', function(e) {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
              const preview = document.getElementById('previewImage');
              const container = document.getElementById('previewContainer');
              preview.src = e.target.result;
              container.style.display = 'block';
            }
            reader.readAsDataURL(file);
          }
        });

        document.getElementById('uploadForm').addEventListener('submit', function() {
          document.getElementById('loading').style.display = 'block';
        });
      </script>
    </body>
    </html>
    """
    return render_template_string(html)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return render_template_string(error_template("No file part in the request")), 400

    file = request.files['file']
    if file.filename == '':
        return render_template_string(error_template("No selected file")), 400

    if not allowed_file(file.filename):
        return render_template_string(error_template("File type not allowed")), 400

    try:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        ext = filename.rsplit('.', 1)[1].lower()
        analysis_method = request.form.get('analysis_method', 'yolov5')
        image_path = None

        if ext == 'pdf':
            try:
                images = convert_from_path(file_path)
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'converted_page.jpg')
                images[0].save(image_path, 'JPEG')
            except Exception as e:
                message = ("PDF conversion failed: " + str(e) + "<br>"
                          "Ensure Poppler is installed and in your system PATH.<br>"
                          "For macOS: <code>brew install poppler</code><br>"
                          "For Ubuntu: <code>sudo apt-get install poppler-utils</code><br>"
                          "For Windows: Download from <a href='http://blog.alivate.com.au/poppler-windows/'>Poppler for Windows</a>.")
                return render_template_string(error_template(message)), 500
        elif ext in ['png', 'jpg', 'jpeg']:
            image_path = file_path
        else:
            return render_template_string(error_template("Unsupported file type.")), 400

        # Choose the detection method based on user selection
        if analysis_method == 'yolov5':
            detection_results = detect_components(image_path)
        elif analysis_method == 'openai':
            detection_results = openai_detect_components(file_path)
        else:
            detection_results = {}

        # Create BOM CSV using pandas
        bom_list = []
        if detection_results:
            for component, count in detection_results.items():
                bom_list.append({'Component': component, 'Quantity': count})
        else:
            bom_list.append({'Component': 'No detections', 'Quantity': 0})
        
        bom_df = pd.DataFrame(bom_list)
        csv_filename = f'bom_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
        bom_df.to_csv(csv_path, index=False)

        # Clean up temporary files
        if image_path and image_path != file_path:
            try:
                os.remove(image_path)
            except:
                pass

        # Render result page with a download button and preview
        result_html = f"""
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>BOM Generated</title>
          <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
        </head>
        <body>
          <div class="container mt-5">
            <h1 class="mb-4">Bill of Material Generated</h1>
            <p class="lead">Your technical component extraction is complete. Download your BOM below.</p>
            
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">Detected Components</h5>
              </div>
              <div class="card-body">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {''.join(f'<tr><td>{row["Component"]}</td><td>{row["Quantity"]}</td></tr>' for row in bom_list)}
                  </tbody>
                </table>
              </div>
            </div>
            
            <a href="{url_for('download_file', filename=csv_filename)}" class="btn btn-success btn-lg">Download CSV</a>
            <br><br>
            <a href="/" class="btn btn-secondary">Upload Another File</a>
          </div>
        </body>
        </html>
        """
        return render_template_string(result_html)

    except Exception as e:
        return render_template_string(error_template(f"An error occurred: {str(e)}")), 500

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    return send_file(file_path, as_attachment=True)

def error_template(message):
    template = f"""
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Error</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    </head>
    <body>
      <div class="container mt-5">
        <div class="alert alert-danger" role="alert">
          <h4 class="alert-heading">An Error Occurred</h4>
          <p>{message}</p>
        </div>
        <a href="/" class="btn btn-primary">Return to Home</a>
      </div>
    </body>
    </html>
    """
    return template

if __name__ == '__main__':
    app.run(debug=True)
