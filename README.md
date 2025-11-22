# Epstein Archive Investigator - Local Edition

A simple, local-only investigative tool for analyzing .txt and .jpg files.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the App

```bash
python app.py
```

### 3. Open in Browser

Navigate to: **http://localhost:5000**

## Features

✅ **Upload Files** - Drag and drop .txt and .jpg files
✅ **Full-Text Search** - Search across all text documents
✅ **Entity Extraction** - Automatically extract names, dates, and locations
✅ **Network Graph** - Visualize relationships between people
✅ **Timeline** - Chronological view of extracted dates
✅ **Image Gallery** - Browse uploaded images
✅ **Document Viewer** - Read full documents with highlighted entities

## How to Use

### Web Interface

1. **Upload Tab**:
   - Click "Select Files" to upload individual files
   - Click "Select Folder" to upload entire directories
   - Or drag and drop files/folders directly onto the upload zone
2. **Search Tab**: Search for keywords across all documents
3. **Documents Tab**: Browse all text documents
4. **Images Tab**: View image gallery
5. **Entities Tab**: See all extracted people, locations, and dates
6. **Network Tab**: View relationship graph between people
7. **Timeline Tab**: Chronological view of events

### Bulk Import (Command Line)

For faster uploads of large directories:

```bash
python3 bulk_import.py /path/to/your/documents
```

Options:
- `--no-recursive`: Only import files from the top level (skip subdirectories)

Example:
```bash
# Import all files recursively
python3 bulk_import.py ~/Documents/investigation

# Import only top-level files
python3 bulk_import.py ~/Documents/investigation --no-recursive
```

## File Storage

- Text files: `uploads/txt/`
- Images: `uploads/images/`
- Database: `database.db` (SQLite)

## Entity Extraction

The app currently extracts:
- **People**: Jeffrey Epstein, Ghislaine Maxwell, Virginia Giuffre, Prince Andrew, etc.
- **Locations**: Little St. James, Palm Beach, Manhattan, New Mexico, etc.
- **Dates**: Various date formats (MM/DD/YYYY, Month DD YYYY, etc.)

You can customize the entity list in `app.py` in the `extract_entities()` function.

## Customization

### Add More Names to Extract

Edit `app.py`, find the `extract_entities()` function, and add names to the `common_names` list:

```python
common_names = [
    'Jeffrey Epstein', 'Epstein',
    'Your Name Here',  # Add your names
]
```

### Add More Locations

```python
locations = [
    'Little St. James',
    'Your Location Here',  # Add your locations
]
```

## Tech Stack

- **Backend**: Python Flask
- **Database**: SQLite with FTS5 (Full-Text Search)
- **Frontend**: HTML, CSS, JavaScript
- **Visualization**: vis-network.js for graph visualization

## Requirements

- Python 3.8+
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Notes

- This is a **local-only** application - no internet connection required after installation
- All data stays on your computer
- No authentication required (single-user local app)
- Database is a single file (`database.db`)

## Future Enhancements

Want to add:
- More sophisticated NLP (spaCy for better entity extraction)
- PDF support
- Audio transcription
- More advanced timeline visualization
- Export capabilities

Just let me know what features you'd like to add!
