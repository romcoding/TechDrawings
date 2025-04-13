from flask import Flask, request, send_file, jsonify
from werkzeug.utils import secure_filename
import os
import pandas as pd
from pdf2image import convert_from_path
from detection import detect_components  # Our custom detection module

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/upload', methods=['POST'])
def upload_file():
    # Validate if the file part is in the request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # If PDF, convert the first page to an image for detection
        ext = filename.rsplit('.', 1)[1].lower()
        if ext == 'pdf':
            try:
                images = convert_from_path(filepath)
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'converted_page.jpg')
                images[0].save(image_path, 'JPEG')
            except Exception as e:
                return jsonify({'error': f'PDF conversion failed: {e}'}), 500
        else:
            image_path = filepath

        # Run the technical component detection on the image
        detection_results = detect_components(image_path)

        # Build a BOM as a CSV file using pandas
        bom = []
        for component, count in detection_results.items():
            bom.append({'Component': component, 'Quantity': count})
        bom_df = pd.DataFrame(bom)
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], 'bom.csv')
        bom_df.to_csv(csv_path, index=False)

        # Optionally: clean up temporary files if desired

        return send_file(csv_path, as_attachment=True)
    else:
        return jsonify({'error': 'File type not allowed'}), 400

if __name__ == '__main__':
    # Ensure the upload folder exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)
