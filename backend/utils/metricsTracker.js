/**
 * Metrics Tracker
 * Tracks chatbot engagement and conversion metrics
 */

const fs = require('fs-extra');
const fsSync = require('fs');
const path = require('path');

class MetricsTracker {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.metricsPath = path.join(this.dataPath, 'metrics.json');
    this.sessionsPath = path.join(this.dataPath, 'sessions.json');
    this.loading = false;
    this.loaded = false;
    // Initialize asynchronously without blocking
    this.initializeDataDirectory().catch(err => {
      console.error('Error initializing metrics tracker:', err);
    });
  }

  /**
   * Initialize data directory
   */
  async initializeDataDirectory() {
    try {
      await fs.ensureDir(this.dataPath);
      await this.loadMetrics();
      await this.loadSessions();
      this.loaded = true;
    } catch (error) {
      console.error('Error initializing metrics directory:', error);
      // Initialize defaults if loading fails
      this.metrics = this.initializeMetrics();
      this.sessions = [];
      this.loaded = true;
    }
  }

  /**
   * Ensure data is loaded before operations
   */
  async ensureLoaded() {
    if (this.loaded) return;
    
    if (this.loading) {
      // Wait for ongoing load
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }
    
    this.loading = true;
    try {
      if (!this.metrics) await this.loadMetrics();
      if (!this.sessions) await this.loadSessions();
      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Load metrics from disk (synchronous for faster loading)
   */
  async loadMetrics() {
    try {
      if (await fs.pathExists(this.metricsPath)) {
        // Use readFileSync for faster loading (small JSON files)
        const data = fsSync.readFileSync(this.metricsPath, 'utf8');
        this.metrics = JSON.parse(data);
      } else {
        this.metrics = this.initializeMetrics();
        // Save asynchronously
        this.saveMetrics().catch(err => console.error('Error saving metrics:', err));
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
      this.metrics = this.initializeMetrics();
    }
  }

  /**
   * Load sessions from disk (synchronous for faster loading)
   */
  async loadSessions() {
    try {
      if (await fs.pathExists(this.sessionsPath)) {
        // Use readFileSync for faster loading
        const data = fsSync.readFileSync(this.sessionsPath, 'utf8');
        this.sessions = JSON.parse(data);
      } else {
        this.sessions = [];
        // Save asynchronously
        this.saveSessions().catch(err => console.error('Error saving sessions:', err));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.sessions = [];
    }
  }

  /**
   * Initialize metrics structure
   */
  initializeMetrics() {
    return {
      totalVisitors: 0,
      engagedVisitors: 0,
      totalConversations: 0,
      totalMessages: 0,
      qualifiedLeads: 0,
      meetingsBooked: 0,
      unknownUsers: 0,
      knownUsers: 0,
      dropOffPoints: {},
      startTime: new Date().toISOString()
    };
  }

  /**
   * Track a new visitor (chatbot opened)
   */
  async trackVisitor(sessionId, userEmail = null) {
    await this.ensureLoaded();
    
    this.metrics.totalVisitors++;
    
    // Create new session
    const session = {
      sessionId,
      email: userEmail || 'unknown',
      startTime: new Date().toISOString(),
      endTime: null,
      messageCount: 0,
      qualified: false,
      meetingBooked: false,
      dropOffPoint: null,
      conversationLength: 0,
      messages: []
    };

    this.sessions.push(session);
    
    if (userEmail) {
      this.metrics.knownUsers++;
    } else {
      this.metrics.unknownUsers++;
    }

    await this.saveMetrics();
    await this.saveSessions();
    
    return session;
  }

  /**
   * Track engagement (first message sent)
   */
  async trackEngagement(sessionId) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session && !session.engaged) {
      this.metrics.engagedVisitors++;
      this.metrics.totalConversations++;
      session.engaged = true;
      await this.saveMetrics();
      await this.saveSessions();
    }
  }

  /**
   * Track a message in conversation
   */
  async trackMessage(sessionId, message, response) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.messageCount++;
      session.messages.push({
        userMessage: message,
        botResponse: response,
        timestamp: new Date().toISOString()
      });
      
      this.metrics.totalMessages++;
      await this.saveSessions();
      await this.saveMetrics();
    }
  }

  /**
   * Track lead qualification
   */
  async trackQualification(sessionId, score) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session && !session.qualified && score >= 50) {
      this.metrics.qualifiedLeads++;
      session.qualified = true;
      session.qualificationScore = score;
      await this.saveMetrics();
      await this.saveSessions();
    }
  }

  /**
   * Track meeting booking
   */
  async trackMeetingBooking(sessionId) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session && !session.meetingBooked) {
      this.metrics.meetingsBooked++;
      session.meetingBooked = true;
      await this.saveMetrics();
      await this.saveSessions();
    }
  }

  /**
   * Track drop-off (when user closes chat)
   */
  async trackDropOff(sessionId, messageCount) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.endTime = new Date().toISOString();
      session.conversationLength = session.messageCount;
      
      // Categorize drop-off point
      let dropOffPoint = 'initial';
      if (messageCount === 0) {
        dropOffPoint = 'before_first_message';
      } else if (messageCount < 3) {
        dropOffPoint = 'early_conversation';
      } else if (messageCount < 10) {
        dropOffPoint = 'mid_conversation';
      } else {
        dropOffPoint = 'late_conversation';
      }
      
      session.dropOffPoint = dropOffPoint;
      
      if (!this.metrics.dropOffPoints[dropOffPoint]) {
        this.metrics.dropOffPoints[dropOffPoint] = 0;
      }
      this.metrics.dropOffPoints[dropOffPoint]++;
      
      await this.saveMetrics();
      await this.saveSessions();
    }
  }

  /**
   * Update user email
   */
  async updateUserEmail(sessionId, email) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      const wasUnknown = session.email === 'unknown';
      session.email = email;
      
      if (wasUnknown && email !== 'unknown') {
        this.metrics.unknownUsers--;
        this.metrics.knownUsers++;
      } else if (!wasUnknown && email === 'unknown') {
        this.metrics.knownUsers--;
        this.metrics.unknownUsers++;
      }
      
      await this.saveMetrics();
      await this.saveSessions();
    }
  }

  /**
   * Save questionnaire answers for a session
   */
  async saveQuestionnaireAnswers(sessionId, answers) {
    await this.ensureLoaded();
    
    const session = this.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.questionnaireAnswers = answers;
      session.questionnaireCompleted = true;
      session.questionnaireCompletedAt = new Date().toISOString();
      await this.saveSessions();
    }
  }

  /**
   * Get all metrics
   */
  async getMetrics() {
    await this.ensureLoaded();
    
    const engagementRate = this.metrics.totalVisitors > 0 
      ? ((this.metrics.engagedVisitors / this.metrics.totalVisitors) * 100).toFixed(2)
      : 0;
    
    const avgConversationLength = this.metrics.totalConversations > 0
      ? (this.metrics.totalMessages / this.metrics.totalConversations).toFixed(2)
      : 0;
    
    const qualificationRate = this.metrics.engagedVisitors > 0
      ? ((this.metrics.qualifiedLeads / this.metrics.engagedVisitors) * 100).toFixed(2)
      : 0;
    
    const meetingBookingRate = this.metrics.qualifiedLeads > 0
      ? ((this.metrics.meetingsBooked / this.metrics.qualifiedLeads) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      engagementRate: `${engagementRate}%`,
      avgConversationLength,
      qualificationRate: `${qualificationRate}%`,
      meetingBookingRate: `${meetingBookingRate}%`
    };
  }

  /**
   * Get all sessions
   */
  async getSessions() {
    await this.ensureLoaded();
    return this.sessions;
  }

  /**
   * Save metrics to disk
   */
  async saveMetrics() {
    try {
      await fs.writeJson(this.metricsPath, this.metrics, { spaces: 2 });
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Save sessions to disk
   */
  async saveSessions() {
    try {
      await fs.writeJson(this.sessionsPath, this.sessions, { spaces: 2 });
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }
}

module.exports = { MetricsTracker };

