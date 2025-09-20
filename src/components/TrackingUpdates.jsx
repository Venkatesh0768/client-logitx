import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Tabs,
  Tab,
  Box,
  Switch,
  FormControlLabel,
  useMediaQuery,
  Stack,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useTheme } from "@mui/material/styles";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TrackingUpdates = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoCenter, setAutoCenter] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);

  // Fetch orders from Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      const ordersRef = collection(db, "AllOrders");
      const ordersQuery = query(ordersRef, where("userId", "==", user.uid));
      const snap = await getDocs(ordersQuery);
      const all = [];
      snap.forEach((docItem) => {
        const data = docItem.data();
        all.push({
          id: data.order_id || docItem.id,
          driver: data.user_name || "Unknown",
          vehicle: data.vehicle_type || "Unknown",
          vehicleNumber: data.vehicleNumber || "", // Add this if available
          location: {
            lat: Number(data.dest_lat) || 0,
            lng: Number(data.dest_lng) || 0,
          },
          status: data.order_status || "Unknown",
          lastUpdated: data.booking_date
            ? new Date(data.booking_date)
            : new Date(),
          route: [
            {
              lat: Number(data.from_lat) || 0,
              lng: Number(data.from_lng) || 0,
            },
            {
              lat: Number(data.dest_lat) || 0,
              lng: Number(data.dest_lng) || 0,
            },
          ],
        });
      });
      setOrders(all);
      setFilteredOrders(all);
    };
    fetchOrders();
  }, [user]);

  useEffect(() => {
    const lower = search.trim().toLowerCase();
    setFilteredOrders(
      orders.filter(
        (order) =>
          order.id.toLowerCase().includes(lower) ||
          (order.vehicleNumber && order.vehicleNumber.toLowerCase().includes(lower))
      )
    );
    setActiveIdx(0); // Reset active tab on search
  }, [search, orders]);

  const activeOrder = filteredOrders[activeIdx] || {};

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view tracking updates</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: 24, md: 40 } }}>
        Real‑Time Order Tracking
      </Typography>
      <hr />

      <Box sx={{ mb: 2 }}>
        <TextField
          label="Search by Order ID or Vehicle Number"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: isMobile ? "100%" : 350, mb: 2 }}
        />
      </Box>

      <Box sx={{ overflowX: "auto", mb: 2 }}>
        <Tabs
          value={activeIdx}
          onChange={(e, v) => setActiveIdx(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
        >
          {filteredOrders.map((order, idx) => (
            <Tab key={order.id} label={`Order #${order.id}`} />
          ))}
        </Tabs>
      </Box>

      {activeOrder && (
        <>
          {/* <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              justifyContent="space-between"
              alignItems={isMobile ? "flex-start" : "center"}
            >
              <Box>
                <Typography variant="body1">
                  <strong>Driver:</strong> {activeOrder.driver}
                </Typography>
                <Typography variant="body1">
                  <strong>Vehicle:</strong> {activeOrder.vehicle}
                </Typography>
                <Typography variant="body1">
                  <strong>Vehicle Number:</strong> {activeOrder.vehicleNumber}
                </Typography>
                <Typography variant="body1">
                  <strong>Status:</strong> {activeOrder.status}
                </Typography>
                <Typography variant="body1">
                  <strong>Updated:</strong>{" "}
                  {activeOrder.lastUpdated
                    ? activeOrder.lastUpdated.toLocaleTimeString()
                    : ""}
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={autoCenter}
                    onChange={(e) => setAutoCenter(e.target.checked)}
                  />
                }
                label="Auto-Center Map"
              />
            </Stack>
          </Paper> */}

          <Box
            sx={{
              width: "100%",
              height: { xs: "300px", sm: "400px", md: "500px" },
            }}
          >
            {activeOrder.location && (
              <MapContainer
                center={activeOrder.location}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                whenCreated={(map) => {
                  if (autoCenter) {
                    map.flyTo(activeOrder.location, map.getZoom());
                  }
                }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {filteredOrders.map((order) => (
                  <Marker key={order.id} position={order.location}>
                    <Popup>
                      <strong>Order #{order.id}</strong>
                      <br />
                      {order.driver} – {order.vehicle}
                      <br />
                      {order.vehicleNumber && (
                        <>
                          Vehicle No: {order.vehicleNumber}
                          <br />
                        </>
                      )}
                      {order.lastUpdated
                        ? order.lastUpdated.toLocaleTimeString()
                        : ""}
                    </Popup>
                  </Marker>
                ))}

                {activeOrder.route && activeOrder.route.length > 1 && (
                  <Polyline positions={activeOrder.route} color="blue" />
                )}
              </MapContainer>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default TrackingUpdates;
