import os
import numpy as np

# Suppress noisy TensorFlow logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 

try:
    from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions
    from tensorflow.keras.preprocessing import image
    
    # Initialize the model globally to avoid reloading overhead
    # We use the standard pre-trained ImageNet weights
    model = MobileNetV2(weights='imagenet', include_top=True)
except ImportError:
    print("Warning: TensorFlow is not installed. Please run: pip install tensorflow")
    model = None

# We map the requested infrastructure categories to closely related ImageNet 
# classes/keywords since standard ImageNet does not possess explicit classes 
# for 'pothole', 'broken pipe', etc. 
INFRASTRUCTURE_KEYWORDS = [
    'street', 'street_sign', 'traffic_light', 'pole', 
    'ashcan', 'trash_can', 'garbage', 'waste', 'barrel',
    'manhole_cover', 'pothole', 'pipe', 'water', 'fountain',
    'plumbing', 'construction', 'concrete', 'asphalt', 'road',
    'crane', 'tractor', 'snowplow', 'barrier', 'fence'
]

def verify_image(image_path: str, threshold: float = 0.40) -> dict:
    """
    Verifies if an image contains infrastructure issues using a pre-trained MobileNetV2.
    
    Args:
        image_path: Path to the structural image file.
        threshold: Confidence threshold to validate the image (default 40%).
        
    Returns:
        dict containing validation status (`valid`), a descriptive `message`, 
        the maximum confidence evaluated (`confidence`), and the `class` identified.
    """
    if model is None:
        return {"valid": False, "message": "Model failed to load due to missing TensorFlow.", "confidence": 0.0}
        
    if not os.path.exists(image_path):
        return {"valid": False, "message": f"Image not found at {image_path}", "confidence": 0.0}

    try:
        # 1. Load and preprocess the image (MobileNetV2 expects 224x224 pixels)
        img = image.load_img(image_path, target_size=(224, 224))
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)

        # 2. Extract model predictions
        predictions = model.predict(x, verbose=0)
        
        # 3. Decode top 15 predictions
        results = decode_predictions(predictions, top=15)[0]
        
        # 4. Search for infrastructure keywords matching the predictions
        max_infra_confidence = 0.0
        detected_class = None
        
        for _id, label, prob in results:
            label_lower = label.lower()
            if any(keyword in label_lower for keyword in INFRASTRUCTURE_KEYWORDS):
                if prob > max_infra_confidence:
                    max_infra_confidence = float(prob)
                    detected_class = label

        # 5. Evaluate the 40% cutoff threshold
        if max_infra_confidence >= threshold:
            return {
                "valid": True,
                "message": f"Valid Image: Detected infrastructure concept '{detected_class}' with {max_infra_confidence*100:.1f}% confidence.",
                "confidence": max_infra_confidence,
                "class": detected_class
            }
        else:
            return {
                "valid": False,
                "message": "Invalid Image: No infrastructure issue detected.",
                "confidence": max_infra_confidence
            }

    except Exception as e:
        return {
            "valid": False, 
            "message": f"Error formatting Image: {str(e)}",
            "confidence": 0.0
        }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        test_img = sys.argv[1]
        result = verify_image(test_img)
        print(f"Result -> {result['message']} (Confidence: {result['confidence']:.2f})")
    else:
        print("Usage: python verify_image.py <path_to_image.jpg>")
