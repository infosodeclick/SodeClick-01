class VoteRankingAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // ดึงรายการคะแนนโหวตเรียงลำดับ
  async getVoteRankings(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        voteType = 'popularity_combined',
        sortBy = 'totalVotes',
        search = ''
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        voteType,
        sortBy
      });

      // เพิ่ม search parameter ถ้ามี
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`${this.baseURL}/api/vote/ranking?${params.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      console.log('🏆 Vote rankings response:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting vote rankings:', error);
      throw error;
    }
  }

  // ดึงข้อมูลสถิติคะแนนโหวต
  async getVoteStats() {
    try {
      const response = await fetch(`${this.baseURL}/api/vote/ranking?limit=1`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result.data.stats;
    } catch (error) {
      console.error('❌ Error getting vote stats:', error);
      throw error;
    }
  }
}

export default new VoteRankingAPI();
