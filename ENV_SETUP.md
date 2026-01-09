# Environment Variables Setup

## Required Environment Variables

### Dune Analytics API Key

To enable the TVL (Total Value Locked) display on the homepage, you need to add your Dune Analytics API key to your environment variables.

#### Local Development

Add the following to your `.env.local` file:

```bash
DUNE_API_KEY=your_actual_dune_api_key_here
```

#### Production (Vercel)

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `DUNE_API_KEY`
   - **Value**: Your Dune Analytics API key
   - **Environment**: Select the appropriate environments (Production, Preview, Development)
4. Save and redeploy your project

### Getting a Dune API Key

1. Sign up for a [Dune Analytics account](https://dune.com/auth/register)
2. Go to your [API settings](https://dune.com/settings/api)
3. Generate a new API key
4. Copy the key and add it to your environment variables

### Security Notes

- **Never commit** your `.env.local` file to version control
- Ensure `.env.local` is listed in your `.gitignore` file
- Keep your API keys secure and rotate them regularly
- Use different API keys for development and production environments when possible

### Troubleshooting

If the TVL display shows an error:

1. Verify your `DUNE_API_KEY` is correctly set
2. Check that the API key is valid and has not expired
3. Ensure you've restarted your development server after adding the environment variable
4. For production, verify the environment variable is set in Vercel and redeploy

### API Rate Limits

The TVL endpoint is configured with:
- 5-minute cache to reduce API calls
- Automatic refresh every 5 minutes on the client side
- Server-side caching headers for optimal performance

This ensures efficient use of the Dune API while keeping data reasonably fresh.