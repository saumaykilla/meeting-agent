#!/bin/bash
# CC — Agent Setup Script
# Run from agent/ directory

python -m venv .venv
source .venv/bin/activate

pip install --upgrade pip

pip install \
  "livekit-agents[google]>=0.8.0" \
  "livekit-plugins-silero>=0.6.0" \
  "pinecone-client>=3.0.0" \
  "google-generativeai>=0.7.0" \
  "google-cloud-speech>=2.26.0" \
  "google-cloud-texttospeech>=2.16.0" \
  "python-dotenv>=1.0.0" \
  "aiohttp>=3.9.0" \
  "asyncio>=3.4.3"

pip freeze > requirements.txt

echo "Agent venv setup complete."
