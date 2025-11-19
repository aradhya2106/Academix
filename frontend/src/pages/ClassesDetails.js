import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './ClassesDetails.css';

const ClassesDetails = () => {
  const { classid } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');

  // assignments
  const [assignments, setAssignments] = useState([]);
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDue, setAssignDue] = useState('');
  const [editingAssign, setEditingAssign] = useState(null); // assignment being edited
  const [menuOpenId, setMenuOpenId] = useState(null); // three-dot menu

  const [showSubmitPopup, setShowSubmitPopup] = useState(false);
  const [submitFile, setSubmitFile] = useState(null);
  const [submissionStatuses, setSubmissionStatuses] = useState({}); // Track submission status for each assignment
  const [assignmentSubmissions, setAssignmentSubmissions] = useState({}); // Track submissions for each assignment (for teachers)
  const [showSubmissionsPopup, setShowSubmissionsPopup] = useState(null); // Show submissions popup for specific assignment

  const [showJoinPopup, setShowJoinPopup] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpError, setOtpError] = useState('');

  const navigate = useNavigate();


  const fetchClassDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/getclassbyid/${classid}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setClassroom(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch class details');
      }
    } catch (error) {
      toast.error('Error fetching class details');
    } finally {
      setLoading(false);
    }

  }

  useEffect(() => {
    fetchClassDetails();
  }, [classid]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/getuser`, {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data.data);
        } else {
          toast.error(data.message || 'Failed to fetch user data');
        }
      } catch (error) {
        toast.error('An error occurred while fetching user data');
      }
    };

    fetchUser();
  }, []);


  const handleAddPost = () => {
    setShowPopup(true);  // Show the popup

  }
  const handleSubmitPost = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/addpost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: postTitle,
          description: postDescription,
          classId: classid
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Post created successfully');
        setPostTitle('');  // Clear the input fields
        setPostDescription('');
        setShowPopup(false);  // Close the popup
        fetchClassDetails(); // Optionally refresh posts here
      } else {
        toast.error(data.message || 'Failed to create post');
      }
    }
    catch (error) {
      toast.error('An error occurred while creating the post');
    }

  }
  const handleClosePopup = () => {
    setShowPopup(false);  // Show the popup

  }
  const handleJoinRequest = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/request-to-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroomId: classid,
          studentEmail: user?.email,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setShowJoinPopup(false);
        setShowOtpPopup(true);
        toast.success('OTP sent to the class owner');
      } else {
        toast.error(data.message || 'Failed to send join request');
      }

    }
    catch (error) {
      toast.error('An error occurred while sending join request');
    }
  }

  const handleSubmitOtp = async () => {

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroomId: classid,
          studentEmail: user?.email,
          otp
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setOtp('');
        setShowOtpPopup(false);
        toast.success('Successfully joined the class');
        fetchClassDetails(); // Refresh the classroom details
      } else {
        setOtpError(data.message || 'Failed to verify OTP');
      }
    } catch (error) {
      console.log(error)
      toast.error('An error occurred while verifying OTP');
    }
  }
  const handleCloseOtpPopup = () => {
    setShowOtpPopup(false);
    setOtpError('');
  }

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/${classid}/assignments`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setAssignments(data.data || []);
        // Fetch submission status for each assignment if user is a student
        if (user?.role === 'student') {
          fetchSubmissionStatuses(data.data || []);
        }
      }
    } catch (e) {}
  }

  const fetchSubmissionStatuses = async (assignmentsList) => {
    const statuses = {};
    for (const assignment of assignmentsList) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments/${assignment._id}/submission-status`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok) {
          statuses[assignment._id] = data.data;
        }
      } catch (error) {
        console.error(`Error fetching submission status for assignment ${assignment._id}:`, error);
        statuses[assignment._id] = { submitted: false };
      }
    }
    setSubmissionStatuses(statuses);
  };

  const fetchAssignmentSubmissions = async (assignmentId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments/${assignmentId}/submissions`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setAssignmentSubmissions(prev => ({
          ...prev,
          [assignmentId]: data.data
        }));
      } else {
        toast.error(data.message || 'Failed to fetch submissions');
      }
    } catch (error) {
      toast.error('Error fetching submissions');
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [classid])

  // Fetch submission statuses when user data is available
  useEffect(() => {
    if (user?.role === 'student' && assignments.length > 0) {
      fetchSubmissionStatuses(assignments);
    }
  }, [user, assignments])

  const handleCreateAssignment = async () => {
    try {
      if (!assignTitle.trim()) {
        toast.error('Title is required');
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: classid,
          title: assignTitle.trim(),
          description: assignDesc.trim(),
          dueDate: assignDue || undefined
        })
      })
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to create assignment');
        return;
      }
      toast.success('Assignment created');
      setShowAssignPopup(false);
      setAssignTitle('');
      setAssignDesc('');
      setAssignDue('');
      fetchAssignments();
    } catch (e) {
      toast.error('Error creating assignment');
    }
  }

  const handleOpenEdit = (a) => {
    setEditingAssign({ ...a });
    setAssignTitle(a.title || '');
    setAssignDesc(a.description || '');
    setAssignDue(a.dueDate ? new Date(a.dueDate).toISOString().slice(0,16) : '');
  }

  const handleUpdateAssignment = async () => {
    try {
      if (!editingAssign) return;
      if (!assignTitle.trim()) {
        toast.error('Title is required');
        return;
      }
      // Use POST /update to avoid environments that block PUT/PATCH
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments/${editingAssign._id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: assignTitle.trim(),
          description: assignDesc.trim(),
          dueDate: assignDue || null
        })
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        // Force a readable message if backend sent HTML or empty body
        data = { message: 'Server did not return JSON' };
      }
      if (!res.ok) {
        toast.error(data.message || 'Failed to update');
        return;
      }
      toast.success('Assignment updated');
      setEditingAssign(null);
      setAssignTitle('');
      setAssignDesc('');
      setAssignDue('');
      fetchAssignments();
    } catch (e) {
      toast.error('Error updating assignment');
    }
  }

  const handleDeleteAssignment = async (id) => {
    try {
      if (!window.confirm('Delete this assignment?')) return;
      let res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.status === 404) {
        res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments/${id}/delete`, { method: 'POST', credentials: 'include' });
      }
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete');
        return;
      }
      toast.success('Assignment deleted');
      fetchAssignments();
    } catch (e) {
      toast.error('Error deleting assignment');
    }
  }

  const handleSubmitAssignment = async (assignmentId) => {
    try {
      if (!submitFile) {
        toast.error('Please choose a PDF to upload');
        return;
      }
      const form = new FormData();
      form.append('file', submitFile);
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/class/assignments/${assignmentId}/submit`, {
        method: 'POST',
        credentials: 'include',
        body: form
      })
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to submit');
        return;
      }
      toast.success('Submitted');
      setShowSubmitPopup(false);
      setSubmitFile(null);
      
      // Refresh submission status for this assignment
      if (user?.role === 'student') {
        // Update the specific assignment's submission status immediately
        setSubmissionStatuses(prev => ({
          ...prev,
          [assignmentId]: {
            submitted: true,
            submittedAt: new Date().toISOString(),
            grade: null,
            feedback: '',
            files: []
          }
        }));
        // Also fetch fresh data to ensure accuracy
        fetchSubmissionStatuses(assignments);
      }
    } catch (e) {
      toast.error('Error submitting assignment');
    }
  }




  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const isStudent = classroom?.students?.includes(user?.email);
  const isOwner = classroom?.owner == user?._id


  return (
    <div className="class-details">
      <div className="section1">
        <img
          src="https://via.placeholder.com/150"  // Dummy image
          alt="Classroom"
          className="class-image"
        />
        <h1 className="class-name">{classroom?.name}</h1>
        <p className="class-description">{classroom?.description}</p>

        {isOwner && (
          <div className="classroom-info">
            <div className="join-code-section">
              <h3>Classroom Join Code</h3>
              <div className="join-code-display">
                <span className="join-code">{classroom?.joinCode}</span>
                <button 
                  className="copy-code-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(classroom?.joinCode);
                    toast.success('Join code copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="join-code-instructions">
                Share this code with students so they can join your classroom.
              </p>
            </div>
            <button className="add-post-btn" onClick={handleAddPost}>
              Add Post
            </button>
          </div>
        )}

        {!isStudent && !isOwner && user?.role === 'student' && (
          <button className="add-post-btn" onClick={() => setShowJoinPopup(true)}>
            Join Class
          </button>
        )}
      </div>

      <div className='post-grid'>
        {
          (isStudent || isOwner) && classroom?.posts?.length > 0 ? (
            classroom.posts.map((post, index) => (
              <div key={index} className="post-card">
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <small>{new Date(post.createdAt).toLocaleDateString()}</small>
              </div>

            ))
          ) : (
            <p>No posts available</p>
          )

        }
      </div>

      <div className='post-grid' style={{ marginTop: 24 }}>
        <div className="post-card" style={{ flex: 1 }}>
          <h3>Assignments</h3>
          {isOwner && (
            <button className="add-post-btn" onClick={() => setShowAssignPopup(true)}>Create Assignment</button>
          )}
          {assignments.length === 0 ? (
            <p style={{ marginTop: 10 }}>No assignments yet.</p>
          ) : (
            assignments.map((a) => (
              <div key={a._id} className="assignment-item">
                <div className="assignment-header">
                  <h3 className="assignment-title">{a.title}</h3>
                  {isOwner && (
                    <div className="assignment-menu">
                      <button 
                        className="view-submissions-btn"
                        onClick={() => {
                          fetchAssignmentSubmissions(a._id);
                          setShowSubmissionsPopup(a._id);
                        }}
                        title="View Student Submissions"
                      >
                        📋 View Submissions
                      </button>
                      <button 
                        className="menu-trigger" 
                        onClick={() => setMenuOpenId(menuOpenId === a._id ? null : a._id)}
                        aria-label="More actions"
                      >
                        ⋯
                      </button>
                      {menuOpenId === a._id && (
                        <div className="menu-dropdown">
                          <button 
                            className="menu-item" 
                            onClick={() => { setMenuOpenId(null); handleOpenEdit(a); }}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="menu-item delete" 
                            onClick={() => { setMenuOpenId(null); handleDeleteAssignment(a._id); }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {a.description && <p>{a.description}</p>}
                {a.dueDate && <small>📅 Due: {new Date(a.dueDate).toLocaleString()}</small>}
                
                {/* Show submission status for students */}
                {isStudent && (
                  <div style={{ marginTop: 10 }}>
                    {submissionStatuses[a._id]?.submitted ? (
                      <div className="submission-status submitted">
                        <span className="status-icon">✅</span>
                        <span className="status-text">
                          Submitted on {new Date(submissionStatuses[a._id].submittedAt).toLocaleString()}
                        </span>
                        {submissionStatuses[a._id].grade !== null && (
                          <span className="grade-display">
                            Grade: {submissionStatuses[a._id].grade}
                          </span>
                        )}
                        {submissionStatuses[a._id].feedback && (
                          <div className="feedback-display">
                            <strong>Feedback:</strong> {submissionStatuses[a._id].feedback}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="submission-status not-submitted">
                        <span className="status-icon">⏳</span>
                        <span className="status-text">Not submitted yet</span>
                        <button className="add-post-btn" onClick={() => setShowSubmitPopup(a._id)}>
                          📤 Submit Assignment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Add Post</h3>
            <input
              type="text"
              placeholder="Title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
            />
            <textarea
              placeholder="Description"
              value={postDescription}
              onChange={(e) => setPostDescription(e.target.value)}
            />
            <div className="popup-buttons">
              <button onClick={handleSubmitPost}>Submit</button>
              <button onClick={handleClosePopup}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showAssignPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>📝 Create Assignment</h3>
            <input
              type="text"
              placeholder="Assignment Title"
              value={assignTitle}
              onChange={(e) => setAssignTitle(e.target.value)}
            />
            <textarea
              placeholder="Assignment Description (optional)"
              value={assignDesc}
              onChange={(e) => setAssignDesc(e.target.value)}
            />
            <input
              type="datetime-local"
              placeholder="Due Date (optional)"
              value={assignDue}
              onChange={(e) => setAssignDue(e.target.value)}
            />
            <div className="popup-buttons">
              <button onClick={handleCreateAssignment}>✨ Create</button>
              <button onClick={() => setShowAssignPopup(false)}>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingAssign && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>✏️ Edit Assignment</h3>
            <input
              type="text"
              placeholder="Assignment Title"
              value={assignTitle}
              onChange={(e) => setAssignTitle(e.target.value)}
            />
            <textarea
              placeholder="Assignment Description (optional)"
              value={assignDesc}
              onChange={(e) => setAssignDesc(e.target.value)}
            />
            <input
              type="datetime-local"
              placeholder="Due Date (optional)"
              value={assignDue}
              onChange={(e) => setAssignDue(e.target.value)}
            />
            <div className="popup-buttons">
              <button onClick={handleUpdateAssignment}>💾 Save Changes</button>
              <button onClick={() => { setEditingAssign(null); setAssignTitle(''); setAssignDesc(''); setAssignDue(''); }}>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {Boolean(showSubmitPopup) && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>📤 Submit Assignment</h3>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>Upload your PDF, images, or code files</p>
            <input
              type="file"
              accept="application/pdf,image/*,.zip,.rar,.tar.gz"
              onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
            />
            <div className="popup-buttons">
              <button onClick={() => handleSubmitAssignment(showSubmitPopup)}>🚀 Submit</button>
              <button onClick={() => { setShowSubmitPopup(false); setSubmitFile(null) }}>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}


      {showJoinPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Join Request</h3>
            <p>Do you want to join this class? An OTP will be sent to the class owner for approval.</p>

            <div className="popup-buttons">

              <button onClick={handleJoinRequest}>Send Join Request</button>
              <button onClick={() => setShowJoinPopup(false)}>Close</button>
            </div>
          </div>

        </div>

      )}


      {showOtpPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Enter OTP</h3>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            {otpError && <p className="otp-error">{otpError}</p>}

            <div className="popup-buttons">
              <button onClick={handleSubmitOtp}>Submit</button>
              <button onClick={handleCloseOtpPopup}>Close</button>
            </div>
          </div></div>
      )}

      {/* Submissions Popup for Teachers */}
      {showSubmissionsPopup && (
        <div className="popup-overlay">
          <div className="popup-content submissions-popup">
            <h3>📋 Student Submissions</h3>
            <div className="submissions-list">
              {assignmentSubmissions[showSubmissionsPopup]?.length > 0 ? (
                assignmentSubmissions[showSubmissionsPopup].map((submission) => (
                  <div key={submission._id} className="submission-item">
                    <div className="submission-header">
                      <h4>{submission.studentId.name}</h4>
                      <span className="submission-date">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="submission-details">
                      {submission.textAnswer && (
                        <p><strong>Text Answer:</strong> {submission.textAnswer}</p>
                      )}
                      {submission.files?.length > 0 && (
                        <div className="submission-files">
                          <strong>Files:</strong>
                          {submission.files.map((file, index) => (
                            <a 
                              key={index} 
                              href={`${process.env.REACT_APP_API_BASE_URL}${file.url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="file-link"
                            >
                              📎 {file.filename}
                            </a>
                          ))}
                        </div>
                      )}
                      {submission.grade !== null && (
                        <p><strong>Grade:</strong> {submission.grade}</p>
                      )}
                      {submission.feedback && (
                        <p><strong>Feedback:</strong> {submission.feedback}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-submissions">No submissions yet.</p>
              )}
            </div>
            <div className="popup-buttons">
              <button onClick={() => setShowSubmissionsPopup(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ClassesDetails