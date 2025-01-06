require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

if (!process.env.VTEX_API_URL || !process.env.VTEX_API_APP_KEY || !process.env.VTEX_API_APP_TOKEN) {
    throw new Error("Missing required environment variables. Please check your .env file.");
}

const VTEX_API_URL = process.env.VTEX_API_URL;
const VTEX_API_APP_KEY = process.env.VTEX_API_APP_KEY;
const VTEX_API_APP_TOKEN = process.env.VTEX_API_APP_TOKEN;

app.use(express.json());
app.use(cors());

const fetchFromVtex = async (url, headers = {}) => {
    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error(`Error fetching data from VTEX API:`, {
            message: error.message,
            response: error.response?.data || "No response data",
        });
        throw error;
    }
};



app.get('/collectionProduct', async (req, res) => {
    try {
        const collectionId = req.query.collectionId;
        if (!collectionId) {
            return res.status(400).send('Collection ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        const url = `${VTEX_API_URL}/api/catalog/pvt/collection/${collectionId}/products`;
        const products = await fetchFromVtex(url, headers);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products from VTEX API');
    }
});



app.get('/collection', async (req, res) => {
    try {
        const response = await axios.get(`https://iamtechiepartneruae.vtexcommercestable.com.br/api/catalog_system/pvt/collection/search`, {
            headers: {
                'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
                'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching products from VTEX:', error);
        res.status(500).send('Error fetching products from VTEX API');
    }
});




app.get('/searchProducts', async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).send('Search query is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        const url = `${VTEX_API_URL}/api/catalog_system/pub/products/search/${encodeURIComponent(searchQuery)}`;
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`VTEX API error: ${response.statusText}`);
        }

        const products = await response.json();

        // Fetch variations (SKUs) for each product
        const productsWithSkus = await Promise.all(
            products.map(async (product) => {
                const variationsUrl = `${VTEX_API_URL}/api/catalog_system/pub/products/variations/${product.productId}`;
                const variationsResponse = await fetch(variationsUrl, { headers });
                if (variationsResponse.ok) {
                    const skuDetails = await variationsResponse.json();
                    product.skus = skuDetails;
                } else {
                    product.skus = [];
                }
                return product;
            })
        );

        res.json(productsWithSkus);
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send('Error fetching search results from VTEX API');
    }
});


//api for fetch product using its skuid
app.get('/sku/:skuId', async (req, res) => {
    try {
        const skuId = req.params.skuId; // Get SKU ID from the URL
        if (!skuId) {
            return res.status(400).send('SKU ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        const url = `${VTEX_API_URL}/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`;
        const skuDetails = await fetchFromVtex(url, headers);
        res.json(skuDetails);
    } catch (error) {
        console.error('Error fetching SKU details:', error);
        res.status(500).send('Error fetching SKU details from VTEX API');
    }
});




app.get('/pricing/:skuId', async (req, res) => {
    try {
        const skuId = req.params.skuId; // Get SKU ID from the URL
        if (!skuId) {
            return res.status(400).send('SKU ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        // VTEX Pricing API URL
        const url = `${VTEX_API_URL}/iamtechiepartneruae/pricing/prices/${skuId}`;
        const pricingDetails = await fetchFromVtex(url, headers);
        res.json(pricingDetails);
    } catch (error) {
        console.error('Error fetching pricing details:', error);
        res.status(500).send('Error fetching pricing details from VTEX API');
    }
});

app.get('/', (req, res) => {
    res.send('VTEX API Server is running!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

