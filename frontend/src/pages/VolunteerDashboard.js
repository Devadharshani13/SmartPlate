import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { UtensilsCrossed, LogOut, MapPin, Package, Users, Clock, CheckCircle, Truck, AlertTriangle } from 'lucide-react';

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

export default function VolunteerDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    extra_volunteer_required: false,
    extra_volunteer_reason: ''
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/volunteer/tasks`, getAuthHeaders());
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (task, newStatus) => {
    setSelectedTask(task);
    setStatusUpdate({
      status: newStatus,
      extra_volunteer_required: false,
      extra_volunteer_reason: ''
    });
    setShowStatusModal(true);
  };

  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/volunteer/update-status`,
        {
          request_id: selectedTask.request_id,
          ...statusUpdate
        },
        getAuthHeaders()
      );
      toast.success('Status updated successfully!');
      setShowStatusModal(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      assigned_to_volunteer: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status) => {
    const labels = {
      picked_up: 'Mark as Picked Up',
      in_transit: 'Mark as In Transit',
      delivered: 'Mark as Delivered'
    };
    return labels[status];
  };

  const completedTasks = tasks.filter(t => ['delivered', 'completed'].includes(t.status)).length;
  const activeTasks = tasks.filter(t => !['delivered', 'completed'].includes(t.status)).length;

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
                <p className="text-xs text-[#9CA3AF]">Volunteer - {user.transport_mode?.replace('_', ' ').toUpperCase()}</p>
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
          <h2 className="text-3xl font-heading font-bold text-[#1F2937]">Volunteer Dashboard</h2>
          <p className="text-[#4B5563] mt-1">Manage your delivery tasks and make an impact</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">Total Tasks</p>
                <p className="text-3xl font-heading font-bold text-[#1F2937] mt-2">{tasks.length}</p>
              </div>
              <Package className="w-10 h-10 text-[#1A4D2E] opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">Active Tasks</p>
                <p className="text-3xl font-heading font-bold text-blue-600 mt-2">{activeTasks}</p>
              </div>
              <Truck className="w-10 h-10 text-blue-600 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9CA3AF] text-sm font-medium">Completed</p>
                <p className="text-3xl font-heading font-bold text-green-600 mt-2">{completedTasks}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-200">
            <h3 className="text-xl font-heading font-bold text-[#1F2937]">Delivery Tasks</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-[#9CA3AF]">Loading tasks...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4 opacity-50" />
                <p className="text-[#9CA3AF]">No tasks assigned yet. Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.request_id}
                    data-testid={`task-card-${task.request_id}`}
                    className="border border-stone-200 rounded-xl p-6 hover:shadow-md transition-all card-hover"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-heading font-semibold text-[#1F2937]">
                            {task.food_type.charAt(0).toUpperCase() + task.food_type.slice(1)} - {task.food_category.charAt(0).toUpperCase() + task.food_category.slice(1)}
                          </h4>
                          <StatusBadge status={task.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[#4B5563] mb-3">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {task.people_count} people
                          </span>
                          <span className="flex items-center">
                            <Package className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {task.quantity} {task.quantity_unit}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-[#1A4D2E]" />
                            {task.required_date} at {task.required_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-600 font-semibold mb-2">PICKUP FROM</p>
                        <p className="text-sm text-[#1F2937] font-medium mb-1">{task.donor_name || 'Donor'}</p>
                        <p className="text-sm text-[#4B5563] flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {task.pickup_location}
                        </p>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-xs text-green-600 font-semibold mb-2">DELIVER TO</p>
                        <p className="text-sm text-[#1F2937] font-medium mb-1">{task.ngo_name}</p>
                        <p className="text-sm text-[#4B5563]">{task.ngo_organization || 'NGO'}</p>
                      </div>
                    </div>

                    {task.special_instructions && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 mt-0.5" />
                          <div>
                            <p className="text-xs text-amber-600 font-semibold mb-1">Special Instructions</p>
                            <p className="text-sm text-amber-800">{task.special_instructions}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {task.co_volunteer_name && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs text-purple-600 font-semibold mb-1">CO-VOLUNTEER ASSIGNED</p>
                        <p className="text-sm text-[#1F2937] font-medium">{task.co_volunteer_name}</p>
                        {task.extra_volunteer_reason && (
                          <p className="text-xs text-[#4B5563] mt-1">Reason: {task.extra_volunteer_reason}</p>
                        )}
                      </div>
                    )}

                    {!['delivered', 'completed'].includes(task.status) && getNextStatus(task.status) && (
                      <div className="flex space-x-3">
                        <button
                          data-testid={`update-status-${task.request_id}`}
                          onClick={() => handleUpdateStatus(task, getNextStatus(task.status))}
                          className="bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                        >
                          {getStatusLabel(getNextStatus(task.status))}
                        </button>
                        {task.status === 'picked_up' && !task.co_volunteer_id && (
                          <button
                            data-testid={`request-extra-volunteer-${task.request_id}`}
                            onClick={() => {
                              setSelectedTask(task);
                              setStatusUpdate({
                                status: task.status,
                                extra_volunteer_required: true,
                                extra_volunteer_reason: ''
                              });
                              setShowStatusModal(true);
                            }}
                            className="bg-[#E07A5F] hover:bg-[#d46b50] text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            Request Extra Volunteer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showStatusModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-stone-200">
              <h3 className="text-2xl font-heading font-bold text-[#1F2937]">
                {statusUpdate.extra_volunteer_required ? 'Request Extra Volunteer' : 'Update Delivery Status'}
              </h3>
            </div>
            <form onSubmit={handleSubmitStatus} className="p-6 space-y-4">
              <div className="bg-[#F9F7F2] p-4 rounded-lg border border-stone-200">
                <p className="text-sm text-[#4B5563]">
                  <span className="font-semibold">Task:</span> {selectedTask.food_type} for {selectedTask.people_count} people
                </p>
                <p className="text-sm text-[#4B5563] mt-1">
                  <span className="font-semibold">Current Status:</span> <StatusBadge status={selectedTask.status} />
                </p>
              </div>

              {!statusUpdate.extra_volunteer_required && (
                <div>
                  <p className="text-sm text-[#4B5563] mb-3">
                    You are about to mark this delivery as:
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-lg font-heading font-semibold text-green-700">
                      {getStatusLabel(statusUpdate.status)}
                    </p>
                  </div>
                </div>
              )}

              {statusUpdate.extra_volunteer_required && (
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] mb-2">Reason for Extra Volunteer</label>
                  <select
                    data-testid="extra-volunteer-reason-select"
                    value={statusUpdate.extra_volunteer_reason}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, extra_volunteer_reason: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#1A4D2E] focus:ring-2 focus:ring-[#1A4D2E] focus:ring-opacity-20"
                    required
                  >
                    <option value="">Select reason</option>
                    <option value="heavy_load">Heavy Load</option>
                    <option value="long_distance">Long Distance</option>
                    <option value="time_constraint">Time Constraint</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="text-xs text-[#9CA3AF] mt-2">
                    A co-volunteer will be automatically assigned based on availability and location.
                  </p>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  data-testid="confirm-status-button"
                  className="flex-1 bg-[#1A4D2E] hover:bg-[#143d24] text-white rounded-full px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  data-testid="cancel-status-button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedTask(null);
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