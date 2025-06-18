# Text Summarizer

A comprehensive web application that provides document summarization, speech-to-text conversion and text-to-speech functionality with user authentication and history tracking.

## 🚀 Features

### 📄 Document Processing
- **Multi-format Support**: Upload and process PDF, DOCX, and TXT files
- **Smart Summarization**: Uses advanced AI models (BART-large-CNN) for high-quality text summarization
- **Intelligent Chunking**: Automatically splits large documents into manageable chunks for better processing
- **Quality Optimization**: Implements advanced parameters for optimal summary generation

### 🎤 Speech-to-Text
- **Real-time Recording**: Record audio directly in the browser
- **File Upload**: Upload existing audio files for transcription
- **Dual Summary Generation**: 
  - Detailed summary of the transcribed content
  - Overall summary for quick understanding
- **Multiple Audio Formats**: Supports various audio file formats

### 🔊 Text-to-Speech
- **Audio Generation**: Convert summarized text to speech
- **Customizable Playback**: Adjustable playback speed (0.5x to 2.0x)
- **Audio Controls**: Play, pause, stop, and seek functionality
- **Download Support**: Download generated audio files

### 🔐 User Authentication
- **Firebase Authentication**: Secure user registration and login
- **Session Management**: Automatic session persistence
- **Protected Routes**: Secure access to premium features

### 📚 History Management
- **Summary History**: Track all processed documents and summaries
- **Detailed Metadata**: Store file information, processing type, and timestamps
- **Search & Filter**: Easy access to previous summaries
- **Delete Functionality**: Remove unwanted entries

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **React Router DOM** - Client-side routing
- **React Bootstrap** - UI components and styling
- **React Icons** - Icon library
- **Vite** - Fast build tool and development server

### Backend
- **FastAPI** - High-performance Python web framework
- **Transformers** - Hugging Face transformers for AI models
- **PyTorch** - Deep learning framework
- **PDFPlumber** - PDF text extraction
- **Python-docx** - DOCX file processing
- **SpeechRecognition** - Speech-to-text conversion
- **gTTS** - Google Text-to-Speech

### Database & Authentication
- **Firebase Firestore** - NoSQL cloud database
- **Firebase Authentication** - User authentication service
- **Firebase Analytics** - Usage analytics (production)

### AI Models
- **BART-large-CNN** - Advanced summarization model
- **Custom Text Processing** - Intelligent chunking and cleaning algorithms

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- npm or yarn package manager

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Text-Summarizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   VITE_BACKEND_URL=http://localhost:8000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   HF_TOKEN=your_huggingface_token
   NGROK_URL=your_ngrok_url  # Optional for development
   ```

5. **Start backend server**
   ```bash
   python main.py
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore
3. Update `src/firebase/config.js` with your Firebase configuration

### Hugging Face Token
1. Get your Hugging Face token from [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Add it to the backend `.env` file

## 🚀 Usage

### Document Summarization
1. **Login** to your account
2. **Upload** a PDF, DOCX, or TXT file
3. **Select** "Summarize" action
4. **Process** the document
5. **View** the generated summary
6. **Save** to history automatically

### Speech-to-Text
1. **Navigate** to Speech-to-Text page
2. **Choose** input method (record or upload)
3. **Process** the audio
4. **View** transcription and summaries
5. **Access** detailed and overall summaries

### Text-to-Speech
1. **Generate** a summary first
2. **Click** the audio button
3. **Listen** to the generated speech
4. **Adjust** playback speed as needed
5. **Download** the audio file

### History Management
1. **Access** the History page
2. **Browse** all previous summaries
3. **View** full summaries in modal
4. **Delete** unwanted entries
5. **Download** audio files

## 📁 Project Structure

```
Text-Summarizer/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Main API server
│   ├── speech_to_text.py   # Speech processing
│   ├── text_to_speech.py   # TTS functionality
│   ├── requirements.txt    # Python dependencies
│   └── venv/              # Virtual environment
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── HomePage.jsx    # Main document processing
│   │   ├── SpeechToText.jsx # Speech-to-text feature
│   │   ├── History.jsx     # History management
│   │   ├── Login.jsx       # Authentication
│   │   └── Navigation.jsx  # Navigation component
│   ├── contexts/           # React contexts
│   │   └── AuthContext.jsx # Authentication context
│   ├── firebase/           # Firebase configuration
│   │   └── config.js       # Firebase setup
│   └── App.jsx             # Main app component
├── public/                 # Static assets
├── package.json            # Node.js dependencies
├── vite.config.js          # Vite configuration
└── README.md               # Project documentation
```

## 🔒 Security Features

- **CORS Protection**: Configured CORS middleware
- **Session Management**: Secure session persistence
- **Protected Routes**: Authentication-required features
- **Input Validation**: File type and size validation
- **Error Handling**: Comprehensive error management

## 🚀 Deployment

### Frontend Deployment
1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting**
   ```bash
   firebase deploy
   ```

### Backend Deployment
1. **Deploy to cloud platform** (Heroku, Railway, etc.)
2. **Set environment variables**
3. **Update CORS origins** in `main.py`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Version History

- **v1.0.0**: Initial release with core features
- Document summarization
- Speech-to-text conversion
- Text-to-speech generation
- User authentication
- History management

---
