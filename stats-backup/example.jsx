// Frontend code example - how to call your Vercel function

// React/Next.js example
export async function getPortfolioValue() {
  try {
    const response = await fetch('/api/portfolio-value');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Extract the total value from the Dune query result
      // Adjust this based on your actual query structure
      const totalValue = result.data.result?.rows?.[0]?.total_value_usd;
      return totalValue;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error fetching portfolio value:', error);
    throw error;
  }
}

// Usage in a React component
import { useState, useEffect } from 'react';

function PortfolioValue() {
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchValue() {
      try {
        setLoading(true);
        const portfolioValue = await getPortfolioValue();
        setValue(portfolioValue);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchValue();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchValue, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading portfolio value...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Total Portfolio Value</h2>
      <p>${value?.toLocaleString() ?? 'N/A'}</p>
    </div>
  );
}

export default PortfolioValue;
