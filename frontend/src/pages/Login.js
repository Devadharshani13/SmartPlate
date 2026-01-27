import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { UtensilsCrossed, User, Mail, Lock, MapPin, Phone, Building2, Truck } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'ngo',
    location: '',
    phone: '',
    organization: '',
    donor_type: '',
    transport_mode: 'bicycle'
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return cleaned.length === 10 && /^\d+$/.test(cleaned);
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Registration-specific validations
    if (!isLogin) {
      if (!formData.name || formData.name.trim().length === 0) {
        newErrors.name = 'Name is required';
      } else if (formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }

      if (!formData.role) {
        newErrors.role = 'Please select a role';
      }

      if (!formData.location || formData.location.trim().length === 0) {
        newErrors.location = 'Location is required';
      } else if (formData.location.trim().length < 3) {
        newErrors.location = 'Location must be at least 3 characters';
      }

      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      }

      // Role-specific validations
      if (formData.role === 'ngo' && (!formData.organization || formData.organization.trim().length === 0)) {
        newErrors.organization = 'Organization name is required for NGOs';
      }

      if (formData.role === 'donor' && (!formData.donor_type || formData.donor_type.trim().length === 0)) {
        newErrors.donor_type = 'Donor type is required';
      }

      if (formData.role === 'volunteer' && (!formData.transport_mode || formData.transport_mode.trim().length === 0)) {
        newErrors.transport_mode = 'Transport mode is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            ...formData,
            phone: formData.phone.replace(/[\s\-\(\)]/g, ''),
            name: formData.name.trim(),
            location: formData.location.trim()
          };

      const response = await axios.post(endpoint, payload);
      toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        toast.error(errorMsg);
      } else if (Array.isArray(errorMsg)) {
        errorMsg.forEach(err => toast.error(err.msg || 'Validation error'));
      } else {
        toast.error('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isLogin) {
      // Validate required fields for Google registration
      const newErrors = {};
      
      if (!formData.role) {
        newErrors.role = 'Please select a role';
      }
      
      if (!formData.location || formData.location.trim().length === 0) {
        newErrors.location = 'Location is required';
      } else if (formData.location.trim().length < 3) {
        newErrors.location = 'Location must be at least 3 characters';
      }
      
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Phone number must be exactly 10 digits';
      }

      // Role-specific validations
      if (formData.role === 'ngo' && (!formData.organization || formData.organization.trim().length === 0)) {
        newErrors.organization = 'Organization name is required for NGOs';
      }

      if (formData.role === 'donor' && (!formData.donor_type || formData.donor_type.trim().length === 0)) {
        newErrors.donor_type = 'Donor type is required';
      }

      setErrors(newErrors);
      
      if (Object.keys(newErrors).length > 0) {
        toast.error('Please fill in Role, Location, and Phone before signing in with Google');
        return;
      }
      
      // Store registration data in sessionStorage for callback
      sessionStorage.setItem('google_registration_data', JSON.stringify({
        role: formData.role,
        location: formData.location.trim(),
        phone: formData.phone.replace(/[\s\-\(\)]/g, ''),
        organization: formData.organization,
        donor_type: formData.donor_type,
        transport_mode: formData.transport_mode
      }));
    }

    setGoogleLoading(true);
    try {
      const response = await axios.get(`${API}/auth/google/login`);
      window.location.href = response.data.login_url;
    } catch (error) {
      toast.error('Failed to initiate Google login');
      setGoogleLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
    setFormData({ ...formData, phone: value });
    
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1A4D2E] to-[#0f3019] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1639432047673-91ea142f9cf5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHw0fHxjb21tdW5pdHklMjBraXRjaGVuJTIwc2VydmluZyUyMGZvb2R8ZW58MHx8fHwxNzY4ODM2NDI0fDA&ixlib=rb-4.1.0&q=85"
            alt="Community food service"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center mb-8">
            <UtensilsCrossed className="w-12 h-12 mr-4" />
            <h1 className="text-5xl font-heading font-bold">SmartPlate</h1>
          </div>
          <p className="text-2xl mb-6 font-light">Reducing Hunger Through Food Redistribution</p>
          <p className="text-lg opacity-90">Join us in making a difference. Connect NGOs, donors, and volunteers to eliminate food waste and fight hunger.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F9F7F2]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <UtensilsCrossed className="w-10 h-10 mr-3 text-[#1A4D2E]" />
            <h1 className="text-4xl font-heading font-bold text-[#1A4D2E]">SmartPlate</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-200">
            <h2 className="text-3xl font-heading font-bold text-[#1F2937] mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-[#4B5563] mb-6">
              {isLogin ? 'Login to continue your mission' : 'Join the food redistribution movement'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                    <input
                      data-testid="register-name-input"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.name ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                      required
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                  <input
                    data-testid="email-input"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.email ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                    required
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                  <input
                    data-testid="password-input"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.password ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                    required
                  />
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] mb-2">I am a *</label>
                    <select
                      data-testid="role-select"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white border ${errors.role ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                    >
                      <option value="ngo">NGO</option>
                      <option value="donor">Donor</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="admin">Administrator</option>
                    </select>
                    {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] mb-2">Location *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                      <input
                        data-testid="location-input"
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g., New York, NY"
                        className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.location ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                        required
                      />
                    </div>
                    {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] mb-2">Phone Number (10 digits) *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                      <input
                        data-testid="phone-input"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="1234567890"
                        maxLength="10"
                        className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.phone ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                        required
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  {formData.role === 'ngo' && (
                    <div>
                      <label className="block text-sm font-medium text-[#1F2937] mb-2">Organization Name *</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                        <input
                          data-testid="organization-input"
                          type="text"
                          name="organization"
                          value={formData.organization}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.organization ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                          required
                        />
                      </div>
                      {errors.organization && <p className="text-red-500 text-sm mt-1">{errors.organization}</p>}
                    </div>
                  )}

                  {formData.role === 'donor' && (
                    <div>
                      <label className="block text-sm font-medium text-[#1F2937] mb-2">Donor Type *</label>
                      <select
                        data-testid="donor-type-select"
                        name="donor_type"
                        value={formData.donor_type}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-white border ${errors.donor_type ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                        required
                      >
                        <option value="">Select type</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="hotel">Hotel</option>
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
                      </select>
                      {errors.donor_type && <p className="text-red-500 text-sm mt-1">{errors.donor_type}</p>}
                    </div>
                  )}

                  {formData.role === 'volunteer' && (
                    <div>
                      <label className="block text-sm font-medium text-[#1F2937] mb-2">Transport Mode *</label>
                      <div className="relative">
                        <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                        <select
                          data-testid="transport-mode-select"
                          name="transport_mode"
                          value={formData.transport_mode}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 bg-white border ${errors.transport_mode ? 'border-red-500' : 'border-stone-200'} rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20 transition-all`}
                          required
                        >
                          <option value="on_foot">On Foot</option>
                          <option value="bicycle">Bicycle</option>
                          <option value="two_wheeler">Two Wheeler</option>
                          <option value="car">Car</option>
                          <option value="van">Van</option>
                        </select>
                      </div>
                      {errors.transport_mode && <p className="text-red-500 text-sm mt-1">{errors.transport_mode}</p>}
                    </div>
                  )}
                </>
              )}

              <button
                data-testid="submit-button"
                type="submit"
                disabled={loading}
                className="w-full bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-[#6B7280]">Or continue with</span>
              </div>
            </div>

            <button
              data-testid="google-signin-button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-stone-300 hover:border-[#1A4D2E] text-[#1F2937] rounded-full px-8 py-3 font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Redirecting...' : 'Sign in with Google'}
            </button>

            <div className="mt-6 text-center">
              <button
                data-testid="toggle-auth-mode"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-[#1A4D2E] hover:text-[#143d24] font-medium transition-colors"
              >
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
