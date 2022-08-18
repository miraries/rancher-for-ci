import axios from 'axios'

export default async function clearCfCache({zoneId, apiKey}) {
    return await axios.post(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
        purge_everything: true
    }, {
        headers: {
            Authorization: `Bearer ${apiKey}`
        }
    });
}