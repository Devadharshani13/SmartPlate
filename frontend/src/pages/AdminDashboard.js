import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { UtensilsCrossed, LogOut, Shield, CheckCircle, XCircle, Users, FileText, Activity, Eye, UserCheck } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function AdminDashboard({ user, onLogout }) {
  const [pendingNGOs, setPendingNGOs] = useState([]);
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('verifications');
  const [loading, setLoading] = useState(true);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showIdModal, setShowIdModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'verifications') {
        const ngoResponse = await axios.get(`${API}/admin/pending-verifications`, getAuthHeaders());
        setPendingNGOs(ngoResponse.data);
        
        const volunteerResponse = await axios.get(`${API}/admin/pending-volunteers`, getAuthHeaders());
        setPendingVolunteers(volunteerResponse.data);
      } else if (activeTab === 'users') {
        const response = await axios.get(`${API}/admin/users`, getAuthHeaders());
        setAllUsers(response.data);
      } else if (activeTab === 'audit') {
        const response = await axios.get(`${API}/admin/audit-logs`, getAuthHeaders());
        setAuditLogs(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNGOVerification = async (userId, action, notes = '') => {
    try {
      await axios.post(`${API}/admin/verify-ngo`, { user_id: userId, action, notes }, getAuthHeaders());
      toast.success(`NGO ${action} successfully`);
      fetchData();
    } catch (error) {
      toast.error('Failed to process verification');
    }
  };

  const handleVolunteerVerification = async (userId, action, notes = '') => {
    try {
      await axios.post(`${API}/admin/verify-volunteer`, { user_id: userId, action, notes }, getAuthHeaders());
      toast.success(`Volunteer ${action} successfully`);
      setShowIdModal(false);
      setSelectedVolunteer(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to process verification');
    }
  };

  const viewVolunteerIdProof = async (volunteer) => {
    try {
      setSelectedVolunteer(volunteer);
      setShowIdModal(true);
    } catch (error) {
      toast.error('Failed to load ID proof');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2]">
      <nav className="bg-white/80 backdrop-blur-md border-b border-stone-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <UtensilsCrossed className="w-8 h-8 text-[#1A4D2E] mr-3" />
              <h1 className="text-2xl font-heading font-bold text-[#1A4D2E]">SmartPlate Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-[#1F2937]">{user.name}</p>
                <p className="text-xs text-[#9CA3AF]">Administrator</p>
              </div>
              <button data-testid="logout-button" onClick={onLogout} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                <LogOut className="w-5 h-5 text-[#4B5563]" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold text-[#1F2937]">Admin Control Panel</h2>
          <p className="text-[#4B5563] mt-1">Manage verifications, users, and system activities</p>
        </div>

        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button onClick={() => setActiveTab('verifications')} className={`px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${activeTab === 'verifications' ? 'bg-[#1A4D2E] text-white shadow-lg' : 'bg-white text-[#4B5563] border border-stone-200 hover:bg-stone-50'}`}>
            <Shield className="w-5 h-5 inline mr-2" />
            Verifications
          </button>
          <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-[#1A4D2E] text-white shadow-lg' : 'bg-white text-[#4B5563] border border-stone-200 hover:bg-stone-50'}`}>
            <Users className="w-5 h-5 inline mr-2" />
            All Users
          </button>
          <button onClick={() => setActiveTab('audit')} className={`px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-[#1A4D2E] text-white shadow-lg' : 'bg-white text-[#4B5563] border border-stone-200 hover:bg-stone-50'}`}>
            <Activity className="w-5 h-5 inline mr-2" />
            Audit Logs
          </button>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-[#9CA3AF]">Loading...</div>
            </div>
          ) : (
            <>
              {activeTab === 'verifications' && (
                <div className="space-y-8">
                  {/* NGO Verifications */}
                  <div>
                    <h3 className="text-xl font-heading font-bold text-[#1F2937] mb-4 flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Pending NGO Verifications ({pendingNGOs.length})
                    </h3>
                    {pendingNGOs.length === 0 ? (
                      <p className="text-[#9CA3AF] text-center py-8">No pending NGO verifications</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingNGOs.map((ngo) => (
                          <div key={ngo.user_id} className="border border-stone-200 rounded-xl p-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-lg font-heading font-semibold text-[#1F2937]">{ngo.name}</h4>
                                <p className="text-sm text-[#4B5563] mt-1">{ngo.organization}</p>
                                <div className="mt-3 space-y-1">
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Email:</span> {ngo.email}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Location:</span> {ngo.location}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Phone:</span> {ngo.phone || 'N/A'}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Registered:</span> {new Date(ngo.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex space-x-3">
                                <button 
                                  data-testid={`approve-ngo-${ngo.user_id}`}
                                  onClick={() => handleNGOVerification(ngo.user_id, 'verified')} 
                                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </button>
                                <button 
                                  data-testid={`reject-ngo-${ngo.user_id}`}
                                  onClick={() => handleNGOVerification(ngo.user_id, 'rejected')} 
                                  className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Volunteer Verifications */}
                  <div className="border-t border-stone-200 pt-8">
                    <h3 className="text-xl font-heading font-bold text-[#1F2937] mb-4 flex items-center">
                      <UserCheck className="w-5 h-5 mr-2" />
                      Pending Volunteer Verifications ({pendingVolunteers.length})
                    </h3>
                    {pendingVolunteers.length === 0 ? (
                      <p className="text-[#9CA3AF] text-center py-8">No pending volunteer verifications</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingVolunteers.map((volunteer) => (
                          <div key={volunteer.user_id} className="border border-stone-200 rounded-xl p-6 bg-blue-50/30">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-lg font-heading font-semibold text-[#1F2937]">{volunteer.name}</h4>
                                <div className="mt-3 space-y-1">
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Email:</span> {volunteer.email}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Location:</span> {volunteer.location}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Phone:</span> {volunteer.phone || 'N/A'}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Transport:</span> {volunteer.transport_mode?.replace('_', ' ') || 'N/A'}</p>
                                  <p className="text-sm text-[#4B5563]"><span className="font-medium">Registered:</span> {new Date(volunteer.created_at).toLocaleDateString()}</p>
                                  {volunteer.id_proof_uploaded_at && (
                                    <p className="text-sm text-[#4B5563]">
                                      <span className="font-medium">ID Uploaded:</span> {new Date(volunteer.id_proof_uploaded_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2">
                                {volunteer.id_proof_url && (
                                  <button 
                                    data-testid={`view-id-${volunteer.user_id}`}
                                    onClick={() => viewVolunteerIdProof(volunteer)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View ID
                                  </button>
                                )}
                                <button 
                                  data-testid={`approve-volunteer-${volunteer.user_id}`}
                                  onClick={() => handleVolunteerVerification(volunteer.user_id, 'verified')} 
                                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center"
                                  disabled={!volunteer.id_proof_url}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </button>
                                <button 
                                  data-testid={`reject-volunteer-${volunteer.user_id}`}
                                  onClick={() => handleVolunteerVerification(volunteer.user_id, 'rejected')} 
                                  className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-heading font-bold text-[#1F2937] mb-4">All Users ({allUsers.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F9F7F2]">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Role</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((u) => (
                          <tr key={u.user_id} className="border-t border-stone-200">
                            <td className="px-4 py-3 text-sm text-[#1F2937]">{u.name}</td>
                            <td className="px-4 py-3 text-sm text-[#4B5563]">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{u.role.toUpperCase()}</span>
                            </td>
                            <td className="px-4 py-3">
                              {(u.role === 'ngo' || u.role === 'volunteer') && (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  u.verification_status === 'verified' 
                                    ? 'bg-green-100 text-green-800' 
                                    : u.verification_status === 'rejected' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {u.verification_status || 'Pending'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#4B5563]">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-heading font-bold text-[#1F2937] mb-4">Recent Audit Logs</h3>
                  {auditLogs.length === 0 ? (
                    <p className="text-[#9CA3AF] text-center py-8">No audit logs</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.log_id} className="border border-stone-200 rounded-lg p-4 bg-[#F9F7F2]">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <FileText className="w-4 h-4 text-[#1A4D2E]" />
                                <span className="font-medium text-[#1F2937]">{log.action}</span>
                                <span className="text-xs text-[#9CA3AF]">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="mt-2 text-sm text-[#4B5563] ml-7">
                                {JSON.stringify(log.details)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ID Proof Modal */}
      {showIdModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-heading font-bold text-[#1F2937]">Volunteer ID Proof</h3>
                <p className="text-sm text-[#4B5563] mt-1">{selectedVolunteer.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowIdModal(false);
                  setSelectedVolunteer(null);
                }}
                className="text-[#4B5563] hover:text-[#1F2937]"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {selectedVolunteer.id_proof_url ? (
                <div className="space-y-4">
                  <div className="bg-stone-100 rounded-lg p-4">
                    <p className="text-sm text-[#4B5563] mb-2">
                      <span className="font-medium">Filename:</span> {selectedVolunteer.id_proof_filename || 'ID Proof'}
                    </p>
                    <p className="text-sm text-[#4B5563]">
                      <span className="font-medium">Uploaded:</span>{' '}
                      {selectedVolunteer.id_proof_uploaded_at
                        ? new Date(selectedVolunteer.id_proof_uploaded_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="border border-stone-200 rounded-lg p-4">
                    {selectedVolunteer.id_proof_url.endsWith('.pdf') ? (
                      <div className="text-center">
                        <p className="text-[#4B5563] mb-4">PDF Document</p>
                        <a
                          href={`${API}/admin/volunteer-id/${selectedVolunteer.user_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-[#1A4D2E] text-white px-6 py-2 rounded-full hover:bg-[#143d24] transition-all"
                        >
                          Open PDF
                        </a>
                      </div>
                    ) : (
                      <img
                        src={`${API}/admin/volunteer-id/${selectedVolunteer.user_id}`}
                        alt="Volunteer ID Proof"
                        className="w-full h-auto rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    )}
                    <div style={{ display: 'none' }} className="text-center text-red-500">
                      Failed to load image
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => handleVolunteerVerification(selectedVolunteer.user_id, 'verified')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve Volunteer
                    </button>
                    <button
                      onClick={() => handleVolunteerVerification(selectedVolunteer.user_id, 'rejected')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject Volunteer
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[#9CA3AF] text-center py-8">No ID proof uploaded</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
