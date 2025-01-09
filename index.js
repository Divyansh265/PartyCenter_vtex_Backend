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
app.get('/recommendations/:skuId', async (req, res) => {
    try {
        const skuId = req.params.skuId;
        if (!skuId) {
            return res.status(400).send('SKU ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        // Step 1: Fetch product details using the SKU ID
        const skuUrl = `${VTEX_API_URL}/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`;
        const skuDetails = await fetchFromVtex(skuUrl, headers);

        const productId = skuDetails.ProductId; // Extract the Product ID
        console.log(productId);

        if (!productId) {
            return res.status(404).send('Product ID not found for the given SKU ID');
        }

        // Step 2: Fetch recommendation products using the Product ID
        const recommendationsUrl = `${VTEX_API_URL}/api/catalog_system/pub/products/crossselling/similars/${productId}`;
        const recommendations = await fetchFromVtex(recommendationsUrl, headers);

        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).send('Error fetching recommendation products from VTEX API');
    }
});


app.get('/cart-with-product-details/:orderFormId', async (req, res) => {
    try {
        const { orderFormId } = req.params;
        if (!orderFormId) {
            return res.status(400).send('Order Form ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };
        const orderFormUrl = `${VTEX_API_URL}/api/checkout/pub/orderForm/${orderFormId}`;
        const orderForm = await fetchFromVtex(orderFormUrl, headers);
        if (!orderForm.items || orderForm.items.length === 0) {
            return res.json({ ...orderForm, productDetails: [] });
        }

        const productDetailsPromises = orderForm.items.map(async (item) => {
            const skuId = item.id;
            const skuDetailsUrl = `${VTEX_API_URL}/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`;
            try {
                const skuDetails = await fetchFromVtex(skuDetailsUrl, headers);
                return { ...item, skuDetails };
            } catch (error) {
                console.error(`Error fetching SKU details for SKU ID: ${skuId}`, error.message);
                return { ...item, skuDetails: null, error: 'Failed to fetch SKU details' };
            }
        });
        const productDetails = await Promise.all(productDetailsPromises);

        res.json({ ...orderForm, productDetails });
    } catch (error) {
        console.error('Error combining OrderForm and SKU details:', error.message);
        res.status(500).send('Error combining OrderForm and SKU details');
    }
});


//product fetch by product id
// app.get('/product/:productId', async (req, res) => {
//     try {
//         const productId = req.params.productId; // Get product ID from the URL
//         if (!productId) {
//             return res.status(400).send('Product ID is required');
//         }

//         const headers = {
//             'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
//             'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
//         };

//         const url = `${VTEX_API_URL}/api/catalog_system/pub/products/variations/${productId}`;
//         const productVariations = await fetchFromVtex(url, headers);

//         res.json(productVariations);
//     } catch (error) {
//         console.error('Error fetching product variations:', error);
//         res.status(500).send('Error fetching product variations from VTEX API');
//     }
// });


app.get('/product/:productId', async (req, res) => {
    try {
        const productId = req.params.productId; // Get Product ID from the URL
        if (!productId) {
            return res.status(400).send('Product ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        // Fetch product details
        const productUrl = `${VTEX_API_URL}/api/catalog_system/pub/products/variations/${productId}`;
        const productData = await fetchFromVtex(productUrl, headers);

        if (!productData || !productData.skus || productData.skus.length === 0) {
            return res.status(404).send('No SKUs found for the given product ID');
        }

        // Fetch SKU details for each SKU
        const skuPromises = productData.skus.map(async (sku) => {
            const skuUrl = `${VTEX_API_URL}/api/catalog_system/pvt/sku/stockkeepingunitbyid/${sku.sku}`;
            return fetchFromVtex(skuUrl, headers);
        });

        const skuDetails = await Promise.all(skuPromises);

        // Combine product data with SKU details
        const combinedData = {
            ...productData,
            skus: productData.skus.map((sku, index) => ({
                ...sku,
                additionalDetails: skuDetails[index],
            })),
        };

        res.json(combinedData);
    } catch (error) {
        console.error('Error fetching product and SKU details:', error);
        res.status(500).send('Error fetching product and SKU details from VTEX API');
    }
});















//OrderForm API
app.get('/cart/', async (req, res) => {
    try {
        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        const url = `${VTEX_API_URL}/api/checkout/pub/orderForm`;
        const orderForm = await fetchFromVtex(url, headers);

        res.json(orderForm);
    } catch (error) {
        console.error('Error fetching OrderForm:', error);
        res.status(500).send('Error fetching OrderForm from VTEX API');
    }
});

//add to cart
app.post('/add-to-cart/:orderFormId', async (req, res) => {
    const { orderFormId } = req.params;
    const { orderItems } = req.body;

    if (!orderItems) {
        return res.status(400).json({ error: 'Item data is required' });
    }

    try {
        const response = await axios.post(
            `${VTEX_API_URL}/api/checkout/pub/orderForm/${orderFormId}/items`,
            {
                "orderItems": orderItems
            },
            {
                headers: {
                    'X-VTEX-API-AppKey': process.env.VTEX_API_APP_KEY,
                    'X-VTEX-API-AppToken': process.env.VTEX_API_APP_TOKEN,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error adding item to cart:', error.message);
        res.status(500).json({ error: 'Failed to add item to cart', details: error });
    }
});



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

app.get('/collectionProductDetails', async (req, res) => {
    try {
        const collectionId = req.query.collectionId;
        if (!collectionId) {
            return res.status(400).send('Collection ID is required');
        }

        const headers = {
            'X-VTEX-API-AppKey': VTEX_API_APP_KEY,
            'X-VTEX-API-AppToken': VTEX_API_APP_TOKEN,
        };

        // Fetch collection products
        const collectionUrl = `${VTEX_API_URL}/api/catalog/pvt/collection/${collectionId}/products`;
        const collectionData = await fetchFromVtex(collectionUrl, headers);

        // Check if products exist in the collection
        if (!collectionData || !collectionData.Data || collectionData.Data.length === 0) {
            return res.status(404).send('No products found in the collection');
        }

        // Fetch additional details for each product
        const detailedProducts = await Promise.all(
            collectionData.Data.map(async (product) => {
                const skuId = product.SkuId;
                const skuUrl = `${VTEX_API_URL}/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`;
                try {
                    const skuDetails = await fetchFromVtex(skuUrl, headers);
                    return {
                        ...product,
                        SkuDetails: skuDetails, // Merge SKU details
                    };
                } catch (error) {
                    console.error(`Error fetching details for SKU ID: ${skuId}`, error);
                    return {
                        ...product,
                        SkuDetails: null, // Handle errors gracefully
                    };
                }
            })
        );

        // Return merged data
        res.json({
            CollectionId: collectionId,
            Products: detailedProducts,
        });
    } catch (error) {
        console.error('Error fetching collection product details:', error);
        res.status(500).send('Error fetching product details from VTEX API');
    }
});


app.get('/', (req, res) => {
    res.send('VTEX API Server is running!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

