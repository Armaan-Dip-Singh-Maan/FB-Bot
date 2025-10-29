# Calendly Integration Setup Guide

This guide will help you set up Calendly integration with your Franquicia Boost bot.

## Prerequisites

1. A Calendly account (free or paid)
2. Your Calendly username

## Setup Steps

### 1. Get Your Calendly Username

1. Log in to your Calendly account
2. Go to your profile settings
3. Look for your username in the URL or settings
4. Your Calendly link will look like: `https://calendly.com/YOUR_USERNAME`

### 2. Configure the Bot

1. Open `backend/config/calendly.js`
2. Replace `'YOUR_CALENDLY_USERNAME'` with your actual Calendly username
3. Save the file

Example:
```javascript
module.exports = {
    username: 'john-doe', // Your actual Calendly username
    widget: {
        minWidth: '320',
        height: '600',
    }
};
```

### 3. Set Up Your Calendly Event Types

1. In your Calendly account, create an event type for "Franchise Consultation"
2. Set the duration (recommended: 30-60 minutes)
3. Add a description about discussing franchise opportunities
4. Set your availability

### 4. Test the Integration

1. Start your backend server: `npm start` (in the backend directory)
2. Open your bot in the browser
3. Try asking questions that show interest in franchises:
   - "I'm interested in investing in a franchise"
   - "What franchise opportunities do you have?"
   - "I want to learn more about becoming a franchisee"
4. The bot should suggest scheduling a call
5. Click the "Schedule a Call" button to test the Calendly widget

## How It Works

### Interest Detection

The bot automatically detects when users show interest in franchise opportunities by analyzing their messages for:

- Investment-related questions
- Specific franchise inquiries
- Expressions of serious consideration
- Questions about next steps
- Commitment to franchise opportunities

### Calendly Suggestion

When interest is detected, the bot will:

1. Display a special message with a call-to-action
2. Show a "Schedule a Call with Our Founder" button
3. Open a Calendly widget when clicked
4. Allow users to book directly with your calendar

### Customization

You can customize the Calendly integration by modifying:

- **Interest detection**: Edit the system prompt in `backend/utils/openaiClient.js`
- **Suggestion message**: Modify the `addCalendlySuggestion()` function in `script.js`
- **Widget appearance**: Update the CSS in `style.css`
- **Event types**: Configure in your Calendly account

## Troubleshooting

### Common Issues

1. **Calendly widget not loading**
   - Check your Calendly username is correct
   - Ensure your Calendly account is active
   - Verify the Calendly script is loading (check browser console)

2. **Interest detection not working**
   - The AI might need more specific training
   - Try asking more direct questions about franchise investment
   - Check the system prompt in `openaiClient.js`

3. **Styling issues**
   - Check the CSS classes in `style.css`
   - Ensure the Calendly widget has proper dimensions
   - Test on different screen sizes

### Testing Interest Detection

Try these sample questions to test the integration:

- "I have $100,000 to invest in a franchise, what do you recommend?"
- "I'm seriously considering becoming a franchisee, what are my options?"
- "I want to discuss franchise opportunities with someone who can help me choose"
- "What's the next step to get started with a franchise?"

## Support

If you need help with the Calendly integration:

1. Check the Calendly documentation: https://help.calendly.com/
2. Verify your Calendly account settings
3. Test the integration step by step
4. Check browser console for any JavaScript errors

## Security Notes

- The Calendly integration uses public APIs
- No sensitive data is stored in the bot
- Users book directly through Calendly's secure platform
- Your calendar availability is managed through Calendly
