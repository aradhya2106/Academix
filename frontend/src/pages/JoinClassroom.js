import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './JoinClassroom.css';

const JoinClassroom = () => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a join code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/join-by-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Successfully joined the classroom!');
        navigate('/'); // Redirect to homepage to see the new classroom
      } else {
        toast.error(data.message || 'Failed to join classroom');
      }
    } catch (error) {
      toast.error('An error occurred while joining the classroom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-classroom-page">
      <div className="join-classroom-container">
        <h1>Join Classroom</h1>
        <p className="join-instructions">
          Enter the 6-character join code provided by your teacher to join a classroom.
        </p>
        
        <form onSubmit={handleJoin} className="join-form">
          <div className="input-group">
            <label htmlFor="joinCode">Join Code</label>
            <input
              id="joinCode"
              type="text"
              placeholder="e.g., ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength="6"
              className="join-code-input"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="join-btn"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Classroom'}
          </button>
        </form>

        <div className="help-section">
          <h3>How to get a join code?</h3>
          <ul>
            <li>Ask your teacher for the classroom join code</li>
            <li>The code is usually 6 characters long (letters and numbers)</li>
            <li>You can also search for classrooms using the search icon in the navbar</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinClassroom;
