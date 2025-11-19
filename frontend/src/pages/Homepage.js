import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import './Homepage.css'

const Homepage = () => {
  const navigate = useNavigate()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [loading, setLoading] = useState(true)
  const [myClasses, setMyClasses] = useState([])
  const [enrolledClasses, setEnrolledClasses] = useState([])
  const [user, setUser] = useState(null)

  const api = process.env.REACT_APP_API_BASE_URL

  const fetchClasses = async () => {
    try {
      setLoading(true)

      if (user?.role === 'teacher') {
        // Teachers only see their created classes
        const mineRes = await fetch(`${api}/class/classroomscreatedbyme`, { credentials: 'include' })
        const mineData = await mineRes.json()

        if (mineRes.ok) {
          setMyClasses(mineData.data || [])
        } else if (mineRes.status !== 404) {
          toast.error(mineData.message || 'Failed to load your classrooms')
        } else {
          setMyClasses([])
        }
        // Teachers don't have enrolled classes
        setEnrolledClasses([])
      } else {
        // Students only see enrolled classes
        const enrolledRes = await fetch(`${api}/class/classroomsforstudent`, { credentials: 'include' })
        const enrolledData = await enrolledRes.json()

        if (enrolledRes.ok) {
          setEnrolledClasses(enrolledData.data || [])
        } else if (enrolledRes.status !== 404) {
          toast.error(enrolledData.message || 'Failed to load enrolled classrooms')
        } else {
          setEnrolledClasses([])
        }
        // Students don't have created classes
        setMyClasses([])
      }
    } catch (e) {
      toast.error('Network error while loading classrooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${api}/auth/getuser`, { credentials: 'include' })
        const data = await res.json()
        if (res.ok) setUser(data.data)
      } catch (e) {}
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch classes when user data is available
  useEffect(() => {
    if (user) {
      fetchClasses()
    }
  }, [user])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Classroom name is required')
      return
    }

    try {
      const res = await fetch(`${api}/class/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), description: description.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Failed to create classroom')
        return
      }
      toast.success('Classroom created')
      setCreating(false)
      setName('')
      setDescription('')
      const newId = data?.data?._id
      if (newId) {
        navigate(`/classes/${newId}`)
      } else {
        fetchClasses()
      }
    } catch (e) {
      toast.error('Network error while creating classroom')
    }
  }

  const Card = ({ classroom }) => (
    <div className="class-card" onClick={() => navigate(`/classes/${classroom._id}`)}>
      <div className="class-card__banner" />
      <div className="class-card__body">
        <h3 className="class-card__title">{classroom.name}</h3>
        {classroom.description && (
          <p className="class-card__desc">{classroom.description}</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="home">
      <div className="home__header">
        <h1>Classrooms</h1>
        {user?.role === 'teacher' && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>Create classroom</button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {user?.role === 'teacher' ? (
            /* Teachers only see their created classes */
            <section className="section">
              <div className="section__head">
                <h2>Your Classes</h2>
              </div>
              {myClasses.length === 0 ? (
                <p className="muted">You haven't created any classes yet.</p>
              ) : (
                <div className="grid">
                  {myClasses.map(c => (
                    <Card key={c._id} classroom={c} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* Students only see enrolled classes */
            <section className="section">
              <div className="section__head">
                <h2>My Classes</h2>
              </div>
              {enrolledClasses.length === 0 ? (
                <p className="muted">You are not enrolled in any classes yet.</p>
              ) : (
                <div className="grid">
                  {enrolledClasses.map(c => (
                    <Card key={c._id} classroom={c} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {creating && (
        <div className="modal__backdrop" onClick={() => setCreating(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create classroom</h3>
            <form onSubmit={handleCreate} className="form">
              <label className="label">Name<span className="required">*</span></label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Physics 101"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label className="label">Description</label>
              <textarea
                className="textarea"
                placeholder="Describe the class (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="actions">
                <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Homepage