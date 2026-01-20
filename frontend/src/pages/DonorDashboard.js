import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { UtensilsCrossed, LogOut, Filter, Search, MapPin, Users, Package, Clock, AlertCircle } from 'lucide-react';

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

export default function DonorDashboard({ user, onLogout }) {
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [filterFoodType, setFilterFoodType] = useState('all');
  const [searchLocation, setSearchLocation] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [acceptFormData, setAcceptFormData] = useState({
    availability_time: '',
    food_condition: 'excellent'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'available') {
        const response = await axios.get(`${API}/donor/requests`, getAuthHeaders());
        setAvailableRequests(response.data);
      } else {
        const response = await axios.get(`${API}/donor/my-donations`, getAuthHeaders());
        setMyDonations(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = (request) => {
    setSelectedRequest(request);
    setShowAcceptModal(true);
  };

  const handleSubmitAccept = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/donor/accept`,
        {
          request_id: selectedRequest.request_id,
          ...acceptFormData
        },
        getAuthHeaders()
      );
      toast.success('Request accepted! Volunteer will be assigned shortly.');
      setShowAcceptModal(false);
      setSelectedRequest(null);
      setAcceptFormData({ availability_time: '', food_condition: 'excellent' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept request');
    }
  };

  const filteredRequests = availableRequests.filter(request => {
    const matchesType = filterFoodType === 'all' || request.food_type === filterFoodType;
    const matchesLocation = !searchLocation || request.pickup_location.toLowerCase().includes(searchLocation.toLowerCase());
    return matchesType && matchesLocation;
  }).sort((a, b) => b.urgency_score - a.urgency_score);

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
                <p className="text-xs text-[#9CA3AF]">Donor</p>
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
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold text-[#1F2937]">Donor Dashboard</h2>
          <p className="text-[#4B5563] mt-1">Browse food requests and contribute to ending hunger</p>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            data-testid="available-tab"
            onClick={() => setActiveTab('available')}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'available'
                ? 'bg-[#1A4D2E] text-white shadow-lg'
                : 'bg-white text-[#4B5563] border border-stone-200 hover:bg-stone-50'
            }`}
          >
            Available Requests
          </button>
          <button
            data-testid="my-donations-tab"
            onClick={() => setActiveTab('my-donations')}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'my-donations'
                ? 'bg-[#1A4D2E] text-white shadow-lg'
                : 'bg-white text-[#4B5563] border border-stone-200 hover:bg-stone-50'
            }`}
          >
            My Donations
          </button>
        </div>

        {activeTab === 'available' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                  <input
                    data-testid="search-location-input"
                    type="text"
                    placeholder="Search by location..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#F9F7F2] border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  />
                </div>
              </div>
              <div>
                <select
                  data-testid="filter-food-type-select"
                  value={filterFoodType}
                  onChange={(e) => setFilterFoodType(e.target.value)}
                  className="px-4 py-2 bg-[#F9F7F2] border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                >
                  <option value="all">All Food Types</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non_vegetarian">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-[#9CA3AF]">Loading...</div>
              </div>
            ) : activeTab === 'available' && filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4 opacity-50" />
                <p className="text-[#9CA3AF]">No requests match your filters</p>
              </div>
            ) : activeTab === 'my-donations' && myDonations.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4 opacity-50" />
                <p className="text-[#9CA3AF]">You haven't accepted any requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(activeTab === 'available' ? filteredRequests : myDonations).map((request) => (
                  <div
                    key={request.request_id}
                    data-testid={`request-card-${request.request_id}`}
                    className="border border-stone-200 rounded-xl p-6 hover:shadow-md transition-all card-hover"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-heading font-semibold text-[#1F2937]">
                            {request.food_type.charAt(0).toUpperCase() + request.food_type.slice(1)} - {request.food_category.charAt(0).toUpperCase() + request.food_category.slice(1)}
                          </h4>
                          <StatusBadge status={request.status} />
                          <div className="bg-[#E07A5F] text-white px-3 py-1 rounded-full text-xs font-medium">
                            Urgency: {request.urgency_score}/10
                          </div>
                        </div>
                        <p className="text-sm text-[#4B5563] mb-3">
                          Requested by <span className="font-semibold">{request.ngo_name}</span>
                          {request.ngo_organization && ` (${request.ngo_organization})`}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[#4B5563]">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {request.people_count} people
                          </span>
                          <span className="flex items-center">
                            <Package className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {request.quantity} {request.quantity_unit}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {request.required_date} at {request.required_time}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {request.pickup_location}
                          </span>
                        </div>
                        {request.special_instructions && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start">
                              <AlertCircle className="w-4 h-4 text-amber-600 mr-2 mt-0.5" />
                              <p className="text-sm text-amber-800">{request.special_instructions}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {activeTab === 'available' && (
                        <button
                          data-testid={`accept-request-${request.request_id}`}
                          onClick={() => handleAcceptRequest(request)}
                          className="ml-4 bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-2 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                        >
                          Accept Request
                        </button>
                      )}
                    </div>

                    {request.volunteer_name && (
                      <div className="border-t border-stone-200 pt-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-[#9CA3AF] mb-1">Assigned Volunteer</p>
                            <p className="text-sm text-[#1F2937] font-medium">{request.volunteer_name}</p>
                          </div>
                          {request.co_volunteer_name && (
                            <div>
                              <p className="text-xs text-[#9CA3AF] mb-1">Co-Volunteer</p>
                              <p className="text-sm text-[#1F2937] font-medium">{request.co_volunteer_name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAcceptModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-stone-200">
              <h3 className="text-2xl font-heading font-bold text-[#1F2937]">Accept Food Request</h3>
              <p className="text-[#4B5563] mt-1">Provide details about your donation</p>
            </div>
            <form onSubmit={handleSubmitAccept} className="p-6 space-y-4">
              <div className="bg-[#F9F7F2] p-4 rounded-lg border border-stone-200">
                <p className="text-sm text-[#4B5563] mb-2">
                  <span className="font-semibold">Request:</span> {selectedRequest.food_type} - {selectedRequest.food_category}
                </p>
                <p className="text-sm text-[#4B5563]">
                  <span className="font-semibold">Quantity:</span> {selectedRequest.quantity} {selectedRequest.quantity_unit} for {selectedRequest.people_count} people
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">When can you provide the food?</label>
                <input
                  data-testid="availability-time-input"
                  type="datetime-local"
                  value={acceptFormData.availability_time}
                  onChange={(e) => setAcceptFormData({ ...acceptFormData, availability_time: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">Food Condition</label>
                <select
                  data-testid="food-condition-select"
                  value={acceptFormData.food_condition}
                  onChange={(e) => setAcceptFormData({ ...acceptFormData, food_condition: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  data-testid="confirm-accept-button"
                  className="flex-1 bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  Confirm & Accept
                </button>
                <button
                  type="button"
                  data-testid="cancel-accept-button"
                  onClick={() => {
                    setShowAcceptModal(false);
                    setSelectedRequest(null);
                  }}
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