import json

def main():
    llms_txt = """# Personal Consumption Record Web App

> A Personal Consumption Record Web App utilizing a Cloudflare Worker backend.

## Documentation

- [README](README.md): Project overview and setup
- [OpenAPI](openapi.md): REST API Documentation
- [API](API.json): REST API JSON format
- [GEMINI](GEMINI.md): Web App Design Progress Summary
"""

    with open("llms.txt", "w") as f:
        f.write(llms_txt)

    llms_full_txt = """# Personal Consumption Record Web App

> A Personal Consumption Record Web App utilizing a Cloudflare Worker backend.

## Documentation

- [README](README.md): Project overview and setup
"""

    with open("README.md", "r") as f:
        readme_content = f.read()

    llms_full_txt += f"\n\n{readme_content}\n"

    llms_full_txt += "\n- [OpenAPI](openapi.md): REST API Documentation\n"
    with open("openapi.md", "r") as f:
        openapi_content = f.read()
    llms_full_txt += f"\n\n{openapi_content}\n"

    llms_full_txt += "\n- [API](API.json): REST API JSON format\n"
    with open("API.json", "r") as f:
        api_json_content = f.read()
    llms_full_txt += f"\n\n```json\n{api_json_content}\n```\n"

    llms_full_txt += "\n- [GEMINI](GEMINI.md): Web App Design Progress Summary\n"
    with open("GEMINI.md", "r") as f:
        gemini_content = f.read()
    llms_full_txt += f"\n\n{gemini_content}\n"


    with open("llms-full.txt", "w") as f:
        f.write(llms_full_txt)

if __name__ == "__main__":
    main()
