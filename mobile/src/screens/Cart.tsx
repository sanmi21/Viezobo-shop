import { useCart } from "../../../shared/cart-context";
import { Button, money, Notice } from "../components/ui";
export function Cart({ checkout }: { checkout: () => void }) {
  const { cart, subtotal, busy, hydrated, updateQuantity, removeFromCart } =
    useCart();
  return (
    <>
      <h1>Your cart</h1>
      {!hydrated ? (
        <Notice>Loading your shared cart…</Notice>
      ) : !cart.length ? (
        <Notice>Your cart is empty. Add a drink from the shop.</Notice>
      ) : (
        <>
          <div className="panel">
            {cart.map(({ product, quantity }) => (
              <article className="cart-item" key={product.id}>
                <img src={product.image_url} alt="" />
                <div>
                  <h3>{product.name}</h3>
                  <p>{money(product.price)}</p>
                  <div className="quantity">
                    <button
                      disabled={busy}
                      aria-label={`Decrease ${product.name}`}
                      onClick={() => updateQuantity(product.id, -1)}
                    >
                      −
                    </button>
                    <span>{quantity}</span>
                    <button
                      disabled={busy}
                      aria-label={`Increase ${product.name}`}
                      onClick={() => updateQuantity(product.id, 1)}
                    >
                      +
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => removeFromCart(product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
            <div className="total">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
          </div>
          <Button disabled={busy} onClick={checkout}>
            Continue to checkout
          </Button>
        </>
      )}
    </>
  );
}
