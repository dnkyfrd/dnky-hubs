import fetch from 'node-fetch';
import config from '../donkey_bike_city_config.json' assert { type: 'json' };

export async function handler(event, context) {
  try {
    const { city, bbox } = event.queryStringParameters;
    if (!city) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'City parameter is required' })
      };
    }

    // Find city config
    const cityConfig = config.find(c => c.city.toLowerCase() === city.toLowerCase());
    if (!cityConfig) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'City not found in config' })
      };
    }

    // Build API URL
    let apiUrl = cityConfig.endpoints.hubs;
    if (bbox) {
      const separator = apiUrl.includes('?') ? '&' : '?';
      apiUrl += `${separator}bbox=${bbox}`;
    }

    // Fetch from real API
    const response = await fetch(apiUrl, {
      headers: cityConfig.headers || {}
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Error from upstream API' })
      };
    }

    const data = await response.json();

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: data.items.map(item => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [item.longitude, item.latitude]
        },
        properties: {
          name: item.name
        }
      }))
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300'
      },
      body: JSON.stringify(geojson)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}