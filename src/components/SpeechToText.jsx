import React, { useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
import { FaMicrophone, FaStop, FaSpinner, FaFileUpload, FaLock } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SpeechToText.css';

const SpeechToText = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [detailedSummary, setDetailedSummary] = useState('');
    const [overallSummary, setOverallSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedMode, setSelectedMode] = useState('upload');
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const startRecording = async () => {
        if (!currentUser) {
            setShowAuthPrompt(true);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
                await processAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setError('');
        } catch (err) {
            setError('Error accessing microphone: ' + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleFileUpload = (event) => {
        if (!currentUser) {
            setShowAuthPrompt(true);
            return;
        }

        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('audio/')) {
                setError('Please upload an audio file');
                return;
            }
            processAudio(file);
        }
    };

    const processAudio = async (audioFile) => {
        if (!currentUser) {
            setShowAuthPrompt(true);
            return;
        }

        setLoading(true);
        setError('');
        setTranscription('');
        setDetailedSummary('');
        setOverallSummary('');

        const formData = new FormData();
        formData.append('audio_file', audioFile);

        try {
            const response = await fetch('https://text-summarizer-backend.onrender.com/api/speech-to-text', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                setTranscription(data.transcribed_text);
                setDetailedSummary(data.summary);
                setOverallSummary(data.overall_summary);
            } else {
                throw new Error(data.message || 'Failed to process audio');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while processing the audio');
            console.error('Error details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (showAuthPrompt) {
        return (
            <Container className="speech-to-text-container">
                <Row className="justify-content-center">
                    <Col md={8}>
                        <Card className="speech-card">
                            <Card.Body className="text-center">
                                <FaLock className="lock-icon mb-3" size={48} />
                                <h2>Authentication Required</h2>
                                <p className="text-muted mb-4">
                                    Please login to use the Speech to Text feature
                                </p>
                                <Button
                                    variant="primary"
                                    onClick={() => navigate('/login')}
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
        <Container className="speech-to-text-container">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="speech-card">
                        <Card.Body>
                            <h2 className="text-center mb-4">Speech to Text</h2>

                            <Form.Group className="mb-4">
                                <Form.Label>Select Input Method</Form.Label>
                                <Form.Select 
                                    value={selectedMode}
                                    onChange={(e) => setSelectedMode(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="upload">Upload Audio File</option>
                                    <option value="record">Record Audio</option>
                                </Form.Select>
                            </Form.Group>

                            {selectedMode === 'record' ? (
                                <div className="recording-controls text-center">
                                    {!isRecording ? (
                                        <Button
                                            variant="primary"
                                            onClick={startRecording}
                                            className="record-btn"
                                            disabled={loading}
                                        >
                                            <FaMicrophone className="me-2" />
                                            Start Recording
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="danger"
                                            onClick={stopRecording}
                                            className="stop-btn"
                                        >
                                            <FaStop className="me-2" />
                                            Stop Recording
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="upload-section text-center">
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="audio/*"
                                    />
                                    <Button
                                        variant="primary"
                                        onClick={() => fileInputRef.current.click()}
                                        className="upload-btn"
                                        disabled={loading}
                                    >
                                        <FaFileUpload className="me-2" />
                                        Upload Audio File
                                    </Button>
                                    <p className="text-muted mt-2">
                                        Supported formats: WAV, MP3, M4A, etc.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <Alert variant="danger" className="mt-3">
                                    {error}
                                </Alert>
                            )}

                            {loading && (
                                <div className="text-center mt-4">
                                    <FaSpinner className="spinner" />
                                    <p>Processing audio...</p>
                                </div>
                            )}

                            {transcription && (
                                <div className="transcription-box mt-4">
                                    <h3>Transcription</h3>
                                    <div className="transcription-content">
                                        {transcription}
                                    </div>
                                </div>
                            )}

                            {detailedSummary && (
                                <div className="summary-box mt-4">
                                    <h3>Detailed Summary</h3>
                                    <div className="summary-content">
                                        {detailedSummary}
                                    </div>
                                </div>
                            )}

                            {overallSummary && (
                                <div className="summary-box mt-4">
                                    <h3>Overall Summary</h3>
                                    <div className="summary-content">
                                        {overallSummary}
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default SpeechToText; 