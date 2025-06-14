# Smart Copy Pro - Chrome Extension

A powerful Chrome extension that enhances your copying experience with features like auto-copy on selection, clipboard history, and privacy protection.

## Features

- **Auto-Copy**: Automatically copies selected text to clipboard
- **Clipboard History**: Keeps track of your recently copied items
- **Privacy Filter**: Protects sensitive information from being copied
- **Smart Detection**: Ignores code blocks and non-human-readable text
- **Visual Feedback**: Shows a confirmation when text is copied
- **Keyboard Shortcuts**: Quick toggle for extension features

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup
```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Development mode with hot reload
npm run dev
```

### Project Structure
```
smart-copy-pro/
├── src/
│   ├── background.js    # Background service worker
│   ├── content.js       # Content script
│   ├── popup.js         # Popup UI logic
│   └── options.js       # Options page logic
├── public/
│   ├── manifest.json    # Extension manifest
│   ├── popup.html      # Popup UI
│   ├── options.html    # Options page
│   └── icons/          # Extension icons
└── dist/               # Built extension files
```

## Features in Detail

### Auto-Copy
- Automatically copies selected text to clipboard
- Ignores code blocks and non-human-readable text
- Visual feedback when text is copied

### Clipboard History
- Stores up to 50 recent copies
- Easy access through popup
- Click to copy from history

### Privacy Filter
- Detects and blocks sensitive information:
  - Credit card numbers
  - Passwords
  - Email addresses
  - Phone numbers

### Smart Detection
- Ignores code blocks (text containing {, }, or ;)
- Filters out very short text
- Excludes text with only numbers or special characters

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors
- Inspired by the need for a smarter clipboard experience 