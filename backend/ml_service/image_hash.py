import os
import sys
import json
import imagehash
from PIL import Image

def calculate_phash(image_path: str) -> str:
    """Calculates the perceptual hash of an image."""
    try:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at: {image_path}")
        
        img = Image.open(image_path)
        # Using perceptual hash (pHash) which is robust to slight modifications
        h = imagehash.phash(img)
        return str(h)
    except Exception as e:
        return json.dumps({"error": str(e)})

def compare_hashes(hash1_str: str, hash2_str: str) -> dict:
    """Compares two ImageHash strings and returns the Hamming distance."""
    try:
        h1 = imagehash.hex_to_hash(hash1_str)
        h2 = imagehash.hex_to_hash(hash2_str)
        
        # Calculate Hamming distance
        distance = h1 - h2
        
        # User defined threshold is < 10
        is_duplicate = distance < 10
        
        return {
            "distance": distance,
            "is_duplicate": is_duplicate,
            "threshold": 10
        }
    except Exception as e:
        return {"error": f"Failed to compare hashes: {str(e)}"}

if __name__ == "__main__":
    # Command line usage for integration with Node.js backend
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing command. Usage: python image_hash.py <command> [args]"}))
        sys.exit(1)
        
    command = sys.argv[1]
    
    if command == "hash" and len(sys.argv) == 3:
        image_path = sys.argv[2]
        phash_val = calculate_phash(image_path)
        if hasattr(phash_val, 'startswith') and phash_val.startswith('{'):
            print(phash_val) # error json
        else:
            print(json.dumps({"phash": phash_val}))
            
    elif command == "compare" and len(sys.argv) == 4:
        hash1 = sys.argv[2]
        hash2 = sys.argv[3]
        result = compare_hashes(hash1, hash2)
        print(json.dumps(result))
        
    else:
        print(json.dumps({"error": "Invalid command or arguments."}))
        sys.exit(1)
