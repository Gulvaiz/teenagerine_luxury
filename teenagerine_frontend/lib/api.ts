export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export async function fetchProducts(params?: Record<string, string>) {
    try {
        const url = new URL(`${API_BASE_URL}/products`);
        if (params) {
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        }

        const res = await fetch(url.toString(), { cache: 'no-store' }); // Ensure fresh data
        if (!res.ok) throw new Error('Failed to fetch products');

        const json = await res.json();
        // The backend returns { status: "success", data: { products: [] } } or similar structure
        // We need to return the array of products.
        // Based on product.controller.js: res.status(200).json({ status: "success", ..., data: { products }, ... })
        return json.data?.products || [];
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

export async function fetchProduct(id: string) {
    try {
        const res = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!res.ok) throw new Error('Failed to fetch product');
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}
