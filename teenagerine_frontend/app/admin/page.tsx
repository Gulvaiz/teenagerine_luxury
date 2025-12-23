export default function AdminPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            <p>Admin panel design coming soon.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 border rounded shadow">
                    <h2 className="text-xl font-bold">Manage Products</h2>
                    <p>Add, edit, or remove products.</p>
                </div>
                <div className="p-4 border rounded shadow">
                    <h2 className="text-xl font-bold">Manage Orders</h2>
                    <p>View and process orders.</p>
                </div>
            </div>
        </div>
    );
}
