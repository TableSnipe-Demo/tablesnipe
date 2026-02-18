import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { searchRestaurants, type RestaurantSearchResult } from "@/lib/api";
import { Search, Star, MapPin } from "lucide-react";

interface RestaurantSearchProps {
  onSelect: (restaurant: RestaurantSearchResult) => void;
}

export function RestaurantSearch({ onSelect }: RestaurantSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RestaurantSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchRestaurants(query);
        setResults(data);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search restaurants on OpenTable..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {results.map((r) => (
              <button
                key={r.id}
                className="flex w-full items-start gap-3 rounded-sm p-3 text-left hover:bg-accent transition-colors"
                onClick={() => {
                  onSelect(r);
                  setQuery(r.name);
                  setShowDropdown(false);
                }}
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt={r.name}
                    className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.cuisine} {r.price_range ? `· ${r.price_range}` : ""} · {r.city}
                  </div>
                  {r.rating && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">{r.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          No restaurants found
        </div>
      )}
    </div>
  );
}
