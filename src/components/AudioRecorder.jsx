// src/components/AudioRecorder.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

const AudioRecorder = ({ onRecordingComplete, maxDuration = 15 }) => {
  const { showToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  // Initialize audio context and analyser
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      microphoneRef.current.connect(analyserRef.current);
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        chunksRef.current = [];
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Call the callback with the recorded audio
        if (onRecordingComplete) {
          onRecordingComplete(blob, recordingTime);
        }
      };
      
      return true;
    } catch (error) {
      console.error('Error initializing audio:', error);
      showToast('Failed to access microphone. Please check permissions.', { type: 'error' });
      return false;
    }
  }, [onRecordingComplete, recordingTime, showToast]);

  // Update audio level meter
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const initialized = await initializeAudio();
    if (!initialized) return;
    
    chunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioURL('');
    setAudioBlob(null);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return prev + 0.1;
      });
    }, 100);
    
    // Start audio level monitoring
    updateAudioLevel();
    
    showToast('Recording started', { type: 'info' });
  }, [initializeAudio, maxDuration, showToast, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    
    showToast('Recording stopped', { type: 'success' });
  }, []);

  // Pause/resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 0.1;
        });
      }, 100);
      updateAudioLevel();
      showToast('Recording resumed', { type: 'info' });
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
      showToast('Recording paused', { type: 'info' });
    }
    
    setIsPaused(!isPaused);
  }, [isPaused, maxDuration, stopRecording, showToast, updateAudioLevel]);

  // Discard recording
  const discardRecording = useCallback(() => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL('');
    setAudioBlob(null);
    setRecordingTime(0);
    showToast('Recording discarded', { type: 'info' });
  }, [audioURL, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  // Format time display
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-recorder">
      <div className="recording-controls">
        {!isRecording ? (
          <button className="btn btn-primary" onClick={startRecording}>
            Start Recording
          </button>
        ) : (
          <div className="recording-active">
            <div className="recording-indicator">
              <div className={`recording-dot ${isPaused ? 'paused' : ''}`}></div>
              <span>{isPaused ? 'Paused' : 'Recording'}</span>
              <span className="recording-time">{formatTime(recordingTime)}</span>
              <span className="recording-max">/ {formatTime(maxDuration)}</span>
            </div>
            
            <div className="audio-level-meter">
              <div className="audio-level-bar" style={{ width: `${audioLevel * 100}%` }}></div>
            </div>
            
            <div className="recording-buttons">
              <button className="btn btn-secondary" onClick={togglePause}>
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button className="btn btn-primary" onClick={stopRecording}>
                Stop
              </button>
            </div>
          </div>
        )}
      </div>
      
      {audioURL && (
        <div className="recording-preview">
          <h3>Recording Preview</h3>
          <audio src={audioURL} controls />
          <div className="recording-actions">
            <button className="btn btn-primary" onClick={() => onRecordingComplete(audioBlob, recordingTime)}>
              Use This Recording
            </button>
            <button className="btn btn-secondary" onClick={discardRecording}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;