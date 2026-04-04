import os
import sys
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Load API Key from .env
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")

if GEMINI_API_KEY is None:
    print("API Key missing. Please check your .env file.")
    sys.exit(1)

# Initialize the modern Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

# Define our SG3 departments
SG3_DEPARTMENTS = ["pothole", "broken streetlight", "water leak", "garbage"]

def analyze_grievance(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File '{image_path}' not found.")
        return

    try:
        print(f"Uploading image to Gemini File API...")
        uploaded_file = client.files.upload(file=image_path)
        
        prompt = """Act as a municipal inspector. Identify the primary infrastructure issue in this photo (e.g., Pothole, Broken Streetlight, Water Leak, Garbage). Provide a confidence score from 0-1 and a 1-sentence description of the severity.
Use the following JSON format:
{"category": "issue name", "confidence": float, "severity": "description"}"""

        print("Analyzing with AI-detector...")
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # Parse the JSON response
        response_data = json.loads(response.text)
        
        category = response_data.get("category", "")
        confidence = response_data.get("confidence", 0.0)
        severity = response_data.get("severity", "")

        print("\n--- Output ---")
        print(f"Category: {category}")
        print(f"Confidence: {confidence}")
        print(f"Severity: {severity}")

        # If the category matches our SG3 departments, log 'Auto-Routing Triggered'.
        if any(dept in category.lower() for dept in SG3_DEPARTMENTS):
            print("\nAuto-Routing Triggered")
        else:
            print("\nNo Auto-Routing Match.")

        # Cleanup the file from Gemini storage
        client.files.delete(name=uploaded_file.name)

    except json.JSONDecodeError:
        print("Failed to decode JSON from Gemini response.")
        print("Raw response:", response.text)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_img = sys.argv[1]
        analyze_grievance(test_img)
    else:
        print("Usage: python gemini_verify.py path/to/image.jpg")
