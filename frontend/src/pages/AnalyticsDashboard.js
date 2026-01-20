import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { UtensilsCrossed, LogOut, Users, TrendingUp, Package, Award, Activity, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const COLORS = ['#1A4D2E', '#E07A5F', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function AnalyticsDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [statsResponse, trendsResponse] = await Promise.all([
        axios.get(`${API}/analytics/dashboard`, getAuthHeaders()),
        axios.get(`${API}/analytics/trends`, getAuthHeaders())
      ]);
      setStats(statsResponse.data);
      setTrends(trendsResponse.data.trends || []);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const statusData = stats ? Object.entries(stats.status_distribution).map(([key, value]) => ({
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: value
  })).filter(item => item.value > 0) : [];

  const userRolesData = stats ? [
    { name: 'NGOs', value: stats.ngo_count },
    { name: 'Donors', value: stats.donor_count },
    { name: 'Volunteers', value: stats.volunteer_count }
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
        <div className="animate-pulse text-[#1A4D2E] text-xl font-heading">Loading analytics...</div>
      </div>
    );
  }

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
                <p className="text-xs text-[#9CA3AF]">Analytics Dashboard</p>
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
          <h2 className="text-3xl font-heading font-bold text-[#1F2937]">Impact Analytics</h2>
          <p className="text-[#4B5563] mt-1">Track the impact of SmartPlate's food redistribution mission</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-[#1A4D2E] opacity-80" />
              <div className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-bold">
                SDG 2
              </div>
            </div>
            <p className="text-[#9CA3AF] text-sm font-medium mb-1">People Fed</p>
            <p className="text-4xl font-heading font-bold text-[#1A4D2E]">
              {stats?.total_people_fed?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-[#4B5563] mt-2">Total beneficiaries served</p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-blue-600 opacity-80" />
              <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
                {stats?.success_rate || 0}%
              </div>
            </div>
            <p className="text-[#9CA3AF] text-sm font-medium mb-1">Meals Delivered</p>
            <p className="text-4xl font-heading font-bold text-blue-600">
              {stats?.completed_requests || 0}
            </p>
            <p className="text-xs text-[#4B5563] mt-2">Out of {stats?.total_requests || 0} requests</p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-[#E07A5F] opacity-80" />
            </div>
            <p className="text-[#9CA3AF] text-sm font-medium mb-1">NGOs Served</p>
            <p className="text-4xl font-heading font-bold text-[#E07A5F]">
              {stats?.ngo_count || 0}
            </p>
            <p className="text-xs text-[#4B5563] mt-2">Active organizations</p>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-purple-600 opacity-80" />
            </div>
            <p className="text-[#9CA3AF] text-sm font-medium mb-1">Success Rate</p>
            <p className="text-4xl font-heading font-bold text-purple-600">
              {stats?.success_rate || 0}%
            </p>
            <p className="text-xs text-[#4B5563] mt-2">Delivery completion rate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center mb-6">
              <BarChart3 className="w-6 h-6 text-[#1A4D2E] mr-2" />
              <h3 className="text-xl font-heading font-bold text-[#1F2937]">Request Status Distribution</h3>
            </div>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <Bar dataKey="value" fill="#1A4D2E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[#9CA3AF]">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-[#1A4D2E] mr-2" />
              <h3 className="text-xl font-heading font-bold text-[#1F2937]">User Distribution</h3>
            </div>
            {userRolesData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={userRolesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userRolesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[#9CA3AF]">
                No user data available
              </div>
            )}
          </div>
        </div>

        {trends.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center mb-6">
              <TrendingUp className="w-6 h-6 text-[#1A4D2E] mr-2" />
              <h3 className="text-xl font-heading font-bold text-[#1F2937]">Hunger Reduction Trends</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#1A4D2E" strokeWidth={2} name="Requests Completed" />
                <Line yAxisId="right" type="monotone" dataKey="people_fed" stroke="#E07A5F" strokeWidth={2} name="People Fed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-8 bg-gradient-to-r from-[#1A4D2E] to-[#0f3019] rounded-2xl p-8 text-white">
          <div className="flex items-center mb-4">
            <Award className="w-10 h-10 mr-3" />
            <h3 className="text-2xl font-heading font-bold">SDG Impact Report</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-white/80 text-sm mb-2">SDG 2: Zero Hunger</p>
              <p className="text-3xl font-heading font-bold">{stats?.total_people_fed?.toLocaleString() || 0}</p>
              <p className="text-white/70 text-sm mt-1">People fed through food redistribution</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">SDG 12: Responsible Consumption</p>
              <p className="text-3xl font-heading font-bold">{stats?.completed_requests || 0}</p>
              <p className="text-white/70 text-sm mt-1">Meals saved from going to waste</p>
            </div>
            <div>
              <p className="text-white/80 text-sm mb-2">Community Impact</p>
              <p className="text-3xl font-heading font-bold">
                {(stats?.ngo_count || 0) + (stats?.donor_count || 0) + (stats?.volunteer_count || 0)}
              </p>
              <p className="text-white/70 text-sm mt-1">Active community members</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}