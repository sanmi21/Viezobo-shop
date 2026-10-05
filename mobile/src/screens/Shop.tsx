import { useEffect, useState } from "react";
import type { Product } from "../../../types/shop";
import { useCart } from "../../../shared/cart-context";
import { request } from "../services/api";
import { Button, Notice, money } from "../components/ui";
export function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart, busy } = useCart();
  function load() {
    setLoading(true);
    setError("");
    void request("/api/products")
      .then((data) => setProducts((data as { products: Product[] }).products))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  return (
    <>
      <section className="hero">
        <span>JOY IN A BOTTLE</span>
        <h1>
          Your everyday
          <br />
          <em>refreshment.</em>
        </h1>
        <p>Explore our hibiscus, fruit and spice blends.</p>
      </section>
      <h2>Our drinks</h2>
      {loading && <Notice>Loading drinks…</Notice>}
      {error && (
        <>
          <Notice>{error}</Notice>
          <Button onClick={load}>Retry</Button>
        </>
      )}
      <div className="products">
        {products.map((product) => (
          <article className="product" key={product.id}>
            <img src={product.image_url} alt={product.name} />
            <div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <small>
                {product.size} ·{" "}
                {product.stock_status ? "In stock" : "Unavailable"}
              </small>
              <footer>
                <strong>{money(product.price)}</strong>
                <Button
                  disabled={!product.stock_status || busy}
                  onClick={() => addToCart(product)}
                >
                  Add +
                </Button>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
