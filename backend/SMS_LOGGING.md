# SMS Service Logging

## Overview

We've implemented comprehensive logging for the SMS service with Melipayamak integration. The logging system captures detailed information about:

- SMS service initialization
- SMS sending attempts
- Request payloads and headers
- Response data and status codes
- Error conditions and exceptions

## Log Files

Logs are stored in the `logs/` directory:

- `logs/app.log` - General application logs
- `logs/sms.log` - SMS-specific logs with detailed debugging information

The logging system uses rotating file handlers to prevent logs from growing too large.

## Testing the SMS Service

### Using the Test Script

We've created a test script to help diagnose SMS issues:

```bash
# Make sure the script is executable
chmod +x test_melipayamak.py

# Run the test script
./test_melipayamak.py
```

The script provides two testing modes:
1. **Direct API Testing** - Tests the Melipayamak API directly without going through our service layer
2. **Service Integration Testing** - Tests our SMS service layer's integration with Melipayamak

### Checking Logs

After running tests or during normal operation, check the logs:

```bash
# View the main application log
cat logs/app.log

# View SMS-specific logs
cat logs/sms.log

# Monitor SMS logs in real-time
tail -f logs/sms.log
```

## Troubleshooting Melipayamak Issues

If SMS messages are not being delivered, check:

1. **Phone Number Format**: Melipayamak expects Iranian numbers in the format `09XXXXXXXXX`
   - Our system automatically converts `+98XXXXXXXXX` to `09XXXXXXXXX`
   - Check SMS logs to confirm the number is being formatted correctly

2. **API Response Codes**: 
   - HTTP 200 indicates successful message sending
   - Any other code indicates a problem (details will be in the logs)

3. **API Key Validity**:
   - Verify the API key in the `.env` file is correct
   - The system uses the format `https://console.melipayamak.com/api/send/otp/{MELIPAYAMAK_API_KEY}`

4. **Network Connectivity**:
   - Ensure the server can reach the Melipayamak API endpoint
   - Look for timeout errors in the logs

## Configuration

The SMS provider can be configured in the `.env` file