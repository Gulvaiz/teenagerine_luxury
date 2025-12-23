"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Grid, List } from 'lucide-react';

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = true }: FilterSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}
            >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {isOpen && <div>{children}</div>}
        </div>
    );
};

export default function FilterSidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '0');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '2500000');
    const [selectedBrands, setSelectedBrands] = useState<string[]>(searchParams.get('brands')?.split(',') || []);
    const [includeSoldOut, setIncludeSoldOut] = useState(searchParams.get('includeSoldOut') === 'true');

    // Brands list (mock for now, could catch from API)
    const brands = ['Chanel', 'Gucci', 'Louis Vuitton', 'Dior', 'Prada', 'Hermes', 'Rolex', 'Cartier'];

    const conditions = ['New With Tags', 'Pre-Owned', 'Gently Used', 'Vintage'];
    const [selectedConditions, setSelectedConditions] = useState<string[]>(searchParams.get('conditions')?.split(',') || []);

    const updateFilters = () => {
        const params = new URLSearchParams(searchParams.toString());

        if (minPrice) params.set('minPrice', minPrice);
        else params.delete('minPrice');

        if (maxPrice) params.set('maxPrice', maxPrice);
        else params.delete('maxPrice');

        if (selectedBrands.length > 0) params.set('brands', selectedBrands.join(','));
        else params.delete('brands');

        if (selectedConditions.length > 0) params.set('conditions', selectedConditions.join(','));
        else params.delete('conditions');

        if (includeSoldOut) params.set('includeSoldOut', 'true');
        else params.delete('includeSoldOut');

        // Reset page to 1 on filter change
        params.set('page', '1');

        router.push(`?${params.toString()}`);
    };

    const handleBrandToggle = (brand: string) => {
        setSelectedBrands(prev =>
            prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
        );
    };

    const handleConditionToggle = (condition: string) => {
        setSelectedConditions(prev =>
            prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
        );
    };

    // Trigger update when selections change (debounced for inputs ideally, but simpler here for now)
    // For price, we might want a "Apply" button or blur event to avoid too many redirects
    // For checkboxes, instant update is usually fine

    useEffect(() => {
        // Initial sync with URL
    }, [searchParams]);

    return (
        <aside style={{ width: '280px', flexShrink: 0, paddingRight: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Filters</span>
            </div>

            <FilterSection title="Price Range">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Min"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <span>-</span>
                    <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Max"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>
                <button
                    onClick={updateFilters}
                    className="btn btn-outline"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                >
                    Apply Price
                </button>
            </FilterSection>

            <FilterSection title="Brands">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {brands.map(brand => (
                        <label key={brand} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selectedBrands.includes(brand)}
                                onChange={() => {
                                    handleBrandToggle(brand);
                                    // setTimeout(updateFilters, 0); // Immediate update for checks? Or wait for Apply button?
                                    // Common pattern: immediate update for facets
                                }}
                            />
                            {brand}
                        </label>
                    ))}
                    <button
                        onClick={updateFilters}
                        style={{ marginTop: '10px', fontSize: '0.8rem', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        Apply Brands
                    </button>
                </div>
            </FilterSection>

            <FilterSection title="Condition">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {conditions.map(cond => (
                        <label key={cond} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selectedConditions.includes(cond)}
                                onChange={() => handleConditionToggle(cond)}
                            />
                            {cond}
                        </label>
                    ))}
                    <button
                        onClick={updateFilters}
                        style={{ marginTop: '10px', fontSize: '0.8rem', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                        Apply Conditions
                    </button>
                </div>
            </FilterSection>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                        type="checkbox"
                        checked={includeSoldOut}
                        onChange={(e) => {
                            setIncludeSoldOut(e.target.checked);
                            // We can trigger update here manually or wait for user to click separate apply
                            // Let's add a global apply button/logic or just trigger logic here
                        }}
                    />
                    Include Sold Out Products
                </label>
                <button
                    onClick={updateFilters}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '20px' }}
                >
                    Update Filters
                </button>
            </div>
        </aside>
    );
}
