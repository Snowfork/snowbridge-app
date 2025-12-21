import { VercelRequest, VercelResponse } from '@vercel/node';
import { DuneClient } from "@duneanalytics/client-sdk";

// Enable CORS if you need to call this from a different domain
const allowCors = (fn: Function) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Replace * with your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Dune client with API key from environment variable
    const dune = new DuneClient(process.env.DUNE_API_KEY!);
    
    // Get the latest result for your query
    const queryResult = await dune.getLatestResult({ queryId: 6386607 });
    
    // Cache the response for 5 minutes to reduce API calls
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    // Return the result
    return res.status(200).json({
      success: true,
      data: queryResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dune API error:', error);
    
    // Don't expose internal error details to the client
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio value',
      timestamp: new Date().toISOString()
    });
  }
}

export default allowCors(handler);
