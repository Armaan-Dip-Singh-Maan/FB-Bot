/**
 * Lead Qualification System
 * Tracks user engagement and interest to determine if they're a qualified lead
 */

class LeadQualification {
  constructor() {
    this.qualificationCriteria = {
      // Budget/Investment indicators
      budgetMentioned: { points: 10, keywords: ['budget', 'investment', 'cost', 'price', 'afford', 'capital', 'funding', 'money', '$'] },
      budgetRange: { points: 15, keywords: ['$10k', '$50k', '$100k', '$500k', 'thousand', 'million'] },
      
      // Serious interest indicators
      specificFranchise: { points: 12, keywords: ['franchise type', 'specific', 'looking for', 'interested in', 'which franchise'] },
      locationMentioned: { points: 8, keywords: ['location', 'area', 'city', 'state', 'near me', 'local', 'region'] },
      timelineMentioned: { points: 15, keywords: ['when', 'timeline', 'soon', 'asap', 'quickly', 'start', 'launch', 'open'] },
      
      // Commitment indicators
      askingQuestions: { points: 5, keywords: ['how', 'what', 'why', 'tell me', 'explain', 'more info'] },
      readyToProceed: { points: 20, keywords: ['ready', 'proceed', 'next steps', 'apply', 'sign up', 'register', 'get started'] },
      consultationInterest: { points: 18, keywords: ['consultation', 'talk', 'meet', 'discuss', 'call', 'speak'] },
      
      // Experience indicators
      businessExperience: { points: 10, keywords: ['experience', 'background', 'previous', 'owned', 'business', 'entrepreneur'] },
      franchiseExperience: { points: 15, keywords: ['franchise owner', 'franchised', 'franchisee', 'operated franchise'] },
      
      // Engagement indicators
      multipleQuestions: { points: 8 }, // Calculated by message count
      detailedResponse: { points: 5 }, // Calculated by message length
    };
    
    this.qualificationThreshold = 50; // Minimum points to be considered qualified
    
    // Industry categories for filtering
    this.industries = [
      'Food & Beverage',
      'Retail',
      'Home Services',
      'Fitness & Health',
      'Education',
      'Other'
    ];
    
    // Price ranges for filtering
    this.priceRanges = [
      { label: 'Under $50K', min: 0, max: 50000 },
      { label: '$50K-$150K', min: 50000, max: 150000 },
      { label: '$150K-$300K', min: 150000, max: 300000 },
      { label: '$300K+', min: 300000, max: Infinity }
    ];
  }
  
  /**
   * Extract filter preferences from message
   * @param {string} message - User's message
   * @param {Object} currentFilters - Current filter state
   * @returns {Object} Updated filter preferences
   */
  extractFilters(message, currentFilters = {}) {
    const lowerMessage = message.toLowerCase();
    const filters = { ...currentFilters };
    
    // Extract industry
    for (const industry of this.industries) {
      const industryLower = industry.toLowerCase();
      if (lowerMessage.includes(industryLower) || 
          (industry === 'Food & Beverage' && (lowerMessage.includes('food') || lowerMessage.includes('restaurant') || lowerMessage.includes('cafe'))) ||
          (industry === 'Home Services' && (lowerMessage.includes('home') || lowerMessage.includes('cleaning') || lowerMessage.includes('repair'))) ||
          (industry === 'Fitness & Health' && (lowerMessage.includes('fitness') || lowerMessage.includes('gym') || lowerMessage.includes('health'))) ||
          (industry === 'Education' && (lowerMessage.includes('education') || lowerMessage.includes('school') || lowerMessage.includes('tutoring')))) {
        filters.industry = industry;
        break;
      }
    }
    
    // Extract price range
    for (const range of this.priceRanges) {
      if (lowerMessage.includes(range.label.toLowerCase()) || 
          lowerMessage.includes(`$${range.min / 1000}k`) ||
          lowerMessage.includes(`$${range.min}`)) {
        filters.priceRange = range.label;
        break;
      }
    }
    
    // Extract location (simple - look for city/state patterns)
    // Check for location keywords followed by a word
    const locationKeywords = ['in', 'at', 'near', 'around', 'location'];
    for (const keyword of locationKeywords) {
      const pattern = new RegExp(`${keyword}\\s+([a-z]+(?:\\s+[a-z]+)?)`, 'i');
      const match = message.match(pattern);
      if (match && match[1]) {
        // Capitalize first letter of each word
        filters.location = match[1].split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
      }
    }
    
    return filters;
  }

  /**
   * Analyze a message and calculate qualification points
   * @param {string} message - User's message
   * @param {Object} sessionData - Current session data (message count, etc.)
   * @returns {Object} Qualification analysis with points and reasons
   */
  analyzeMessage(message, sessionData = {}) {
    const lowerMessage = message.toLowerCase();
    let points = 0;
    const reasons = [];
    const detectedCriteria = {};

    // Check each qualification criteria
    for (const [criterion, config] of Object.entries(this.qualificationCriteria)) {
      if (config.keywords) {
        const matched = config.keywords.some(keyword => 
          lowerMessage.includes(keyword.toLowerCase())
        );
        
        if (matched && !detectedCriteria[criterion]) {
          points += config.points;
          reasons.push(`+${config.points}pts: ${criterion.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
          detectedCriteria[criterion] = true;
        }
      }
    }

    // Check message count for engagement
    if (sessionData.messageCount > 5) {
      const engagementPoints = Math.min(8, Math.floor(sessionData.messageCount / 5) * 2);
      if (engagementPoints > 0 && !detectedCriteria.multipleQuestions) {
        points += engagementPoints;
        reasons.push(`+${engagementPoints}pts: high engagement (${sessionData.messageCount} messages)`);
        detectedCriteria.multipleQuestions = true;
      }
    }

    // Check message length for detailed response
    if (message.length > 50 && !detectedCriteria.detailedResponse) {
      points += this.qualificationCriteria.detailedResponse.points;
      reasons.push(`+${this.qualificationCriteria.detailedResponse.points}pts: detailed response`);
      detectedCriteria.detailedResponse = true;
    }

    return {
      points,
      reasons,
      isQualified: points >= this.qualificationThreshold,
      totalScore: (sessionData.currentScore || 0) + points
    };
  }

  /**
   * Get qualification status message
   * @param {number} currentScore - Current total qualification score
   * @returns {string} Status message
   */
  getQualificationStatus(currentScore) {
    const threshold = this.qualificationThreshold;
    
    if (currentScore >= threshold) {
      return 'qualified';
    } else if (currentScore >= threshold * 0.7) {
      return 'almost_qualified';
    } else if (currentScore >= threshold * 0.4) {
      return 'interested';
    } else {
      return 'browsing';
    }
  }

  /**
   * Check if lead should be asked about meeting
   * @param {number} totalScore - Total qualification score
   * @param {boolean} alreadySuggested - Whether meeting was already suggested
   * @returns {boolean} Whether to suggest meeting
   */
  shouldSuggestMeeting(totalScore, alreadySuggested = false) {
    return totalScore >= this.qualificationThreshold && !alreadySuggested;
  }
}

module.exports = { LeadQualification };

