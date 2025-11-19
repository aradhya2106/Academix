import React, { useState } from 'react'
import { toast } from 'react-toastify'

const ForgotPassword = () => {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const api = process.env.REACT_APP_API_BASE_URL

  const handleSendOtp = async () => {
    if (!email) return toast.error('Enter your email')
    try {
      const res = await fetch(`${api}/auth/sendotp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.message || 'Failed to send OTP')
      toast.success('OTP sent to your email')
      setStep(2)
    } catch (e) {
      toast.error('Network error')
    }
  }

  const handleReset = async () => {
    if (!otp || !newPassword) return toast.error('OTP and new password required')
    try {
      const res = await fetch(`${api}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.message || 'Reset failed')
      toast.success('Password reset. Please login.')
      setStep(1)
      setOtp('')
      setNewPassword('')
    } catch (e) {
      toast.error('Network error')
    }
  }

  return (
    <div className="login-page">
      <h1>Reset password</h1>
      {step === 1 ? (
        <>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button onClick={handleSendOtp}>Send OTP</button>
        </>
      ) : (
        <>
          <input type="text" placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleReset}>Reset password</button>
        </>
      )}
    </div>
  )
}

export default ForgotPassword









