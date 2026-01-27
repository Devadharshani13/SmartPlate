import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { UtensilsCrossed, LogOut, Plus, Users, TrendingUp, Package, Clock, MapPin, User, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import LocationAutocomplete from '../components/LocationAutocomplete';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    accepted_by_donor: { label: 'Accepted', class: 'bg-blue-100 text-blue-800 border-blue-200' },
    assigned_to_volunteer: { label: 'Assigned', class: 'bg-purple-100 text-purple-800 border-purple-200' },
    picked_up: { label: 'Picked Up', class: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    in_transit: { label: 'In Transit', class: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    delivered: { label: 'Delivered', class: 'bg-green-100 text-green-800 border-green-200' },
    completed: { label: 'Completed', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.class}`}>
      {config.label}
    </span>
  );
};

export default function NGODashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = setFormData({
  food_type: 'vegetarian',
  food_category: 'cooked',
  quantity: '',
  quantity_unit: 'people',
  required_date: '',
  required_time: '',
  pickup_location: '',
  special_instructions: '',
  people_count: '',
  latitude: null,
  longitude: null
});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/ngo/requests`, getAuthHeaders());
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/ngo/requests`, formData, getAuthHeaders());
      toast.success('Food request created successfully!');
      setShowCreateModal(false);
      setFormData({
        food_type: 'vegetarian',
        food_category: 'cooked',
        quantity: '',
        quantity_unit: 'people',
        required_date: '',
        required_time: '',
        pickup_location: '',
        special_instructions: '',
        people_count: ''
      });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create request');
    }
  };

  const handleConfirmReceipt = async (requestId) => {
    try {
      await axios.post(`${API}/ngo/confirm-receipt`, { request_id: requestId }, getAuthHeaders());
      toast.success('Receipt confirmed! Thank you.');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to confirm receipt');
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    inProgress: requests.filter(r => ['accepted_by_donor', 'assigned_to_volunteer', 'picked_up', 'in_transit', 'delivered'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length
  };
  const handleLocationSelect = (locationData) => {
  setFormData({
    ...formData,
    pickup_location: locationData.address,
    latitude: locationData.latitude,
    longitude: locationData.longitude
  });
};


  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <nav className="bg-white/80 backdrop-blur-md border-b border-stone-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <UtensilsCrossed className="w-8 h-8 text-[#1A4D2E] mr-3" />
              <h1 className="text-2xl font-heading font-bold text-[#1A4D2E]">SmartPlate</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-[#1F2937]">{user.name}</p>
                <p className="text-xs text-[#9CA3AF]">{user.organization || 'NGO'}</p>
              </div>
              <button
                data-testid="logout-button"
                onClick={onLogout}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-[#4B5563]" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-heading font-bold text-[#1F2937]">NGO Dashboard</h2>
            <p className="text-[#4B5563] mt-1">Manage your food requests and track deliveries</p>
          </div>
          <button
            data-testid="create-request-button"
            onClick={() => setShowCreateModal(true)}
            className="bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-98 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Request
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-heading font-bold text-[#1F2937] mt-2">{stats.total}</p>
              </div>
              <Package className="w-10 h-10 text-[#1A4D2E] opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">Pending</p>
                <p className="text-3xl font-heading font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">In Progress</p>
                <p className="text-3xl font-heading font-bold text-blue-600 mt-2">{stats.inProgress}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">Completed</p>
                <p className="text-3xl font-heading font-bold text-green-600 mt-2">{stats.completed}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-200">
            <h3 className="text-xl font-heading font-bold text-[#1F2937]">My Food Requests</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-[#9CA3AF]">Loading requests...</div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4 opacity-50" />
                <p className="text-[#9CA3AF]">No requests yet. Create your first food request!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.request_id}
                    data-testid={`request-card-${request.request_id}`}
                    className="border border-stone-200 rounded-xl p-6 hover:shadow-md transition-all card-hover"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-heading font-semibold text-[#1F2937]">
                            {request.food_type.charAt(0).toUpperCase() + request.food_type.slice(1)} - {request.food_category.charAt(0).toUpperCase() + request.food_category.slice(1)}
                          </h4>
                          <StatusBadge status={request.status} />
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-[#4B5563]">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {request.people_count} people
                          </span>
                          <span className="flex items-center">
                            <Package className="w-4 h-4 mr-1" />
                            {request.quantity} {request.quantity_unit}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {request.required_date} at {request.required_time}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-[#E07A5F] text-white px-3 py-1 rounded-full text-xs font-medium">
                          Urgency: {request.urgency_score}/10
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Pickup Location</p>
                        <p className="text-sm text-[#1F2937] flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                          {request.pickup_location}
                        </p>
                      </div>
                      {request.special_instructions && (
                        <div>
                          <p className="text-xs text-[#9CA3AF] mb-1">Special Instructions</p>
                          <p className="text-sm text-[#1F2937]">{request.special_instructions}</p>
                        </div>
                      )}
                    </div>

                    {request.donor_name && (
                      <div className="border-t border-stone-200 pt-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-1">Donor</p>
                            <p className="text-sm text-[#1F2937] flex items-center">
                              <User className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                              {request.donor_name}
                            </p>
                          </div>
                          {request.volunteer_name && (
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-1">Volunteer</p>
                              <p className="text-sm text-[#1F2937] flex items-center">
                                <User className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                                {request.volunteer_name}
                              </p>
                            </div>
                          )}
                          {request.co_volunteer_name && (
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-1">Co-Volunteer</p>
                              <p className="text-sm text-[#1F2937] flex items-center">
                                <User className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                                {request.co_volunteer_name}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {request.status === 'delivered' && (
                      <div className="mt-4">
                        <button
                          data-testid={`confirm-receipt-${request.request_id}`}
                          onClick={() => handleConfirmReceipt(request.request_id)}
                          className="bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                        >
                          Confirm Receipt
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200">
              <h3 className="text-2xl font-heading font-bold text-[#1F2937]">Create Food Request</h3>
              <p className="text-[#4B5563] mt-1">Fill in the details for your food requirement</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Food Type</label>
                  <select
                    data-testid="food-type-select"
                    name="food_type"
                    value={formData.food_type}
                    onChange={(e) => setFormData({ ...formData, food_type: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  >
                    <option value="vegetarian">Vegetarian</option>
                    <option value="non_vegetarian">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Food Category</label>
                  <select
                    data-testid="food-category-select"
                    name="food_category"
                    value={formData.food_category}
                    onChange={(e) => setFormData({ ...formData, food_category: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  >
                    <option value="cooked">Cooked</option>
                    <option value="packed">Packed</option>
                    <option value="raw">Raw</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Quantity</label>
                  <input
                    data-testid="quantity-input"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Unit</label>
                  <select
                    data-testid="quantity-unit-select"
                    value={formData.quantity_unit}
                    onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  >
                    <option value="people">People</option>
                    <option value="kg">Kilograms</option>
                    <option value="packets">Packets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">People Count</label>
                <input
                  data-testid="people-count-input"
                  type="number"
                  value={formData.people_count}
                  onChange={(e) => setFormData({ ...formData, people_count: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Required Date</label>
                  <input
                    data-testid="required-date-input"
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                    required
                  />
                </div>
                <div>
  <label className="block text-sm font-medium text-[#1F2937] mb-2">Pickup Location</label>
  <LocationAutocomplete
    value={formData.pickup_location}
    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
    onPlaceSelect={handleLocationSelect}
    placeholder="Start typing pickup address..."
    required
    dataTestId="pickup-location-input"
  />
</div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Required Time</label>
                  <input
                    data-testid="required-time-input"
                    type="time"
                    value={formData.required_time}
                    onChange={(e) => setFormData({ ...formData, required_time: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">Pickup Location</label>
                <input
                  data-testid="pickup-location-input"
                  type="text"
                  value={formData.pickup_location}
                  onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">Special Instructions (Optional)</label>
                <textarea
                  data-testid="special-instructions-input"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  data-testid="submit-request-button"
                  className="flex-1 bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  Create Request
                </button>
                <button
                  type="button"
                  data-testid="cancel-button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-white border-2 border-stone-200 text-[#4B5563] hover:bg-stone-50 rounded-full font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}
