import { useState, useCallback, useEffect } from "react";
import { Product, RetailShop, OrderBooker, Order, Vendor } from "../db/schema";
import { getProducts } from "../db/productService";
import { getShops } from "../db/shopService";
import { getBookers } from "../db/bookerService";
import { getOrders } from "../db/orderService";
import { getVendors } from "../db/vendorService";
import { initDb } from "../db/client";

export function useAppData(isAuthenticated: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<RetailShop[]>([]);
  const [bookers, setBookers] = useState<OrderBooker[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAppData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      await initDb();
      try {
        const prodList = await getProducts();
        setProducts(prodList);
      } catch (e) {
        console.error("Failed to load products:", e);
      }
      try {
        const shopList = await getShops();
        setShops(shopList);
      } catch (e) {
        console.error("Failed to load shops:", e);
      }
      try {
        const bookerList = await getBookers();
        setBookers(bookerList);
      } catch (e) {
        console.error("Failed to load bookers:", e);
      }
      try {
        const orderList = await getOrders();
        setOrders(orderList);
      } catch (e) {
        console.error("Failed to load orders:", e);
      }
      try {
        const vendorList = await getVendors();
        setVendors(vendorList);
      } catch (e) {
        console.error("Failed to load vendors:", e);
      }
    } catch (err) {
      console.error("Database initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppData(true);
    }
  }, [isAuthenticated, fetchAppData]);

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockAlert).length;
  const pendingOrdersCount = orders.filter((o) => o.status === "PENDING").length;

  return {
    products,
    shops,
    bookers,
    orders,
    vendors,
    lowStockCount,
    pendingOrdersCount,
    isLoading,
    fetchAppData,
  };
}
