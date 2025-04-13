import os
from flask import Flask, request, send_file, jsonify, render_template_string, url_for
from werkzeug.utils import secure_filename
import pandas as pd
from pdf2image import convert_from_path
from detection import detect_components  # Ensure your detection.py is correctly set up

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'
# Allowed file extensions
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Route: Home page with modern file upload form (using Bootstrap)
@app.route('/', methods=['GET'])
def index():
    html = """
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Technical Drawing Analysis</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    </head>
    <body>
      <div class="container mt-5">
        <h1 class="mb-4">Upload a Technical Document</h1>
        <p class="lead">Upload a file in PNG, JPG, or PDF format. (DOC/DOCX not supported yet.)</p>
        <form method="post" action="/upload" enctype="multipart/form-data">
          <div class="form-group">
            <label for="file">Select File:</label>
            <input type="file" name="file" id="file" class="form-control-file" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" required>
          </div>
          <button type="submit" class="btn btn-primary">Upload</button>
        </form>
      </div>
    </body>
    </html>
    """
    return render_template_string(html)

# Route: File upload and processing
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return render_template_string(error_template("No file part in the request")), 400

    file = request.files['file']
    if file.filename == '':
        return render_template_string(error_template("No selected file")), 400

    if not allowed_file(file.filename):
        return render_template_string(error_template("File type not allowed")), 400

    # Ensure upload folder exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    ext = filename.rsplit('.', 1)[1].lower()
    image_path = None

    if ext == 'pdf':
        try:
            # Convert first page of the PDF to an image (JPEG)
            images = convert_from_path(file_path)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'converted_page.jpg')
            images[0].save(image_path, 'JPEG')
        except Exception as e:
            message = ("PDF conversion failed: Unable to get page count. " 
                       "Ensure Poppler is installed and in your system PATH. "
                       "For macOS, run: <code>brew install poppler</code>.<br>"
                       "For Ubuntu, run: <code>sudo apt-get install poppler-utils</code>.<br>"
                       "For Windows, download from: <a href='http://blog.alivate.com.au/poppler-windows/'>Poppler for Windows</a>.")
            return render_template_string(error_template(message)), 500

    elif ext in ['png', 'jpg', 'jpeg']:
        image_path = file_path

    elif ext in ['doc', 'docx']:
        return render_template_string(error_template("DOC/DOCX file processing is not supported yet.")), 400

    else:
        return render_template_string(error_template("Unsupported file type.")), 400

    # Run detection on the image
    detection_results = detect_components(image_path)

    # Generate BOM CSV file using pandas
    bom_list = []
    for component, count in detection_results.items():
        bom_list.append({'Component': component, 'Quantity': count})
    bom_df = pd.DataFrame(bom_list)
    csv_filename = 'bom.csv'
    csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
    bom_df.to_csv(csv_path, index=False)

    # Render result page with download button
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
        <p class="lead">Your technical component extraction is complete. Download your Bill of Material below.</p>
        <a href="{url_for('download_file', filename=csv_filename)}" class="btn btn-success btn-lg">Download CSV</a>
        <br><br>
        <a href="/" class="btn btn-secondary">Upload Another File</a>
      </div>
    </body>
    </html>
    """
    return render_template_string(result_html)

# Route: File download route for the CSV
@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    return send_file(file_path, as_attachment=True)

def error_template(message):
    """Return an HTML error template with Bootstrap styling."""
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
