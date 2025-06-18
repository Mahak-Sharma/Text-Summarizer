# Text Summarizer

A full-stack web application that provides text summarization capabilities with additional features like text-to-speech conversion. The application can process text from various sources including plain text, PDF files, and Word documents.

## Features

- Text summarization using advanced AI models
- Support for multiple input formats:
  - Plain text
  - PDF files
  - Word documents
- Text-to-speech conversion
- Modern and responsive user interface
- Real-time processing

## Tech Stack

### Frontend
- React.js
- Vite
- Bootstrap 5
- React Router DOM
- React Icons

### Backend
- FastAPI (Python)
- Transformers (Hugging Face)
- PyTorch
- PDF Plumber
- Python-docx
- pyttsx3 (Text-to-Speech)

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8 or higher
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
<<<<<<< HEAD
git clone https://github.com/Mahak-Sharma/text-summarizer.git
=======
git clone https://github.com/yourusername/text-summarizer.git
>>>>>>> master
cd text-summarizer
```

2. Install frontend dependencies:
```bash
npm install
```

3. Set up the backend:
```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On Unix or MacOS
source venv/bin/activate
pip install -r requirements.txt
```

## Running the Application

1. Start both frontend and backend servers with a single command:
```bash
npm start
```

Or run them separately:

2. Start the backend server:
```bash
cd backend
python -m uvicorn main:app --reload
```

3. Start the frontend development server:
```bash
npm run dev
```

<<<<<<< HEAD
=======
The application will be available at `http://localhost:5173`

>>>>>>> master
## API Endpoints

- `POST /summarize`: Summarize text from various sources
- `POST /text-to-speech`: Convert text to speech

<<<<<<< HEAD
## 🛠 Future Enhancements
- **Speech-to-text summarization** with python libraries summarizing the speech.
- **Image Recognition** for extracting information from image.

## 🤝 Contributing
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit changes (`git commit -m 'Added feature X'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a Pull Request.
=======
## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
>>>>>>> master

## Acknowledgments

- Hugging Face Transformers library
- FastAPI framework
- React.js community
