import React, { useRef, useState, useEffect } from "react";
import "./Homepage.css";
import { FiUploadCloud, FiFile, FiCheck, FiPlay, FiPause } from "react-icons/fi";

const Homepage = () => {
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [action, setAction] = useState("summarize");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");
    setSummary("");
    setAudioUrl("");

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      let response;
      if (action === "summarize") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("action", action);
        
        response = await fetch("http://localhost:8000/api/process", {
          method: "POST",
          body: formData,
        });
      } else if (action === "text-to-speech") {
        let text;
        if (file.type === "text/plain") {
          text = await file.text();
        } else if (file.type === "application/pdf") {
          // For PDF files
          const formData = new FormData();
          formData.append("file", file);
          formData.append("action", "summarize"); 
          
          const processResponse = await fetch("http://localhost:8000/api/process", {
            method: "POST",
            body: formData,
          });
          
          const processData = await processResponse.json();
          if (!processData.success) {
            throw new Error(processData.message || "Failed to extract text from PDF");
          }
          text = processData.result;
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                  file.type === "application/msword") {
          // For DOCX/DOC files
          const formData = new FormData();
          formData.append("file", file);
          formData.append("action", "summarize");
          
          const processResponse = await fetch("http://localhost:8000/api/process", {
            method: "POST",
            body: formData,
          });
          
          const processData = await processResponse.json();
          if (!processData.success) {
            throw new Error(processData.message || "Failed to extract text from document");
          }
          text = processData.result;
        } else {
          throw new Error("Unsupported file type for text-to-speech");
        }

        if (!text || text.trim().length === 0) {
          throw new Error("No text content found in the document");
        }
        
        response = await fetch("http://localhost:8000/api/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text,
            voice_type: "male"
          }),
        });
      }

      clearInterval(interval);
      setProgress(100);

      if (action === "summarize") {
        const data = await response.json();
        if (data.success) {
          setSummary(data.result);
        } else {
          setError(data.message || "Failed to process document");
        }
      } else if (action === "text-to-speech") {
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          
          if (contentType && contentType.includes("audio/")) {
            try {
              const blob = await response.blob();
              const audioBlob = new Blob([blob], { type: 'audio/mpeg' });
              const url = URL.createObjectURL(audioBlob);
              
              // Test if the audio is valid
              const audio = new Audio();
              audio.src = url;
              
              await new Promise((resolve, reject) => {
                audio.onloadedmetadata = resolve;
                audio.onerror = () => reject(new Error('Audio failed to load'));
                setTimeout(() => reject(new Error('Audio loading timeout')), 5000);
              });
              
              setAudioUrl(url);
            } catch (error) {
              console.error("Audio processing error:", error);
              setError(`Failed to process audio: ${error.message}`);
            }
          } else {
            const errorData = await response.json();
            setError(errorData.message || "Failed to generate speech");
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: "Failed to generate speech" }));
          setError(errorData.message || "Failed to generate speech");
        }
      }
    } catch (err) {
      console.error("Request error:", err);
      setError(`Failed to connect to the server: ${err.message}`);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleAudioError = (e) => {
    console.error("Audio playback error:", e);
    setError("Failed to play audio. Please try again.");
  };

  return (
    <div className="background-container">
      <header className="header-layout">
        <div className="header-title">TextSummarizer</div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Transform Long Text into Clear Summaries</h1>
        <p className="hero-subtitle">
          Upload your documents and get instant, accurate summaries powered by AI
        </p>
      </section>

      {/* Upload Section */}
      <div className="upload-container">
        <div
          className="file-upload-section"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setFile(e.target.files[0])}
            accept=".pdf,.doc,.docx,.txt"
            style={{ display: "none" }}
          />
          <FiUploadCloud className="upload-icon" size={48} />
          <p>Drag and drop your file here or click to browse</p>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>
            Supports PDF, DOC, DOCX, and TXT files
          </p>
        </div>

        {file && (
          <div className="file-preview">
            <FiFile size={24} />
            <span>{file.name}</span>
            {progress === 100 && <FiCheck size={24} color="green" />}
          </div>
        )}

        <select
          className="action-select"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="summarize">Summarize Text</option>
          <option value="text-to-speech">Convert to Speech</option>
        </select>

        {uploading && (
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file || !action}
          className="upload-btn"
        >
          {uploading ? (
            <>
              <span className="loading-spinner" />
              Processing...
            </>
          ) : (
            "Process Document"
          )}
        </button>

        {/* Results Section */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {summary && (
          <div className="summary-container">
            <h3>Summary</h3>
            <p>{summary}</p>
          </div>
        )}

        {audioUrl && (
          <div className="audio-container">
            <h3>Audio Version</h3>
            <div className="audio-player">
              <button onClick={toggleAudio} className="play-button">
                {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
              </button>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                controls
                className="audio-element"
              />
            </div>
          </div>
        )}
      </div>

      {/* Features Section */}
      <section className="services">
        <h2>Our Features</h2>
        <div className="service-cards">
          <div className="service-card">
            <h3>Smart Summarization</h3>
            <p>
              Our AI-powered engine analyzes your text and generates concise,
              accurate summaries while preserving key information.
            </p>
          </div>
          <div className="service-card">
            <h3>Text to Speech</h3>
            <p>
              Convert your documents into natural-sounding speech for
              accessibility or convenience.
            </p>
          </div>
          <div className="service-card">
            <h3>Multiple Formats</h3>
            <p>
              Support for various document formats including PDF, DOC,
              DOCX, and plain text files.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-us">
        <h2>About TextSummarizer</h2>
        <p>
          TextSummarizer is your intelligent companion for processing and
          understanding text content. Whether you're a student, professional,
          or researcher, our AI-powered tools help you extract meaningful
          insights from any document quickly and accurately.
        </p>
      </section>
    </div>
  );
};

export default Homepage;
