import Header from "../components/Header";
import { Discovery } from "../components/Catalog";

export default function Marketplace() {
  return (
    <>
      <Header />
      <main className="marketplace-page">
        <h1>Textile marketplace</h1>
        <Discovery />
      </main>
    </>
  );
}
