# Lead Qualification Points System

## 📍 Location

The points system is located in: **`backend/utils/leadQualification.js`**

It's used in: **`backend/server.js`** (lines 82-106, 177-179, 233-235)

---

## 🎯 How It Works

### Qualification Threshold
- **Minimum points needed**: `50 points` to be considered a qualified lead
- Located in: `backend/utils/leadQualification.js` line 32

### Points System Breakdown

| Criteria | Points | Keywords/Triggers |
|----------|--------|-------------------|
| **Budget Mentioned** | 10 pts | budget, investment, cost, price, afford, capital, funding, money, $ |
| **Budget Range** | 15 pts | $10k, $50k, $100k, $500k, thousand, million |
| **Specific Franchise** | 12 pts | franchise type, specific, looking for, interested in, which franchise |
| **Location Mentioned** | 8 pts | location, area, city, state, near me, local, region |
| **Timeline Mentioned** | 15 pts | when, timeline, soon, asap, quickly, start, launch, open |
| **Asking Questions** | 5 pts | how, what, why, tell me, explain, more info |
| **Ready to Proceed** | 20 pts | ready, proceed, next steps, apply, sign up, register, get started |
| **Consultation Interest** | 18 pts | consultation, talk, meet, discuss, call, speak |
| **Business Experience** | 10 pts | experience, background, previous, owned, business, entrepreneur |
| **Franchise Experience** | 15 pts | franchise owner, franchised, franchisee, operated franchise |
| **Multiple Questions** | 8 pts | Calculated: messageCount > 5 |
| **Detailed Response** | 5 pts | Calculated: message length > 50 characters |

---

## 🔄 Flow in Server (`backend/server.js`)

### 1. Initialization (Line 82)
```javascript
const leadQualifier = new LeadQualification();
```

### 2. Greeting Detection (Lines 85-86)
- Detects if user says "hello", "hi", "hey", etc.
- **Only activates scoring on greetings** or if already started

### 3. Points Calculation (Lines 98-106)
```javascript
if (isGreeting || sessionData.qualificationScore > 0) {
  qualification = leadQualifier.analyzeMessage(sanitizedMessage, {
    messageCount: sessionData.messageCount || 1,
    currentScore: sessionData.qualificationScore || 0
  });
  totalScore = qualification.totalScore;
}
```

### 4. Qualification Check (Lines 177-179)
```javascript
const justQualified = totalScore > 0 && 
                     previousScore < 50 && 
                     qualification.totalScore >= 50;
```

### 5. Response with Points (Lines 233-235)
```javascript
qualificationScore: totalScore,
qualificationStatus: qualificationStatus,
pointsAdded: qualification.points,
```

---

## 📊 Qualification Statuses

Based on total score:
- **`qualified`**: ≥ 50 points (meeting threshold)
- **`almost_qualified`**: ≥ 35 points (70% of threshold)
- **`interested`**: ≥ 20 points (40% of threshold)
- **`browsing`**: < 20 points

---

## 🎯 When Points Are Awarded

1. **On Greetings**: When user says "hello", "hi", etc. → Scoring starts
2. **On Direct Questions**: If user asks a direct question (not greeting), scoring is **NOT activated** (only answers provided)
3. **Accumulative**: Points accumulate throughout the conversation
4. **Once Started**: If scoring has started (score > 0), it continues for all messages

---

## 💡 Example Flow

1. User: "hello" → Scoring starts (0 points)
2. User: "I'm looking for pizza franchises" → +12 pts (specific franchise) = **12 total**
3. User: "I have $1 million budget" → +15 pts (budget range) = **27 total**
4. User: "in NW Calgary" → +8 pts (location) = **35 total**
5. User: "I want to start soon" → +15 pts (timeline) = **50 total** ✅ **QUALIFIED!**
6. Bot asks: "Would you like to schedule a meeting with our founder?"

---

## 🔧 Configuration

To modify the points system:
- **File**: `backend/utils/leadQualification.js`
- **Threshold**: Line 32 (`this.qualificationThreshold = 50`)
- **Points**: Lines 9-30 (`this.qualificationCriteria`)
- **Keywords**: Update keywords arrays to match your needs

---

## 📝 Current Status

✅ **Working**: Points are being calculated and tracked
✅ **Working**: Only activates on greetings or if already started
✅ **Working**: Returns points to frontend for display
✅ **Working**: Triggers meeting suggestion at 50 points

