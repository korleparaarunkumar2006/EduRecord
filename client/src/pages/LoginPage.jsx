import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaGraduationCap, FaIdBadge, FaKey, FaEye, FaEyeSlash, FaArrowRight } from 'react-icons/fa6';
import { loginFaculty } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ facultyId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, token } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.facultyId.trim() || !form.password) {
      toast.error('Please enter your Faculty ID and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginFaculty(form);
      if (res.data.success) {
        login(res.data.token, res.data.faculty);
        toast.success(`Welcome back, ${res.data.faculty.name}!`);
        navigate('/');
      } else {
        toast.error(res.data.message || 'Login failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo">
            <FaGraduationCap />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 className="login-title">EduRecord Login</h1>
            <p className="login-subtitle">Student Information System — Faculty Access</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <FaIdBadge /> Faculty ID
            </label>
            <input
              className="form-input"
              type="text"
              name="facultyId"
              placeholder="e.g. CSE-ADM-001"
              value={form.facultyId}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FaKey /> Password
            </label>
            <div className="password-wrapper">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button type="button" className="btn-eye" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Authenticating...
              </>
            ) : (
              <>
                Log In <FaArrowRight />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
