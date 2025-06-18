import React, { useState, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Form,
} from "react-bootstrap";
import {
  FaFileUpload,
  FaSpinner,
  FaFileAlt,
  FaVolumeUp,
  FaLock,
  FaPlay,
  FaPause,
  FaStop,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import SpeechToText from "./SpeechToText";
import "./HomePage.css";

const HomePage = () => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    if (!currentUser) {
      setShowAuthPrompt(true);
      return;
    }

    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
      // Reset audio states when new file is selected
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  const saveToFirebase = async (fileData, summaryText) => {
    try {
      const userDocRef = doc(db, "users", currentUser.uid);

      const summaryData = {
        id: Date.now().toString(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        action: selectedAction,
        summary: summaryText,
        createdAt: new Date().toISOString(),
      };

      try {
        await updateDoc(userDocRef, {
          summaries: arrayUnion(summaryData),
        });
      } catch (error) {
        if (error.code === "not-found") {
          await setDoc(userDocRef, {
            userId: currentUser.uid,
            email: currentUser.email,
            summaries: [summaryData],
            createdAt: serverTimestamp(),
          });
        } else {
          throw error;
        }
      }

      console.log("Summary saved successfully");
    } catch (err) {
      console.error("Error saving to Firebase:", err);
      setError("Failed to save summary to database");
    }
  };

  const handlePlay = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Error playing audio:", err);
        setError("Failed to play audio. Please try again.");
      }
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleUpload = async () => {
    if (!currentUser) {
      setShowAuthPrompt(true);
      return;
    }

    if (!file) {
      setError("Please select a file first");
      return;
    }

    if (!selectedAction) {
      setError("Please select an action first");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      if (selectedAction === "summarize") {
        const response = await fetch(`http://localhost:8000/api/process`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          setSummary(data.result);
          await saveToFirebase(file, data.result);
        } else {
          throw new Error(data.message || "Failed to summarize document");
        }
      } else {
        // For text-to-speech, first get the text content
        const textResponse = await fetch(`http://localhost:8000/api/process`, {
          method: "POST",
          body: formData,
        });

        if (!textResponse.ok) {
          throw new Error(`Error: ${textResponse.statusText}`);
        }

        const textData = await textResponse.json();
        if (!textData.success) {
          throw new Error(textData.message || "Failed to process document");
        }

        // Save the extracted text to Firebase
        await saveToFirebase(file, textData.result);

        // Then convert the text to speech
        const audioResponse = await fetch(
          `http://localhost:8000/api/text-to-speech`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: textData.result,
              voice_type: "default",
            }),
          }
        );

        if (!audioResponse.ok) {
          throw new Error(`Error: ${audioResponse.statusText}`);
        }

        const audioBlob = await audioResponse.blob();
        const url = URL.createObjectURL(audioBlob);

        // Create new audio element
        const audio = new Audio();
        audio.src = url;
        audio.preload = "metadata";

        // Wait for metadata to load
        await new Promise((resolve) => {
          audio.addEventListener("loadedmetadata", resolve, { once: true });
        });

        setAudioUrl(url);
        audioRef.current = audio;
      }
    } catch (err) {
      setError(err.message || "An error occurred while processing the file");
      console.error("Error details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (showAuthPrompt) {
    return (
      <Container className="home-container">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="upload-card">
              <Card.Body className="text-center">
                <FaLock className="lock-icon mb-3" size={48} />
                <h2>Authentication Required</h2>
                <p className="text-muted mb-4">
                  Please login to use the file processing features
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate("/login")}
                  className="login-btn"
                >
                  Go to Login
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="home-container">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="upload-card">
            <Card.Body>
              <h2 className="text-center mb-4">Add Texts to summarize</h2>

              <div className="action-buttons mb-4">
                <Button
                  variant={
                    selectedAction === "summarize"
                      ? "primary"
                      : "outline-primary"
                  }
                  className="action-btn"
                  onClick={() => setSelectedAction("summarize")}
                  disabled={loading}
                >
                  <FaFileAlt className="me-2" />
                  Summarize Document
                </Button>
                <Button
                  variant={
                    selectedAction === "text-to-speech"
                      ? "primary"
                      : "outline-primary"
                  }
                  className="action-btn"
                  onClick={() => setSelectedAction("text-to-speech")}
                  disabled={loading}
                >
                  <FaVolumeUp className="me-2" />
                  Convert to Speech
                </Button>
              </div>

              <div className="upload-section">
                <input
                  type="file"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".txt,.pdf,.doc,.docx"
                />
                <Button
                  variant="primary"
                  className="upload-btn"
                  onClick={() => fileInputRef.current.click()}
                  disabled={loading}
                >
                  <FaFileUpload className="me-2" />
                  Select File
                </Button>
                {file && (
                  <div className="selected-file">Selected: {file.name}</div>
                )}
              </div>

              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}

              <div className="text-center mt-4">
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  disabled={!file || !selectedAction || loading}
                  className="process-btn"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spinner me-2" />
                      Processing...
                    </>
                  ) : (
                    "Process File"
                  )}
                </Button>
              </div>

              {summary && (
                <div className="summary-section mt-4">
                  <h3>Summary</h3>
                  <div className="summary-content">{summary}</div>
                </div>
              )}

              {audioUrl && (
                <div className="audio-player-container">
                  <h3>
                    <FaVolumeUp className="audio-icon" />
                    Audio Player
                  </h3>
                  <div className="audio-controls">
                    <div className="speed-control">
                      <label>Playback Speed:</label>
                      <select
                        className="speed-select"
                        value={playbackRate}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value);
                          setPlaybackRate(rate);
                          if (audioRef.current) {
                            audioRef.current.playbackRate = rate;
                          }
                        }}
                      >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1.0">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2.0">2.0x</option>
                      </select>
                    </div>
                    <div className="custom-audio-player">
                      <div className="player-controls">
                        <div className="control-buttons">
                          {!isPlaying ? (
                            <Button
                              className="play-button"
                              onClick={handlePlay}
                              title="Play"
                            >
                              <FaPlay />
                            </Button>
                          ) : (
                            <Button
                              className="pause-button"
                              onClick={handlePause}
                              title="Pause"
                            >
                              <FaPause />
                            </Button>
                          )}
                          <Button
                            className="stop-button"
                            onClick={handleStop}
                            title="Stop"
                          >
                            <FaStop />
                          </Button>
                        </div>
                        <div className="time-display">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        <input
                          type="range"
                          className="progress-bar"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          disabled={!audioUrl}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={12}>
          <SpeechToText />
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;
