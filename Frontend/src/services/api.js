const API_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("reliefsync_token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
};

export const api = {
  // Authentication
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      const responseData = await handleResponse(res);
      if (responseData.success && responseData.data?.token) {
        localStorage.setItem("reliefsync_token", responseData.data.token);
        localStorage.setItem("reliefsync_user", JSON.stringify(responseData.data.user || responseData.data));
      }
      return responseData;
    },
    registerNgo: async (ngo, admin) => {
      const res = await fetch(`${API_URL}/auth/register-ngo`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ ngo, admin }),
      });
      return handleResponse(res);
    },
    logout: () => {
      localStorage.removeItem("reliefsync_token");
      localStorage.removeItem("reliefsync_user");
    },
    getCurrentUser: () => {
      try {
        return JSON.parse(localStorage.getItem("reliefsync_user"));
      } catch {
        return null;
      }
    },
    getToken: () => {
      return localStorage.getItem("reliefsync_token");
    }
  },

  // Public Complaints
  public: {
    submitComplaint: async (text, locationHint, sourceType = "TEXT") => {
      const res = await fetch(`${API_URL}/public/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locationHint, sourceType }),
      });
      return handleResponse(res);
    },
    trackComplaint: async (complaintId, token) => {
      const res = await fetch(`${API_URL}/public/complaints/${complaintId}?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return handleResponse(res);
    }
  },

  // NGO Management
  ngo: {
    getProfile: async () => {
      const res = await fetch(`${API_URL}/ngo/me`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateProfile: async (profileData) => {
      const res = await fetch(`${API_URL}/ngo/me`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(profileData),
      });
      return handleResponse(res);
    },
    getCaseOffers: async (status = "PENDING") => {
      const res = await fetch(`${API_URL}/ngo/case-offers?status=${status}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    respondToCaseOffer: async (offerId, decision) => {
      const res = await fetch(`${API_URL}/ngo/case-offers/${offerId}/respond`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ decision }),
      });
      return handleResponse(res);
    }
  },

  // Volunteers Management (NGO Admin)
  volunteers: {
    list: async () => {
      const res = await fetch(`${API_URL}/volunteers`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_URL}/volunteers/${id}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (volunteerData) => {
      const res = await fetch(`${API_URL}/volunteers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(volunteerData),
      });
      return handleResponse(res);
    },
    update: async (id, volunteerData) => {
      const res = await fetch(`${API_URL}/volunteers/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(volunteerData),
      });
      return handleResponse(res);
    },
    createLoginAccount: async (id, password) => {
      const res = await fetch(`${API_URL}/volunteers/${id}/account`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ password }),
      });
      return handleResponse(res);
    },
    // For Volunteer's own actions
    getMyProfile: async () => {
      const res = await fetch(`${API_URL}/volunteers/me`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateMyAvailability: async (availability) => {
      const res = await fetch(`${API_URL}/volunteers/me/availability`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ availability }),
      });
      return handleResponse(res);
    }
  },

  // Volunteer Offers (For both NGO and Volunteer)
  volunteerOffers: {
    getNgoOffers: async (status = "PENDING") => {
      const res = await fetch(`${API_URL}/volunteer-offers/ngo?status=${status}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getMyOffers: async (status = "PENDING") => {
      const res = await fetch(`${API_URL}/volunteer-offers/me?status=${status}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    respondToOffer: async (offerId, decision) => {
      const res = await fetch(`${API_URL}/volunteer-offers/${offerId}/respond`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ decision }),
      });
      return handleResponse(res);
    }
  },

  // Matching recommendations
  matching: {
    getRecommendations: async (needId) => {
      const res = await fetch(`${API_URL}/matching/needs/${needId}/recommendations`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Assignments
  assignments: {
    create: async (needId, volunteerId) => {
      const res = await fetch(`${API_URL}/assignments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ needId, volunteerId }),
      });
      return handleResponse(res);
    },
    list: async () => {
      const res = await fetch(`${API_URL}/assignments`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status, notes) => {
      const res = await fetch(`${API_URL}/assignments/${id}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      return handleResponse(res);
    },
    // For Volunteer's own assignments
    getMyAssignments: async () => {
      const res = await fetch(`${API_URL}/volunteer-assignments/me`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateMyAssignmentProgress: async (assignmentId, status, notes) => {
      const res = await fetch(`${API_URL}/volunteer-assignments/${assignmentId}/progress`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      return handleResponse(res);
    }
  },

  // Needs (NGO Claimed Complaints)
  needs: {
    list: async () => {
      const res = await fetch(`${API_URL}/needs`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_URL}/needs/${id}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },

  // Reports
  reports: {
    list: async () => {
      const res = await fetch(`${API_URL}/reports`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_URL}/reports/${id}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    submitText: async (title, content) => {
      const res = await fetch(`${API_URL}/reports/text`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ title, text: content }),
      });
      return handleResponse(res);
    },
    submitPdf: async (title, file) => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("pdf", file);
      
      const token = localStorage.getItem("reliefsync_token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_URL}/reports/pdf`, {
        method: "POST",
        headers,
        body: formData,
      });
      return handleResponse(res);
    }
  },

  // Dashboard Overview
  dashboard: {
    getOverview: async () => {
      const res = await fetch(`${API_URL}/dashboard/overview`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getCriticalNeeds: async () => {
      const res = await fetch(`${API_URL}/dashboard/critical-needs`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getActiveAssignments: async () => {
      const res = await fetch(`${API_URL}/dashboard/active-assignments`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getVolunteerStats: async () => {
      const res = await fetch(`${API_URL}/dashboard/volunteer-stats`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  }
};
