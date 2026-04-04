import os
import sys
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# 1. Load the GOOGLE_API_KEY from the .env file securely.
# load_dotenv() typically loads from CWD, but we can explicitly search parent dirs to be safe:
# Because this script is in services/, .env is in the parent directory (root).
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
env_path = os.path.join(root_dir, '.env')
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Error: GOOGLE_API_KEY missing. Please check your .env file.")
    sys.exit(1)

# 2. Initialize Gemini Client
client = genai.Client(api_key=api_key)

# 3. Define the analyze_image function
def analyze_image(image_path):
    if not os.path.exists(image_path):
        print(f"Error: Image '{image_path}' not found.")
        return None

    uploaded_file = None
    try:
        # Send image to Gemini File API
        uploaded_file = client.files.upload(file=image_path)
        
        prompt = "Identify the infrastructure issue (Pothole, Water Leak, Streetlight, Garbage). Return ONLY a JSON object with: { 'category': string, 'confidence': float, 'severity': 'Low'|'Medium'|'High', 'summary': string }"

        # Initialize gemini-3-flash-preview as instructed
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # Parse JSON and return it
        return json.loads(response.text)

    except json.JSONDecodeError:
        print("Failed to decode JSON from Gemini response.")
        if response:
            print("Raw response:", response.text)
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None
    finally:
        # Clean up the file from Gemini File API
        if uploaded_file:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as e:
                pass # Silently drop cleanup errors

# 4. Add a __main__ block
if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_img = sys.argv[1]
        print(f"Analyzing {test_img}...")
        result = analyze_image(test_img)
        
        if result:
            print("\nAnalysis Result:")
            print(json.dumps(result, indent=2))
        else:
            print("\nAnalysis failed or returned empty.")
    else:
        print("Usage: python ai_analyzer.py path/to/image.jpg")
