#!/bin/bash
set -e
pip install --upgrade pip
pip install --prefer-binary -r requirements.txt
# Install spaCy model directly via pip (versioned URL avoids 404 from spacy download command)
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl
