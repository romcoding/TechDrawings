# detection.py
import torch

# Load your YOLOv5 model (ensure you update the path to your trained model)
model = torch.hub.load(
    'ultralytics/yolov5',
    'custom',
    path='path/to/your/best.pt',
    force_reload=True,
    trust_repo=True  # Accepts the repository explicitly
)

def detect_components(image_path):
    results = model(image_path)
    counts = {}
    # Map the detected class indices to component names.
    class_mapping = {0: 'valve', 1: 'pump', 2: 'bolt'}  # Adjust the mapping as needed
    for pred in results.pred[0]:
        cls = int(pred[5])
        component = class_mapping.get(cls, 'unknown')
        counts[component] = counts.get(component, 0) + 1
    return counts
