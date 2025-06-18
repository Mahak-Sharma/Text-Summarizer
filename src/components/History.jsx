import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Modal, Button, Form } from 'react-bootstrap';
import { FaFileAlt, FaVolumeUp, FaTrash, FaExpand, FaDownload } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import './History.css';

const History = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    const fetchSummaries = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Sort summaries by date in descending order (newest first)
          const sortedSummaries = userData.summaries?.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          ) || [];
          setSummaries(sortedSummaries);
        }
      } catch (err) {
        console.error('Error fetching summaries:', err);
        setError('Failed to load summaries');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [currentUser]);

  const handleDelete = async (summaryId) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const summaryToDelete = userData.summaries.find(s => s.id === summaryId);

        if (summaryToDelete) {
          await updateDoc(userDocRef, {
            summaries: arrayRemove(summaryToDelete)
          });

          // Update local state
          setSummaries(prevSummaries => 
            prevSummaries.filter(summary => summary.id !== summaryId)
          );
        }
      }
    } catch (err) {
      console.error('Error deleting summary:', err);
      setError('Failed to delete summary');
    }
  };

  const handleViewFullSummary = (summary) => {
    setSelectedSummary(summary);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (audioUrl) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'text-to-speech.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Container className="history-container">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="history-container">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (summaries.length === 0) {
    return (
      <Container className="history-container">
        <div className="text-center">
          <h2>No Summaries Yet</h2>
          <p className="text-muted">Your summarized documents will appear here</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="history-container">
      <h2 className="text-center mb-4">Summary History</h2>
      <Row>
        {summaries.map((summary) => (
          <Col key={summary.id} md={6} className="mb-4">
            <Card className="history-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h3 className="history-title">{summary.fileName}</h3>
                    <span className="history-date">{formatDate(summary.createdAt)}</span>
            </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleViewFullSummary(summary)}
                    >
                      <FaExpand />
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(summary.id)}
                    >
                      <FaTrash />
                    </button>
            </div>
          </div>
                <div className="history-type mb-3">
                  {summary.action === 'summarize' ? (
                    <span className="badge bg-primary">
                      <FaFileAlt className="me-1" />
                      Document Summary
                    </span>
                  ) : (
                    <span className="badge bg-info">
                      <FaVolumeUp className="me-1" />
                      Text to Speech
                    </span>
                  )}
                </div>
                <div className="history-summary">
                  {summary.summary}
                </div>
                {summary.action === 'text-to-speech' && summary.audioUrl && (
                  <div className="audio-player-container mt-3">
                    <div className="audio-controls">
                      <div className="speed-control">
                        <Form.Label>Playback Speed</Form.Label>
                        <Form.Select
                          value={playbackRate}
                          onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                          className="speed-select"
                        >
                          <option value="0.5">0.5x</option>
                          <option value="0.75">0.75x</option>
                          <option value="1.0">1.0x</option>
                          <option value="1.25">1.25x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2.0">2.0x</option>
                        </Form.Select>
                      </div>
                      <Button
                        variant="outline-primary"
                        onClick={() => handleDownload(summary.audioUrl)}
                        className="download-button"
                      >
                        <FaDownload className="me-2" />
                        Download
                      </Button>
                    </div>
                    <audio
                      controls
                      className="audio-player"
                      src={summary.audioUrl}
                      style={{ width: '100%' }}
                      onPlay={(e) => {
                        e.target.playbackRate = playbackRate;
                      }}
                      onRateChange={(e) => {
                        e.target.playbackRate = playbackRate;
                      }}
                    />
                  </div>
                )}
                <div className="history-meta mt-3">
                  <small className="text-muted">
                    File Type: {summary.fileType} | Size: {(summary.fileSize / 1024).toFixed(2)} KB
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Full Summary Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
        className="summary-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSummary?.fileName}
            <div className="modal-subtitle">
              <small className="text-muted">
                {selectedSummary && formatDate(selectedSummary.createdAt)}
              </small>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSummary && (
            <>
              <div className="modal-type mb-3">
                {selectedSummary.action === 'summarize' ? (
                  <span className="badge bg-primary">
                    <FaFileAlt className="me-1" />
                    Document Summary
                  </span>
                ) : (
                  <span className="badge bg-info">
                    <FaVolumeUp className="me-1" />
                    Text to Speech
                  </span>
                )}
              </div>
              <div className="modal-summary">
                {selectedSummary.summary}
      </div>
              <div className="modal-meta mt-3">
                <small className="text-muted">
                  File Type: {selectedSummary.fileType} | Size: {(selectedSummary.fileSize / 1024).toFixed(2)} KB
                </small>
    </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default History; 