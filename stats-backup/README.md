# Vercel Serverless Function Setup for Dune API

## Project Structure

```
your-project/
├── api/
│   └── portfolio-value.ts  (or .js)
├── .env.local             (local development)
├── .gitignore
├── package.json
└── vercel.json            (optional)
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @duneanalytics/client-sdk
# or
yarn add @duneanalytics/client-sdk
```

### 2. Add the Serverless Function

Place the `portfolio-value.ts` (or `.js`) file in your project's `api/` directory:
- For Next.js: `pages/api/portfolio-value.ts` or `app/api/portfolio-value/route.ts` (App Router)
- For standalone Vercel project: `api/portfolio-value.ts`

### 3. Set Up Environment Variables

#### Local Development (.env.local):
```bash
DUNE_API_KEY=your_actual_dune_api_key_here
```

#### Production (Vercel Dashboard):
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add `DUNE_API_KEY` with your actual key
4. Deploy your project

### 4. Security Configuration (Optional)

Create a `vercel.json` file to add security headers and rate limiting:

```json
{
  "functions": {
    "api/portfolio-value.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/portfolio-value",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=300, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect to GitHub for automatic deployments
```

## Usage in Frontend

```javascript
// Call your API endpoint
const response = await fetch('/api/portfolio-value');
const data = await response.json();

if (data.success) {
  console.log('Portfolio data:', data.data);
  // Access the total value based on your query structure
  const totalValue = data.data.result?.rows?.[0]?.total_value_usd;
}
```

## Security Best Practices

1. **Never commit .env.local to Git** - Add it to .gitignore:
   ```
   .env.local
   .env
   ```

2. **Restrict CORS in production** - Update the function to only allow your domain:
   ```javascript
   res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
   ```

3. **Add rate limiting** - Consider using Vercel's Edge Config or a service like Upstash for rate limiting

4. **Monitor usage** - Keep an eye on your Dune API usage to avoid unexpected costs

## Troubleshooting

### Common Issues:

1. **"DUNE_API_KEY is not defined"**
   - Make sure you've added the environment variable in Vercel Dashboard
   - Redeploy after adding environment variables

2. **CORS errors**
   - Check that your frontend is using relative URLs (`/api/portfolio-value`)
   - Ensure CORS headers are properly set in the function

3. **Timeout errors**
   - Dune queries can be slow; consider increasing `maxDuration` in vercel.json
   - Implement caching to reduce API calls

4. **"Failed to fetch portfolio value"**
   - Check your Dune API key is valid
   - Verify the query ID (6386607) is correct
   - Check Dune API status

## Next Steps

1. Customize the response parsing based on your actual Dune query structure
2. Add error handling for specific Dune API errors
3. Implement proper TypeScript types for the response
4. Add monitoring/logging (e.g., Sentry, LogRocket)
5. Consider adding a database cache for better performance
